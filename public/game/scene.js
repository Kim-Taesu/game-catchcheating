// Play screen: renders the 3x3 seats, HUD, a short top toast after each tap, and drives the
// engine each frame. Full explanations live on the result screen (recap passed to onEnd).
import { buildRound, seededRng } from './round.js'
import { DURATION_MS, createEngine, poseAt, tap, status, result } from './engine.js'
import { markDiscovered, safeStorage } from './storage.js'
import { actionOf } from './labels.js'
import { seatLabel, tapMessage } from './identity.js'

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
 * Recap: caught case ids (catch order), misjudged seats (tap order) and every seat of the round.
 * @typedef {{caught:string[], misjudged:{seat:number, id:string, beforeSwap:boolean}[],
 *   seats:{seat:number, kind:'cheater'|'innocent', id:string}[]}} Recap
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
  // Behavior text shown on a seat in action pose: never reveals the case name.
  // Both are sentences in the same style, so the image-failure screen gives no hint either.
  const behaviorOf = (s) => actionOf(s.kind === 'cheater' ? caseById.get(s.id) : innById.get(s.id))
  const TOAST_MS = 2500

  const startMs = now()
  const engine = createEngine(plan, startMs)
  const storage = safeStorage()

  // ---- DOM ----
  root.textContent = ''
  const hudTime = el('span', { class: 'hud-item', id: 'hud-time' })
  const hudCaught = el('p', { class: 'hud-caught', id: 'hud-caught' })
  // The toast sits inside the HUD box, so it can never cover a seat. #panel-live announces it.
  const toast = el('p', { class: 'toast', id: 'toast', hidden: '', 'aria-hidden': 'true' })
  const hud = el('div', { class: 'hud' }, el('p', { class: 'hud-row' }, hudTime), hudCaught, toast)
  // Time bar below the HUD (the toast covers only the HUD, so the bar stays visible).
  // It shrinks and goes green -> yellow -> red as time runs out; pulses in the last 10 s.
  const timeFill = el('span', { class: 'timebar-fill' })
  const timeBar = el(
    'div',
    { class: 'timebar', id: 'timebar', role: 'progressbar', 'aria-label': '남은 시간', 'aria-valuemin': '0', 'aria-valuemax': String(DURATION_MS / 1000) },
    timeFill,
  )
  const LOW_MS = 10000

  const grid = el('div', { class: 'seats' })
  const views = new Map()
  function paintFallback(v) {
    if (!v.fallback) return
    const label = seatLabel(v.s.seat)
    v.fallback.textContent = v.pose === 1 ? `${label}\n${behaviorOf(v.s)}` : label
  }
  for (const s of plan.seats) {
    // Both poses stay in the DOM and load once; a pose change only toggles which one is opaque
    // (CSS crossfade). alt="" keeps them out of the accessibility tree.
    const img0 = el('img', { class: 'px seat-img seat-img-0', src: `/px/${s.id}-0.webp`, alt: '' })
    const img1 = el('img', { class: 'px seat-img seat-img-1', src: `/px/${s.id}-1.webp`, alt: '' })
    const art = el('span', { class: 'seat-art' }, img0, img1)
    const btn = el(
      'button',
      { type: 'button', class: 'seat', 'data-seat': String(s.seat), style: `--i:${s.seat}` },
      art,
      el('span', { class: 'sr-only', text: seatLabel(s.seat) }),
      el('span', { class: 'stamp stamp-caught', 'aria-hidden': 'true', text: '잡힘' }),
    )
    const view = { s, btn, img0, img1, pose: 0, failed: false, fallback: null }
    const onError = () => {
      if (view.failed) return
      view.failed = true
      view.fallback = el('span', { class: 'seat-fallback' })
      art.replaceWith(view.fallback)
      paintFallback(view)
    }
    img0.addEventListener('error', onError)
    img1.addEventListener('error', onError)
    btn.addEventListener('click', () => onTap(s.seat))
    views.set(s.seat, view)
    grid.append(btn)
  }

  // Always-rendered live region: screen readers announce text changes in it reliably.
  const live = el('div', { class: 'sr-only', id: 'panel-live', role: 'status', 'aria-live': 'polite' })

  root.append(hud, timeBar, grid, live)

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

  // Write a HUD node only when its text changed (render runs every frame).
  const hudShown = {}
  function setHud(node, key, text) {
    if (hudShown[key] === text) return
    hudShown[key] = text
    node.textContent = text
  }

  function render() {
    const t = now()
    const st = status(engine, t)
    const secs = Math.ceil(st.remainingMs / 1000)
    setHud(hudTime, 'time', `남은 시간 ${secs}초`)
    if (hudShown.secs !== secs) {
      hudShown.secs = secs
      timeBar.setAttribute('aria-valuenow', String(secs))
      timeBar.toggleAttribute('data-low', st.remainingMs <= LOW_MS)
    }
    const frac = Math.max(0, Math.min(1, st.remainingMs / DURATION_MS))
    timeFill.style.transform = `scaleX(${frac})`
    // Hue 120 (green) at full time down to 0 (red) at the end.
    timeFill.style.backgroundColor = `hsl(${Math.round(120 * frac)} 72% 42%)`
    setHud(hudCaught, 'caught', `수상한 응시자 ${st.total}명 중 ${st.caught}명 적발`)
    for (const v of views.values()) {
      // A caught seat stays idle for good; the engine's poseAt stays pure.
      const pose = v.btn.hasAttribute('data-caught') ? 0 : poseAt(v.s, t, startMs)
      if (pose !== v.pose) {
        v.pose = pose
        if (!v.failed) {
          v.img1.classList.toggle('is-on', pose === 1)
        } else paintFallback(v)
      }
    }
    if (st.ended !== null && !finished) {
      finished = true
      cancelAnimationFrame(rafId)
      // Nothing overlays the result; the live region keeps the last announcement.
      hideToast(false)
      for (const v of views.values()) v.btn.disabled = true
      root.dataset.ended = st.ended
      const seats = plan.seats.map(({ seat, kind, id }) => ({ seat, kind, id }))
      opts.onEnd(result(engine, t), { caught: [...recap.caught], misjudged: [...recap.misjudged], seats })
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
    const msg = tapMessage(out, caseById)
    if (msg) label.textContent = msg.label
    if (out.kind === 'caught') {
      v.btn.setAttribute('data-caught', '')
      v.btn.setAttribute('aria-disabled', 'true')
      markDiscovered(storage, out.id)
      recap.caught.push(out.id)
    } else if (out.kind === 'innocent') {
      recap.misjudged.push({ seat: seatNo, id: out.id, beforeSwap: out.reason === 'before-swap' })
    }
    if (msg) showToast(msg.toast)
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
