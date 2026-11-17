import { expect, test } from '@playwright/test'
import fs from 'node:fs'
// @ts-expect-error plain JS module without d.ts path mapping in e2e
import { buildRound, seededRng } from '../public/game/round.js'
// @ts-expect-error plain JS module
import { TITLE_TEXT, titleFor } from '../public/game/result.js'

test.use({ viewport: { width: 375, height: 667 } })

const cases = JSON.parse(fs.readFileSync('public/data/cases.json', 'utf8'))
const innocents = JSON.parse(fs.readFileSync('public/data/innocents.json', 'utf8'))
const SEED = 7
const plan = buildRound(cases, innocents, seededRng(SEED))
const cheaters = plan.seats.filter((s: { kind: string }) => s.kind === 'cheater') as { seat: number }[]
const ORIGIN = 'http://127.0.0.1:8788'

async function clearRound(page: import('@playwright/test').Page) {
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  for (const s of cheaters) await page.locator(`[data-seat="${s.seat}"]`).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
}
const noShare = () => {
  // @ts-expect-error test hook
  delete Navigator.prototype.share
}

test('종료 화면: 칭호, 숫자, 버튼 3개, 면책, 포커스', async ({ page }) => {
  await clearRound(page)
  const end = page.locator('#end')
  await expect(end).toBeVisible()
  await expect(end.locator('h2')).toBeFocused()
  const title = TITLE_TEXT[titleFor({ c: 3, m: 0, f: 0, t: 0 })]
  const heading = await end.locator('h2').textContent()
  expect(Object.values(TITLE_TEXT)).toContain(heading)
  expect(title).toBeTruthy()
  await expect(end).toContainText('잡은 3 · 놓친 0 · 오해 0')
  await expect(end).toContainText('걸린 시간')
  await expect(end.getByRole('button', { name: '자랑하기' })).toBeVisible()
  await expect(end.getByRole('link', { name: '다시 하기' })).toHaveAttribute('href', '/play')
  await expect(end.getByRole('link', { name: '도감 보기' })).toHaveAttribute('href', '/dex')
  await expect(page.locator('.disclaimer')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

test('share 없음: 클립보드에 링크 한 번 복사', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ORIGIN })
  await page.addInitScript(noShare)
  await clearRound(page)
  await page.getByRole('button', { name: '자랑하기' }).click()
  await expect(page.locator('#end')).toContainText('복사했어요')
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('/r?c=3&m=0&f=0&t=')
  expect(text.split('/r?c=').length - 1).toBe(1)
  expect(text).toContain('치팅 파인더 — ')
  await expect(page.locator('.end-link')).toBeHidden()
})

test('navigator.share 사용, 취소(AbortError)는 조용히 무시', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __shared: unknown[] }).__shared = []
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (d: unknown) => {
        const w = window as unknown as { __shared: unknown[] }
        w.__shared.push(d)
        return w.__shared.length === 1
          ? Promise.resolve()
          : Promise.reject(new DOMException('cancel', 'AbortError'))
      },
    })
  })
  await clearRound(page)
  await page.getByRole('button', { name: '자랑하기' }).click()
  await page.getByRole('button', { name: '자랑하기' }).click()
  const shared = await page.evaluate(() => (window as unknown as { __shared: { text: string }[] }).__shared)
  expect(shared).toHaveLength(2)
  expect(shared[0].text).toContain('/r?c=3&m=0&f=0&t=')
  await expect(page.locator('.end-link')).toBeHidden()
  await expect(page.locator('#end')).not.toContainText('길게 눌러')
})

test('share·클립보드 모두 실패: 선택된 링크 입력창 표시', async ({ page }) => {
  await page.addInitScript(noShare)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    })
  })
  await clearRound(page)
  await page.getByRole('button', { name: '자랑하기' }).click()
  const input = page.locator('.end-link')
  await expect(input).toBeVisible()
  await expect(input).toHaveAttribute('readonly', '')
  await expect(input).toHaveValue(/\/r\?c=3&m=0&f=0&t=\d+$/)
  await expect(input).toBeFocused()
  await expect(page.locator('#end')).toContainText('링크를 길게 눌러 복사하세요')
  const sel = await input.evaluate((i: HTMLInputElement) => i.value.slice(i.selectionStart!, i.selectionEnd!))
  expect(sel).toBe(await input.inputValue())
})

test('기회 소진 종료: 기회 소진 표기, 시간 줄 없음, 놓친 수 표시', async ({ page }) => {
  await page.goto(`/play?seed=${SEED}`)
  await expect(page.locator('[data-seat]')).toHaveCount(9)
  const inn = plan.seats.filter((s: { kind: string }) => s.kind === 'innocent') as { seat: number }[]
  for (const s of inn.slice(0, 3)) await page.locator(`[data-seat="${s.seat}"]`).click()
  await expect(page.locator('#end')).toContainText('오해 3')
  await expect(page.locator('#end')).toContainText('기회를 모두 사용했어요')
  await expect(page.locator('#end')).not.toContainText('걸린 시간')
  await expect(page.locator('#end')).not.toContainText('시간 종료')
  await expect(page.locator('#end .end-time')).toHaveCount(0)
})
