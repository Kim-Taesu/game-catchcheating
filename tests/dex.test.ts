import { describe, expect, it } from 'vitest'
import cases from '../public/data/cases.json'
import { filterCases } from '../public/dex-logic.js'
import { loadDiscovered, markDiscovered } from '../public/game/storage.js'
import type { CaseEntry } from '../public/game/round.js'

const all = cases as CaseEntry[]
const base = { region: 'all', group: 'all', status: 'all' } as const

function memStore(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  } as unknown as Storage
}
const throwing = {
  getItem() { throw new Error('denied') },
  setItem() { throw new Error('denied') },
} as unknown as Storage

describe('filterCases', () => {
  it('기본 필터는 unverified 제외 전부', () => {
    const r = filterCases(all, base)
    expect(r.length).toBe(27)
    expect(r.some((c) => c.status === 'unverified')).toBe(false)
  })
  it('status unverified는 미검증만', () => {
    const r = filterCases(all, { ...base, status: 'unverified' })
    expect(r.length).toBe(3)
    expect(r.every((c) => c.status === 'unverified')).toBe(true)
  })
  it('region world는 해외 origin 사건만, kr는 KR origin 사건', () => {
    const w = filterCases(all, { ...base, region: 'world' })
    expect(w.length).toBeGreaterThan(0)
    expect(w.length).toBeLessThan(27)
    expect(w.every((c) => c.origins.some((o) => o.country !== 'KR'))).toBe(true)
    const k = filterCases(all, { ...base, region: 'kr' })
    expect(k.every((c) => c.origins.some((o) => o.country === 'KR'))).toBe(true)
    expect(k.some((c) => c.id === 'glasses-lens-heat')).toBe(false)
  })
  it('group·status 필터', () => {
    expect(filterCases(all, { ...base, group: 'proxy' }).map((c) => c.id)).toEqual(['proxy-id'])
    expect(filterCases(all, { ...base, status: 'investigating' }).map((c) => c.id)).toEqual(['calculator-mod'])
  })
})

describe('storage', () => {
  it('null이면 빈 Set, markDiscovered 무해', () => {
    expect(loadDiscovered(null).size).toBe(0)
    expect(() => markDiscovered(null, 'peek')).not.toThrow()
  })
  it('표시 후 읽기', () => {
    const s = memStore()
    markDiscovered(s, 'peek')
    markDiscovered(s, 'peek')
    expect(loadDiscovered(s).has('peek')).toBe(true)
    expect(JSON.parse(s.getItem('cf:discovered')!)).toEqual(['peek'])
  })
  it('예외 던지는 storage', () => {
    expect(loadDiscovered(throwing).size).toBe(0)
    expect(() => markDiscovered(throwing, 'peek')).not.toThrow()
  })
  it('깨진 JSON·배열 아님', () => {
    const s = memStore()
    s.setItem('cf:discovered', '{x')
    expect(loadDiscovered(s).size).toBe(0)
    s.setItem('cf:discovered', '{"a":1}')
    expect(loadDiscovered(s).size).toBe(0)
  })
})
