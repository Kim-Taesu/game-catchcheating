import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { flagOf, originFlags } from '../public/game/labels.js'

const cases = JSON.parse(readFileSync(new URL('../public/data/cases.json', import.meta.url), 'utf8')) as {
  id: string
  playable?: boolean
  origins: { country: string }[]
}[]

describe('country flags', () => {
  it('turns an ISO code into its flag emoji', () => {
    expect(flagOf('KR')).toBe('🇰🇷')
    expect(flagOf('JP')).toBe('🇯🇵')
    expect(flagOf('ES')).toBe('🇪🇸')
  })
  it('returns empty for anything that is not two capital letters', () => {
    for (const bad of ['', 'K', 'kr', 'KOR', '1A', undefined]) expect(flagOf(bad as string)).toBe('')
  })
  it('lists each country once, in the order the case first names it', () => {
    expect(originFlags([{ country: 'KR' }, { country: 'JP' }, { country: 'KR' }, { country: 'TH' }])).toBe('🇰🇷🇯🇵🇹🇭')
  })
  it('every playable case has at least one flag', () => {
    for (const c of cases.filter((x) => x.playable)) expect(originFlags(c.origins), c.id).not.toBe('')
  })
})
