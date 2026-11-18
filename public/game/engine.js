// Game engine: a pure state machine. No timers; every answer derives from the
// absolute `nowMs` the caller passes in (safe after the tab was inactive).
import { ACTION_MS } from './round.js'

export const DURATION_MS = 60000
export const LIVES = 1

export function createEngine(plan, startMs) {
  return {
    plan,
    startMs,
    lives: LIVES,
    caught: new Set(),
    ended: null,
    clearAtMs: null,
  }
}

/** 0 = base pose, 1 = action pose. Pure in (seat, nowMs, startMs). */
export function poseAt(seat, nowMs, startMs) {
  const t = nowMs - startMs
  if (seat.swapAtMs !== undefined && t >= seat.swapAtMs) return 1
  for (const onset of seat.onsets) {
    if (t >= onset && t < onset + ACTION_MS) return 1
  }
  return 0
}

/** Lazily settle the timer end; terminal states never change afterwards. */
function settle(e, nowMs) {
  if (e.ended === null && nowMs - e.startMs >= DURATION_MS) e.ended = 'timeout'
}

export function tap(e, seat, nowMs) {
  settle(e, nowMs)
  const s = e.plan.seats.find((x) => x.seat === seat)
  if (!s) return { kind: 'ignored', seat, id: '' }
  if (e.ended !== null || e.caught.has(seat)) return { kind: 'ignored', seat, id: s.id }

  const isCheater = s.kind === 'cheater'
  const beforeSwap = isCheater && s.swapAtMs !== undefined && nowMs - e.startMs < s.swapAtMs
  if (isCheater && !beforeSwap) {
    e.caught.add(seat)
    if (e.caught.size >= e.plan.cheaterCount) {
      e.ended = 'clear'
      e.clearAtMs = nowMs
    }
    return { kind: 'caught', seat, id: s.id }
  }

  e.lives -= 1
  if (e.lives <= 0) e.ended = 'lives'
  // Any non-catch tap (innocent or a swap seat before its swap) ends the round.
  const out = { kind: 'innocent', seat, id: s.id }
  if (beforeSwap) out.reason = 'before-swap'
  return out
}

export function status(e, nowMs) {
  settle(e, nowMs)
  return {
    remainingMs: Math.max(0, DURATION_MS - (nowMs - e.startMs)),
    lives: e.lives,
    caught: e.caught.size,
    total: e.plan.cheaterCount,
    ended: e.ended,
  }
}

export function result(e, nowMs) {
  const st = status(e, nowMs)
  const t =
    st.ended === 'clear'
      ? Math.min(60, Math.ceil((e.clearAtMs - e.startMs) / 1000))
      : 60
  return { c: st.caught, m: st.total - st.caught, f: LIVES - st.lives, t }
}
