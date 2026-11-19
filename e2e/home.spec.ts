import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 667 } })

test('홈: 제목, 진입 링크, 면책, 가로 스크롤 없음', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/치팅 파인더/)
  await expect(page.getByRole('link', { name: '도감 보기' })).toHaveAttribute('href', '/dex')
  await expect(page.getByRole('link', { name: '게임 시작' })).toHaveAttribute('href', '/play')
  await expect(page.locator('.disclaimer')).toBeVisible()
  await expect(page.locator('.disclaimer')).toContainText('따라 하기 안내가 아닙니다')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/og/eagle.png?v=2')
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(375)
})
