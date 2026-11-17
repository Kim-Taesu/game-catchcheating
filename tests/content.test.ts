import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { CaseEntry, Innocent } from '../public/game/round.js'

const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T
const cases = read<CaseEntry[]>('../public/data/cases.json')
const innocents = read<Innocent[]>('../public/data/innocents.json')

const PLAYABLE = [
  'smart-glasses-frame', 'glasses-lens-heat', 'earpiece-hidden', 'bone-conduction', 'smartwatch', 'phone-in-clothes',
  'glasses-swap', 'earbud-swallow', 'ear-bandage', 'signal-fingers', 'peek', 'cheat-sheet-sleeve',
]
const DEX_ONLY = ['button-camera', 'calculator-mod', 'body-writing', 'disguised-item', 'phone-in-bag', 'proxy-id']
const RUMORS = ['rumor-forum-confession', 'rumor-video-comment', 'rumor-broker-telegram']
const INNOCENTS = [
  'think-chin', 'look-up', 'plain-glasses', 'yawn', 'pencil-spin', 'rub-eyes', 'analog-watch', 'plain-calculator',
  'sneeze', 'drink-water', 'scratch-head', 'stretch', 'erase', 'turn-back', 'nose-sniff',
]
const LOOKALIKES: Record<string, string> = {
  'smart-glasses-frame': 'plain-glasses',
  'glasses-swap': 'plain-glasses',
  smartwatch: 'analog-watch',
  'earpiece-hidden': 'sneeze',
  'earbud-swallow': 'sneeze',
}
const STATUSES = ['confirmed', 'investigating', 'mentioned', 'unverified']
const BASIS = ['report', 'guideline', 'community', 'industry']
const BANNED = ['냥이', '리트 만점']

const ids = (list: { id: string }[]) => list.map((x) => x.id).sort()

/** 모든 문자열 값을 모은다 (중첩 객체·배열 포함). */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

describe('cases.json', () => {
  it('has the exact id sets: 12 playable, 6 dex-only, 3 rumors', () => {
    expect(ids(cases.filter((c) => c.playable))).toEqual([...PLAYABLE].sort())
    expect(ids(cases.filter((c) => !c.playable && c.status !== 'unverified'))).toEqual([...DEX_ONLY].sort())
    expect(ids(cases.filter((c) => c.status === 'unverified'))).toEqual([...RUMORS].sort())
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length)
  })

  it('every case has a known status and at least one https source (rumors cite the report that calls them unverified)', () => {
    for (const c of cases) {
      expect(STATUSES, c.id).toContain(c.status)
      expect(c.sources.length, c.id).toBeGreaterThanOrEqual(1)
      for (const s of c.sources) expect(s.url, c.id).toMatch(/^https:\/\//)
    }
  })

  it('keeps the calculator case under investigation (mechanism unconfirmed)', () => {
    expect(cases.find((c) => c.id === 'calculator-mod')!.status).toBe('investigating')
  })

  it('industry-based tells disclose that they are not an observed catch', () => {
    for (const c of cases.filter((x) => x.playable && x.tell!.basisKind === 'industry')) {
      expect(c.tell!.basisNote ?? '', c.id).toContain('업계 설명')
    }
  })

  it('playable cases carry a sourced tell', () => {
    for (const c of cases.filter((x) => x.playable)) {
      expect(c.tell, c.id).toBeDefined()
      expect(BASIS, c.id).toContain(c.tell!.basisKind)
      expect(c.tell!.basisSources.length, c.id).toBeGreaterThanOrEqual(1)
      for (const s of c.tell!.basisSources) expect(s.url, c.id).toMatch(/^https:\/\//)
      expect(c.tell!.action.trim(), c.id).not.toBe('')
    }
  })

  it('dex-only cases are marked low visibility; rumors are never playable', () => {
    for (const c of cases.filter((x) => DEX_ONLY.includes(x.id))) expect(c.visibility, c.id).toBe('low')
    for (const c of cases.filter((x) => x.status === 'unverified')) expect(c.playable, c.id).toBe(false)
  })

  it('phone-in-clothes says its pose is staged', () => {
    const c = cases.find((x) => x.id === 'phone-in-clothes')!
    expect(c.tell!.basisNote).toContain('수법은 보도, 행동 포즈는 연출')
  })

  it('only glasses-swap swaps', () => {
    for (const c of cases.filter((x) => x.playable)) expect(c.tell!.swap === true, c.id).toBe(c.id === 'glasses-swap')
  })

  it('has exactly the planned lookalike pairs, all pointing at real innocents', () => {
    const actual = Object.fromEntries(cases.filter((x) => x.lookalike).map((c) => [c.id, c.lookalike]))
    expect(actual).toEqual(LOOKALIKES)
    const innocentIds = new Set(innocents.map((i) => i.id))
    for (const target of Object.values(actual)) expect(innocentIds.has(target!), target).toBe(true)
  })

  it('keeps summary, cue and detect short', () => {
    for (const c of cases) for (const field of [c.summary, c.cue, c.detect]) expect(field.length, c.id).toBeLessThanOrEqual(160)
  })
})

describe('innocents.json', () => {
  it('has the 15 ids with a behavior and a reason', () => {
    expect(ids(innocents)).toEqual([...INNOCENTS].sort())
    for (const i of innocents) {
      expect(['oneoff', 'repeat'], i.id).toContain(i.behavior)
      expect(i.why.trim(), i.id).not.toBe('')
    }
    expect(innocents.filter((i) => i.behavior === 'repeat').length).toBeGreaterThanOrEqual(5)
    expect(innocents.filter((i) => i.behavior === 'oneoff').length).toBeGreaterThanOrEqual(5)
  })

  it('does not attribute its guidance to an official body', () => {
    for (const i of innocents) for (const word of ['지침', '교육부', '교육청']) expect(i.why.includes(word), i.id).toBe(false)
  })
})

describe('content policy', () => {
  it('names no individual (banned nicknames/phrases)', () => {
    for (const text of [...strings(cases), ...strings(innocents)]) {
      for (const word of BANNED) expect(text.includes(word), `${word} in "${text}"`).toBe(false)
    }
  })
})
