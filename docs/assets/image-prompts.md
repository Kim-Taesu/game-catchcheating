# 이미지 생성 프롬프트 (도트풍 에셋) — v2: 칸마다 포즈 2개

기준 품질: subwayrun의 `public/px`·`public/avatars` (윤곽선·명암이 있는 도트풍 일러스트, 캐릭터 64~96px 표시).
원본은 `images/`에 둔다 (git 제외). 시트를 자르고 투명 배경 webp로 바꾸는 스크립트는 에셋이 오면 만든다.

수법·사건의 근거는 [docs/research/cheating-methods.md](../research/cheating-methods.md)의 id와 "행동 단서 근거" 절을 따른다.
모든 그림은 만화적인 일러스트이며 장비의 작동 방식·제작법은 담지 않는다. 눈에 띄는 **외형·행동 단서**만 그린다.

## 0. 이번 버전에서 바뀐 것 (v1 → v2)

- 단서는 **행동**이다. 그래서 한 응시자를 **두 포즈**(기본 / 행동)로 그린다. 게임에서 5초쯤 간격으로 행동 포즈로 바뀌었다 돌아온다.
- 게임에 나오는 수법은 근거가 확인된 **12종**. 나머지 6종(단추 카메라·개조 계산기·팔뚝 필기·물병 라벨·가방 속 폰·위조 신분증)은 응시자 이미지가 필요 없고 **소품 시트**만 쓴다.
- 평범한 응시자는 **15명**으로 늘렸다 (한 판에 5~6명이 나오므로 반복되는 얼굴을 줄이기 위해).

## 1. 공통 규칙

| 항목 | 값 |
| --- | --- |
| 시트 크기 | **가로 2:1** 직사각형, 가능하면 2400×1200 이상 |
| 시트 구성 | **3×3 격자**. 칸은 가로로 긴 2:1 직사각형 9개, 크기 동일 |
| 칸 안 구성 | **같은 인물을 두 번**: 왼쪽 = 기본 포즈(IDLE), 오른쪽 = 행동 포즈(ACTION). 옷·머리·얼굴·책상·소품 모두 같고 포즈만 다름 |
| 배경 | 전체가 **단색 마젠타 #FF00FF** (그림자·그라데이션·바닥 없음). 옷·소품에 마젠타·보라 계열 금지 |
| 시점 | 정면, 책상에 앉은 **상반신 + 책상 윗면**. 두 포즈 모두 같은 배율·같은 위치(머리와 책상 높이가 일치) |
| 여백 | 각 포즈 사방 8% 이상 여백, 칸 밖으로 안 넘침 |
| 금지 | 칸 사이 선·테두리·글자·번호·화살표·동그라미·워터마크 |
| 단서 | 처음엔 잘 안 보이지만 자세히 보면 찾을 수 있는 크기 |

### 공통 스타일 블록 (모든 프롬프트 맨 앞에 붙인다)

```
Pixel art game sprite sheet, 16-bit era look with clean 1px dark outlines,
soft cel shading, slightly chibi proportions (big head, small body), cheerful and
friendly mood, Korean exam takers (teens to adults, varied hair, skin tones, genders),
each character seated at a school desk seen from the front, upper body plus desk top
visible, a white exam paper and pencil on every desk. The sheet is a strict 3x3 grid of
equal wide cells (each cell twice as wide as tall). Every cell contains the SAME character
drawn twice side by side: LEFT = idle pose, RIGHT = action pose; identical face, hair,
clothes, desk and props in both, only the pose differs, same scale and same vertical
position. Flat solid magenta (#FF00FF) background everywhere, no floor, no shadows on the
background, no grid lines, no borders, no text, no letters, no numbers, no arrows, no
watermark, no UI. Crisp pixel edges, no blur.
```

## 2. 시트 1 — 수법 응시자 (파일: `images/catch_수법시트1.png`)

칸 순서는 왼쪽→오른쪽, 위→아래. 각 칸 프롬프트를 공통 스타일 블록 뒤에 이어 붙인다. 근거 표시: 보도 / 지침 / 커뮤니티 / 업계 설명.

| 칸 | id | 기본(IDLE) | 행동(ACTION) | 근거 |
| --- | --- | --- | --- | --- |
| 1 | `smart-glasses-frame` | wearing thick black-framed smart glasses with a tiny red LED dot on the right temple arm, calm, looking at the exam paper | one hand touching the glasses frame at the temple, eyes glancing up to the upper right | 보도(안경테 반복 만짐) + 업계 설명(우측 상단 시선) |
| 2 | `glasses-lens-heat` | wearing very thick horn-rimmed glasses and a cap pulled low, reading the paper normally | holding the exam paper unnaturally close to the face, a faint sweat drop | 보도(대만) |
| 3 | `earpiece-hidden` | wearing a knit beanie pulled over both ears, a tiny edge of a white earbud barely visible, eyes on the paper | one hand touching the ear, head tilting slightly to the side | 지침(서울시교육청) |
| 4 | `bone-conduction` | wearing a thin black sports band behind the neck and ears, no earbuds in the ears, reading | lips slightly moving as if murmuring, one hand touching behind the ear | 업계 설명 |
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
| 6 | `stretch` | writing | stretching both arms up, shoulders back |
| 7 | `erase` | writing | erasing something on the paper with an eraser, brushing crumbs off |
| 8 | `turn-back` | writing | turning the head back toward the clock on the wall at the back of the room (not toward neighbors) |
| 9 | `nose-sniff` | writing | rubbing the nose and sniffling, a cold |

## 5. 시트 4 — 단서 소품 (파일: `images/catch_소품시트.png`)

사건 카드 팝업·도감 아이콘용. 사람 없이 **물건 하나씩**, 마젠타 배경, **정사각형** 3×3 (포즈 2개 규칙 없음). 공통 스타일 블록에서 "character/desk/pose" 문장을 빼고 "single object icon centered in each square cell" 로 바꿔 쓴다.

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

## 6. 배경 — 시험장 (파일: `images/catch_시험장.png`)

가로 16:9 (1152×648 이상). 응시자·책상은 그리지 않는다 (코드로 3×3 자리에 올린다).

```
Pixel art game background, 16-bit era look with clean outlines and soft shading.
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
- 두 포즈의 머리·책상 높이가 맞는가 (어긋나면 번갈아 보일 때 인물이 튄다)
- 배경이 완전한 마젠타 단색인가
- 단서가 **보이긴 하지만 한눈에 티 나지는 않는가**
- 평범 응시자에게 장비·표시등·이어폰·붕대가 섞이지 않았는가
- 글자·번호·화살표·워터마크가 없는가

## 9. 개수 요약

| 시트 | 칸 | 이미지 |
| --- | --- | --- |
| 수법시트1 | 9 | 18프레임 |
| 시트2 | 3 수법 + 6 평범 | 18프레임 |
| 시트3 | 9 평범 | 18프레임 |
| 소품시트 | 9 | 9 |
| 시험장 | 1 | 1 |
| 합계 | 시트 5장 | 응시자 54프레임 + 소품 9 + 배경 1 |
