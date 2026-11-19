// How to play, shown before a round: three short steps (다음 → 다음 → 게임 시작).
// The round (and its 60 s timer) starts only when 게임 시작 is pressed.
// Numbers come from the game's own constants so the text cannot drift from the rules.
import { MAX_CHEATERS, MIN_CHEATERS } from './round.js'
import { DURATION_MS } from './engine.js'

function el(tag, cls, text) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text !== undefined) n.textContent = text
  return n
}

/** A sprite in a small frame, with an optional caption under it. */
function sprite(id, caption, extra) {
  const fig = el('figure', 'intro-fig')
  const frame = el('span', 'intro-frame')
  const img = el('img', 'intro-img')
  img.src = `/px/${id}.webp`
  img.alt = ''
  frame.append(img)
  if (extra) frame.append(extra)
  fig.append(frame)
  if (caption) fig.append(el('figcaption', 'intro-cap', caption))
  return fig
}

const arrow = () => el('span', 'intro-arrow', '→')

const STEPS = [
  {
    title: '당신은 시험 감독관',
    lines: [
      `시험장 9자리 중 ${MIN_CHEATERS}~${MAX_CHEATERS}명이 부정행위를 하고 있어요.`,
      `${DURATION_MS / 1000}초 안에 모두 찾아내세요.`,
    ],
    art: () => [sprite('analog-watch-0'), sprite('smart-glasses-frame-0'), sprite('look-up-0')],
  },
  {
    title: '같은 행동을 반복하면 수상해요',
    lines: [
      '부정행위자는 약 7초마다 수상한 행동을 되풀이해요.',
      '평범한 응시자도 가끔 하품이나 기지개를 해요. 한 번 움직였다고 의심하지 마세요.',
    ],
    art: () => [
      sprite('smart-glasses-frame-0', '평소'),
      arrow(),
      sprite('smart-glasses-frame-1', '자꾸 반복'),
      sprite('yawn-1', '가끔 한 번'),
    ],
  },
  {
    title: '누르면 적발, 잘못 누르면 끝',
    lines: [
      '수상한 응시자를 누르면 적발이에요.',
      '평범한 응시자를 누르면 시험이 바로 끝나요.',
      '끝나면 9명이 각각 무엇을 했는지 알려 드려요.',
    ],
    art: () => [
      sprite('smart-glasses-frame-1', '적발', el('span', 'intro-stamp', '잡힘')),
      sprite('sneeze-1', '오해하면 끝', el('span', 'intro-stamp intro-stamp-wrong', '정상')),
    ],
  },
]

/**
 * Render the intro into `root`. `onStart` runs once, on 게임 시작.
 * @param {HTMLElement} root
 * @param {{onStart: () => void}} opts
 */
export function showIntro(root, opts) {
  const box = el('section', 'intro card')
  box.id = 'intro'
  box.setAttribute('aria-labelledby', 'intro-title')
  const count = el('p', 'intro-step')
  const title = el('h2', 'intro-title')
  title.id = 'intro-title'
  title.tabIndex = -1
  const art = el('div', 'intro-art')
  const lines = el('ul', 'intro-lines')
  const dots = el('div', 'intro-dots')
  dots.setAttribute('aria-hidden', 'true')
  const dotEls = STEPS.map(() => el('span', 'intro-dot'))
  dots.append(...dotEls)
  const next = el('button', 'btn btn-primary intro-next')
  next.type = 'button'
  box.append(count, title, art, lines, dots, next)

  let step = 0
  let started = false
  function render() {
    const s = STEPS[step]
    const last = step === STEPS.length - 1
    count.textContent = `${step + 1} / ${STEPS.length}`
    title.textContent = s.title
    art.replaceChildren(...s.art())
    lines.replaceChildren(...s.lines.map((t) => el('li', '', t)))
    dotEls.forEach((d, i) => d.classList.toggle('is-on', i === step))
    next.textContent = last ? '게임 시작' : '다음'
    title.focus()
  }
  next.addEventListener('click', () => {
    if (step < STEPS.length - 1) {
      step++
      render()
    } else if (!started) {
      started = true
      opts.onStart()
    }
  })

  root.replaceChildren(box)
  render()
}
