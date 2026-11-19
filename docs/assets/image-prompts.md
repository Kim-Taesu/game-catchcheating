# 이미지 생성 프롬프트 (도트풍 에셋) — v5: 부드러운 고해상도 도트, 칸마다 포즈 2개, 시트4(새 수법 3종) 추가

기준 품질: subwayrun의 `public/px`·`public/avatars` (윤곽선·명암이 있는 도트풍 일러스트, 캐릭터 64~96px 표시).
원본은 `images/`에 둔다 (git 제외). 자르기는 `scripts/slice-sheet.mjs`가 한다 (명령은 §10).

수법·사건의 근거는 [docs/research/cheating-methods.md](../research/cheating-methods.md)의 id와 "행동 단서 근거" 절을 따른다.
모든 그림은 만화적인 일러스트이며 장비의 작동 방식·제작법은 담지 않는다. 눈에 띄는 **외형·행동 단서**만 그린다.

## 0. 이번 버전에서 바뀐 것

**v4 → v5 (2026-11-19, 게임 출전 12종 → 15종)**
- **새 시트: 시트4** (§4-2, `images/catch_시트4.png`). 도감 전용이던 신발 속 통신기기·가발 속 카메라·가슴 카메라를 게임에 넣기 위한 응시자 3명, 이들과 헷갈리는 평범한 응시자 2명(연필 줍기·머리 넘기기), 그리고 §8-2에서 다시 그리면 좋다고 한 4칸.
- 판당 부정행위자가 3~4명에서 **5~8명**으로 늘었다. 평범한 응시자는 판마다 1~4명.

**v3 → v4 (2026-11-19, 실제 시트 5장 반영 후)**
- **새 시트: 소품시트2** (§5-2, `images/catch_소품시트2.png`). 도감에 추가된 사건 9건(신발·가발·지우개 속 기기, 문자, 인터넷 질문, 쪽지, 화장실, 사전 유출 등)의 아이콘. 지금은 이어폰·쪽지 아이콘을 여러 사건이 같이 쓰고 있다.
- 소품 시트용 **스타일 블록을 따로** 둔다(§5-0). 응시자용 블록을 고쳐 쓰지 않아도 된다.
- 1차 생성에서 소품 `prop-cheat-note` 왼쪽 끝에 이웃 칸의 선이 잘려 들어왔다 → 소품은 **칸 가운데, 사방 15% 여백**으로 바꿨다.
- 다시 만들면 좋은 칸 목록을 §8-2에 적었다(선택).

**v2 → v3 (2026-11-19, 로컬 확인 후 "딱딱 끊기지 않고 자연스럽고 부드럽게")**
- 화풍: 각진 16-bit 도트(검은 1px 윤곽선, 선명한 픽셀) → **부드러운 고해상도 도트**(hi-bit, 부드러운 명암·그라데이션, 색 있는 윤곽선, 부드러운 조명).
- 두 포즈는 **한 동작의 앞뒤**처럼 그린다. 몸의 위치는 그대로, 머리·눈·한쪽 팔만 움직인다. 게임은 두 그림을 0.25초 동안 서서히 겹쳐 바꾸므로(크로스페이드), 몸 위치가 다르면 인물이 흔들려 보인다.
- 게임 표시 크기로 줄일 때는 부드러운 축소(lanczos)를 쓴다(자르기 도구가 처리).

**v1 → v2**

- 단서는 **행동**이다. 그래서 한 응시자를 **두 포즈**(기본 / 행동)로 그린다. 게임에서 5초쯤 간격으로 행동 포즈로 바뀌었다 돌아온다.
- 게임에 나오는 수법은 근거가 확인된 **12종**(v5에서 15종). 나머지 도감 전용(v2 때 6종, v4에서 15종, v5에서 12종)은 응시자 이미지가 필요 없고 **소품 시트**만 쓴다.
- 평범한 응시자는 **15명**으로 늘렸다 (한 판에 5~6명이 나오므로 반복되는 얼굴을 줄이기 위해).

## 1. 공통 규칙

| 항목 | 값 |
| --- | --- |
| 시트 크기 | **가로 2:1** 직사각형, 가능하면 2400×1200 이상 |
| 시트 구성 | **3×3 격자**. 칸은 가로로 긴 2:1 직사각형 9개, 크기 동일 |
| 칸 안 구성 | **같은 인물을 두 번**: 왼쪽 = 기본 포즈(IDLE), 오른쪽 = 행동 포즈(ACTION). 옷·머리·얼굴·책상·소품 모두 같고 포즈만 다름 |
| 포즈 관계 | 행동 포즈는 기본 포즈에서 **이어지는 작은 동작**. 몸·어깨·책상 위치는 그대로, 머리·눈·한쪽 팔만 움직임 (게임이 두 그림을 서서히 겹쳐 바꾸기 때문) |
| 화풍 | 부드러운 고해상도 도트(hi-bit). 부드러운 명암·그라데이션, 색 있는 윤곽선. 각진 16-bit·검은 1px 윤곽선은 피한다 |
| 배경 | 전체가 **단색 마젠타 #FF00FF** (그림자·그라데이션·바닥 없음). 옷·소품에 마젠타·보라 계열 금지 |
| 시점 | 정면, 책상에 앉은 **상반신 + 책상 윗면**. 두 포즈 모두 같은 배율·같은 위치(머리와 책상 높이가 일치) |
| 여백 | 각 포즈 사방 8% 이상 여백, 칸 밖으로 안 넘침 |
| 금지 | 칸 사이 선·테두리·글자·번호·화살표·동그라미·워터마크 |
| 단서 | 처음엔 잘 안 보이지만 자세히 보면 찾을 수 있는 크기 |

### 공통 스타일 블록 (모든 프롬프트 맨 앞에 붙인다)

```
High-resolution pixel art game sprite sheet (hi-bit pixel art), soft cel shading with
gentle gradients, colored anti-aliased outlines instead of hard black lines, soft warm
lighting, smooth natural look, slightly chibi proportions (big head, small body), cheerful and
friendly mood, Korean exam takers (teens to adults, varied hair, skin tones, genders),
each character seated at a school desk seen from the front, upper body plus desk top
visible, a white exam paper and pencil on every desk. The sheet is a strict 3x3 grid of
equal wide cells (each cell twice as wide as tall). Every cell contains the SAME character
drawn twice side by side: LEFT = idle pose, RIGHT = action pose; identical face, hair,
clothes, desk and props in both, same scale and same vertical position. The action pose
is a small, natural continuation of the idle pose, like the next frame of one smooth
motion: the body, shoulders and desk stay exactly in place; only the head, the eyes or
one arm moves. Flat solid magenta (#FF00FF) background everywhere, no floor, no shadows on the
background, no grid lines, no borders, no text, no letters, no numbers, no arrows, no
watermark, no UI. Clean edges, no blur, no noise.
```

## 2. 시트 1 — 수법 응시자 (파일: `images/catch_수법시트1.png`)

칸 순서는 왼쪽→오른쪽, 위→아래. 각 칸 프롬프트를 공통 스타일 블록 뒤에 이어 붙인다. 근거 표시: 보도 / 지침 / 커뮤니티 / 업계 설명.

| 칸 | id | 기본(IDLE) | 행동(ACTION) | 근거 |
| --- | --- | --- | --- | --- |
| 1 | `smart-glasses-frame` | wearing thick black-framed smart glasses with a tiny red LED dot on the right temple arm, calm, looking at the exam paper | one hand touching the glasses frame at the temple, eyes glancing up to the upper right | 보도(안경테 반복 만짐) + 업계 설명(우측 상단 시선) |
| 2 | `glasses-lens-heat` | wearing very thick horn-rimmed glasses and a cap pulled low, reading the paper normally | holding the exam paper unnaturally close to the face, a faint sweat drop | 보도(대만) |
| 3 | `earpiece-hidden` | wearing a knit beanie pulled over both ears, a tiny edge of a white earbud barely visible, eyes on the paper | lips moving slightly as if murmuring to themselves, eyes unfocused looking at nothing, head still | 보도(모자·귀마개로 가림, 2017) + 업계 설명(중얼거림) |
| 4 | `bone-conduction` | wearing a thin black sports band behind the neck and ears, no earbuds in the ears, reading | lips slightly moving as if murmuring, one hand touching the sports band at the back of the neck | 업계 설명 |
| 5 | `smartwatch` | ordinary-looking digital wristwatch on the left wrist, writing on the paper | left wrist raised to eye level, looking at the watch screen with a faint glow | 업계 설명 |
| 6 | `phone-in-clothes` | wearing a loose hoodie with a flat rectangular bulge at the chest, nervous, writing | hand pressing the chest bulge, head bowed looking down into the collar | 보도(수법) · 행동은 연출 |
| 7 | `glasses-swap` | wearing plain thin glasses, writing normally | wearing a different pair of thick-framed glasses with a tiny LED, the plain pair resting on the desk next to the pencil | 보도(LEET, 내신) |
| 8 | `earbud-swallow` | nervous face, looking at the paper, lips pressed | one hand over the mouth, cheeks puffed, wide panicked eyes, as if swallowing something | 보도(이탈리아) |
| 9 | `ear-bandage` | wearing a cap and a white bandage taped over one ear, writing | touching the bandage with one hand while glancing toward the front of the room | 보도(시리아인 2017, 외형 가림) |

## 3. 시트 2 — 수법 응시자 3명 + 평범한 응시자 6명 (파일: `images/catch_시트2.png`)

| 칸 | id | 기본(IDLE) | 행동(ACTION) | 근거 |
| --- | --- | --- | --- | --- |
| 1 | `signal-fingers` | writing normally, one hand low by the desk edge | one hand held low beside the desk edge showing a few fingers like a number, glancing sideways | 커뮤니티(신호 교환) |
| 2 | `peek` | writing normally | head turned sharply to the side staring at a neighbor's desk | 커뮤니티 |
| 3 | `cheat-sheet-sleeve` | writing normally, shirt cuffs neat | cuff slightly rolled, a tiny folded paper note tucked inside, eyes glancing down at the cuff | 지침(소매 확인) + 커뮤니티(쉬는 시간마다 쪽지) |
| 4 | `think-chin` | looking at the paper | resting the chin on one hand, thinking hard (held pose) | 평범 |
| 5 | `look-up` | looking at the paper | eyes looking up at the ceiling, pencil tapping the lip | 평범 |
| 6 | `plain-glasses` | wearing ordinary thin round glasses, no lights, writing | pushing the glasses up at the bridge of the nose with one finger | 평범 |
| 7 | `yawn` | writing | big sleepy yawn, one eye shut, head slightly tilted | 평범 |
| 8 | `pencil-spin` | holding the pencil normally | spinning the pencil between the fingers, relaxed | 평범 |
| 9 | `rub-eyes` | looking at the paper | rubbing both eyes with the knuckles, tired | 평범 |

## 4. 시트 3 — 평범한 응시자 9명 (파일: `images/catch_시트3.png`)

장비 단서(표시등·이어폰·특이한 안경·붕대 등)가 없어야 한다.

| 칸 | id | 기본(IDLE) | 행동(ACTION) |
| --- | --- | --- | --- |
| 1 | `analog-watch` | writing, an ordinary analog wristwatch on the left wrist | glancing at the analog wristwatch, checking the time |
| 2 | `plain-calculator` | an ordinary simple calculator on the desk, plain back, no lens, looking at the paper | pressing keys on the calculator, honest focused face |
| 3 | `sneeze` | writing | sneezing into a tissue held in front of the nose and mouth |
| 4 | `drink-water` | writing, a plain clear water bottle with a plain label on the desk | drinking from the water bottle |
| 5 | `scratch-head` | writing | scratching the back of the head, puzzled |
| 6 | `stretch` | writing | stretching both arms up, body stays in place |
| 7 | `erase` | writing | erasing something on the paper with an eraser, brushing crumbs off |
| 8 | `turn-back` | writing | turning the head back toward the clock on the wall at the back of the room (not toward neighbors) |
| 9 | `nose-sniff` | writing | rubbing the nose and sniffling, a cold |

## 4-2. 시트 4 — 새 수법 3명 + 새 평범 2명 + 다시 그리기 4명 (파일: `images/catch_시트4.png`, 완료)

반영: 1~5번 전부, 다시 그리기는 7·8·9번만 교체. 6번 `ear-bandage`는 기존 그림을 유지했다.

공통 스타일 블록(§1) 뒤에 아래 칸 설명을 붙인다. 6~9번은 기존 칸을 **다시 그린 것**이다. 기존보다 나을 때만 교체하고, 아니면 버린다(자를 때 임시 디렉터리로 먼저 낸다).

| 칸 | id | 기본(IDLE) | 행동(ACTION) | 근거 |
| --- | --- | --- | --- | --- |
| 1 | `shoe-device` | a tiny white earbud barely visible deep in one ear, nervous face, writing | head tilted down glancing under the desk toward the feet, one arm reaching down below the desk edge | 보도(인도 2021: 수상한 행동, 귀 속 이어폰, 신발 속 기기) · 발 쪽을 보는 포즈는 연출 |
| 2 | `wig-device` | wearing an unnaturally thick, slightly crooked brown wig covering both ears, tense face, writing | one hand pressing the wig down over one ear, eyes darting nervously to the side | 보도(스페인 2023: 티 나는 가발, 초조한 행동) · 가발을 누르는 포즈는 연출 |
| 3 | `camera-ai-watch` | a tiny round pin camera like a shirt button on the chest pocket, a black smartwatch on the left wrist, writing | shoulders hunched and chest leaned slightly forward so the shirt pocket is close over the exam paper, eyes down (a small lean only, desk and arms stay in place) | 보도(스페인 2025: 가슴을 화면 가까이 붙임) |
| 4 | `pick-up-pencil` (평범) | writing, an empty desk spot where the pencil was | head tilted down, one arm reaching below the desk edge, a yellow pencil visible in the fingers | 평범 (신발 속 기기와 헷갈리는 짝) |
| 5 | `fix-hair` (평범) | long natural hair, a strand falling over the face, writing | one hand tucking the strand of hair behind the ear, calm face, eyes on the paper | 평범 (가발과 헷갈리는 짝) |
| 6 | `ear-bandage` (다시) | wearing a cap and a white bandage taped over one ear, writing | touching the bandage with one hand while glancing toward the front of the room; body and shoulders stay exactly in place, only the head turns and one hand rises | 보도 |
| 7 | `earbud-swallow` (다시) | nervous face, looking at the paper, lips pressed | one hand over the mouth, cheeks puffed, wide panicked eyes, as if swallowing something; same body size and position as the idle pose | 보도 |
| 8 | `earpiece-hidden` (다시) | wearing a knit beanie pulled over both ears, a tiny edge of a white earbud barely visible, eyes on the paper | lips clearly moving with a tiny murmur mark, eyes drifting to the side, head still | 보도 + 업계 설명 |
| 9 | `turn-back` (다시, 평범) | writing | head turned back over the shoulder toward the back wall, chin up, clearly looking behind, not sideways | 평범 |

붙여 넣을 칸 설명 (공통 스타일 블록 뒤에):

```
Cell 1: IDLE a nervous examinee with a tiny white earbud barely visible deep in one ear,
writing. ACTION head tilted down glancing under the desk toward the feet, one arm
reaching down below the desk edge.
Cell 2: IDLE an examinee wearing an unnaturally thick, slightly crooked brown wig covering
both ears, tense face, writing. ACTION one hand pressing the wig down over one ear, eyes
darting nervously to the side.
Cell 3: IDLE an examinee with a tiny round pin camera like a shirt button on the chest
pocket and a black smartwatch on the left wrist, writing. ACTION shoulders hunched and
chest leaned slightly forward so the shirt pocket is close over the exam paper, eyes
down; a small lean only, desk and arms stay in place.
Cell 4: IDLE an ordinary examinee writing. ACTION head tilted down, one arm reaching below
the desk edge, a yellow pencil visible in the fingers, picking up a dropped pencil.
Cell 5: IDLE an ordinary examinee with long natural hair, a strand falling over the face,
writing. ACTION one hand tucking the strand behind the ear, calm face, eyes on the paper.
Cell 6: IDLE an examinee wearing a cap and a white bandage taped over one ear, writing.
ACTION touching the bandage with one hand while glancing toward the front of the room;
body and shoulders stay exactly in place, only the head turns and one hand rises.
Cell 7: IDLE a nervous examinee looking at the paper, lips pressed. ACTION one hand over
the mouth, cheeks puffed, wide panicked eyes, as if swallowing something; same body size
and position as the idle pose.
Cell 8: IDLE an examinee wearing a knit beanie pulled over both ears, a tiny edge of a
white earbud barely visible, eyes on the paper. ACTION lips clearly moving with a tiny
murmur mark, eyes drifting to the side, head still.
Cell 9: IDLE an ordinary examinee writing. ACTION head turned back over the shoulder
toward the back wall, chin up, clearly looking behind, not sideways.
```

평범한 응시자 4·5번에는 이어폰·표시등·특이한 가발이 없어야 한다. 6~9번은 기존 인물과 얼굴이 달라도 된다(칸 안의 두 포즈만 같으면 된다).

## 5. 소품 시트 (사람 없음, 정사각형)

### 5-0. 소품 스타일 블록 (소품시트·소품시트2 프롬프트 맨 앞에 붙인다)

```
High-resolution pixel art game icon sheet (hi-bit pixel art), soft cel shading with
gentle gradients, colored anti-aliased outlines instead of hard black lines, soft warm
lighting, smooth natural look, cheerful and friendly mood. The sheet is a SQUARE image
divided into a strict 3x3 grid of equal square cells. Each cell contains exactly ONE
object icon, centered, three-quarter view, filling about 65% of the cell, with at least
15% empty margin on every side so nothing touches or crosses the cell edges. No people,
no hands, no faces (unless the cell says so). Flat solid magenta (#FF00FF) background
everywhere, no floor, no cast shadows on the background, no grid lines, no borders, no
text, no readable letters or numbers, no arrows, no watermark, no UI. Clean edges, no blur,
no noise. Objects must not use magenta or purple colors.
```

칸 순서는 왼쪽→오른쪽, 위→아래. 블록 뒤에 `Cell 1: …, Cell 2: …` 식으로 칸 설명을 이어 붙인다.

### 5-1. 소품시트 1 (파일: `images/catch_소품시트.png`, 완료)

사건 카드 팝업·도감 아이콘용.

| 칸 | id | 그릴 것 | 쓰임 |
| --- | --- | --- | --- |
| 1 | `prop-smart-glasses` | black smart glasses, tiny red dot on one temple | 스마트안경 |
| 2 | `prop-earbud` | a tiny white wireless earbud | 이어폰 계열 |
| 3 | `prop-button-camera` | a shirt button with a tiny dark lens and blue glint | 단추 카메라 (도감 전용) |
| 4 | `prop-calculator-back` | the back of a plain calculator with a tiny round lens | 개조 계산기 (도감 전용) |
| 5 | `prop-id-card` | an ID card whose photo does not match a small face drawn beside it | 위조 신분증 (도감 전용) |
| 6 | `prop-bone-band` | a thin sports neckband with two small pads | 뼈 전도 |
| 7 | `prop-smartwatch` | a digital wristwatch with a faint glowing screen | 스마트워치 |
| 8 | `prop-cheat-note` | a tiny folded paper note covered with handwriting | 소매 쪽지, 팔뚝 필기 (도감 전용) |
| 9 | `prop-phone-glow` | a smartphone glowing inside a half-open bag | 가방 속 폰 (도감 전용) |

### 5-2. 소품시트 2 (파일: `images/catch_소품시트2.png`, 완료)

도감에 추가된 사건 9건용. 장비는 **겉모습만** 그린다(내부 구조·배선·조립 방법 없음). 화면에는 읽을 수 있는 글자 대신 빛나는 줄·점만 그린다.

| 칸 | id | 그릴 것 (프롬프트에 그대로) | 쓰임 (사건 id) |
| --- | --- | --- | --- |
| 1 | `prop-bt-slipper` | a plain rubber flip-flop slipper seen from the side, its thick sole slightly split open with a tiny black box and a small blinking blue light peeking out | 신발 속 통신기기 (`shoe-device`) |
| 2 | `prop-wig` | a slightly messy dark-brown short wig on a simple round wig stand (no face), a tiny black camera lens peeking out of the hair near the ear area | 가발 속 카메라·이어폰 (`wig-device`) |
| 3 | `prop-camera-watch` | a black smartwatch with a glowing screen showing short abstract lines, next to a tiny round pin camera the size of a shirt button | 카메라→AI→스마트워치 (`camera-ai-watch`) |
| 4 | `prop-eraser-screen` | a white rubber eraser with a tiny glowing rectangular screen set into its top, lying on a neatly folded silk scarf | 지우개·스카프 속 수신 화면 (`eraser-receiver`) |
| 5 | `prop-flip-phone` | an old 2000s silver flip phone, open, its small screen glowing with a row of dot symbols (no readable numbers) | 문자로 답 돌리기 (`sms-relay`) |
| 6 | `prop-qa-phone` | a smartphone half tucked into a jacket sleeve cuff, its screen showing a question-and-answer chat layout with two speech bubbles (no readable text) | 시험 중 인터넷에 문제 올리기 (`online-ask`) |
| 7 | `prop-paper-plane` | a folded paper airplane and two crumpled paper notes resting on a white window sill | 벽 타고 쪽지 건네기 (`outside-help`) |
| 8 | `prop-restroom-note` | a small folded paper note and a smartphone tucked behind a white bathroom radiator pipe, light blue tiles behind | 쉬는 시간 화장실 답 전달 (`restroom-relay`) |
| 9 | `prop-exam-envelope` | a brown exam-paper envelope torn open at the top, white test sheets sliding out, a broken red wax seal | 시험지·답안 사전 유출 (`insider-leak`) |

붙여 넣을 칸 설명 (5-0 블록 뒤에):

```
Cell 1: a plain rubber flip-flop slipper seen from the side, its thick sole slightly
split open with a tiny black box and a small blinking blue light peeking out.
Cell 2: a slightly messy dark-brown short wig on a simple round wig stand with no face,
a tiny black camera lens peeking out of the hair near the ear area.
Cell 3: a black smartwatch with a glowing screen showing short abstract lines, next to a
tiny round pin camera the size of a shirt button.
Cell 4: a white rubber eraser with a tiny glowing rectangular screen set into its top,
lying on a neatly folded silk scarf.
Cell 5: an old 2000s silver flip phone, open, its small screen glowing with a row of dot
symbols, no readable numbers.
Cell 6: a smartphone half tucked into a jacket sleeve cuff, its screen showing a
question-and-answer chat layout with two speech bubbles, no readable text.
Cell 7: a folded paper airplane and two crumpled paper notes resting on a white window sill.
Cell 8: a small folded paper note and a smartphone tucked behind a white bathroom radiator
pipe, light blue tiles behind.
Cell 9: a brown exam-paper envelope torn open at the top, white test sheets sliding out,
a broken red wax seal.
```

## 6. 배경 — 시험장 (파일: `images/catch_시험장.png`)

가로 16:9 (1152×648 이상). 응시자·책상은 그리지 않는다 (코드로 3×3 자리에 올린다).

```
High-resolution pixel art game background (hi-bit pixel art), soft shading with gentle
gradients, colored outlines, soft warm daylight.
A bright Korean school exam classroom seen from the front: a green blackboard with
a plain wall clock on the upper wall, white wall with a small notice board, warm
wooden floor with subtle tile lines, large windows letting in soft daylight on the
side. The central lower 60% of the image is an empty open floor with no furniture,
no desks, no people. No text, no letters, no numbers, no watermark.
```

## 7. 나중에 (이번 요청에는 불필요)

- 허브 카드 썸네일 (subwayrun_허브썸네일 방식)
- 칭호별 결과 일러스트 5장 (공유 이미지용). 에셋이 오면 같은 응시자 이미지를 조합해서 만든다

## 8. 생성 후 점검 (사람이 보고 판단)

- 격자가 균등한가, 칸마다 **같은 인물이 두 번**(왼쪽 기본·오른쪽 행동) 나오는가. 얼굴이 달라지면 그 시트를 재생성하거나 해당 칸만 다시 생성
- 두 포즈의 몸·어깨·책상 위치가 같고 머리·눈·한쪽 팔만 다른가 (게임이 0.25초 동안 겹쳐 바꾸므로, 몸이 움직이면 인물이 흔들려 보인다)
- 배경이 완전한 마젠타 단색인가
- 단서가 **보이긴 하지만 한눈에 티 나지는 않는가**
- 평범 응시자에게 장비·표시등·이어폰·붕대가 섞이지 않았는가
- 글자·번호·화살표·워터마크가 없는가
- (소품) 물건이 칸 가운데 있고 이웃 칸의 선·조각이 잘려 들어오지 않았는가. 장비 내부 구조나 조립 모습이 그려지지 않았는가

### 8-2. 1차 생성 점검 결과 (선택 재생성)

필수는 아니다. 다시 만들 경우 그 칸만 같은 프롬프트로 생성해 같은 크기로 원본 시트에 덮어쓴다.

| 칸 | 문제 | 고칠 점 (행동 칸에 덧붙이기) |
| --- | --- | --- |
| 시트1 9 `ear-bandage` | 행동 포즈에서 상체가 기울어 겹칠 때 살짝 흔들림 | "body and shoulders stay exactly in place, only the head turns and one hand rises" |
| 시트1 8 `earbud-swallow` | 행동 포즈에서 몸이 약간 커짐 | "same body size and position as the idle pose" |
| 시트3 8 `turn-back` | 곁눈질(`peek`)과 고개 방향이 비슷함 | "head turned back over the shoulder toward the back wall, chin up, clearly looking behind, not sideways" |
| 시트1 3 `earpiece-hidden` | 행동이 입만 벌려 작게 보임 | "lips clearly moving with a tiny murmur mark, eyes drifting to the side" |
| 소품 8 `prop-cheat-note` | 왼쪽 끝에 이웃 칸 선 | 5-0 블록으로 다시 생성 |

## 9. 개수 요약

| 시트 | 칸 | 이미지 |
| --- | --- | --- |
| 수법시트1 | 9 | 18프레임 |
| 시트2 | 3 수법 + 6 평범 | 18프레임 |
| 시트3 | 9 평범 | 18프레임 |
| 소품시트 | 9 | 9 (완료) |
| 소품시트2 | 9 | 9 (완료) |
| 시트4 | 3 수법 + 2 평범 + 4 다시 | 18프레임 (완료, 6번은 미채택) |
| 시험장 | 1 | 1 |
| 합계 | 시트 7장 | 응시자 64프레임(+다시 그린 8) + 소품 18 + 배경 1 |

## 10. 자르기 명령 (`images/`에 넣은 뒤)

임시 디렉터리에 먼저 자르고 §8로 점검한 뒤 `public/px/`로 복사한다.

```
node scripts/slice-sheet.mjs images/catch_수법시트1.png pair smart-glasses-frame,glasses-lens-heat,earpiece-hidden,bone-conduction,smartwatch,phone-in-clothes,glasses-swap,earbud-swallow,ear-bandage <임시>
node scripts/slice-sheet.mjs images/catch_시트2.png pair signal-fingers,peek,cheat-sheet-sleeve,think-chin,look-up,plain-glasses,yawn,pencil-spin,rub-eyes <임시>
node scripts/slice-sheet.mjs images/catch_시트3.png pair analog-watch,plain-calculator,sneeze,drink-water,scratch-head,stretch,erase,turn-back,nose-sniff <임시>
node scripts/slice-sheet.mjs images/catch_시트4.png pair shoe-device,wig-device,camera-ai-watch,pick-up-pencil,fix-hair,ear-bandage,earbud-swallow,earpiece-hidden,turn-back <임시>
node scripts/slice-sheet.mjs images/catch_소품시트.png prop prop-smart-glasses,prop-earbud,prop-button-camera,prop-calculator-back,prop-id-card,prop-bone-band,prop-smartwatch,prop-cheat-note,prop-phone-glow <임시>
node scripts/slice-sheet.mjs images/catch_소품시트2.png prop prop-bt-slipper,prop-wig,prop-camera-watch,prop-eraser-screen,prop-flip-phone,prop-qa-phone,prop-paper-plane,prop-restroom-note,prop-exam-envelope <임시>
```

소품을 새로 추가하면 코드도 바꾼다: `scripts/lib/assets.mjs`의 `PROP_IDS`, `public/dex.js`의 `PROP` 표 (소품시트2는 연결 완료).
