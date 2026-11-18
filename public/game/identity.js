// The only place that builds text a player can read before an examinee is caught.
// Idle, cleared and every non-catch tap use seat numbers only, so nothing here can leak
// whether a seat is a case, an innocent, or a glasses-swap seat before its swap.
import { statusLabel } from './labels.js'

/** Seat text (also the sr-only label): idle, caught or cleared. `seatIndex` is 0-based. */
export function seatLabel(seatIndex, state = 'idle', caseName = '') {
  const base = `응시자 ${seatIndex + 1}`
  if (state === 'caught') return `${base} 잡힘: ${caseName}`
  if (state === 'cleared') return `${base} 확인함`
  return base
}

/** Toast + seat label for an engine.tap outcome; null when the tap was ignored. */
export function tapMessage(outcome, caseById) {
  if (outcome.kind === 'caught') {
    const c = caseById.get(outcome.id)
    const name = c?.name ?? outcome.id
    const st = statusLabel(c)
    return { toast: `적발! ${name}${st ? ` · ${st}` : ''}`, label: seatLabel(outcome.seat, 'caught', name) }
  }
  if (outcome.kind === 'innocent') {
    // Same shape for every non-catch tap (innocent or swap seat before its swap).
    return { toast: `정상 행동입니다 · 응시자 ${outcome.seat + 1}`, label: seatLabel(outcome.seat, 'cleared') }
  }
  return null
}

/** Result-screen line for a before-swap misjudgment; names the case only if caught later. */
export function beforeSwapLine(seatIndex, laterCaseName) {
  const later = laterCaseName ? ` (나중에 적발: ${laterCaseName})` : ''
  return `응시자 ${seatIndex + 1} — 이때는 아직 수상한 점이 보이지 않았어요${later}`
}
