# CLAUDE.md — 치팅 파인더

필기시험 부정행위 도감(`/dex`) + 3×3 감독관 게임(`/play`) + 결과 공유(`/r`). Cloudflare Worker `catchcheating`, 정적 파일은 `public/`, Worker는 `/r`만 직접 처리. 설계 원문은 `docs/superpowers/specs/2026-11-17-catchcheating-design.md`.

**에셋 교체 전 공개 배포 금지.** GitHub 저장소 생성, 배포, 서브도메인 연결, 허브 카드 추가는 모두 사용자의 명시적 승인이 있어야 한다.

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
| `wrangler deploy` | 배포. 위 게이트 승인 전에는 실행 금지. `workers_dev`는 현재 `false`. 서브도메인 후보 `cheatfinder.ktslab.xyz` |

## Layout

```
wrangler.jsonc          Worker 설정. assets=./public, run_worker_first=["/r"], workers_dev=false
playwright.config.ts    e2e 설정 (시스템 Chrome, :8788)
src/worker.ts           `/r` 공유 랜딩 핸들러. c·m·f·t 검증, 서버가 칭호 재계산, 잘못된 값은 `/`로 이동
src/share.ts            공유 링크·OG 태그 생성. `OG_VERSION`(OG 이미지 URL `?v=`)
public/index.html       소개 + 도감/게임 진입
public/dex.html, dex.js, dex-logic.js   도감 (목록·필터 3축·상세·발견 표시). 순수 로직은 dex-logic.js
public/play.html, play.css              게임 화면
public/site.css         공통 스타일
public/data/cases.json      사건·수법 도감 데이터 (수법 12종 출전 + 도감 전용 6종 + 미검증 소문)
public/data/innocents.json  평범한 응시자 15명 (id, name, behavior, why)
public/game/round.js    판 구성: 수법 3~4 + 평범 5~6, 해외 사례 최소 1, 헷갈리는 쌍 배치
public/game/engine.js   60초·기회 3·행동 포즈 타이밍·탭 판정·glasses-swap
public/game/result.js   기록(c·m·f·t)과 칭호 계산
public/game/share.js    공유 문구·링크 (navigator.share → 클립보드 → 선택 가능 링크)
public/game/storage.js  도감 발견 표시 저장 (localStorage)
public/game/scene.js    3×3 좌석 렌더
public/game/result-ui.js  결과 화면
public/game/*.d.ts      위 JS의 타입 선언 (tests가 TS로 import)
public/px/              스프라이트 `<id>-0|1.webp`(기본·행동), `prop-*.webp`, `classroom.webp`. 현재 임시본
public/og/              칭호별 공유 카드 PNG 5장 (eagle·veteran·suspicious·rookie·sleepy)
scripts/                make-placeholders / slice-sheet / make-og, 공용 코드는 scripts/lib/ (caption, slice)
tests/                  vitest: content*(콘텐츠 규칙), round·engine·result·share-text·dex·worker·slice·placeholders·smoke
e2e/                    Playwright: home·dex·play·play-resilience·share
docs/research/cheating-methods.md   조사 원문. 모든 주장·출처의 기준 (A~H절, G=행동 단서 근거)
docs/assets/image-prompts.md        이미지 생성 프롬프트 v2 (시트 5종, 생성 후 점검 §8)
images/                 사용자가 넣는 생성 원본 시트 (git 제외)
```

## 게임 규칙 요약

- 60초, 기회 3. 3×3 좌석 = 수법 응시자 3~4 + 평범한 응시자 5~6, 해외 `origins` 수법 최소 1
- 수법 응시자는 약 5초(±1.5초) 간격으로 행동 포즈를 0.8초. 좌석별 시작은 무작위
- 평범한 응시자: `oneoff`는 판당 1~2회, `repeat`는 약 8초 간격. `glasses-swap`은 18~22초에 포즈가 바뀌어 유지
- 수법 응시자를 탭하면 적발, 평범한 응시자를 탭하면 기회 -1과 "단일 행동만으로 단정할 수 없다" 설명
- 종료: 전원 적발 / 60초 / 기회 0. 기록 `c`(잡음) `m`(놓침) `f`(오해) `t`(초, 전원 적발 못 하면 60)
- 공유 링크 `/r?c=&m=&f=&t=`: `f` 0~3, `c+m`은 3 또는 4, `t` 0~60. 서명 없음(랭킹이 없어 위조 이득 없음)

| 칭호 (위에서부터 먼저 맞는 것) | 조건 |
| --- | --- |
| 매의 눈 감독관 | `m=0`, `f=0`, `t<=30` |
| 베테랑 감독관 | `m<=1`, `f<=1` |
| 의심 많은 감독관 | `f>=3` |
| 신입 감독관 | `c>=2` |
| 졸고 있는 감독관 | 그 외 |

## 콘텐츠 규칙

`tests/content*.test.ts`가 아래를 강제한다. 데이터를 고치면 `npm test`를 먼저 돌린다.

- **상태 라벨 4종**: `confirmed` 확인됨 / `investigating` 수사 중·일부 추정 / `mentioned` 거론됨 / `unverified` 미검증 소문
- **tell 근거 종류**: `report` 보도 / `guideline` 감독 지침 / `community` 커뮤니티 정리 / `industry` 업계 설명(독립 검증 아님). `playable=true`이면 근거 종류와 출처가 필수
- 행동 포즈가 연출이면(예: `phone-in-clothes`) `basisNote`에 그 사실을 밝힌다 ("수법은 보도, 행동 포즈는 연출")
- 모든 주장에는 출처 URL이 있어야 하고, `docs/research/cheating-methods.md`와 대조해 확인한다
- **미검증 소문은 도감 전용**. 게임에 쓰지 않는다
- 행동 단서가 없는 수법은 게임에서 빼고 도감에서 "알아채기 어렵다"로 표시(`visibility: "low"`)

안티목표 (기술적으로 돌아가도 실패):

- 따라 하기 안내서가 되는 것. 장비 모델·설정·회피법·제작법 금지, 뉴스 수준 개요와 "알아챈 단서"만
- 추정을 사실처럼 보이게 하는 것. 사건에는 확인 라벨, 행동에는 근거 라벨
- 특정 개인 지목. 실명·별명('…냥이' 등)·계정명 금지, 온라인 의혹 단계 건은 쓰지 않는다
- 의심만으로 사람을 모는 게임. 평범한 응시자를 반드시 넣고 오해 시 설명을 보여 준다

면책 문구(화면에 유지): "뉴스 보도 기준 개요이며 따라 하기 안내가 아닙니다. 수사 중인 사건은 바뀔 수 있습니다."

## 에셋 교체 절차

현재 `public/px/`는 임시 에셋이다. 교체 전 공개 배포 금지.

1. 사용자가 `docs/assets/image-prompts.md`의 시트 5종(수법시트1, 시트2, 시트3, 소품시트, 시험장 배경)을 `images/`(git 제외)에 넣는다
2. 시트마다 `node scripts/slice-sheet.mjs <sheet.png> <pair|prop> <9 ids> <임시 디렉터리>`로 자른다 (임시 디렉터리에 먼저 낸다)
3. 프롬프트 문서 §8 점검표로 결과를 확인한다: 같은 인물 두 포즈, 머리·책상 높이, 마젠타 배경, 단서가 티 나지 않는지, 평범 응시자에 장비 없음, 글자·워터마크 없음
4. 통과한 파일을 `public/px/`로 복사한다. 실제 파일은 `make-placeholders.mjs`가 `--force` 없이는 덮어쓰지 않는다
5. `node scripts/make-og.mjs`로 공유 카드를 다시 만든다
6. OG 이미지가 바뀌면 `src/share.ts`의 `OG_VERSION`을 올린다 (카카오톡이 URL 기준으로 캐시)
7. `npm test`, `npm run e2e` 통과 후 사용자 승인을 받고 배포

슬라이서 알려진 한계: 마젠타 despill이 없고 webp가 손실 압축이다. 분홍 테두리와 번짐을 눈으로 확인한다.
