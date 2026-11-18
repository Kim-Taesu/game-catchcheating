import { describe, expect, it } from 'vitest'
import {
  ACTION_MS,
  buildRound,
  seededRng,
  type CaseEntry,
  type Innocent,
  type RoundPlan,
} from '../public/game/round.js'

const src = [{ title: 't', url: 'https://example.com' }]

function playable(
  id: string,
  extra: Partial<CaseEntry> = {},
  swap = false,
): CaseEntry {
  return {
    id,
    name: id,
    group: 'device',
    origins: [{ country: 'KR', year: 2026, label: 'kr' }],
    summary: 's',
    cue: 'c',
    detect: 'd',
    status: 'confirmed',
    sources: src,
    playable: true,
    tell: { action: 'a', basisKind: 'report', basisSources: src, ...(swap ? { swap: true } : {}) },
    ...extra,
  }
}

function notPlayable(id: string, extra: Partial<CaseEntry> = {}): CaseEntry {
  return {
    id,
    name: id,
    group: 'classic',
    origins: [{ country: 'KR', year: 2020, label: 'kr' }],
    summary: 's',
    cue: 'c',
    detect: 'd',
    status: 'confirmed',
    sources: src,
    playable: false,
    ...extra,
  }
}

const cases: CaseEntry[] = [
  playable('glasses', {
    origins: [
      { country: 'KR', year: 2026, label: 'kr' },
      { country: 'JP', year: 2025, label: 'jp' },
    ],
    lookalike: 'inn-glasses',
  }),
  playable('watch', { lookalike: 'inn-watch' }),
  playable('earpiece'),
  playable('sleeve'),
  playable('swap', {}, true),
  notPlayable('hidden-camera'),
  playable('rumor', { status: 'unverified' }),
]

const innocents: Innocent[] = [
  { id: 'inn-glasses', name: 'g', behavior: 'oneoff', action: '한다', why: 'w' },
  { id: 'inn-watch', name: 'w', behavior: 'repeat', action: '한다', why: 'w' },
  { id: 'inn-3', name: '3', behavior: 'oneoff', action: '한다', why: 'w' },
  { id: 'inn-4', name: '4', behavior: 'repeat', action: '한다', why: 'w' },
  { id: 'inn-5', name: '5', behavior: 'oneoff', action: '한다', why: 'w' },
  { id: 'inn-6', name: '6', behavior: 'repeat', action: '한다', why: 'w' },
  { id: 'inn-7', name: '7', behavior: 'oneoff', action: '한다', why: 'w' },
  { id: 'inn-8', name: '8', behavior: 'repeat', action: '한다', why: 'w' },
  { id: 'inn-9', name: '9', behavior: 'oneoff', action: '한다', why: 'w' },
  { id: 'inn-10', name: '10', behavior: 'repeat', action: '한다', why: 'w' },
]

const seeds = Array.from({ length: 200 }, (_, i) => i + 1)
const rounds: RoundPlan[] = seeds.map((s) => buildRound(cases, innocents, seededRng(s)))
const caseById = new Map(cases.map((c) => [c.id, c]))
const innById = new Map(innocents.map((i) => [i.id, i]))

function gaps(xs: number[]): number[] {
  return xs.slice(1).map((x, i) => x - xs[i]!)
}

describe('buildRound constraints', () => {
  it('exports ACTION_MS = 2000 (long enough to read the pose)', () => {
    expect(ACTION_MS).toBe(2000)
  })

  it('never overlaps two action poses of the same seat', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const s of buildRound(cases, innocents, seededRng(seed)).seats) {
        for (let i = 1; i < s.onsets.length; i++) expect(s.onsets[i] - s.onsets[i - 1]).toBeGreaterThanOrEqual(ACTION_MS)
      }
    }
  })

  it('has 9 unique seats, 3 or 4 cheaters, unique ids, only eligible cases', () => {
    for (const r of rounds) {
      expect(r.seats).toHaveLength(9)
      expect(r.seats.map((s) => s.seat).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
      expect([3, 4]).toContain(r.cheaterCount)
      const cheaters = r.seats.filter((s) => s.kind === 'cheater')
      expect(cheaters).toHaveLength(r.cheaterCount)
      expect(new Set(r.seats.map((s) => s.id)).size).toBe(9)
      for (const c of cheaters) {
        const entry = caseById.get(c.id)!
        expect(entry.playable).toBe(true)
        expect(entry.status).not.toBe('unverified')
      }
      for (const s of r.seats.filter((x) => x.kind === 'innocent')) {
        expect(innById.has(s.id)).toBe(true)
      }
    }
  })

  it('includes at least one overseas case in every round', () => {
    for (const r of rounds) {
      const overseas = r.seats
        .filter((s) => s.kind === 'cheater')
        .filter((s) => caseById.get(s.id)!.origins.some((o) => o.country !== 'KR'))
      expect(overseas.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('is deterministic per seed and varies across seeds', () => {
    for (const s of [1, 7, 42, 200]) {
      expect(buildRound(cases, innocents, seededRng(s))).toEqual(
        buildRound(cases, innocents, seededRng(s)),
      )
    }
    const distinct = new Set(rounds.map((r) => JSON.stringify(r)))
    expect(distinct.size).toBeGreaterThanOrEqual(2)
    const layouts = new Set(rounds.map((r) => r.seats.map((s) => s.id).join('|')))
    expect(layouts.size).toBeGreaterThanOrEqual(2)
  })

  it('cheater onsets are ascending, spaced 3500-6500ms, start 0-6000, end < 60000', () => {
    for (const r of rounds) {
      for (const s of r.seats.filter((x) => x.kind === 'cheater')) {
        if (caseById.get(s.id)!.tell?.swap) continue
        expect(s.onsets.length).toBeGreaterThan(0)
        expect(s.onsets[0]).toBeGreaterThanOrEqual(0)
        expect(s.onsets[0]).toBeLessThanOrEqual(6000)
        expect(s.onsets[s.onsets.length - 1]).toBeLessThan(60000)
        for (const g of gaps(s.onsets)) {
          expect(g).toBeGreaterThanOrEqual(3500)
          expect(g).toBeLessThanOrEqual(6500)
        }
      }
    }
  })

  it('innocent onsets follow their behavior', () => {
    let repeat = 0
    let oneoff = 0
    for (const r of rounds) {
      for (const s of r.seats.filter((x) => x.kind === 'innocent')) {
        expect(s.swapAtMs).toBeUndefined()
        const inn = innById.get(s.id)!
        if (inn.behavior === 'repeat') {
          repeat++
          expect(s.onsets.length).toBeGreaterThan(0)
          expect(s.onsets[s.onsets.length - 1]).toBeLessThan(60000)
          for (const g of gaps(s.onsets)) {
            expect(g).toBeGreaterThanOrEqual(6000)
            expect(g).toBeLessThanOrEqual(10000)
          }
        } else {
          oneoff++
          expect([1, 2]).toContain(s.onsets.length)
          for (const t of s.onsets) {
            expect(t).toBeGreaterThanOrEqual(3000)
            expect(t).toBeLessThanOrEqual(55000)
          }
          expect([...s.onsets].sort((a, b) => a - b)).toEqual(s.onsets)
        }
      }
    }
    expect(repeat).toBeGreaterThan(0)
    expect(oneoff).toBeGreaterThan(0)
  })

  it('swap case has swapAtMs 18000-22000 and no onsets', () => {
    let seen = 0
    for (const r of rounds) {
      for (const s of r.seats.filter((x) => x.kind === 'cheater')) {
        if (!caseById.get(s.id)!.tell?.swap) {
          expect(s.swapAtMs).toBeUndefined()
          continue
        }
        seen++
        expect(s.onsets).toEqual([])
        expect(s.swapAtMs).toBeGreaterThanOrEqual(18000)
        expect(s.swapAtMs).toBeLessThanOrEqual(22000)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('seats the lookalike innocent whenever its case is chosen', () => {
    let checked = 0
    for (const r of rounds) {
      const ids = new Set(r.seats.map((s) => s.id))
      for (const s of r.seats.filter((x) => x.kind === 'cheater')) {
        const look = caseById.get(s.id)!.lookalike
        if (!look) continue
        checked++
        expect(ids.has(look)).toBe(true)
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('builds a round without throwing when no overseas case exists', () => {
    const domestic = cases.map((c) => ({
      ...c,
      origins: [{ country: 'KR', year: 2026, label: 'kr' }],
    }))
    for (const s of seeds.slice(0, 50)) {
      const r = buildRound(domestic, innocents, seededRng(s))
      expect(r.seats).toHaveLength(9)
    }
  })

  it('ignores a lookalike id that is not in the innocents list', () => {
    const odd = cases.map((c) => (c.id === 'watch' ? { ...c, lookalike: 'missing' } : c))
    for (const s of seeds.slice(0, 50)) {
      const r = buildRound(odd, innocents, seededRng(s))
      expect(r.seats).toHaveLength(9)
      expect(new Set(r.seats.map((x) => x.id)).size).toBe(9)
    }
  })
})
