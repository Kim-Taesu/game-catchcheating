// Play screen: renders the 3x3 seats, HUD, a short top toast after each tap, and drives the
// engine each frame. Full explanations live on the result screen (recap passed to onEnd).
import { buildRound, seededRng } from './round.js'
import { createEngine, poseAt, tap, status, result } from './engine.js'
import { markDiscovered, safeStorage } from './storage.js'
import { STATUS_LABEL } from './labels.js'

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
 * Recap: caught/missed case ids (catch order / seat order) and misjudged seats in tap order.
 * @typedef {{caught:string[], missed:string[], misjudged:{seat:number, id:string, beforeSwap:boolean}[]}} Recap
 * @param {{cases:any[], innocents:any[], seed?:number, now?:()=>number, onEnd:(r:{c:number,m:number,f:number,t:number}, recap:Recap)=>void}} opts
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
  // Behavior text shown on a seat in action pose: never reveals the case name.
  // Both are sentences in the same style, so the image-failure screen gives no hint either.
  const behaviorOf = (s) => (s.kind === 'cheater' ? caseById.get(s.id)?.tell?.action : innById.get(s.id)?.action) ?? ''
  const TOAST_MS = 2500

  const startMs = now()
  const engine = createEngine(plan, startMs)
  const storage = safeStorage()

  // ---- DOM ----
  root.textContent = ''
  const hudTime = el('span', { class: 'hud-item', id: 'hud-time' })
  const hudLives = el('span', { class: 'hud-item', id: 'hud-lives' })
  const hudCaught = el('p', { class: 'hud-caught', id: 'hud-caught' })
  // The toast sits inside the HUD box, so it can never cover a seat. #panel-live announces it.
  const toast = el('p', { class: 'toast', id: 'toast', hidden: '', 'aria-hidden': 'true' })
  const hud = el('div', { class: 'hud' }, el('p', { class: 'hud-row' }, hudTime, hudLives), hudCaught, toast)

  const grid = el('div', { class: 'seats' })
  const views = new Map()
  function paintFallback(v) {
    if (!v.fallback) return
    const label = `응시자 ${v.s.seat + 1}`
    v.fallback.textContent = v.pose === 1 ? `${label}\n${behaviorOf(v.s)}` : label
  }
  for (const s of plan.seats) {
    const img = el('img', { class: 'px seat-img', src: `/px/${s.id}-0.webp`, alt: '' })
    const btn = el(
      'button',
      { type: 'button', class: 'seat', 'data-seat': String(s.seat), style: `--i:${s.seat}` },
      img,
      el('span', { class: 'sr-only', text: `응시자 ${s.seat + 1}` }),
      el('span', { class: 'stamp stamp-caught', 'aria-hidden': 'true', text: '적발' }),
      el('span', { class: 'stamp stamp-cleared', 'aria-hidden': 'true', text: '확인함' }),
    )
    const view = { s, btn, img, pose: 0, failed: false, fallback: null }
    img.addEventListener('error', () => {
      view.failed = true
      view.fallback = el('span', { class: 'seat-fallback' })
      img.replaceWith(view.fallback)
      paintFallback(view)
    })
    btn.addEventListener('click', () => onTap(s.seat))
    views.set(s.seat, view)
    grid.append(btn)
  }

  // Always-rendered live region: screen readers announce text changes in it reliably.
  const live = el('div', { class: 'sr-only', id: 'panel-live', role: 'status', 'aria-live': 'polite' })

  root.append(hud, grid, live)

  // ---- toast ----
  let toastTimer = 0
  function hideToast(clearLive = true) {
    clearTimeout(toastTimer)
    toast.hidden = true
    if (clearLive) live.textContent = ''
  }
  function showToast(text) {
    clearTimeout(toastTimer)
    toast.textContent = text
    toast.hidden = false
    live.textContent = text
    toastTimer = setTimeout(hideToast, TOAST_MS)
  }
  const onKey = (ev) => {
    if (ev.key === 'Escape' && !toast.hidden) hideToast()
  }
  document.addEventListener('keydown', onKey)

  /** @type {{caught:string[], misjudged:{seat:number, id:string, beforeSwap:boolean}[]}} */
  const recap = { caught: [], misjudged: [] }

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
        else paintFallback(v)
      }
    }
    if (st.ended !== null && !finished) {
      finished = true
      cancelAnimationFrame(rafId)
      // Nothing overlays the result; the live region keeps the last announcement.
      hideToast(false)
      for (const v of views.values()) v.btn.disabled = true
      root.dataset.ended = st.ended
      const missed = plan.seats.filter((x) => x.kind === 'cheater' && !recap.caught.includes(x.id)).map((x) => x.id)
      opts.onEnd(result(engine, t), { caught: [...recap.caught], missed, misjudged: [...recap.misjudged] })
    }
  }
  function frame() {
    render()
    if (!finished) rafId = requestAnimationFrame(frame)
  }

  function onTap(seatNo) {
    if (finished) return
    const out = tap(engine, seatNo, now())
    const v = views.get(seatNo)
    const label = v.btn.querySelector('.sr-only')
    if (out.kind === 'caught') {
      const c = caseById.get(out.id)
      v.btn.removeAttribute('data-cleared')
      v.btn.setAttribute('data-caught', '')
      label.textContent = `응시자 ${seatNo + 1} 적발: ${nameOf(out.id)}`
      markDiscovered(storage, out.id)
      recap.caught.push(out.id)
      const st = STATUS_LABEL[c?.status]
      showToast(`적발! ${nameOf(out.id)}${st ? ` · ${st}` : ''}`)
    } else if (out.kind === 'innocent') {
      const beforeSwap = out.reason === 'before-swap'
      v.btn.setAttribute('data-cleared', '')
      label.textContent = `응시자 ${seatNo + 1} 확인함`
      recap.misjudged.push({ seat: seatNo, id: out.id, beforeSwap })
      // Same text for every non-catch tap (innocent or swap seat before its swap), so the toast
      // never tells the swap seat apart. Names and reasons are on the result screen.
      showToast(`정상 행동입니다 · 응시자 ${seatNo + 1}`)
    }
    render()
  }

  render()
  if (!finished) rafId = requestAnimationFrame(frame)

  return {
    stop() {
      finished = true
      cancelAnimationFrame(rafId)
      clearTimeout(toastTimer)
      document.removeEventListener('keydown', onKey)
    },
  }
}
