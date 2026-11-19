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

test('안내 그림: 1장 시험장 9칸(그림 18장), 2장 6칸, 3장 누르기 장면, 모두 로드된다', async ({ page }) => {
  await page.goto('/play?seed=7')
  const imgsLoaded = () =>
    page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('#intro img')].every((i) => i.complete && i.naturalWidth > 0))
  await expect(intro(page).locator('.mini-hall .mini-seat')).toHaveCount(9)
  await expect(intro(page).locator('.mini-hall img')).toHaveCount(18)
  await expect.poll(imgsLoaded).toBe(true)
  await intro(page).getByRole('button', { name: '다음' }).click()
  await expect(intro(page).locator('.intro-row .mini-seat')).toHaveCount(6)
  await expect.poll(imgsLoaded).toBe(true)
  await intro(page).getByRole('button', { name: '다음' }).click()
  await expect(intro(page).locator('.tap-demo .mini-seat')).toHaveCount(2)
  await expect(intro(page)).toContainText('적발! AI 스마트안경')
  await expect.poll(imgsLoaded).toBe(true)
})

test('움직임 줄이기: 안내 애니메이션 없이 행동 장면을 멈춘 그림으로', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/play?seed=7')
  const first = intro(page).locator('.mini-hall .motion-repeat .mini-img-1').first()
  await expect(first).toHaveCSS('animation-name', 'none')
  await expect(first).toHaveCSS('opacity', '1')
  await expect(intro(page).locator('.mini-scan')).toBeHidden()
})
