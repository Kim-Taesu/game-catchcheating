import { describe, expect, it } from 'vitest'
import { ACTION_MS } from '../public/game/round.js'
import type { RoundPlan, SeatPlan } from '../public/game/round.js'
import { DURATION_MS, LIVES, createEngine, poseAt, result, status, tap } from '../public/game/engine.js'

const START = 1000

function plan(): RoundPlan {
  const seats: SeatPlan[] = [
    { seat: 0, kind: 'cheater', id: 'earpiece-hidden', onsets: [5000, 10000] },
    { seat: 1, kind: 'innocent', id: 'yawn', onsets: [3000] },
    { seat: 2, kind: 'cheater', id: 'glasses-swap', onsets: [], swapAtMs: 20000 },
    { seat: 3, kind: 'innocent', id: 'stretch', onsets: [] },
    { seat: 4, kind: 'cheater', id: 'peek', onsets: [7000] },
    { seat: 5, kind: 'innocent', id: 'cough', onsets: [] },
    { seat: 6, kind: 'innocent', id: 'sneeze', onsets: [] },
    { seat: 7, kind: 'innocent', id: 'scratch', onsets: [] },
    { seat: 8, kind: 'innocent', id: 'sigh', onsets: [] },
  ]
  return { seats, cheaterCount: 3 }
}

const seatOf = (p: RoundPlan, n: number) => p.seats[n]

describe('constants', () => {
  it('has spec values', () => {
    expect(DURATION_MS).toBe(60000)
    expect(LIVES).toBe(3)
  })
})

describe('poseAt', () => {
  const p = plan()
  it('shows action pose for ACTION_MS after an onset', () => {
    const s = seatOf(p, 0)
    expect(poseAt(s, START + 4999, START)).toBe(0)
    expect(poseAt(s, START + 5000, START)).toBe(1)
    expect(poseAt(s, START + 5000 + ACTION_MS - 1, START)).toBe(1)
    expect(poseAt(s, START + 5800, START)).toBe(0)
    expect(poseAt(s, START + 10000, START)).toBe(1)
  })
  it('swap seat switches at swapAtMs and stays', () => {
    const s = seatOf(p, 2)
    expect(poseAt(s, START + 19999, START)).toBe(0)
    expect(poseAt(s, START + 20000, START)).toBe(1)
    expect(poseAt(s, START + 30000, START)).toBe(1)
    expect(poseAt(s, START + 59999, START)).toBe(1)
  })
  it('is pure: same now gives same value', () => {
    const s = seatOf(p, 0)
    const now = START + 45000
    expect(poseAt(s, now, START)).toBe(poseAt(s, now, START))
    expect(poseAt(s, START + 5100, START)).toBe(poseAt(s, START + 5100, START))
  })
  it('is 0 before start', () => {
    expect(poseAt(seatOf(p, 0), START - 100, START)).toBe(0)
  })
})

describe('tap', () => {
  it('catches a cheater once; retap is ignored', () => {
    const e = createEngine(plan(), START)
    const r1 = tap(e, 0, START + 6000)
    expect(r1).toEqual({ kind: 'caught', seat: 0, id: 'earpiece-hidden' })
    expect(status(e, START + 6000).caught).toBe(1)
    const r2 = tap(e, 0, START + 6100)
    expect(r2.kind).toBe('ignored')
    const st = status(e, START + 6100)
    expect(st.caught).toBe(1)
    expect(st.lives).toBe(3)
  })

  it('innocent tap costs a life; three end the game; later taps ignored', () => {
    const e = createEngine(plan(), START)
    expect(tap(e, 1, START + 1000)).toEqual({ kind: 'innocent', seat: 1, id: 'yawn' })
    expect(status(e, START + 1000).lives).toBe(2)
    tap(e, 3, START + 2000)
    expect(status(e, START + 2000).ended).toBeNull()
    tap(e, 5, START + 3000)
    const st = status(e, START + 3000)
    expect(st.lives).toBe(0)
    expect(st.ended).toBe('lives')
    expect(tap(e, 0, START + 4000).kind).toBe('ignored')
    expect(tap(e, 6, START + 4000).kind).toBe('ignored')
    expect(status(e, START + 4000).caught).toBe(0)
    expect(status(e, START + 4000).lives).toBe(0)
  })

  it('catching everyone clears with elapsed seconds rounded up', () => {
    const e = createEngine(plan(), START)
    tap(e, 0, START + 2000)
    tap(e, 4, START + 5000)
    expect(status(e, START + 5000).ended).toBeNull()
    tap(e, 2, START + 12300 + 0) // before swap -> innocent, not caught
    expect(status(e, START + 12300).caught).toBe(2)
    tap(e, 2, START + 21000)
    expect(status(e, START + 21000).ended).toBe('clear')
    expect(result(e, START + 21000)).toEqual({ c: 3, m: 0, f: 1, t: 21 })
  })

  it('clear at 12300ms gives t=13', () => {
    const p = plan()
    delete p.seats[2].swapAtMs
    const e = createEngine(p, START)
    tap(e, 0, START + 1000)
    tap(e, 4, START + 2000)
    tap(e, 2, START + 12300)
    expect(status(e, START + 99999).ended).toBe('clear')
    expect(result(e, START + 99999)).toEqual({ c: 3, m: 0, f: 0, t: 13 })
  })

  it('exact whole second does not round up past itself', () => {
    const p = plan()
    delete p.seats[2].swapAtMs
    const e = createEngine(p, START)
    tap(e, 0, START + 1000)
    tap(e, 4, START + 2000)
    tap(e, 2, START + 12000)
    expect(result(e, START + 12000).t).toBe(12)
  })

  it('unknown seat is ignored', () => {
    const e = createEngine(plan(), START)
    expect(tap(e, 42, START + 1000).kind).toBe('ignored')
    expect(status(e, START + 1000).lives).toBe(3)
  })
})

describe('timeout', () => {
  it('ends lazily after DURATION_MS with t=60 and m = missed', () => {
    const e = createEngine(plan(), START)
    tap(e, 0, START + 6000)
    const st = status(e, START + DURATION_MS)
    expect(st.ended).toBe('timeout')
    expect(st.remainingMs).toBe(0)
    expect(result(e, START + DURATION_MS + 5000)).toEqual({ c: 1, m: 2, f: 0, t: 60 })
  })

  it('59999 is still running', () => {
    const e = createEngine(plan(), START)
    const st = status(e, START + 59999)
    expect(st.ended).toBeNull()
    expect(st.remainingMs).toBe(1)
  })

  it('tap after timer end is ignored and f unchanged', () => {
    const e = createEngine(plan(), START)
    expect(tap(e, 1, START + DURATION_MS + 1).kind).toBe('ignored')
    expect(tap(e, 0, START + DURATION_MS + 2).kind).toBe('ignored')
    const r = result(e, START + DURATION_MS + 3)
    expect(r.f).toBe(0)
    expect(r.c).toBe(0)
    expect(r.t).toBe(60)
  })

  it('lives loss gives t=60', () => {
    const e = createEngine(plan(), START)
    tap(e, 1, START + 1000)
    tap(e, 3, START + 1000)
    tap(e, 5, START + 1000)
    expect(result(e, START + 1000)).toEqual({ c: 0, m: 3, f: 3, t: 60 })
  })
})

describe('Review Focus 2: derived from nowMs only', () => {
  it('status after a long gap with no calls', () => {
    const e = createEngine(plan(), START)
    const st = status(e, START + 45000)
    expect(st.remainingMs).toBe(15000)
    expect(st.ended).toBeNull()
    expect(st.total).toBe(3)
    const s = seatOf(plan(), 0)
    expect(poseAt(s, START + 45000, START)).toBe(poseAt(s, START + 45000, START))
  })

  it('timeout is evaluated at tap time too', () => {
    const e = createEngine(plan(), START)
    expect(tap(e, 0, START + 70000).kind).toBe('ignored')
    expect(status(e, START + 70000).ended).toBe('timeout')
  })
})

describe('Review Focus 3: swap seat before swap', () => {
  it('early tap is innocent before-swap; later tap catches', () => {
    const e = createEngine(plan(), START)
    const r = tap(e, 2, START + 10000)
    expect(r).toEqual({ kind: 'innocent', seat: 2, id: 'glasses-swap', reason: 'before-swap' })
    const st = status(e, START + 10000)
    expect(st.lives).toBe(2)
    expect(st.caught).toBe(0)
    const r2 = tap(e, 2, START + 21000)
    expect(r2.kind).toBe('caught')
    expect(status(e, START + 21000).caught).toBe(1)
  })
})
