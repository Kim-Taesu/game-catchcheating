// Result titles and share values. Pure functions: shared by browser, Worker and tests.
import { MAX_CHEATERS, MIN_CHEATERS } from './round.js'

export const TITLE_TEXT = {
  eagle: '매의 눈 감독관',
  veteran: '베테랑 감독관',
  suspicious: '의심 많은 감독관',
  rookie: '신입 감독관',
  sleepy: '졸고 있는 감독관',
}

/** First match wins. */
export function titleFor(r) {
  if (r.m === 0 && r.f === 0 && r.t <= 30) return 'eagle'
  if (r.m <= 1 && r.f === 0) return 'veteran'
  if (r.c >= 2 && r.f === 0) return 'rookie'
  if (r.f >= 1) return 'suspicious'
  return 'sleepy'
}

/**
 * Time line on the result screen. Only a clear has an elapsed time; a wrong-tap ending has
 * no time line because the reason line already says why the exam ended.
 * @param {'clear'|'timeout'|'lives'} [reason]
 */
export function endTimeLine(r, reason) {
  if (reason === 'clear' || (reason === undefined && r.m === 0)) return `걸린 시간 ${r.t}초`
  if (reason === 'timeout') return '시간 종료'
  return null
}

export function shareQuery(r) {
  return `c=${r.c}&m=${r.m}&f=${r.f}&t=${r.t}`
}

function readInt(params, key) {
  const raw = params.get(key)
  if (raw === null || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isInteger(n) ? n : null
}

/** Returns a validated Result, or null when any value is missing or out of range. */
export function parseShare(params) {
  const c = readInt(params, 'c')
  const m = readInt(params, 'm')
  const f = readInt(params, 'f')
  const t = readInt(params, 't')
  if (c === null || m === null || f === null || t === null) return null
  if (f > 1 || t > 60) return null
  // A round has MIN_CHEATERS..MAX_CHEATERS cheaters, so caught + missed must be in that range.
  if (c + m < MIN_CHEATERS || c + m > MAX_CHEATERS) return null
  return { c, m, f, t }
}

/** Result-screen reward: 1억 per caught cheater ("💰 포상금 5억!"); nobody caught -> "💸 포상금 0억". */
export function rewardLine(r) {
  return r.c > 0 ? `💰 포상금 ${r.c}억!` : '💸 포상금 0억'
}
