import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 667 } })

const intro = (page: import('@playwright/test').Page) => page.locator('#intro')

test('게임 전 안내 3장: 다음 → 다음 → 게임 시작을 눌러야 판이 시작된다', async ({ page }) => {
  await page.goto('/play?seed=7')
  await expect(intro(page)).toBeVisible()
  await expect(intro(page)).toContainText('1 / 3')
  await expect(page.locator('[data-seat]')).toHaveCount(0)
  await expect(page.locator('#game')).not.toContainText('남은 시간')
  await expect(intro(page).locator('h2')).toBeFocused()
  await intro(page).getByRole('button', { name: '다음' }).click()
  await expect(intro(page)).toContainText('2 / 3')
  await expect(intro(page).locator('h2')).toBeFocused()
  await intro(page).getByRole('button', { name: '다음' }).click()
  await expect(intro(page)).toContainText('3 / 3')
  await expect(intro(page).getByRole('button', { name: '다음' })).toHaveCount(0)
  await intro(page).getByRole('button', { name: '게임 시작' }).click()
  await expect(intro(page)).toHaveCount(0)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  await expect(page.locator('#game')).toContainText('남은 시간 60초')
})

test('안내를 보는 동안에는 시간이 흐르지 않는다', async ({ page }) => {
  await page.clock.install()
  await page.goto('/play?seed=7')
  await expect(intro(page)).toBeVisible()
  await page.clock.fastForward(70000)
  await intro(page).getByRole('button', { name: '다음' }).click()
  await intro(page).getByRole('button', { name: '다음' }).click()
  await intro(page).getByRole('button', { name: '게임 시작' }).click()
  await expect(page.locator('#game')).toContainText('남은 시간 60초')
  await expect(page.locator('#game')).not.toHaveAttribute('data-ended', /.+/)
})

test('안내 화면은 한 화면에 들어가고 가로 스크롤이 없다', async ({ page }) => {
  await page.goto('/play?seed=7')
  for (let step = 1; step <= 3; step++) {
    const btn = intro(page).getByRole('button', { name: step < 3 ? '다음' : '게임 시작' })
    const box = (await btn.boundingBox())!
    expect(box.y + box.height, `step ${step}`).toBeLessThanOrEqual(667)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
    if (step < 3) await btn.click()
  }
})

test('결과 화면의 다시 하기는 안내 없이 바로 시작한다', async ({ page }) => {
  await page.goto('/play?again=1&seed=7')
  await expect(intro(page)).toHaveCount(0)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
})
