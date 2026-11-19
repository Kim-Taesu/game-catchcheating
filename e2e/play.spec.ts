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
  await expect(page.locator('#game')).not.toContainText('기회')
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(375)
})

test('두 포즈 이미지 18장이 2초 안에 모두 존재하고 로드된다', async ({ page }) => {
  await startRound(page, SEED)
  await expect(page.locator('[data-seat] img')).toHaveCount(18)
  await expect
    .poll(
      () => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('[data-seat] img')].every((i) => i.complete && i.naturalWidth > 0)),
      { timeout: 2000 },
    )
    .toBe(true)
  for (const s of p7.seats) {
    const imgs = seat(page, s.seat).locator('img')
    await expect(imgs.nth(0)).toHaveAttribute('src', `/px/${s.id}-0.webp`)
    await expect(imgs.nth(1)).toHaveAttribute('src', `/px/${s.id}-1.webp`)
    await expect(imgs.nth(0)).toHaveAttribute('alt', '')
    await expect(imgs.nth(1)).toHaveAttribute('alt', '')
  }
})

const caseName = (id: string) => cases.find((c: { id: string }) => c.id === id).name as string
const WRONG_REASON = '정상 응시자를 잡아 시험이 끝났어요'

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

test('잡힌 좌석: "잡힘" 표시, 행동 멈춤(포즈 0 유지), aria-disabled', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  const target = cheaters.find((s) => s.id === 'phone-in-clothes')!
  const sp = seat(page, target.seat)
  await sp.click()
  await expect(sp).toHaveAttribute('data-caught', '')
  await expect(sp).toHaveAttribute('aria-disabled', 'true')
  await expect(sp.locator('.stamp-caught')).toHaveText('잡힘')
  // Several onsets pass (gaps are 5.5-8.5 s). Record every state of the action image's class, so a
  // brief switch to the action pose between two checks cannot slip through.
  const action = sp.locator('img.seat-img-1')
  await action.evaluate((img) => {
    const w = window as unknown as { __on: boolean[] }
    w.__on = [img.classList.contains('is-on')]
    new MutationObserver(() => w.__on.push(img.classList.contains('is-on'))).observe(img, { attributes: true, attributeFilter: ['class'] })
  })
  for (let i = 0; i < 40; i++) await page.clock.runFor(1000)
  const on = await page.evaluate(() => (window as unknown as { __on: boolean[] }).__on)
  expect(on.every((v) => v === false)).toBe(true)
  await expect(action).toHaveCSS('opacity', '0')
  await expect(sp.locator('img.seat-img-0')).toHaveClass(/is-on/)
  await expect(sp.locator('.stamp-caught')).toHaveText('잡힘')
  await expect(sp).toHaveAttribute('aria-disabled', 'true')
})

test('Esc로 알림 닫기', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, cheaters[0].seat).click()
  await expect(page.locator('#toast')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#toast')).toBeHidden()
})

test('평범 좌석 한 번 탭하면 즉시 종료: 의심 많은 감독관, 사유 문구, 좌석 비활성', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'lives')
  await expect(page.locator('#end')).toBeVisible()
  await expect(page.locator('#end h2')).toHaveText('의심 많은 감독관')
  await expect(page.locator('#end')).toContainText(WRONG_REASON)
  await expect(page.locator('#end')).toContainText('오해 1')
  await expect(page.locator('#end .end-time')).toHaveCount(0)
  await expect(page.locator('#toast')).toBeHidden()
  for (let i = 0; i < 9; i++) await expect(seat(page, i)).toBeDisabled()
  const inn = innocents.find((i: { id: string }) => i.id === innos[0].id)
  await expect(page.locator('#end-misjudged li')).toHaveCount(1)
  await expect(page.locator('#end-misjudged')).toContainText(inn.name)
})

test('수법 전원 적발 시 종료', async ({ page }) => {
  await startRound(page, SEED)
  for (const s of cheaters) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
  await expect(page.locator('#end')).toContainText('시험 종료')
})

test('안경 바꿔치기: 교체 전 탭도 평범 응시자와 똑같이 즉시 종료, 사건 이름 없이 응시자 N 표시', async ({ page }) => {
  // seed 4: one seat is glasses-swap (swapAtMs 18-22 s).
  const p = planFor(4)
  const sw = p.seats.find((s) => s.swapAtMs !== undefined)!
  await page.clock.install()
  await startRound(page, 4)
  await seat(page, sw.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'lives')
  await expect(page.locator('#end h2')).toHaveText('의심 많은 감독관')
  await expect(page.locator('#end')).toContainText(WRONG_REASON)
  await expect(page.locator('#panel-live')).toHaveText(`정상 행동입니다 · 응시자 ${sw.seat + 1}`)
  await expect(seat(page, sw.seat)).not.toContainText('안경 바꿔치기')
  const item = page.locator('#end-misjudged li').first()
  await expect(item).toContainText(`응시자 ${sw.seat + 1} — 이때는 아직 수상한 점이 보이지 않았어요`)
  await expect(item).not.toContainText('안경 바꿔치기')
  await expect(page.locator('#end-missed')).toContainText('안경 바꿔치기')
})

test('안경 바꿔치기: 교체 후에는 적발', async ({ page }) => {
  const p = planFor(4)
  const sw = p.seats.find((s) => s.swapAtMs !== undefined)!
  await page.clock.install()
  await startRound(page, 4)
  await page.clock.fastForward(sw.swapAtMs! + 1000)
  await seat(page, sw.seat).click()
  await expect(page.locator('#toast')).toContainText('적발! 안경 바꿔치기')
  await expect(seat(page, sw.seat)).toHaveAttribute('data-caught', '')
  await expect(page.locator('#game')).not.toHaveAttribute('data-ended', /.+/)
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
  await seat(page, cheaters[0].seat).click()
  await expect(page.locator('#toast')).toBeVisible()
  await page.clock.fastForward(2000)
  await seat(page, cheaters[1].seat).click()
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
      await seat(page, cheaters[0].seat).click()
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

test('오해 종료 결과: 오해한 응시자 1명과 놓친 수법 목록', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, cheaters[0].seat).click()
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'lives')
  const wrong = page.locator('#end-misjudged')
  await expect(wrong).toContainText('오해한 응시자')
  await expect(wrong.locator('li')).toHaveCount(1)
  const inn = innocents.find((i: { id: string }) => i.id === innos[0].id)
  await expect(wrong).toContainText(inn.name)
  await expect(wrong).toContainText(inn.why)
  await expect(wrong.locator('li').first()).toContainText('단일 행동만으로는 부정행위라고 단정할 수 없습니다.')
  const missed = page.locator('#end-missed')
  await expect(missed).toContainText('놓친 수법')
  await expect(missed.locator('li')).toHaveCount(cheaters.length - 1)
  for (const s of cheaters.slice(1)) await expect(missed.locator(`a[href="/dex#${s.id}"]`)).toBeVisible()
  await expect(page.locator('#end-met li')).toHaveCount(1)
})
