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

/**
 * A small seat showing an examinee. `motion` animates the action pose with CSS:
 * 'repeat' = acts again and again (a cheater), 'once' = acts once in a long cycle (an innocent).
 * `delay` (s) staggers seats so they do not move together.
 */
function seat(id, { motion = 'none', delay = 0, caption, extra, cls = '' } = {}) {
  const fig = el('figure', `intro-fig ${cls}`.trim())
  const frame = el('span', `mini-seat motion-${motion}`)
  frame.style.setProperty('--d', `${-delay}s`)
  for (const n of [0, 1]) {
    const img = el('img', `mini-img mini-img-${n}`)
    img.src = `/px/${id}-${n}.webp`
    img.alt = ''
    frame.append(img)
  }
  if (extra) frame.append(...[extra].flat())
  fig.append(frame)
  if (caption) fig.append(el('figcaption', 'intro-cap', caption))
  return fig
}

/** Step 1: a live mini exam hall: nine seats acting like the game, a shrinking time bar, a moving magnifier. */
function miniHall() {
  const wrap = el('div', 'mini-wrap')
  const bar = el('div', 'mini-timebar')
  bar.append(el('span', 'mini-timebar-fill'))
  const hall = el('div', 'mini-hall')
  const seats = [
    ['smart-glasses-frame', 'repeat', 0.3],
    ['yawn', 'once', 2.5],
    ['smartwatch', 'repeat', 1.6],
    ['think-chin', 'once', 6.2],
    ['peek', 'repeat', 0.9],
    ['earpiece-hidden', 'repeat', 2.4],
    ['stretch', 'once', 8.8],
    ['wig-device', 'repeat', 1.2],
    ['analog-watch', 'once', 4.4],
  ]
  for (const [id, motion, delay] of seats) hall.append(seat(id, { motion, delay }))
  hall.append(el('span', 'mini-scan', '🔍'))
  wrap.append(bar, hall)
  return [wrap]
}

/** Step 2: three cheaters repeating their action vs three innocents acting once. */
function repeatVsOnce() {
  const row = (label, cls, items) => {
    const r = el('div', `intro-row ${cls}`)
    r.append(el('p', 'intro-row-label', label))
    const seats = el('div', 'intro-row-seats')
    seats.append(...items)
    r.append(seats)
    return r
  }
  const again = () => el('span', 'mini-badge mini-badge-again', '↻ 또')
  return [
    row('부정행위자: 같은 동작을 계속', 'is-cheat', [
      seat('smart-glasses-frame', { motion: 'repeat-fast', delay: 0, caption: '안경테 만지기', extra: again() }),
      seat('smartwatch', { motion: 'repeat-fast', delay: 0.8, caption: '손목 보기', extra: again() }),
      seat('peek', { motion: 'repeat-fast', delay: 1.6, caption: '옆자리 보기', extra: again() }),
    ]),
    row('평범한 응시자: 가끔 한 번', 'is-calm', [
      seat('yawn', { motion: 'once', delay: 1, caption: '하품' }),
      seat('stretch', { motion: 'once', delay: 4.5, caption: '기지개' }),
      seat('drink-water', { motion: 'once', delay: 8, caption: '물 마시기' }),
    ]),
  ]
}

/** Step 3: a looping tap demo: catch a cheater, then tap an innocent and the exam ends. */
function tapDemo() {
  const demo = el('div', 'tap-demo')
  const seats = el('div', 'tap-seats')
  seats.append(
    seat('smart-glasses-frame', {
      motion: 'demo',
      cls: 'tap-a',
      caption: '수상한 응시자',
      extra: el('span', 'intro-stamp tap-stamp', '잡힘'),
    }),
    seat('sneeze', {
      motion: 'demo-b',
      cls: 'tap-b',
      caption: '평범한 응시자',
      extra: el('span', 'intro-stamp intro-stamp-wrong tap-stamp-b', '정상'),
    }),
  )
  const finger = el('span', 'tap-finger', '👆')
  const toastA = el('p', 'tap-toast tap-toast-a', '적발! AI 스마트안경 · 확인됨')
  const toastB = el('p', 'tap-toast tap-toast-b', '정상 응시자를 잡아 시험 끝')
  demo.append(toastA, toastB, seats, finger)
  return [demo]
}

const STEPS = [
  {
    title: '당신은 시험 감독관',
    lines: [`9명 중 ${MIN_CHEATERS}~${MAX_CHEATERS}명이 부정행위 중이에요. ${DURATION_MS / 1000}초 안에 찾아내세요.`],
    art: miniHall,
  },
  {
    title: '같은 행동을 반복하면 수상해요',
    lines: ['부정행위자는 약 7초마다 같은 동작을 되풀이해요. 한 번 움직였다고 다 의심하지는 마세요.'],
    art: repeatVsOnce,
  },
  {
    title: '누르면 적발, 잘못 누르면 끝',
    lines: ['평범한 응시자를 누르면 시험이 바로 끝나요. 끝나면 9명이 각각 무엇을 했는지 알려 드려요.'],
    art: tapDemo,
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
