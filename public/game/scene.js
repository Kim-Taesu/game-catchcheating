// Play screen: renders the 3x3 seats, HUD, tap panels and drives the engine each frame.
import { buildRound, seededRng } from './round.js'
import { createEngine, poseAt, tap, status, result } from './engine.js'
import { markDiscovered, safeStorage } from './storage.js'

const STATUS_LABEL = {
  confirmed: '확인됨',
  investigating: '수사 중·일부 추정',
  mentioned: '거론됨',
}
const BASIS_LABEL = {
  report: '보도',
  guideline: '감독 지침',
  community: '커뮤니티 정리',
  industry: '업계 설명',
}
const SINGLE_ACTION_NOTE = '단일 행동만으로는 부정행위라고 단정할 수 없습니다.'

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else node.setAttribute(k, v)
  }
  for (const c of children) node.append(c)
  return node
}

/**
 * @param {HTMLElement} root
 * @param {{cases:any[], innocents:any[], seed?:number, now?:()=>number, onEnd:(r:{c:number,m:number,f:number,t:number})=>void}} opts
 * @returns {{stop():void}}
 */
export function startGame(root, opts) {
  const now = opts.now ?? (() => Date.now())
  const seed = opts.seed ?? Math.floor(Math.random() * 4294967296)
  // The rng goes straight into buildRound (file order) so a seed reproduces the round.
  const plan = buildRound(opts.cases, opts.innocents, seededRng(seed))
  const caseById = new Map(opts.cases.map((c) => [c.id, c]))
  const innById = new Map(opts.innocents.map((i) => [i.id, i]))
  const nameOf = (id) => (caseById.get(id) ?? innById.get(id))?.name ?? id

  const startMs = now()
  const engine = createEngine(plan, startMs)
  const storage = safeStorage()

  // ---- DOM ----
  root.textContent = ''
  const hudTime = el('span', { class: 'hud-item', id: 'hud-time' })
  const hudLives = el('span', { class: 'hud-item', id: 'hud-lives' })
  const hudCaught = el('p', { class: 'hud-caught', id: 'hud-caught' })
  const hud = el('div', { class: 'hud' }, el('p', { class: 'hud-row' }, hudTime, hudLives), hudCaught)

  const grid = el('div', { class: 'seats' })
  const views = new Map()
  for (const s of plan.seats) {
    const img = el('img', { class: 'px seat-img', src: `/px/${s.id}-0.webp`, alt: '' })
    const stamp = el('span', { class: 'stamp', 'aria-hidden': 'true', text: '적발' })
    const btn = el(
      'button',
      { type: 'button', class: 'seat', 'data-seat': String(s.seat), style: `--i:${s.seat}` },
      img,
      el('span', { class: 'sr-only', text: nameOf(s.id) }),
      stamp,
    )
    const view = { s, btn, img, pose: 0, failed: false }
    img.addEventListener('error', () => {
      view.failed = true
      img.replaceWith(el('span', { class: 'seat-fallback', text: nameOf(s.id) }))
    })
    btn.addEventListener('click', () => onTap(s.seat))
    views.set(s.seat, view)
    grid.append(btn)
  }

  const panelBody = el('div', { class: 'panel-body' })
  const panelClose = el('button', { type: 'button', class: 'btn panel-close', id: 'panel-close', text: '닫기' })
  const panel = el(
    'div',
    { class: 'panel card', id: 'panel', role: 'status', 'aria-live': 'polite', hidden: '' },
    panelBody,
    panelClose,
  )

  root.append(hud, grid, panel)

  // ---- panels ----
  function closePanel() {
    panel.hidden = true
    root.classList.remove('has-panel')
  }
  function openPanel(...nodes) {
    panelBody.textContent = ''
    panelBody.append(...nodes)
    panel.hidden = false
    root.classList.add('has-panel')
  }
  panelClose.addEventListener('click', closePanel)
  const onKey = (ev) => {
    if (ev.key === 'Escape' && !panel.hidden) closePanel()
  }
  document.addEventListener('keydown', onKey)

  function showCaught(id) {
    const c = caseById.get(id)
    const t = c?.tell
    const nodes = [
      el('p', { class: 'panel-tag', text: '적발!' }),
      el('h2', { class: 'panel-title', text: c?.name ?? id }),
      el('p', {}, el('span', { class: 'chip', text: STATUS_LABEL[c?.status] ?? '' })),
      el('p', { text: c?.cue ?? '' }),
    ]
    if (t) {
      const basis = `근거: ${BASIS_LABEL[t.basisKind] ?? ''}${t.basisNote ? ` (${t.basisNote})` : ''}`
      nodes.push(el('p', { class: 'panel-basis', text: basis }))
    }
    nodes.push(el('a', { href: `/dex#${id}`, text: '도감에서 자세히' }))
    openPanel(...nodes)
  }
  function showInnocent(out) {
    if (out.reason === 'before-swap') {
      openPanel(
        el('h2', { class: 'panel-title', text: '아직 수상한 점이 보이지 않아요' }),
        el('p', { text: SINGLE_ACTION_NOTE }),
      )
      return
    }
    const inn = innById.get(out.id)
    openPanel(
      el('h2', { class: 'panel-title', text: '정상 행동입니다' }),
      el('p', { class: 'panel-name', text: inn?.name ?? out.id }),
      el('p', { text: inn?.why ?? '' }),
      el('p', { class: 'panel-note', text: SINGLE_ACTION_NOTE }),
    )
  }

  // ---- loop ----
  let rafId = 0
  let finished = false

  function render() {
    const t = now()
    const st = status(engine, t)
    hudTime.textContent = `남은 시간 ${Math.ceil(st.remainingMs / 1000)}초`
    hudLives.textContent = `기회 ${st.lives}`
    hudCaught.textContent = `수상한 응시자 ${st.total}명 중 ${st.caught}명 적발`
    for (const v of views.values()) {
      const pose = poseAt(v.s, t, startMs)
      if (pose !== v.pose) {
        v.pose = pose
        if (!v.failed) v.img.src = `/px/${v.s.id}-${pose}.webp`
      }
    }
    if (st.ended !== null && !finished) {
      finished = true
      cancelAnimationFrame(rafId)
      root.dataset.ended = st.ended
      opts.onEnd(result(engine, t))
    }
  }
  function frame() {
    render()
    if (!finished) rafId = requestAnimationFrame(frame)
  }

  function onTap(seatNo) {
    if (finished) return
    const out = tap(engine, seatNo, now())
    if (out.kind === 'caught') {
      const v = views.get(seatNo)
      v.btn.setAttribute('data-caught', '')
      markDiscovered(storage, out.id)
      showCaught(out.id)
    } else if (out.kind === 'innocent') {
      showInnocent(out)
    }
    render()
  }

  render()
  if (!finished) rafId = requestAnimationFrame(frame)

  return {
    stop() {
      finished = true
      cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', onKey)
    },
  }
}
