import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { beforeSwapLine, seatLabel, tapMessage } from '../public/game/identity.js'
import { statusLabel } from '../public/game/labels.js'

const cases: { id: string; name: string; status?: string }[] = JSON.parse(fs.readFileSync('public/data/cases.json', 'utf8'))
const innocents: { id: string }[] = JSON.parse(fs.readFileSync('public/data/innocents.json', 'utf8'))
const caseById = new Map(cases.map((c) => [c.id, c]))
const NON_CATCH = /^정상 행동입니다 · 응시자 \d$/

describe('identity text', () => {
  it('every innocent tap and a before-swap tap share one shape', () => {
    const outs = [
      ...innocents.map((i, n) => ({ kind: 'innocent' as const, seat: n % 9, id: i.id })),
      { kind: 'innocent' as const, seat: 4, id: 'glasses-swap', reason: 'before-swap' as const },
    ]
    for (const o of outs) {
      const m = tapMessage(o, caseById)!
      expect(m.toast, o.id).toMatch(NON_CATCH)
      expect(m.label, o.id).toBe(`응시자 ${o.seat + 1} 확인함`)
    }
  })
  it('ignored taps produce nothing', () => {
    expect(tapMessage({ kind: 'ignored', seat: 0, id: 'x' }, caseById)).toBeNull()
  })
  it('no non-catch or idle/cleared text contains any case name', () => {
    for (const c of cases) {
      const texts = [
        tapMessage({ kind: 'innocent', seat: 3, id: c.id }, caseById)!.toast,
        tapMessage({ kind: 'innocent', seat: 3, id: c.id, reason: 'before-swap' }, caseById)!.toast,
        tapMessage({ kind: 'innocent', seat: 3, id: c.id }, caseById)!.label,
        seatLabel(3),
        seatLabel(3, 'cleared'),
        beforeSwapLine(3),
      ]
      for (const t of texts) expect(t, c.id).not.toContain(c.name)
    }
  })
  it('a catch names the case and its status label', () => {
    for (const c of cases) {
      const m = tapMessage({ kind: 'caught', seat: 2, id: c.id }, caseById)!
      expect(m.toast).toContain(c.name)
      const st = statusLabel(c)
      if (st) expect(m.toast).toContain(st)
      expect(m.label).toBe(`응시자 3 적발: ${c.name}`)
    }
  })
})
