import { expect, test } from '@playwright/test'
import fs from 'node:fs'
// @ts-expect-error plain JS module without d.ts path mapping in e2e
import { buildRound, seededRng } from '../public/game/round.js'

test.use({ viewport: { width: 375, height: 667 } })

const cases = JSON.parse(fs.readFileSync('public/data/cases.json', 'utf8'))
const innocents = JSON.parse(fs.readFileSync('public/data/innocents.json', 'utf8'))

type Seat = { seat: number; kind: 'cheater' | 'innocent'; id: string; swapAtMs?: number }
function plan(seed: number): { seats: Seat[]; cheaterCount: number } {
  return buildRound(cases, innocents, seededRng(seed))
}

// seed 7: 3 cheaters, none with a swap -> deterministic without a mocked clock.
const SEED = 7
const p7 = plan(SEED)
const cheaters = p7.seats.filter((s) => s.kind === 'cheater')
const innos = p7.seats.filter((s) => s.kind === 'innocent')
const seat = (page: import('@playwright/test').Page, n: number) => page.locator(`[data-seat="${n}"]`)

test('좌석 9개, 터치 크기, HUD', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  for (let i = 0; i < 9; i++) {
    const box = await seat(page, i).boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await expect(page.locator('#game')).toContainText('수상한 응시자 3명 중 0명 적발')
  await expect(page.locator('#game')).toContainText('남은 시간')
  await expect(page.locator('#game')).toContainText('기회 3')
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(375)
})

test('수법 좌석 탭: 사건 카드, 발견 저장, 닫으면 적발 +1', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  const target = cheaters.find((s) => s.id === 'phone-in-clothes')!
  await seat(page, target.seat).click()
  const panel = page.locator('#panel')
  await expect(panel).toBeVisible()
  await expect(panel).toContainText(cases.find((c: { id: string }) => c.id === 'phone-in-clothes').name)
  await expect(panel).toContainText('확인됨')
  await expect(panel.locator('a[href="/dex#phone-in-clothes"]')).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('cf:discovered'))
  expect(JSON.parse(stored!)).toContain('phone-in-clothes')
  await expect(seat(page, target.seat)).toHaveAttribute('data-caught', '')
  await page.locator('#panel-close').click()
  await expect(panel).toBeHidden()
  await expect(page.locator('#game')).toContainText('수상한 응시자 3명 중 1명 적발')
})

test('Esc로 팝업 닫기', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  await seat(page, cheaters[0].seat).click()
  await expect(page.locator('#panel')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#panel')).toBeHidden()
})

test('평범 좌석 탭: 정상 행동 안내와 기회 -1', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  await seat(page, innos[0].seat).click()
  const panel = page.locator('#panel')
  await expect(panel).toContainText('정상 행동입니다')
  await expect(panel).toContainText('단일 행동만으로는')
  await expect(page.locator('#game')).toContainText('기회 2')
})

test('기회 3번 소진 시 종료', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  for (const s of innos.slice(0, 3)) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'lives')
  await expect(page.locator('#end')).toBeVisible()
  await expect(page.locator('#end')).toContainText('시험 종료')
})

test('수법 전원 적발 시 종료', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  for (const s of cheaters) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
  await expect(page.locator('#end')).toContainText('시험 종료')
})

test('안경 바꿔치기: 교체 전 탭은 실수, 교체 후 탭은 적발', async ({ page }) => {
  // seed 4: seat 8 is glasses-swap (swapAtMs 18-22 s).
  const p = plan(4)
  const sw = p.seats.find((s) => s.swapAtMs !== undefined)!
  await page.clock.install()
  await page.goto('/play?seed=4')
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  await seat(page, sw.seat).click()
  await expect(page.locator('#panel')).toContainText('아직 수상한 점이 보이지 않아요')
  await expect(page.locator('#panel')).toContainText('단일 행동만으로는')
  await expect(page.locator('#game')).toContainText('기회 2')
  await page.clock.fastForward(sw.swapAtMs! + 1000)
  await seat(page, sw.seat).click()
  await expect(page.locator('#panel')).toContainText('안경 바꿔치기')
  await expect(seat(page, sw.seat)).toHaveAttribute('data-caught', '')
})

test('시간 종료', async ({ page }) => {
  await page.clock.install()
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  await page.clock.fastForward(61000)
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'timeout')
  await expect(page.locator('#end')).toContainText('시험 종료')
})

test('탭 전에는 어떤 좌석도 사건 이름을 드러내지 않음', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  for (let i = 0; i < 9; i++) {
    const text = (await seat(page, i).textContent()) ?? ''
    expect(text).toContain(`응시자 ${i + 1}`)
    for (const c of cases) expect(text).not.toContain(c.name)
  }
})

test('이미지가 막혀도 대체 카드는 응시자 N만 보여 줌', async ({ page }) => {
  await page.route('**/px/**', (r) => r.abort())
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('.seat-fallback')).toHaveCount(9)
  for (let i = 0; i < 9; i++) {
    const text = (await seat(page, i).locator('.seat-fallback').textContent()) ?? ''
    for (const c of cases) expect(text).not.toContain(c.name)
  }
})

test('팝업은 4초 뒤 자동으로 닫힘', async ({ page }) => {
  await page.clock.install()
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#panel')).toBeVisible()
  await page.clock.fastForward(3000)
  await expect(page.locator('#panel')).toBeVisible()
  await page.clock.fastForward(1500)
  await expect(page.locator('#panel')).toBeHidden()
})
