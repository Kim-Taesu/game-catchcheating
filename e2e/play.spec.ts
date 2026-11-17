import { expect, test } from '@playwright/test'
import { cases, cheatersOf, innocents, innocentsOf, planFor, seat, startRound } from './helpers'

test.use({ viewport: { width: 375, height: 667 } })

// seed 7: 3 cheaters, none with a swap -> deterministic without a mocked clock.
const SEED = 7
const p7 = planFor(SEED)
const cheaters = cheatersOf(p7)
const innos = innocentsOf(p7)

test('좌석 9개, 터치 크기, HUD', async ({ page }) => {
  await startRound(page, SEED)
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

test('행동 포즈 이미지 9장이 로드 직후 미리 요청된다', async ({ page }) => {
  const urls = new Set<string>()
  page.on('request', (r) => {
    const m = new URL(r.url()).pathname.match(/^\/px\/.+-1\.webp$/)
    if (m) urls.add(m[0])
  })
  await startRound(page, SEED)
  const expected = [...new Set(p7.seats.map((s) => `/px/${s.id}-1.webp`))]
  expect(expected).toHaveLength(9)
  await expect.poll(() => expected.every((u) => urls.has(u)), { timeout: 2000 }).toBe(true)
})

const caseName = (id: string) => cases.find((c: { id: string }) => c.id === id).name as string
// Every non-catch tap gets the same toast shape, so the toast never tells the swap seat apart.
const NON_CATCH = /^정상 행동입니다 · 응시자 \d$/

test('수법 좌석 탭: 상단 짧은 알림, 발견 저장, 적발 +1, 알림에 링크 없음', async ({ page }) => {
  await startRound(page, SEED)
  const target = cheaters.find((s) => s.id === 'phone-in-clothes')!
  await seat(page, target.seat).click()
  const toast = page.locator('#toast')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveText(`적발! ${caseName('phone-in-clothes')} · 확인됨`)
  await expect(toast.locator('a')).toHaveCount(0)
  await expect(page.locator('#panel-live')).toHaveText(`적발! ${caseName('phone-in-clothes')} · 확인됨`)
  const stored = await page.evaluate(() => localStorage.getItem('cf:discovered'))
  expect(JSON.parse(stored!)).toContain('phone-in-clothes')
  await expect(seat(page, target.seat)).toHaveAttribute('data-caught', '')
  await expect(page.locator('#game')).toContainText('수상한 응시자 3명 중 1명 적발')
  // The running game has no link that would navigate away.
  await expect(page.locator('#game a')).toHaveCount(0)
})

test('Esc로 알림 닫기', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, cheaters[0].seat).click()
  await expect(page.locator('#toast')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#toast')).toBeHidden()
})

test('평범 좌석 탭: 정상 행동 알림, 기회 -1, 확인함 표시', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#toast')).toHaveText(`정상 행동입니다 · 응시자 ${innos[0].seat + 1}`)
  await expect(page.locator('#toast')).toHaveText(NON_CATCH)
  await expect(page.locator('#toast')).not.toContainText(innocents.find((i: { id: string }) => i.id === innos[0].id).name)
  await expect(page.locator('#panel-live')).toHaveText(`정상 행동입니다 · 응시자 ${innos[0].seat + 1}`)
  await expect(page.locator('#game')).toContainText('기회 2')
  await expect(seat(page, innos[0].seat)).toHaveAttribute('data-cleared', '')
  await expect(seat(page, innos[0].seat).locator('.stamp-cleared')).toBeVisible()
  await expect(seat(page, innos[0].seat)).toBeEnabled()
})

test('같은 평범 좌석을 다시 탭해도 기회는 한 번만 줄어듦', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#game')).toContainText('기회 2')
  await seat(page, innos[0].seat).click()
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#game')).toContainText('기회 2')
  await seat(page, innos[1].seat).click()
  await expect(page.locator('#game')).toContainText('기회 1')
})

test('기회 3번 소진 시 종료', async ({ page }) => {
  await startRound(page, SEED)
  for (const s of innos.slice(0, 3)) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'lives')
  await expect(page.locator('#end')).toBeVisible()
  await expect(page.locator('#end')).toContainText('시험 종료')
})

test('수법 전원 적발 시 종료', async ({ page }) => {
  await startRound(page, SEED)
  for (const s of cheaters) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
  await expect(page.locator('#end')).toContainText('시험 종료')
})

test('안경 바꿔치기: 교체 전 탭은 평범 응시자와 같은 알림, 재탭 무시, 교체 후 적발', async ({ page }) => {
  // seed 4: one seat is glasses-swap (swapAtMs 18-22 s).
  const p = planFor(4)
  const sw = p.seats.find((s) => s.swapAtMs !== undefined)!
  await page.clock.install()
  await startRound(page, 4)
  await seat(page, sw.seat).click()
  await expect(page.locator('#toast')).toHaveText(`정상 행동입니다 · 응시자 ${sw.seat + 1}`)
  await expect(page.locator('#toast')).toHaveText(NON_CATCH)
  await expect(page.locator('#panel-live')).toHaveText(`정상 행동입니다 · 응시자 ${sw.seat + 1}`)
  await expect(page.locator('#game')).toContainText('기회 2')
  await expect(seat(page, sw.seat)).toHaveAttribute('data-cleared', '')
  await expect(seat(page, sw.seat)).not.toContainText('안경 바꿔치기')
  await seat(page, sw.seat).click()
  await expect(page.locator('#game')).toContainText('기회 2')
  await page.clock.fastForward(sw.swapAtMs! + 1000)
  await seat(page, sw.seat).click()
  await expect(page.locator('#toast')).toContainText('적발! 안경 바꿔치기')
  await expect(seat(page, sw.seat)).toHaveAttribute('data-caught', '')
  await expect(seat(page, sw.seat)).not.toHaveAttribute('data-cleared', '')
  await expect(page.locator('#game')).toContainText('기회 2')
})

test('교체 전 오해는 결과 목록에서 사건 이름 없이 응시자 N으로 표시', async ({ page }) => {
  const p = planFor(4)
  const sw = p.seats.find((s) => s.swapAtMs !== undefined)!
  await page.clock.install()
  await startRound(page, 4)
  await seat(page, sw.seat).click()
  await page.clock.fastForward(61000)
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'timeout')
  const item = page.locator('#end-misjudged li').first()
  await expect(item).toContainText(`응시자 ${sw.seat + 1} — 이때는 아직 수상한 점이 보이지 않았어요`)
  await expect(item).not.toContainText('안경 바꿔치기')
  await expect(page.locator('#end-missed')).toContainText('안경 바꿔치기')
})

test('시간 종료', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  await page.clock.fastForward(61000)
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'timeout')
  await expect(page.locator('#end')).toContainText('시험 종료')
  await expect(page.locator('#end')).toContainText('시간 종료')
})

test('탭 전에는 어떤 좌석도 사건 이름을 드러내지 않음', async ({ page }) => {
  await startRound(page, SEED)
  for (let i = 0; i < 9; i++) {
    const text = (await seat(page, i).textContent()) ?? ''
    expect(text).toContain(`응시자 ${i + 1}`)
    for (const c of cases) expect(text).not.toContain(c.name)
  }
})

test('이미지가 막혀도 대체 카드는 응시자 N만 보여 줌', async ({ page }) => {
  await page.route('**/px/**', (r) => r.abort())
  await startRound(page, SEED)
  await expect(page.locator('.seat-fallback')).toHaveCount(9)
  for (let i = 0; i < 9; i++) {
    const text = (await seat(page, i).locator('.seat-fallback').textContent()) ?? ''
    for (const c of cases) expect(text).not.toContain(c.name)
  }
})

test('알림은 2.5초 뒤 자동으로 닫히고, 새 탭은 알림을 바꿈', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#toast')).toBeVisible()
  await page.clock.fastForward(2000)
  await seat(page, cheaters[0].seat).click()
  await expect(page.locator('#toast')).toContainText('적발!')
  await page.clock.fastForward(2000)
  await expect(page.locator('#toast')).toBeVisible()
  await page.clock.fastForward(700)
  await expect(page.locator('#toast')).toBeHidden()
})

for (const vp of [{ width: 375, height: 667 }, { width: 360, height: 600 }]) {
  test.describe(`${vp.width}×${vp.height}`, () => {
    test.use({ viewport: vp })
    test('알림이 떠 있어도 모든 좌석 중심을 누를 수 있음', async ({ page }) => {
      await startRound(page, SEED)
      await seat(page, innos[0].seat).click()
      const toast = page.locator('#toast')
      await expect(toast).toBeVisible()
      const tb = (await toast.boundingBox())!
      expect(tb.height).toBeLessThanOrEqual(72)
      const gb = (await page.locator('.seats').boundingBox())!
      expect(tb.y + tb.height).toBeLessThanOrEqual(gb.y)
      const hits = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-seat]')].map((b) => {
          const r = b.getBoundingClientRect()
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return hit !== null && b.contains(hit)
        }),
      )
      expect(hits).toEqual(Array(9).fill(true))
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width)
    })
  })
}

test('종료 후: 알림 없음, 좌석 비활성, 재탭 무시, onEnd 한 번, 만난 수법 목록', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  for (const s of cheaters) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
  for (let i = 0; i < 9; i++) await expect(seat(page, i)).toBeDisabled()
  await expect(page.locator('#toast')).toBeHidden()
  await page.clock.fastForward(10000)
  // Programmatic taps after the end (and on caught seats) change nothing.
  await page.evaluate(() => document.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach((b) => b.click()))
  await expect(page.locator('#game')).toContainText('수상한 응시자 3명 중 3명 적발')
  await expect(page.locator('#game')).toContainText('기회 3')
  await expect(page.locator('#toast')).toBeHidden()
  // onEnd ran exactly once (showResult rebuilds the DOM, so only the counter can tell).
  await page.waitForTimeout(300)
  await expect(page.locator('#end')).toHaveAttribute('data-end-count', '1')
  const met = page.locator('#end-met')
  await expect(met).toContainText('이번 판에서 만난 수법')
  await expect(met.locator('li')).toHaveCount(cheaters.length)
  for (const s of cheaters) {
    await expect(met).toContainText(caseName(s.id))
    await expect(met.locator(`a[href="/dex#${s.id}"]`)).toHaveText('도감에서 자세히')
  }
  await expect(met).toContainText('근거:')
  await expect(page.locator('#end-misjudged')).toHaveCount(0)
  await expect(page.locator('#end-missed')).toHaveCount(0)
})

test('기회 소진 결과: 오해한 응시자와 놓친 수법 목록', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, cheaters[0].seat).click()
  for (const s of innos.slice(0, 3)) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'lives')
  const wrong = page.locator('#end-misjudged')
  await expect(wrong).toContainText('오해한 응시자')
  await expect(wrong.locator('li')).toHaveCount(3)
  for (const s of innos.slice(0, 3)) {
    const inn = innocents.find((i: { id: string }) => i.id === s.id)
    await expect(wrong).toContainText(inn.name)
    await expect(wrong).toContainText(inn.why)
  }
  await expect(wrong.locator('li').first()).toContainText('단일 행동만으로는 부정행위라고 단정할 수 없습니다.')
  const missed = page.locator('#end-missed')
  await expect(missed).toContainText('놓친 수법')
  await expect(missed.locator('li')).toHaveCount(cheaters.length - 1)
  for (const s of cheaters.slice(1)) await expect(missed.locator(`a[href="/dex#${s.id}"]`)).toBeVisible()
  await expect(page.locator('#end-met li')).toHaveCount(1)
})
