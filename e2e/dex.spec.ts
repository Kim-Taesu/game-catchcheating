import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 667 } })

test('도감: 18장(미검증 제외), 해외 필터 감소', async ({ page }) => {
  await page.goto('/dex')
  await expect(page.locator('#grid .dcard')).toHaveCount(18)
  await expect(page.locator('#progress')).toHaveText('0 / 12')
  await page.selectOption('#f-region', 'world')
  const n = await page.locator('#grid .dcard').count()
  expect(n).toBeGreaterThan(0)
  expect(n).toBeLessThan(18)
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(375)
})

test('도감: 카드 클릭 시 상세와 출처 링크, Esc로 닫기', async ({ page }) => {
  await page.goto('/dex')
  await page.locator('#grid .dcard[data-id="smart-glasses-frame"]').click()
  await expect(page.locator('#detail')).toBeVisible()
  await expect(page.locator('#d-title')).toHaveText('AI 스마트안경')
  expect(await page.locator('#d-body a[target="_blank"]').count()).toBeGreaterThanOrEqual(1)
  await expect(page.locator('#d-body')).toContainText('보도')
  await page.keyboard.press('Escape')
  await expect(page.locator('#detail')).toBeHidden()
})

test('도감: #id로 바로 열기', async ({ page }) => {
  await page.goto('/dex#glasses-lens-heat')
  await expect(page.locator('#detail')).toBeVisible()
  await expect(page.locator('#d-title')).toBeVisible()
})

test('도감: localStorage가 예외를 던져도 목록 렌더', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('denied') },
    })
  })
  await page.goto('/dex')
  await expect(page.locator('#grid .dcard')).toHaveCount(18)
})

test('도감: 발견 표시 반영', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cf:discovered', JSON.stringify(['peek'])))
  await page.goto('/dex')
  await expect(page.locator('#progress')).toHaveText('1 / 12')
})

test('도감: 미검증 코너는 접혀 있고 열면 3건', async ({ page }) => {
  await page.goto('/dex')
  await expect(page.locator('#grid .dcard')).toHaveCount(18)
  await expect(page.locator('#rumor-grid')).toBeHidden()
  await page.locator('#rumor summary').click()
  await expect(page.locator('#rumor-grid .dcard')).toHaveCount(3)
})
