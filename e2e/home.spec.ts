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

test('탭 아이콘이 있고, 로컬에서는 허브(ktslab.xyz)로 아무 요청도 보내지 않는다', async ({ page }) => {
  const hubCalls: string[] = []
  page.on('request', (r) => {
    if (new URL(r.url()).hostname.endsWith('ktslab.xyz')) hubCalls.push(r.url())
  })
  for (const path of ['/', '/dex', '/play?seed=7', '/play?again=1&seed=7']) {
    await page.goto(path)
    const href = await page.locator('link[rel="icon"]').getAttribute('href')
    expect(href, path).toBe('/favicon.png')
  }
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  const icon = await page.request.get('/favicon.png')
  expect(icon.status()).toBe(200)
  expect(icon.headers()['content-type']).toContain('image/png')
  await page.waitForTimeout(300)
  expect(hubCalls).toEqual([])
})
