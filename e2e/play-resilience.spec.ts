import { expect, test } from '@playwright/test'
import fs from 'node:fs'
// @ts-expect-error plain JS module without d.ts path mapping in e2e
import { buildRound, seededRng } from '../public/game/round.js'
// @ts-expect-error plain JS module
import { TITLE_TEXT } from '../public/game/result.js'

test.use({ viewport: { width: 375, height: 667 } })

const cases = JSON.parse(fs.readFileSync('public/data/cases.json', 'utf8'))
const innocents = JSON.parse(fs.readFileSync('public/data/innocents.json', 'utf8'))
const SEED = 7
const plan = buildRound(cases, innocents, seededRng(SEED))
const cheaters = plan.seats.filter((s: { kind: string }) => s.kind === 'cheater') as { seat: number }[]
const seat = (page: import('@playwright/test').Page, n: number) => page.locator(`[data-seat="${n}"]`)

test('이미지가 모두 실패해도 대체 카드로 한 판이 끝까지 진행', async ({ page }) => {
  await page.route('**/px/*.webp', (r) => r.abort())
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  await expect(page.locator('.seat-fallback')).toHaveCount(9)
  // The abort took effect: no seat image finished loading.
  const loaded = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-seat] img')].filter((i) => i.complete && i.naturalWidth > 0).length,
  )
  expect(loaded).toBe(0)
  for (let i = 0; i < 9; i++) {
    const text = (await seat(page, i).locator('.seat-fallback').textContent()) ?? ''
    expect(text).toContain(`응시자 ${i + 1}`)
  }
  for (let i = 0; i < 9; i++) {
    const text = (await seat(page, i).textContent()) ?? ''
    for (const c of cases) expect(text).not.toContain(c.name)
  }
  for (const s of cheaters) {
    await seat(page, s.seat).click()
    await expect(page.locator('#panel')).toBeVisible()
  }
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
  await expect(page.locator('#end')).toBeVisible()
  expect(Object.values(TITLE_TEXT)).toContain(await page.locator('#end h2').textContent())
})

test('탭 비활성 모사: 45초 점프 후 남은 시간 약 15초, 이후 시간 종료', async ({ page }) => {
  await page.clock.install()
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  await page.clock.fastForward(45_000)
  const text = (await page.locator('#game').textContent()) ?? ''
  const m = text.match(/남은 시간\s*(\d+)\s*초/)
  expect(m).not.toBeNull()
  const left = Number(m![1])
  expect(left).toBeGreaterThanOrEqual(14)
  expect(left).toBeLessThanOrEqual(16)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  await expect(page.locator('#game')).not.toHaveAttribute('data-ended', /.+/)
  await page.clock.fastForward(20_000)
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'timeout')
  await expect(page.locator('#end')).toBeVisible()
  await expect(page.locator('#end')).toContainText(`놓친 ${cheaters.length}`)
})
