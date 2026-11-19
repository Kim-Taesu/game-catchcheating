# CLAUDE.md — 치팅 파인더

필기시험 부정행위 도감(`/dex`) + 3×3 감독관 게임(`/play`) + 결과 공유(`/r`). Cloudflare Worker `catchcheating`, 정적 파일은 `public/`, Worker는 `/r`만 직접 처리. 설계 원문은 `docs/superpowers/specs/2026-11-17-catchcheating-design.md`.

**배포, 서브도메인 연결, 허브 카드 추가는 모두 사용자의 명시적 승인이 있어야 한다.** 실제 에셋은 2026-11-19에 교체됐다(배포 전제 조건 충족).

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Vitest (`tests/*.test.ts`). 콘텐츠 규칙도 여기서 강제된다 |
| `npm run typecheck` | `tsc --noEmit`. 포맷터·린터 없음 |
| `npm run dev` | `wrangler dev`, 로컬 `:8787` |
| `npm run e2e` | Playwright (`e2e/`). 시스템 Chrome(`/Applications/Google Chrome.app`) 사용, 번들 브라우저 없음. `wrangler dev --port 8788`을 스스로 띄운다 (이미 떠 있으면 재사용) |
| `node scripts/make-placeholders.mjs [--force]` | `public/px/` 임시 스프라이트·배경·소품과 `public/og/` 임시 카드 생성. 실제 파일은 `--force` 없이는 덮어쓰지 않는다 |
| `node scripts/slice-sheet.mjs <sheet.png> <pair\|prop> <9 ids> <outDir>` | 생성 이미지 시트(3×3)를 칸별 webp로 자른다 |
| `node scripts/make-og.mjs` | 칭호별 공유 카드 `public/og/<tier>.png` (800×400) 생성 |
| `npx wrangler deploy` | 배포. 공개 주소 `https://cheatfinder.ktslab.xyz` (Worker custom domain, `workers_dev`·`preview_urls`는 `false`). 머지해도 자동 배포되지 않는다(CI·Workers Builds 없음). 배포는 사용자 승인 후 `main`에서 실행 |

## Layout

```
wrangler.jsonc          Worker 설정. assets=./public, run_worker_first=["/r"], custom domain cheatfinder.ktslab.xyz, workers_dev=false
playwright.config.ts    e2e 설정 (시스템 Chrome, :8788)
src/worker.ts           `/r` 라우팅만. 실제 처리는 src/share.ts
src/share.ts            `/r` 값 검증(c·m·f·t, `parseShare`)·서버 칭호 재계산·OG 태그 생성, 잘못된 값은 `/`로 이동. `OG_VERSION`(OG 이미지 URL `?v=`)
public/index.html       소개 + 도감/게임 진입
public/dex.html, dex.js, dex-logic.js   도감 (목록·필터 3축·상세·발견 표시). 순수 로직은 dex-logic.js
public/play.html, play.css              게임 화면
public/site.css         공통 스타일
public/data/cases.json      사건·수법 도감 데이터 (수법 15종 출전 + 도감 전용 12종 + 미검증 소문 3건). 분류 device·collab·classic·proxy·leak
public/data/innocents.json  평범한 응시자 17명 (id, name, behavior, action, why, vs). `action`은 `tell.action`과 같은 "…한다" 문장, `why`는 정상인 구체적 이유, `vs`는 비슷한 부정행위 단서와 겉으로 보이는 차이
public/game/round.js    판 구성: 수법 5~8(`MIN_CHEATERS`·`MAX_CHEATERS`) + 평범 1~4, 해외 사례 최소 1, 헷갈리는 쌍 배치, 좌석별 행동 포즈 시각(onsets·swapAtMs) 생성
public/game/engine.js   60초·오해 1번이면 종료(`LIVES=1`)·포즈 판정(poseAt)·탭 판정·적발 좌석 재탭 무시·glasses-swap
public/game/result.js   기록(c·m·f·t)과 칭호 계산, 결과 화면 시간 줄(endTimeLine)
public/game/share.js    공유 문구·링크 (navigator.share → 클립보드 → 선택 가능 링크)
public/game/storage.js  도감 발견 표시 저장 (localStorage)
public/game/scene.js    3×3 좌석·HUD·남은 시간 막대·상단 짧은 알림(toast). 끝나면 onEnd(result, recap{caught, misjudged, seats})
public/game/result-ui.js  결과 화면: 칭호·숫자 + 판 그대로의 3×3 결과 좌석(잡음·놓침·오해·정상) + 좌석 설명 창(dialog) + 공유
public/game/labels.js   상태·근거 라벨, 행동 문장, 교체 전 오해 안내 (scene·result-ui 공용)
public/game/identity.js  게임 중 정체를 숨기는 문구의 단일 출처: 좌석 라벨, 탭 알림(tapMessage)
public/game/intro.js    게임 전 안내 3장(다음 → 다음 → 게임 시작). 숫자는 `MIN_CHEATERS`·`MAX_CHEATERS`·`DURATION_MS`에서 가져온다
public/game/hub.js      허브 지표(`POST https://ktslab.xyz/event`, sendBeacon). `cheatfinder.ktslab.xyz`에서만 보낸다(로컬·e2e는 0건, e2e가 확인). 홈·도감·게임 안내는 페이지를 열 때 `enter`, "게임 시작"에 `play_start`, 결과 화면에 `play_end`(ms). 안내 없이 바로 시작하는 "다시 하기"는 `enter`+`play_start`를 요청 하나로 묶는다(쿠키 발급 전 동시 요청은 방문자 2명). 허브 카드·`/ops`·`/dashboard`가 이 값을 쓴다
public/favicon.png, apple-touch-icon.png  탭·홈 화면 아이콘 (스마트안경 소품)
public/game/*.d.ts      위 JS의 타입 선언 (tests가 TS로 import)
public/px/              스프라이트 `<id>-0|1.webp`(기본·행동), `prop-*.webp`, `classroom.webp`. 실제 에셋 (응시자 54, 소품 18, 배경 1)
public/og/              칭호별 공유 카드 PNG 5장 (eagle·veteran·suspicious·rookie·sleepy)
scripts/                make-placeholders / slice-sheet / make-og, 공용 코드는 scripts/lib/ (caption, slice, esc, assets=PROP_IDS)
tests/                  vitest: content*(콘텐츠 규칙), identity(정답 숨김 불변식)·round·engine·result·share-text·dex·worker·slice·placeholders·smoke
e2e/                    Playwright: home·dex·play·play-resilience·share, 공용 도우미 helpers.ts(planFor·seat·startRound)
docs/research/cheating-methods.md   조사 원문. 모든 주장·출처의 기준 (A~H절, G=행동 단서 근거)
docs/assets/image-prompts.md        이미지 생성 프롬프트 v4 (부드러운 hi-bit 도트, 시트 6종: 응시자 3·소품 2·배경 1, 생성 후 점검 §8, 자르기 명령 §10)
images/                 사용자가 넣는 생성 원본 시트 (git 제외)
```

## 게임 규칙 요약

- `/play`를 열면 안내 3장(감독관 역할·반복 행동 단서·탭 규칙)이 먼저 나오고 "게임 시작"을 눌러야 판과 60초가 시작된다. 결과 화면 "다시 하기"(`/play?again=1`)는 안내를 건너뛴다. e2e `startRound`는 안내를 눌러 넘긴다
- 60초, 기회 없음(오해 1번이면 즉시 종료). 3×3 좌석 = 수법 응시자 5~8(균등 무작위) + 평범한 응시자 1~4, 해외 `origins` 수법 최소 1. 최대 8은 평범한 응시자를 늘 1명 이상 남기기 위해서다(안티목표). 헷갈리는 평범 응시자는 자리가 있는 만큼 먼저 넣는다
- 수법 응시자는 약 7초(±1.5초) 간격으로 행동 포즈를 4초(겹치지 않음). 좌석별 시작은 무작위
- 포즈 전환은 기본·행동 두 이미지를 겹쳐 두고 행동 이미지만 기본 이미지 위에서 0.25초 페이드(opacity 250ms, 기본 이미지는 늘 불투명). `prefers-reduced-motion: reduce`면 즉시 전환. 두 이미지는 `alt=""`, 한 번만 로드
- 잡힌 좌석은 "잡힘" 도장·흐리게 표시, 접근성 라벨 "응시자 N 잡힘: 이름", `aria-disabled`, 이후 행동 포즈를 멈춤(항상 기본 포즈). 멈춤은 scene render에서 처리하고 `engine.poseAt`은 순수하게 둔다
- 모든 좌석이 12초 안에 처음 움직인다(판이 보통 20~30초에 끝나므로). 평범한 응시자: `oneoff`는 판당 2회(첫 행동 2~10초, 두 번째는 8~14초 뒤), `repeat`는 약 8초 간격. `glasses-swap`은 6~12초에 포즈가 바뀌어 유지
- 수법 응시자를 탭하면 적발, 평범한 응시자를 탭하면 그 즉시 종료(`ended: 'lives'`, `f=1`). `glasses-swap`을 교체 전에 탭해도 평범한 응시자와 똑같이 종료되고(다르게 반응하면 정체가 드러남), 교체 후에는 적발 가능. 적발한 좌석 재탭은 무시
- 남은 시간은 숫자와 함께 HUD 아래 막대(`#timebar`, `role=progressbar`, `aria-valuenow`=남은 초)로 보인다. 막대는 줄어들며 초록 → 노랑 → 빨강(hue 120→0)으로 바뀌고, 10초 이하면 `data-low`로 깜빡인다(reduced-motion은 깜빡임 없음). 알림은 HUD만 덮으므로 막대는 늘 보인다
- 게임 중 안내는 HUD 자리에 뜨는 짧은 알림(toast)뿐이다. 좌석 격자를 절대 덮지 않고(높이 ≤72px), 2.5초 뒤 사라지고, 새 탭이 바꾸고, Esc로 닫힌다. 링크·긴 설명 없음. 문구: 적발 "적발! 수법 이름 · 상태 라벨", 적발이 아닌 탭(평범·교체 전)은 모두 "정상 행동입니다 · 응시자 N"(평범 이름도 쓰지 않는다. 교체 전 좌석과 구별되지 않게). `#panel-live`(sr-only)가 같은 문구를 읽어 준다
- 자세한 설명은 결과 화면(`#end`)에서 본다. 판이 끝나면 게임 격자(`#game`)를 숨기고 같은 자리에 결과 격자(`#end-grid`, 좌석 `data-result-seat`·`data-outcome`)를 띄운다. 9칸 모두 행동 포즈 그림 + 결과 배지(잡음 초록 / 놓침 빨강 / 오해 주황 / 정상 회색) + 이름. 375×667에서 결과 격자와 "공유하기"가 스크롤 없이 보여야 한다(e2e). 좌석을 누르면 설명 창(`<dialog id="end-detail">`, Esc·닫기·바깥 클릭으로 닫히고 누른 좌석으로 초점 복귀)이 뜬다. 부정행위: 수법 요약·게임에서 보인 행동·실제로 알아챈 단서(`cue`)·근거 라벨·도감 링크, 교체 전에 탭한 `glasses-swap`은 놓침으로 표시하고 "안경을 바꾸기 전에 잡아서 오해가 됐어요…"를 붙인다. 정상: 보인 행동·정상인 이유(`why`)·부정행위와 다른 점(`vs`), 오해한 좌석은 "이 응시자를 잡아서 시험이 끝났어요."를 붙인다. 시간 줄은 전원 적발 "걸린 시간 t초", 시간 종료 "시간 종료", 오해 종료는 시간 줄 없이 "정상 응시자를 잡아 시험이 끝났어요"
- 정답 노출 금지: 적발 전 좌석의 글자·ARIA는 "응시자 N"뿐이고, 이미지 실패 대체 카드는 행동 문장(`tell.action` / 평범 `action`, 같은 문장 형식)만 보여 준다
- 종료: 전원 적발 / 60초 / 정상 응시자 탭. 기록 `c`(잡음) `m`(놓침) `f`(오해) `t`(초, 전원 적발 못 하면 60)
- 공유 링크 `/r?c=&m=&f=&t=`: `f` 0~1, `c+m`은 5~8, `t` 0~60. 서명 없음(랭킹이 없어 위조 이득 없음)

| 칭호 (위에서부터 먼저 맞는 것) | 조건 |
| --- | --- |
| 매의 눈 감독관 | `m=0`, `f=0`, `t<=30` |
| 베테랑 감독관 | `m<=1`, `f=0` |
| 신입 감독관 | `c>=2`, `f=0` |
| 의심 많은 감독관 | `f>=1` (오해로 종료) |
| 졸고 있는 감독관 | 그 외 |

## 콘텐츠 규칙

`tests/content*.test.ts`가 아래를 강제한다. 데이터를 고치면 `npm test`를 먼저 돌린다.

- **상태 라벨 4종**: `confirmed` 확인됨 / `investigating` 수사 중·일부 추정 / `mentioned` 거론됨 / `unverified` 미검증 소문
- **tell 근거 종류**: `report` 보도 / `guideline` 감독 지침 / `community` 커뮤니티 정리 / `industry` 업계 설명(독립 검증 아님). `playable=true`이면 근거 종류와 출처가 필수
- 행동 포즈가 연출이면(예: `phone-in-clothes`) `basisNote`에 그 사실을 밝힌다 ("수법은 보도, 행동 포즈는 연출")
- 모든 주장에는 출처 URL이 있어야 하고, `docs/research/cheating-methods.md`와 대조해 확인한다
- **미검증 소문은 도감 전용**. 게임에 쓰지 않는다
- 행동 단서가 없는 수법은 게임에서 빼고 도감에서 "알아채기 어렵다"로 표시(`visibility: "low"`)
- 평범한 응시자 `why`·`vs`는 구체적으로 쓴다(각 120자 이하). "…만으로는 단정할 수 없어요" 같은 일반론은 금지, 그림에서 보이는 차이(손 위치·시선·기기 유무)를 적는다

안티목표 (기술적으로 돌아가도 실패):

- 따라 하기 안내서가 되는 것. 장비 모델·설정·회피법·제작법 금지, 뉴스 수준 개요와 "알아챈 단서"만
- 추정을 사실처럼 보이게 하는 것. 사건에는 확인 라벨, 행동에는 근거 라벨
- 특정 개인 지목. 실명·별명('…냥이' 등)·계정명 금지, 온라인 의혹 단계 건은 쓰지 않는다
- 의심만으로 사람을 모는 게임. 평범한 응시자를 반드시 넣고 오해 시 설명을 보여 준다

면책 문구(화면에 유지): "뉴스 보도 기준 개요이며 따라 하기 안내가 아닙니다. 수사 중인 사건은 바뀔 수 있습니다."

## 에셋 교체 절차

`public/px/`는 실제 에셋(2026-11-19 교체, 소품시트2 포함)이다. 새 소품을 추가하면 `PROP_IDS`와 `public/dex.js`의 `PROP` 표를 함께 고친다(테스트가 중복 id와 없는 아이콘을 잡는다).

1. 사용자가 `docs/assets/image-prompts.md`의 시트(수법시트1, 시트2, 시트3, 소품시트, 소품시트2, 시험장 배경)를 `images/`(git 제외)에 넣는다. 소품시트2를 넣으면 `PROP_IDS`와 `public/dex.js`의 `PROP` 표도 새 아이콘으로 바꾼다
2. 시트마다 `node scripts/slice-sheet.mjs <sheet.png> <pair|prop> <9 ids> <임시 디렉터리>`로 자른다 (임시 디렉터리에 먼저 낸다). 시험장 배경(`catch_시험장.png`)은 3×3 시트가 아니라서 따로 변환한다:
   `node -e "require('sharp')('images/catch_시험장.png').resize(1152, 648, { fit: 'cover', kernel: 'lanczos3' }).webp({ lossless: true }).toFile('<임시 디렉터리>/classroom.webp')"` → 점검 후 `public/px/classroom.webp`
3. 프롬프트 문서 §8 점검표로 결과를 확인한다: 같은 인물 두 포즈, 몸·어깨·책상 위치가 같고 머리·눈·한쪽 팔만 다른지(크로스페이드 흔들림), 마젠타 배경, 단서가 티 나지 않는지, 평범 응시자에 장비 없음, 글자·워터마크 없음
4. 통과한 파일을 `public/px/`로 복사한다. 실제 파일은 `make-placeholders.mjs`가 `--force` 없이는 덮어쓰지 않는다
5. `node scripts/make-og.mjs`로 공유 카드를 다시 만든다
6. OG 이미지가 바뀌면 `src/share.ts`의 `OG_VERSION`과 `public/index.html`의 `og:image` `?v=`를 함께 올린다 (카카오톡이 URL 기준으로 캐시)
7. `npm test`, `npm run e2e` 통과 후 사용자 승인을 받고 배포

슬라이서는 부드러운 hi-bit 그림용이다: 192×192로 lanczos3 축소(부드러운 hi-bit 그림을 nearest로 줄이면 계단이 생김), 무손실 webp, 마젠타 키(거리 ≤60) 뒤 despill(거리 ≤140인 테두리 픽셀의 R·B를 G 쪽으로 당기고 알파를 비례해 낮춤). 그래도 분홍 테두리가 남는지 눈으로 확인한다. `make-og.mjs`도 스프라이트를 raw로 디코드한 뒤 lanczos3로 줄인다(WebP shrink-on-load가 커널을 무시하므로).
