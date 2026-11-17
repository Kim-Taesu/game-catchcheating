# 치팅 파인더 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 필기시험 부정행위 사건 도감 + 3×3 시험장에서 반복 행동으로 수법 응시자를 찾는 미니게임 + 소맥식 결과 공유를 만든다. 에셋 교체 뒤에만 배포한다.

**Architecture:** 바닐라 HTML/JS 정적 페이지(`public/`)와 작은 Cloudflare Worker(`src/`, `/r` 공유 랜딩만 직접 처리, 나머지는 assets binding). 게임 규칙은 DOM 없는 순수 ES 모듈(`public/game/*.js` + `.d.ts`)로 두고 브라우저·Worker·vitest가 공용으로 쓴다. 시각은 `public/px/<id>-0|1.webp`(기본·행동 포즈)로 교체 가능하게 하고, 에셋 전에는 스크립트가 만든 임시 그림을 쓴다.

**Tech Stack:** Node 26, TypeScript(Worker·테스트), vitest 3, wrangler 4, @playwright/test(시스템 Chrome), sharp(에셋 가공). 허브 소맥·ASAP과 같은 구조.

**Spec:** [docs/superpowers/specs/2026-11-17-catchcheating-design.md](../specs/2026-11-17-catchcheating-design.md) · grill 결과 `.ax/plans/2026-11-17-catchcheating-design.md` · [조사](../../research/cheating-methods.md) · [이미지 프롬프트](../../assets/image-prompts.md)

## Global Constraints

- 서비스 이름 **치팅 파인더**. 한국어 UI, 모바일 우선(375px 폭), 좌석 탭 영역 최소 44px.
- 한 판 **60초**(`DURATION_MS = 60000`), 기회 **3**(`LIVES = 3`), 3×3 좌석 9명 = 수법 응시자 **3~4명** + 평범한 응시자 **5~6명**, 해외(`origins`에 `KR` 아닌 나라가 있는) 수법 **최소 1명**
- 수법 응시자 행동 포즈: 약 **5초(±1.5초)** 간격, 한 번에 **0.8초**(`ACTION_MS = 800`). 평범 `repeat`는 약 **8초(±2초, 초기값)**, `oneoff`는 판당 **1~2회**. `glasses-swap`은 약 **20초**(18~22초)에 포즈가 바뀌어 이후 유지, 그 전 탭은 오해
- 칭호(위에서 먼저 맞는 것): 매의 눈 `m=0,f=0,t<=30` / 베테랑 `m<=1,f<=1` / 의심 많은 `f>=3` / 신입 `c>=2` / 졸고 있는. 티어 id는 `eagle`·`veteran`·`suspicious`·`rookie`·`sleepy`
- 공유 값 `c,m,f,t`는 정수, `f` 0~3, `c+m`은 3 또는 4, `t` 0~60. 범위 밖이면 `/`로 302. 서버가 칭호를 다시 계산. og:image `/og/<tier>.png?v=1`(800×400)
- 게임 출전은 `playable=true` 12종뿐이고 `tell.basisKind`(`report`|`guideline`|`community`|`industry`)와 출처가 필수. 도감 전용 6종(단추 카메라·개조 계산기·팔뚝 필기·물병 라벨·가방 속 폰·위조 신분증)은 `playable=false`, `visibility:"low"`. `unverified`는 게임 제외, 도감 별도 코너
- 확인 라벨 4종: `confirmed` 확인됨 / `investigating` 수사 중·일부 추정 / `mentioned` 거론됨 / `unverified` 미검증 소문
- 개인 실명·별명 금지 (테스트의 금지어는 별명 `냥이`, 표현 `리트 만점`). 장비 모델·설정·회피법·제작법 금지
- 에셋: 응시자 192×192 webp(표시 96px), 한 칸 = 기본(왼쪽)·행동(오른쪽) 두 포즈, 배경 마젠타 `#FF00FF`를 투명 처리. **공개 배포는 실제 에셋 교체 뒤에만**
- 서버 저장 없음. localStorage는 try/catch로 감싸고 실패해도 동작. 외부 서비스에 사용자 정보 전송 금지
- 커밋은 로컬만. **GitHub 저장소 생성·push·`wrangler deploy`·서브도메인·허브 카드 PR은 T17에서 사용자에게 확인한 뒤에만**
- 이 저장소는 아직 커밋이 없어 base SHA 비교 게이트는 쓰지 않는다

## Review Focus

1. `/r`에 `c=abc`, 값 누락, `c+m=5`, `f=4`, `t=61`, 소수 → 전부 302 `/` (T7)
2. 탭이 비활성이던 뒤 45초 시점에 갱신해도 남은 시간 15000ms, 행동 포즈는 현재 시각에서 계산되고 밀린 행동이 한꺼번에 재생되지 않음 (T4)
3. 이미 적발한 좌석 재탭·종료 뒤 탭·`glasses-swap` 좌석을 교체 전에 탭 → 기회/기록이 중복·누락되지 않음 (T4)
4. localStorage가 예외를 던져도 도감 목록이 렌더되고 "발견"만 비어 있음 (T11)
5. 응시자 이미지 404여도 이름 카드로 좌석이 나오고 한 판이 끝까지 진행됨 (T14)
6. 풀에 해외 수법이 하나도 없어도 `buildRound`가 예외 없이 판을 만듦 (T3)

---

## File Structure

```
package.json tsconfig.json vitest.config.ts playwright.config.ts wrangler.jsonc
src/worker.ts            fetch 진입점, /r만 직접 처리
src/share.ts             renderShare(), handleShare()
public/game/result.js(.d.ts)   titleFor, TITLE_TEXT, shareQuery, parseShare
public/game/round.js(.d.ts)    타입, seededRng, buildRound
public/game/engine.js(.d.ts)   createEngine, poseAt, tap, status, result (시각은 인자로 받는 순수 함수)
public/game/storage.js(.d.ts)  safeStorage, loadDiscovered, markDiscovered
public/game/share.js(.d.ts)    shareText, shareUrl
public/game/scene.js, result-ui.js   DOM
public/dex-logic.js(.d.ts)     filterCases
public/index.html dex.html dex.js play.html site.css play.css
public/data/cases.json innocents.json
public/px/*.webp  public/og/*.png     (임시 그림 → 실제 에셋)
scripts/lib/slice.mjs  scripts/slice-sheet.mjs  scripts/make-placeholders.mjs  scripts/make-og.mjs
tests/*.test.ts   e2e/*.spec.ts   README.md   CLAUDE.md
```

---

### Task 1: 프로젝트 골격

```yaml
task_id: T1
owner: main-session            # 의존성 설치·공통 설정(공유 추상화)
allowed_files: [package.json, package-lock.json, tsconfig.json, vitest.config.ts, playwright.config.ts, wrangler.jsonc, src/worker.ts, public/index.html, tests/smoke.test.ts]
forbidden_changes: [docs/**]
must_read: [.ax/plans/2026-11-17-catchcheating-design.md]
expected_output: npm test/typecheck가 통과하고 wrangler dev가 / 와 /r 를 응답
verification_command: npm test && npm run typecheck
handoff_summary_required: true
```

**Interfaces:** Produces — npm scripts `test`(`vitest run`), `typecheck`(`tsc --noEmit`), `dev`(`wrangler dev`), `e2e`(`playwright test`). `src/worker.ts`: `export interface Env { ASSETS: Fetcher }`, `export default { fetch(request: Request, env: Env): Promise<Response> }`.

- [ ] **Step 1:** `package.json` 작성 (`"type":"module"`, private). devDependencies: `@cloudflare/workers-types ^5.20260818.1`, `@playwright/test ^1.50.0`, `sharp ^0.34.0`, `typescript ^5.8.0`, `vitest ^3.2.0`, `wrangler ^4.119.0`. 이 조합은 계획 단계에서 임시 폴더에 설치해 vitest·tsc·wrangler dev·sharp·playwright(시스템 Chrome)가 동작함을 확인했다.
- [ ] **Step 2:** 설정 파일 작성. `tsconfig.json`은 `strict`, `skipLibCheck: true`(없으면 vitest 타입에서 실패), `allowJs: false`, `moduleResolution: "Bundler"`, `types: ["@cloudflare/workers-types"]`, `include: ["src","tests"]`. `vitest.config.ts`는 `include: ['tests/**/*.test.ts']`. `playwright.config.ts`는 `testDir:'e2e'`, `use.launchOptions.executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`, `webServer`로 `npx wrangler dev --port 8788 --ip 127.0.0.1`(url `http://127.0.0.1:8788`). `wrangler.jsonc`는 `name:"catchcheating"`, `main:"src/worker.ts"`, `assets:{directory:"./public",binding:"ASSETS",run_worker_first:["/r"]}`, `workers_dev:false`.
- [ ] **Step 3:** `src/worker.ts` 임시 구현 — `/r` 외 모두 `env.ASSETS.fetch(request)`. `public/index.html`은 `<h1>치팅 파인더</h1>`. `tests/smoke.test.ts`는 `expect(1+1).toBe(2)`.
- [ ] **Step 4:** `npm install` 후 `npm test`, `npm run typecheck` 실행 → 모두 통과.
- [ ] **Step 5:** `npx wrangler dev --port 8788` 띄우고 `curl http://127.0.0.1:8788/` 가 `치팅 파인더`를 포함하는지 확인 후 종료.
- [ ] **Step 6:** 커밋 `chore: scaffold` (이 커밋에 기존 docs·.gitignore 포함).

---

### Task 2: 결과·칭호·공유 값 (순수)

```yaml
task_id: T2
owner: superpowers
allowed_files: [public/game/result.js, public/game/result.d.ts, tests/result.test.ts]
forbidden_changes: [src/**, public/data/**]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md]   # §6.2 칭호, §6.5 공유
expected_output: titleFor·parseShare·shareQuery가 spec 표와 경계값대로 동작
verification_command: npx vitest run tests/result.test.ts
handoff_summary_required: true
```

**Interfaces:** Produces — `type Tier = 'eagle'|'veteran'|'suspicious'|'rookie'|'sleepy'`, `type Result = { c:number; m:number; f:number; t:number }`, `TITLE_TEXT: Record<Tier,string>`(칭호 한국어 5개), `titleFor(r: Result): Tier`, `shareQuery(r: Result): string`(`c=4&m=0&f=0&t=28`), `parseShare(params: URLSearchParams): Result | null`.

- [ ] **Step 1: 실패하는 테스트** (`tests/result.test.ts`):
  - `titleFor({c:4,m:0,f:0,t:30})` = `eagle`, `t:31` = `veteran`
  - `{c:3,m:1,f:1,t:60}` = `veteran`, `{c:3,m:1,f:2,t:60}` = `rookie`(f=2 이므로 suspicious 아님)
  - `{c:1,m:2,f:3,t:60}` = `suspicious`, `{c:4,m:0,f:3,t:20}` = `suspicious`(우선순위: f≥3이 신입보다 먼저)
  - `{c:1,m:2,f:0,t:60}` = `sleepy`, `{c:0,m:3,f:0,t:60}` = `sleepy`
  - `parseShare(new URLSearchParams('c=3&m=1&f=0&t=40'))` = `{c:3,m:1,f:0,t:40}`; 다음은 모두 `null`: `c=abc&m=1&f=0&t=40`, `c=3&m=1&f=0`(t 누락), `c=3&m=2&f=0&t=40`(c+m=5), `c=2&m=0&f=0&t=40`(c+m=2), `c=3&m=1&f=4&t=40`, `c=3&m=1&f=0&t=61`, `c=3&m=1&f=0&t=-1`, `c=3.5&m=0.5&f=0&t=40`
  - `shareQuery` → `parseShare(new URLSearchParams(shareQuery(r)))` 왕복이 같은 값
- [ ] **Step 2:** `npx vitest run tests/result.test.ts` → FAIL(모듈 없음).
- [ ] **Step 3:** `result.js`와 `result.d.ts` 구현. 정수 판정은 `Number.isInteger`, 문자열은 `/^\d+$/`로 먼저 거른다.
- [ ] **Step 4:** 같은 명령 → PASS. **Step 5:** 커밋 `feat: result titles and share values`.

---

### Task 3: 판 구성

```yaml
task_id: T3
owner: superpowers
allowed_files: [public/game/round.js, public/game/round.d.ts, tests/round.test.ts]
forbidden_changes: [public/data/**, public/game/result.js]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md]   # §6.1 데이터, §6.2 규칙
expected_output: buildRound가 spec의 모든 구성 제약을 만족하는 RoundPlan을 만든다
verification_command: npx vitest run tests/round.test.ts
handoff_summary_required: true
```

**Interfaces:** Produces — 타입 `Origin`, `CaseEntry`(필드: `id,name,group,origins,summary,cue,detect,status,sources,playable,tell?,visibility?,lookalike?`; `tell`: `{action,basisKind,basisNote?,basisSources,swap?}`), `Innocent`(`id,name,behavior:'oneoff'|'repeat',why`), `SeatPlan = { seat:number; kind:'cheater'|'innocent'; id:string; onsets:number[]; swapAtMs?:number }`, `RoundPlan = { seats: SeatPlan[]; cheaterCount: 3|4 }`, `ACTION_MS = 800`, `seededRng(seed:number): () => number`(mulberry32), `buildRound(cases: CaseEntry[], innocents: Innocent[], rng: () => number): RoundPlan`.

- [ ] **Step 1: 실패하는 테스트** (`tests/round.test.ts`, 테스트 안에 `cases`·`innocents` 픽스처를 직접 둔다: playable 5종 이상(그중 해외 `origins` 1종, `swap` 1종, `lookalike` 지정 2종), 비playable 2종, innocents 10종):
  - 시드 1..200 전부: `seats.length===9`, 좌석 번호 0..8 중복 없음, `cheaterCount`∈{3,4}이고 `kind==='cheater'` 수와 일치, id 중복 없음, 비playable·`unverified` 없음
  - 시드 1..200 전부: 수법 응시자 중 `origins`에 `KR`가 아닌 나라가 있는 수법이 ≥1
  - 같은 시드 → 같은 결과(`toEqual`), 다른 시드 → 좌석 배치가 달라짐(200개 중 서로 다른 결과 ≥2)
  - 수법 응시자 `onsets`: 오름차순, 각 간격이 3500~6500ms, 첫 값 0~6000, 마지막 값 < 60000
  - `innocent.repeat`는 간격 6000~10000ms, `oneoff`는 `onsets.length`가 1 또는 2, 값 3000~55000
  - `swap` 수법: `swapAtMs`가 18000~22000이고 `onsets`는 빈 배열
  - `lookalike`가 지정된 수법이 뽑힌 판에서는 해당 평범 응시자가 같은 판에 ≥1명 포함(시드 1..200 중 해당 수법이 뽑힌 판 전부)
  - 풀에 해외 수법이 없는 픽스처 → 예외 없이 판 생성
- [ ] **Step 2:** `npx vitest run tests/round.test.ts` → FAIL.
- [ ] **Step 3:** `round.js`·`round.d.ts` 구현. 전체 좌석 셔플은 주입된 `rng`만 사용, 수법 수는 `rng()<0.5 ? 3 : 4`.
- [ ] **Step 4:** 같은 명령 → PASS. **Step 5:** 커밋 `feat: round builder`.

---

### Task 4: 게임 엔진 (시각을 인자로 받는 상태 기계)

```yaml
task_id: T4
owner: superpowers
allowed_files: [public/game/engine.js, public/game/engine.d.ts, tests/engine.test.ts]
forbidden_changes: [public/game/round.js, public/game/result.js]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md, public/game/round.d.ts, public/game/result.d.ts]
expected_output: 타이머·기회·판정·포즈가 모두 nowMs 인자로 결정되고 Review Focus 2·3을 만족
verification_command: npx vitest run tests/engine.test.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — `RoundPlan`, `SeatPlan`, `ACTION_MS`(T3), `Result`(T2). Produces — `DURATION_MS = 60000`, `LIVES = 3`, `type Engine`(불투명), `createEngine(plan: RoundPlan, startMs: number): Engine`, `poseAt(seat: SeatPlan, nowMs: number, startMs: number): 0|1`, `type TapOutcome = { kind:'caught'|'innocent'|'ignored'; seat:number; id:string; reason?:'before-swap' }`, `tap(e: Engine, seat: number, nowMs: number): TapOutcome`, `status(e: Engine, nowMs: number): { remainingMs:number; lives:number; caught:number; total:number; ended: null|'clear'|'timeout'|'lives' }`, `result(e: Engine, nowMs: number): Result`.

- [ ] **Step 1: 실패하는 테스트** (`tests/engine.test.ts`, 3수법+6평범 고정 `RoundPlan` 픽스처, `start=1000`):
  - `poseAt`: onset 5000인 수법 좌석 → now=start+4999 → 0, start+5000 → 1, start+5799 → 1, start+5800 → 0. `swapAtMs=20000` 좌석 → start+19999 → 0, start+20000 → 1, 이후 계속 1
  - 수법 좌석 탭 → `caught`, `status.caught` 1. 같은 좌석 재탭 → `ignored`, 기회·적발 수 불변
  - 평범 좌석 탭 → `innocent`, `lives` 3→2. 평범 3번 탭 → `ended==='lives'`, 이후 어떤 탭도 `ignored`
  - 전원 적발 → `ended==='clear'`, `result` = `{c:3,m:0,f:0,t:<경과초 올림>}` (start+12300에서 마지막 적발 → t=13)
  - 60000ms 경과 후 `status` → `ended==='timeout'`, `result.t===60`, `m`=못 잡은 수
  - **Review Focus 2:** 아무 호출 없이 now=start+45000에서 `status` → `remainingMs===15000`, `ended===null`; 그 시점 `poseAt`은 `onsets`와 현재 시각만으로 0/1이 정해진다(같은 `now`로 두 번 호출해도 같은 값)
  - **Review Focus 3:** `swapAtMs=20000` 좌석을 now=start+10000에 탭 → `{kind:'innocent', reason:'before-swap'}`, 기회 -1, 좌석은 적발 처리되지 않음. start+21000에 다시 탭 → `caught`
  - 타이머 종료 뒤 탭 → `ignored`, `f` 불변
- [ ] **Step 2:** `npx vitest run tests/engine.test.ts` → FAIL.
- [ ] **Step 3:** `engine.js`·`engine.d.ts` 구현. 종료 판정은 `status`·`tap` 호출 때 지연 평가한다(타이머 인터벌 없음).
- [ ] **Step 4:** 같은 명령 → PASS. **Step 5:** 커밋 `feat: game engine`.

---

### Task 5: 사건·평범한 응시자 데이터와 콘텐츠 검사

```yaml
task_id: T5
owner: main-session            # 콘텐츠 정책(안티목표) 판단, 출처 선별
allowed_files: [public/data/cases.json, public/data/innocents.json, tests/content.test.ts]
forbidden_changes: [public/game/**]
must_read: [docs/research/cheating-methods.md, docs/superpowers/specs/2026-11-17-catchcheating-design.md, docs/assets/image-prompts.md]
expected_output: 수법 18건(12 playable + 6 도감 전용) + 미검증 3건 + 평범 15명, 콘텐츠 규칙 테스트 통과
verification_command: npx vitest run tests/content.test.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — `CaseEntry`·`Innocent` 형태(T3). Produces — `public/data/cases.json`(배열), `public/data/innocents.json`(배열). playable id 12개와 innocents id는 [이미지 프롬프트](../../assets/image-prompts.md)의 id와 정확히 같다(`smart-glasses-frame, glasses-lens-heat, earpiece-hidden, bone-conduction, smartwatch, phone-in-clothes, glasses-swap, earbud-swallow, ear-bandage, signal-fingers, peek, cheat-sheet-sleeve` / 평범 15: `think-chin, look-up, plain-glasses, yawn, pencil-spin, rub-eyes, analog-watch, plain-calculator, sneeze, drink-water, scratch-head, stretch, erase, turn-back, nose-sniff`). 도감 전용 id: `button-camera, calculator-mod, body-writing, disguised-item, phone-in-bag, proxy-id`. 미검증 id: `rumor-forum-confession, rumor-video-comment, rumor-broker-telegram`. `lookalike` 지정: `smart-glasses-frame→plain-glasses`, `glasses-swap→plain-glasses`, `smartwatch→analog-watch`, `earpiece-hidden→sneeze`, `earbud-swallow→sneeze`.

- [ ] **Step 1: 실패하는 테스트** (`tests/content.test.ts`, 데이터를 `fs`로 읽는다):
  - 모든 사건: `status`가 4종 중 하나, `status!=='unverified'`이면 `sources.length>=1`이고 각 `url`이 `https://`로 시작
  - `playable===true`인 건 정확히 12개이고 id 집합이 위 목록과 같다. 각각 `tell.basisKind`가 4종 중 하나, `tell.basisSources.length>=1`, `tell.action` 비어 있지 않음
  - `playable===false` 중 `unverified`가 아닌 건 정확히 6개이고 `visibility==='low'`
  - `unverified` 건은 정확히 3개이고 `playable===false`
  - `phone-in-clothes.tell.basisNote`가 `수법은 보도, 행동 포즈는 연출`을 포함
  - innocents: 정확히 15개, `behavior`가 `oneoff`|`repeat`, `why` 비어 있지 않음, `repeat` ≥ 5개, `oneoff` ≥ 5개. `lookalike` 값은 모두 실제 innocent id
  - 모든 텍스트 필드(사건·평범 전부)에 금지어 `냥이`, `리트 만점` 미포함. `summary`·`cue`·`detect` 길이 ≤ 160자
  - `glasses-swap`의 `tell.swap===true`, 나머지 playable은 아님
- [ ] **Step 2:** `npx vitest run tests/content.test.ts` → FAIL.
- [ ] **Step 3:** 두 JSON을 [조사 문서](../../research/cheating-methods.md)(A·A-2·G절)에 근거해 작성. 문구는 뉴스 수준 개요와 알아챈 단서까지만, 따라 하기 정보 금지. 서울시교육청 지침 보도의 원문 URL은 구현 중 찾아 `source`에 넣고, 못 찾으면 보도한 언론 기사 URL을 쓴다(spec §8). 평범 응시자 `why`에는 "단일 행동만으로 단정할 수 없다"는 취지를 넣는다.
- [ ] **Step 4:** 같은 명령 → PASS. **Step 5:** 커밋 `feat: case and innocent data`.

---

### Task 6: 해외 사례 확장 (조사)

```yaml
task_id: T6
owner: main-session            # 웹 조사와 출처 판정
allowed_files: [public/data/cases.json, tests/content-overseas.test.ts, docs/research/cheating-methods.md]
forbidden_changes: [public/game/**, tests/content.test.ts]
must_read: [public/data/cases.json, docs/research/cheating-methods.md]
expected_output: 기존 수법 origins에 해외 사건 8건 이상 매핑, 출처 URL 모두 실제 열림
verification_command: npx vitest run tests/content-overseas.test.ts tests/content.test.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — T5의 `cases.json`. Produces — 기존 사건의 `origins`에 `{country, year, label}` 추가(새 수법·새 id 추가 금지).

- [ ] **Step 1: 실패하는 테스트** (`tests/content-overseas.test.ts`): 모든 사건의 `origins` 중 `country!=='KR'`인 항목 합계 ≥ 8, 서로 다른 나라 ≥ 4, 각 해외 origin이 속한 사건의 `sources`에 해당 사건을 다룬 항목이 있어야 하므로 `origins[i].sourceUrl`이 `sources[].url` 중 하나와 같음. `country`는 ISO 두 글자 대문자.
- [ ] **Step 2:** 실행 → FAIL.
- [ ] **Step 3:** 조사 문서·웹 조사로 해외 사건을 찾아 매핑(현재 확보: 일본 와세다 2024, 튀르키예 2024, 인도 2026, 대만 2026, 이탈리아 2023, 중국 가오카오 대응). 원문을 못 찾은 건(일본 마스크 속 마이크, 인도 큰 단추 금지)은 쓰지 않는다. 각 origin에 `sourceUrl`을 넣는다.
- [ ] **Step 4:** 각 `sourceUrl`을 `curl -sI -o /dev/null -w "%{http_code}"`로 확인(200/30x). 실패 URL은 교체. 그 뒤 위 verification_command → PASS (T5 테스트가 깨지지 않아야 함).
- [ ] **Step 5:** 조사 문서에 해외 매핑 표를 추가하고 커밋 `feat: overseas origins`.

---

### Task 7: Worker `/r` 공유 랜딩

```yaml
task_id: T7
owner: superpowers
allowed_files: [src/worker.ts, src/share.ts, tests/worker.test.ts]
forbidden_changes: [public/game/result.js, wrangler.jsonc]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md, public/game/result.d.ts]   # §6.5
expected_output: /r이 검증·칭호 재계산 후 OG 태그 HTML을 내고 잘못된 값은 302 /
verification_command: npx vitest run tests/worker.test.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — `parseShare`, `titleFor`, `TITLE_TEXT`, `Result`(T2), T1의 `Env`. Produces — `export const OG_VERSION = '1'`, `renderShare(r: Result, origin: string): string`(HTML), `handleShare(url: URL): Response`. `src/worker.ts`의 `fetch`는 `pathname==='/r'`이면 `handleShare`, 아니면 `env.ASSETS.fetch(request)`.

- [ ] **Step 1: 실패하는 테스트** (`tests/worker.test.ts`, `ASSETS`는 `{ fetch: async () => new Response('asset') }` 스텁):
  - `/r?c=4&m=0&f=0&t=28` → 200, `content-type`에 `text/html`, 본문에 `<meta property="og:title" content="잡은 4 · 놓친 0 · 오해 0">`, `og:description`에 `TITLE_TEXT.eagle`, `og:image`가 `https://example.test/og/eagle.png?v=1`
  - `/r?c=3&m=1&f=3&t=60` 본문의 `og:image`가 `/og/suspicious.png?v=1`
  - 클라이언트 칭호 조작 무시: `/r?c=4&m=0&f=0&t=28&title=sleepy` → 여전히 `eagle`
  - **Review Focus 1:** `c=abc`, 값 누락, `c=3&m=2&f=0&t=40`, `f=4`, `t=61`, `c=3.5` 각각 → 302, `Location`이 `/`
  - `/` 와 `/dex` → 스텁 `asset` 응답(자산으로 위임)
  - 본문에 `<meta http-equiv="refresh"` 없이 페이지 안 `나도 해보기` 링크(`/play`)가 있다
- [ ] **Step 2:** 실행 → FAIL. **Step 3:** `src/share.ts` 구현(HTML은 정수만 들어가므로 별도 이스케이프 불필요하나 `origin`은 `new URL(...).origin`에서 얻는다). 친구 결과 영역은 `TITLE_TEXT`와 숫자만 표시.
- [ ] **Step 4:** 같은 명령 → PASS, `npm run typecheck` 통과. **Step 5:** 커밋 `feat: share landing`.

---

### Task 8: 시트 자르기 도구

```yaml
task_id: T8
owner: superpowers
allowed_files: [scripts/lib/slice.mjs, scripts/slice-sheet.mjs, tests/slice.test.ts]
forbidden_changes: [public/px/**]
must_read: [docs/assets/image-prompts.md]
expected_output: 마젠타 배경을 투명 처리하고 3×3 칸을 (기본|행동)으로 나눠 192×192 webp로 저장
verification_command: npx vitest run tests/slice.test.ts
handoff_summary_required: true
```

**Interfaces:** Produces — `gridCells(width:number, height:number, cols:number, rows:number): {x:number;y:number;w:number;h:number}[]`(행 우선), `splitPair(cell): [Rect, Rect]`(좌·우 반), `keyMagenta(rgba: Uint8Array, tolerance?: number): Uint8Array`(`#FF00FF`에서 거리 ≤ tolerance(기본 60)인 픽셀의 알파를 0으로, 새 배열 반환), CLI `node scripts/slice-sheet.mjs <sheet.png> <pair|prop> <id,id,...> <outDir>`(pair → `<id>-0.webp`·`<id>-1.webp`, prop → `<id>.webp`, 모두 192×192 `fit:'contain'` 투명 배경).

- [ ] **Step 1: 실패하는 테스트** (`tests/slice.test.ts`): `gridCells(2400,1200,3,3)` 길이 9, 첫 칸 `{x:0,y:0,w:800,h:400}`, 마지막 칸 `{x:1600,y:800,w:800,h:400}`. `splitPair({x:0,y:0,w:800,h:400})` = `[{x:0,y:0,w:400,h:400},{x:400,y:0,w:400,h:400}]`. `keyMagenta`에 `[255,0,255,255, 250,10,250,255, 10,200,30,255]`을 넣으면 앞 두 픽셀 알파 0, 세 번째 알파 255. 합성 시트(sharp로 2400×1200 마젠타 바탕에 칸마다 단색 사각형 두 개)를 임시 폴더에 쓰고 CLI 실행 → 18개 파일 생성, 각 `sharp().metadata()`가 192×192, 알파 채널 있음, 모서리 픽셀 알파 0.
- [ ] **Step 2:** 실행 → FAIL. **Step 3:** 구현(`sharp` 사용, CLI는 id 개수가 9가 아니면 오류 종료).
- [ ] **Step 4:** 같은 명령 → PASS. **Step 5:** 커밋 `feat: sheet slicer`.

---

### Task 9: 임시 그림과 칭호 OG 이미지 생성

```yaml
task_id: T9
owner: superpowers
allowed_files: [scripts/make-placeholders.mjs, scripts/make-og.mjs, public/px/**, public/og/**, tests/placeholders.test.ts]
forbidden_changes: [public/data/**]
must_read: [public/data/cases.json, public/data/innocents.json, docs/assets/image-prompts.md]
expected_output: 모든 id의 두 포즈와 소품·배경·칭호 PNG 5장이 임시 그림으로 존재
verification_command: node scripts/make-placeholders.mjs && npx vitest run tests/placeholders.test.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — T5의 데이터. Produces — `public/px/<id>-0.webp`·`-1.webp`(playable 12 + innocents 15 = 27명, 192×192), `public/px/prop-*.webp`(프롬프트 문서 소품 9개 id), `public/px/classroom.webp`(1152×648), `public/og/{eagle,veteran,suspicious,rookie,sleepy}.png`(800×400). `scripts/make-og.mjs`는 칭호별로 `public/px`에 있는 이미지를 합성하고 제목 글자를 SVG로 그려 PNG를 만든다(제목 글꼴은 `Apple SD Gothic Neo`, 없으면 sans-serif). 행동 포즈는 기본 포즈와 색 대비·위치 이동·이름 글자로 구분되게 그린다.

- [ ] **Step 1: 실패하는 테스트** (`tests/placeholders.test.ts`): 두 데이터에서 id를 읽어 playable 12 + innocents 15 = 27개 모두 `-0.webp`·`-1.webp` 존재(합 54), 크기 192×192. 소품 9개·`classroom.webp`(1152×648) 존재. `public/og/<tier>.png` 5장이 800×400. 같은 id의 `-0`과 `-1` 픽셀 데이터가 서로 다름.
- [ ] **Step 2:** 스크립트가 아직 없으므로 `node scripts/make-placeholders.mjs` → 실패 확인.
- [ ] **Step 3:** 두 스크립트 구현.
- [ ] **Step 4:** verification_command → PASS. **Step 5:** 커밋 `feat: placeholder art`.

---

### Task 10: 공통 스타일과 홈

```yaml
task_id: T10
owner: superpowers
allowed_files: [public/site.css, public/index.html]
forbidden_changes: [public/game/**, src/**]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md]   # §6.4, §3 면책
expected_output: 소개 + 도감/게임 진입 + 면책 문구가 모바일 폭에서 가로 스크롤 없이 보임
verification_command: npx playwright test e2e/home.spec.ts
handoff_summary_required: true
```

**Interfaces:** Produces — 공통 클래스는 구현자가 정하되 `site.css`는 T11·T12가 같이 쓰므로 CSS 변수(`--bg --ink --accent --line`)와 `.btn`, `.card`, `.chip`, `.disclaimer`를 정의한다. 홈은 링크 `/dex`(텍스트 "도감 보기")와 `/play`(텍스트 "게임 시작")를 가진다. 면책 요소 `.disclaimer`의 문구는 spec §3 그대로.

- [ ] **Step 1: 실패하는 e2e** (`e2e/home.spec.ts`, 뷰포트 375×667): `/` 제목에 `치팅 파인더`, `도감 보기` 링크 `href`가 `/dex`, `게임 시작` 링크가 `/play`, `.disclaimer`가 보임, `document.documentElement.scrollWidth <= 375`.
- [ ] **Step 2:** `npx playwright test e2e/home.spec.ts` → FAIL. **Step 3:** 구현. **Step 4:** PASS. **Step 5:** 커밋 `feat: home page`.

---

### Task 11: 도감

```yaml
task_id: T11
owner: superpowers
allowed_files: [public/dex.html, public/dex.js, public/dex-logic.js, public/dex-logic.d.ts, public/game/storage.js, public/game/storage.d.ts, tests/dex.test.ts, e2e/dex.spec.ts]
forbidden_changes: [public/site.css, public/data/**]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md, public/data/cases.json]   # §6.3
expected_output: 필터 3축·상세·근거 라벨·발견 표시·미검증 코너가 동작, storage 실패에도 동작
verification_command: npx vitest run tests/dex.test.ts && npx playwright test e2e/dex.spec.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — `CaseEntry`(T3), `site.css`(T10). Produces — `filterCases(cases: CaseEntry[], f: { region:'all'|'kr'|'world'; group:'all'|CaseEntry['group']; status:'all'|CaseEntry['status'] }): CaseEntry[]`(`unverified`는 `status:'unverified'`일 때만 포함, 그 외 필터에서는 항상 제외; `region:'world'`는 해외 origin이 있는 사건, `kr`는 `KR` origin이 있는 사건), `safeStorage(): Storage | null`, `loadDiscovered(s: Storage | null): Set<string>`, `markDiscovered(s: Storage | null, id: string): void`(키 `cf:discovered`, JSON 배열).

- [ ] **Step 1: 실패하는 테스트** (`tests/dex.test.ts`): `filterCases` — 기본 필터(all/all/all)는 `unverified` 제외 전부, `status:'unverified'`는 미검증만, `region:'world'`는 해외 origin 사건만. `loadDiscovered(null)`은 빈 Set. 메모리 스텁 storage에 `markDiscovered(s,'peek')` 후 `loadDiscovered(s).has('peek')`. **Review Focus 4:** `getItem`/`setItem`이 예외를 던지는 스텁 → `loadDiscovered`는 빈 Set, `markDiscovered`는 예외 없음. 깨진 JSON(`'{x'`) → 빈 Set.
- [ ] **Step 2:** 실행 → FAIL.
- [ ] **Step 3:** `dex-logic.js`·`storage.js` 구현 후 `dex.html`·`dex.js`: 카드 격자, 필터 3개(`select` 또는 칩), 상세(개요·알아챈 단서·**의심 행동과 근거 라벨**(보도/지침/커뮤니티/업계, `basisNote` 있으면 함께)·감독 확인 방법·출처 링크·origins), `visibility:'low'` 카드에 "행동으로 알아채기 어려움" 표시, 미검증 코너(별도 접힘 영역, "확인되지 않은 소문" 안내), 진행도 `n / 12`, `#id`로 상세 열기.
- [ ] **Step 4:** e2e(`e2e/dex.spec.ts`, 375×667): 카드 수 = playable 12 + 도감 전용 6 = 18(미검증 제외), 필터 `world`에서 카드 수 감소, 카드 클릭 시 출처 링크 ≥1, `localStorage`를 `addInitScript`로 예외 던지게 해도 목록 렌더, 미검증 코너 열면 3건. verification_command → PASS.
- [ ] **Step 5:** 커밋 `feat: dex page`.

---

### Task 12: 게임 화면

```yaml
task_id: T12
owner: superpowers
allowed_files: [public/play.html, public/play.css, public/game/scene.js]
forbidden_changes: [public/game/engine.js, public/game/round.js, public/site.css]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md, public/game/engine.d.ts, public/game/round.d.ts]   # §6.2, §6.9
expected_output: 3×3 좌석·HUD·포즈 교체·탭 판정·사건/오해 팝업·종료까지 한 판이 돈다
verification_command: npx playwright test e2e/play.spec.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — `buildRound`, `seededRng`(T3), `createEngine`, `poseAt`, `tap`, `status`, `result`(T4), 데이터 JSON(T5), `markDiscovered`(T11). Produces — `scene.js`: `export function startGame(root: HTMLElement, opts: { cases; innocents; seed?: number; now?: () => number; onEnd: (r: Result) => void }): { stop(): void }`. `play.html`은 쿼리 `?seed=<정수>`가 있으면 `seededRng(seed)`로 판을 만든다(e2e 재현용). 화면에 항상 보이는 숫자: 남은 시간(초), 기회, `수상한 응시자 n명 중 k명 적발`.

- [ ] **Step 1: 실패하는 e2e** (`e2e/play.spec.ts`, 375×667, 테스트에서 `public/game/round.js`와 데이터로 같은 시드의 `buildRound`를 호출해 수법 좌석을 안다): `/play?seed=7` → 좌석 9개(`[data-seat]`), 각 좌석 높이·너비 ≥ 44px, HUD에 `수상한 응시자 `, 수법 좌석 탭 → 사건 팝업에 사건 이름과 라벨(예: `확인됨`), 닫으면 HUD의 적발 수 +1, 평범 좌석 탭 → `정상 행동`·`단일 행동만으로` 문구 팝업과 기회 -1, 기회 3번 소진 시 종료 화면 진입, 수법 전원 적발 시 종료. 사건 팝업 열릴 때 도감 "발견"이 저장됨(`localStorage` `cf:discovered`).
- [ ] **Step 2:** 실행 → FAIL.
- [ ] **Step 3:** 구현: `requestAnimationFrame`으로 `status`·`poseAt`을 매 프레임 읽어 `<img src="/px/<id>-<pose>.webp">`를 교체(좌석 안에 이름 글자 `alt`와 캡션 겸용), 약한 위아래 흔들림 CSS, 팝업은 `<dialog>` 대신 오버레이 `div`(키보드 포커스 이동·Esc 닫기), 이미지 `onerror` → 이름 카드(`.seat-fallback`)로 대체(T14가 검증). `?seed`가 없으면 `Math.random` 기반 시드.
- [ ] **Step 4:** PASS. **Step 5:** 커밋 `feat: play screen`.

---

### Task 13: 결과 화면과 자랑하기 (T12 이후 순차)

```yaml
task_id: T13
owner: superpowers            # T12와 play.html 겹침 → 반드시 T12 뒤
allowed_files: [public/game/share.js, public/game/share.d.ts, public/game/result-ui.js, public/play.html, public/play.css, tests/share-text.test.ts, e2e/share.spec.ts]
forbidden_changes: [public/game/engine.js, src/**]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md, public/game/result.d.ts]   # §6.5, §6.9
expected_output: 종료 시 칭호·숫자·자랑하기·다시하기·도감 링크, 공유 실패 시 링크 표시
verification_command: npx vitest run tests/share-text.test.ts && npx playwright test e2e/share.spec.ts
handoff_summary_required: true
```

**Interfaces:** Consumes — `Result`·`TITLE_TEXT`·`titleFor`·`shareQuery`(T2), `startGame`의 `onEnd`(T12). Produces — `shareUrl(origin: string, r: Result): string`(`<origin>/r?c=..&m=..&f=..&t=..`), `shareText(r: Result, url: string): string`(`치팅 파인더 — <칭호>! 잡은 c · 놓친 m · 오해 f\n<url>`), `showResult(root: HTMLElement, r: Result, deps: { share?: (d:{text:string})=>Promise<void>; clipboard?: { writeText(t:string): Promise<void> } }): void`.

- [ ] **Step 1: 실패하는 테스트** (`tests/share-text.test.ts`): `shareUrl('https://x.test',{c:4,m:0,f:0,t:28})` = `https://x.test/r?c=4&m=0&f=0&t=28`. `shareText`에 칭호 `TITLE_TEXT.eagle`·`잡은 4 · 놓친 0 · 오해 0`·URL이 포함되고 줄바꿈 뒤 마지막 줄이 URL. **e2e** (`e2e/share.spec.ts`, 375×667, `?seed=7`로 전원 적발): 종료 화면에 칭호 텍스트, `자랑하기`·`다시 하기`·`도감 보기` 버튼. `navigator.share`를 `addInitScript`로 제거한 상태에서 `자랑하기` → 클립보드 호출(권한 부여 후 `readText`가 `/r?c=`를 포함). `navigator.share`와 `clipboard.writeText` 둘 다 거부 → 화면에 선택 가능한 링크 입력창이 나타남(Review Focus: 공유 실패 처리).
- [ ] **Step 2:** 실행 → FAIL. **Step 3:** 구현(`play.html`의 `onEnd` 연결, 결과 안에 면책·도감 링크). **Step 4:** PASS. **Step 5:** 커밋 `feat: result and share`.

---

### Task 14: 이미지 실패·e2e 보강

```yaml
task_id: T14
owner: superpowers
allowed_files: [e2e/play-resilience.spec.ts, public/game/scene.js, public/play.css]
forbidden_changes: [public/game/engine.js, public/game/round.js]
must_read: [public/game/scene.js]
expected_output: 응시자 이미지 404여도 이름 카드로 한 판이 끝까지 진행
verification_command: npx playwright test e2e/play-resilience.spec.ts
handoff_summary_required: true
```

- [ ] **Step 1: 실패하는 e2e** (**Review Focus 5**): `page.route('**/px/*.webp', r => r.abort())` 후 `/play?seed=7` → 좌석 9개 모두 `.seat-fallback`에 응시자 이름 글자가 보임, 수법 좌석 탭 → 사건 팝업 정상, 전원 적발로 종료 화면까지 진행. 별도 케이스: 탭 비활성 모사 — `page.clock`으로 시간을 45초 앞당긴 뒤 HUD 남은 시간이 15초 근처(≤16, ≥14)이고 좌석이 9개 유지.
- [ ] **Step 2:** 실행 → FAIL이면 구현, 이미 통과하면 테스트가 실제로 abort를 걸었는지(`.seat-fallback` 개수 9) 단정으로 확인. **Step 3:** 필요한 수정. **Step 4:** PASS. **Step 5:** 커밋 `test: resilience e2e`.

---

### Task 15: README와 CLAUDE.md

```yaml
task_id: T15
owner: superpowers
allowed_files: [README.md, CLAUDE.md]
forbidden_changes: [docs/**]
must_read: [package.json, docs/superpowers/specs/2026-11-17-catchcheating-design.md]
expected_output: 명령·레이아웃·콘텐츠 규칙(금지어·근거 라벨)·에셋 교체·배포 게이트가 기록됨
verification_command: grep -c "npm test" CLAUDE.md
handoff_summary_required: true
```

- [ ] **Step 1:** 작성 — 허브 CLAUDE.md 형식(명령 표, 레이아웃, 콘텐츠 규칙). 반드시 포함: 명령 4종, 에셋 교체 절차(`slice-sheet.mjs` → `make-placeholders` 대신 실제 파일 유지 → `make-og.mjs`), **"에셋 교체 전 공개 배포 금지"**, 안티목표 4줄.
- [ ] **Step 2:** verification_command가 1 이상 출력. **Step 3:** 커밋 `docs: readme and claude.md`.

---

### Task 16: 실제 에셋 교체 (게이트: 사용자가 시트 5장을 `images/`에 올린 뒤)

```yaml
task_id: T16
owner: main-session            # 파일 덮어쓰기, 사람 확인 필요
allowed_files: [public/px/**, public/og/**]
forbidden_changes: [public/data/**, src/**]
must_read: [docs/assets/image-prompts.md]
expected_output: 임시 그림이 실제 에셋으로 교체되고 점검 항목(§8)을 통과
verification_command: npx vitest run tests/placeholders.test.ts
handoff_summary_required: true
```

- [ ] **Step 1:** `images/catch_수법시트1.png`·`catch_시트2.png`·`catch_시트3.png`·`catch_소품시트.png`·`catch_시험장.png` 존재 확인(없으면 여기서 멈추고 사용자에게 알림).
- [ ] **Step 2:** 시트별 `node scripts/slice-sheet.mjs images/<시트>.png pair <9개 id> /tmp/cf-slice`(소품은 `prop`) 실행 후 `Read`로 결과 이미지를 열어 프롬프트 문서 §8(같은 인물·머리 높이·배경·단서 크기·평범 시트 장비 혼입)을 확인. 실패 칸은 사용자에게 재생성 요청.
- [ ] **Step 3:** 통과한 파일을 `public/px/`로 복사, 배경은 1152×648 webp로 변환해 `classroom.webp` 교체. `node scripts/make-og.mjs`로 `public/og/*.png` 재생성 후 5장을 눈으로 확인.
- [ ] **Step 4:** verification_command → PASS(치수·존재). `npm test`·`npx playwright test` 전체 → PASS. **Step 5:** 사용자에게 `/play` 화면 확인을 요청하고 승인 뒤 커밋 `feat: real art assets`.

---

### Task 17: 배포 (게이트: T16 완료 + 사용자 승인, 항목마다 확인)

```yaml
task_id: T17
owner: main-session            # 외부 공개·배포 — 병렬 subagent 금지
allowed_files: [wrangler.jsonc]
forbidden_changes: [public/**, src/**]
must_read: [docs/superpowers/specs/2026-11-17-catchcheating-design.md]   # §6.8
expected_output: workers.dev(또는 서브도메인)에서 /, /dex, /play, /r 가 응답하고 OG 태그가 맞음
verification_command: curl -s "https://<배포주소>/r?c=3&m=1&f=0&t=40" | grep -c 'og:image'
handoff_summary_required: true
```

- [ ] **Step 1:** 사용자에게 확인: GitHub 저장소 `Kim-Taesu/game-catchcheating` 생성(공개 여부 포함) → 승인 시 `gh repo create`·push.
- [ ] **Step 2:** 사용자에게 확인: `wrangler deploy`(`workers_dev` 켜기). 배포 후 verification_command가 1 이상, `/`·`/dex`·`/play` 200, `/r?c=9&m=9&f=9&t=99` 302 확인. 배포 결과는 `gh`가 아니라 wrangler 출력과 curl 응답으로 판정한다.
- [ ] **Step 3:** 서브도메인 `cheatfinder.ktslab.xyz` 연결 가능 여부를 확인하고 사용자에게 결과를 알린다(대시보드 작업이면 안내만). 허브 `games.json` 카드·썸네일은 별도 PR이며 이 단계에서는 사용자 승인 뒤에만 만든다.
- [ ] **Step 4:** 문제 시 롤백: `npx wrangler rollback`(또는 직전 커밋 재배포)을 사용자에게 제안.

---

## Self-Review 결과

- **Spec 범위 점검**: §6.1 데이터(T5·T6), §6.2 규칙·칭호·최적 전략(T2·T3·T4), §6.3 도감(T11), §6.4 라우트(T7·T10~T13), §6.5 공유(T2·T7·T13), §6.6 구조(File Structure), §6.7 에셋(T8·T9·T16), §6.8 배포·롤백(T17), §6.9 실패 처리(T11·T13·T14), §7 검증(각 태스크). 빈 항목 없음. 해외 사례 조사(§8)는 T6, 지침 원문 URL 확인은 T5 Step 3.
- **타입 일관성**: `Result`/`Tier`/`titleFor`는 T2 정의를 T4·T7·T13이 그대로 사용. `RoundPlan`/`SeatPlan`/`ACTION_MS`는 T3 정의를 T4·T12가 사용. `startGame`의 `onEnd`는 T12→T13.
- **파일 겹침**: `play.html`·`play.css`·`scene.js`는 T12와 T13/T14가 겹치므로 T12 → T13 → T14 순차 필수. `cases.json`은 T5 → T6 순차. 그 외 태스크는 파일이 겹치지 않아 병렬 가능(T2·T3·T8 / T7 / T10 은 서로 독립, T4는 T3 뒤, T9·T11은 T5 뒤).
- **게이트**: T1·T5·T6·T16·T17은 `main-session`(의존성 설치, 콘텐츠 정책, 덮어쓰기, 배포). 나머지는 읽기·생성형이라 subagent 가능. 배포·GitHub 생성·허브 PR은 T17에서만, 항목마다 사용자 확인.
- **검증 명령 사전 실행**: `vitest run`(파일 지정 포함 형태), `tsc --noEmit`(`skipLibCheck` 필요), `wrangler dev`+curl(정적 파일·`/r` 라우팅), `sharp`(webp/png), `playwright`(시스템 Chrome, 번들 브라우저 없이)를 임시 폴더에서 실행해 확인. T7~T16의 개별 테스트는 구현 전이라 첫 실행은 FAIL이 정상이며, 각 태스크 Step 2가 그 FAIL을 확인한다.
