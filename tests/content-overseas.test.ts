import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CaseEntry } from '../public/game/round.js'

const cases = JSON.parse(readFileSync(new URL('../public/data/cases.json', import.meta.url), 'utf8')) as CaseEntry[]
const overseas = cases.flatMap((c) => c.origins.filter((o) => o.country !== 'KR').map((o) => ({ c, o })))

describe('overseas origins', () => {
  it('has at least 8 overseas origins from at least 4 countries', () => {
    expect(overseas.length).toBeGreaterThanOrEqual(8)
    expect(new Set(overseas.map(({ o }) => o.country)).size).toBeGreaterThanOrEqual(4)
  })

  it('uses ISO two-letter upper-case country codes everywhere', () => {
    for (const c of cases) for (const o of c.origins) expect(o.country, c.id).toMatch(/^[A-Z]{2}$/)
  })

  it('backs every overseas origin with one of its case sources', () => {
    for (const { c, o } of overseas) {
      expect(o.sourceUrl, `${c.id} ${o.label}`).toBeDefined()
      expect(c.sources.map((s) => s.url), `${c.id} ${o.label}`).toContain(o.sourceUrl)
    }
  })
})
