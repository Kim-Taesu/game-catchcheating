import { expect, type Page } from '@playwright/test'
import fs from 'node:fs'
// @ts-expect-error plain JS module without d.ts path mapping in e2e
import { buildRound, seededRng } from '../public/game/round.js'

export type Seat = { seat: number; kind: 'cheater' | 'innocent'; id: string; swapAtMs?: number }
export type Plan = { seats: Seat[]; cheaterCount: number }

export const cases = JSON.parse(fs.readFileSync('public/data/cases.json', 'utf8'))
export const innocents = JSON.parse(fs.readFileSync('public/data/innocents.json', 'utf8'))

export function planFor(seed: number): Plan {
  return buildRound(cases, innocents, seededRng(seed))
}
export const cheatersOf = (plan: Plan) => plan.seats.filter((s) => s.kind === 'cheater')
export const innocentsOf = (plan: Plan) => plan.seats.filter((s) => s.kind === 'innocent')

export const seat = (page: Page, n: number) => page.locator(`[data-seat="${n}"]`)

export async function startRound(page: Page, seed: number) {
  await page.goto(`/play?seed=${seed}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
}
