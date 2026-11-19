import { expect, test, type Page } from '@playwright/test'
import { cases, cheatersOf, innocents, innocentsOf, planFor, seat, startRound } from './helpers'

test.use({ viewport: { width: 375, height: 667 } })

// seed 7: 5 cheaters, none with a swap -> deterministic without a mocked clock.
const SEED = 7
const p7 = planFor(SEED)
// Result screen: the same 3x3 seats, each labelled with its outcome; a tap opens the detail dialog.
const rseat = (page: Page, n: number) => page.locator(`#end-grid [data-result-seat="${n}"]`)
const detail = (page: Page) => page.locator('#end-detail')
const cheaters = cheatersOf(p7)
// A confirmed case in this round (toast shows "· 확인됨"); not tied to one case id.
const confirmedSeat = cheaters.find((s) => cases.find((c: { id: string; status: string }) => c.id === s.id).status === 'confirmed')!
const innos = innocentsOf(p7)

test('좌석 9개, 터치 크기, HUD', async ({ page }) => {
  await startRound(page, SEED)
  for (let i = 0; i < 9; i++) {
    const box = await seat(page, i).boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  await expect(page.locator('#game')).toContainText(`수상한 응시자 ${cheaters.length}명 중 0명 적발`)
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

test('행동 포즈 중에 잡으면 행동 이미지는 즉시 투명, 기본 이미지는 불투명', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  const target = confirmedSeat as unknown as { seat: number; onsets: number[] }
  const sp = seat(page, target.seat)
  await page.clock.runFor(target.onsets[0] + 1000)
  const action = sp.locator('img.seat-img-1')
  await expect(action).toHaveClass(/is-on/)
  await sp.click()
  await expect(sp).toHaveAttribute('data-caught', '')
  await expect(action).toHaveCSS('opacity', '0')
  await expect(sp.locator('img.seat-img-0')).toHaveCSS('opacity', '1')
})

test('reduced-motion: 행동 이미지 전환 시간 0s', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await startRound(page, SEED)
  await expect(seat(page, 0).locator('img.seat-img-1')).toHaveCSS('transition-duration', '0s')
})

const caseName = (id: string) => cases.find((c: { id: string }) => c.id === id).name as string
const WRONG_REASON = '정상 응시자를 잡아 시험이 끝났어요'

test('수법 좌석 탭: 상단 짧은 알림, 발견 저장, 적발 +1, 알림에 링크 없음', async ({ page }) => {
  await startRound(page, SEED)
  const target = confirmedSeat
  await seat(page, target.seat).click()
  const toast = page.locator('#toast')
  await expect(toast).toBeVisible()
  await expect(toast).toHaveText(`적발! ${caseName(confirmedSeat.id)} · 확인됨`)
  await expect(toast.locator('a')).toHaveCount(0)
  await expect(page.locator('#panel-live')).toHaveText(`적발! ${caseName(confirmedSeat.id)} · 확인됨`)
  const stored = await page.evaluate(() => localStorage.getItem('cf:discovered'))
  expect(JSON.parse(stored!)).toContain(confirmedSeat.id)
  await expect(seat(page, target.seat)).toHaveAttribute('data-caught', '')
  await expect(page.locator('#game')).toContainText(`수상한 응시자 ${cheaters.length}명 중 1명 적발`)
  // The running game has no link that would navigate away.
  await expect(page.locator('#game a')).toHaveCount(0)
})

test('잡힌 좌석: "잡힘" 표시, 행동 멈춤(포즈 0 유지), aria-disabled', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  const target = confirmedSeat
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
  await expect(sp.locator('img.seat-img-0')).toHaveCSS('opacity', '1')
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
  await expect(page.locator('#end-grid [data-outcome="wrong"]')).toHaveCount(1)
  const wrong = rseat(page, innos[0].seat)
  await expect(wrong).toHaveAttribute('data-outcome', 'wrong')
  await expect(wrong).toContainText(inn.name)
  await expect(wrong).toContainText('오해')
})

test('수법 전원 적발 시 종료', async ({ page }) => {
  await startRound(page, SEED)
  for (const s of cheaters) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
  await expect(page.locator('#end')).toContainText('시험 종료')
})

test('안경 바꿔치기: 교체 전 탭도 평범 응시자와 똑같이 즉시 종료, 결과에서는 놓친 수법으로 표시', async ({ page }) => {
  // seed 4: one seat is glasses-swap (swapAtMs 6-12 s).
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
  // After the round the swap seat is shown as what it was: a missed case, tapped before its swap.
  const item = rseat(page, sw.seat)
  await expect(item).toHaveAttribute('data-outcome', 'missed')
  await expect(item).toContainText('안경 바꿔치기')
  await expect(item).toContainText('놓침')
  await expect(page.locator('#end-grid [data-outcome="wrong"]')).toHaveCount(0)
  await item.click()
  await expect(detail(page)).toBeVisible()
  await expect(detail(page)).toContainText(`응시자 ${sw.seat + 1} · 안경 바꿔치기`)
  await expect(detail(page)).toContainText('안경을 바꾸기 전에 잡아서 오해가 됐어요')
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

test('종료 후: 알림 없음, 좌석 비활성, 재탭 무시, onEnd 한 번, 결과 3×3 좌석과 상세 창', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  for (const s of cheaters) await seat(page, s.seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'clear')
  for (let i = 0; i < 9; i++) await expect(seat(page, i)).toBeDisabled()
  await expect(page.locator('#toast')).toBeHidden()
  await page.clock.fastForward(10000)
  // Programmatic taps after the end (and on caught seats) change nothing.
  await page.evaluate(() => document.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach((b) => b.click()))
  await expect(page.locator('#game')).toContainText(`수상한 응시자 ${cheaters.length}명 중 ${cheaters.length}명 적발`)
  await expect(page.locator('#toast')).toBeHidden()
  // onEnd ran exactly once (showResult rebuilds the DOM, so only the counter can tell).
  await page.waitForTimeout(300)
  await expect(page.locator('#end')).toHaveAttribute('data-end-count', '1')
  // The play grid gives way to the result grid in the same place: nine seats, no list to scroll.
  await expect(page.locator('#game')).toBeHidden()
  await expect(page.locator('#end-grid [data-result-seat]')).toHaveCount(9)
  for (const s of cheaters) {
    const r = rseat(page, s.seat)
    await expect(r).toHaveAttribute('data-outcome', 'caught')
    await expect(r).toContainText('잡음')
    await expect(r).toContainText(caseName(s.id))
    await expect(r.locator('img')).toHaveAttribute('src', `/px/${s.id}-1.webp`)
  }
  for (const s of innos) {
    const inn = innocents.find((i: { id: string }) => i.id === s.id)
    const r = rseat(page, s.seat)
    await expect(r).toHaveAttribute('data-outcome', 'innocent')
    await expect(r).toContainText('정상')
    await expect(r).toContainText(inn.name)
  }
  // Cheater detail: what was shown, the clue, its basis, and the dex link.
  await rseat(page, cheaters[0].seat).click()
  const d = detail(page)
  await expect(d).toBeVisible()
  await expect(d).toContainText(`응시자 ${cheaters[0].seat + 1} · ${caseName(cheaters[0].id)}`)
  await expect(d).toContainText('근거:')
  await expect(d.locator(`a[href="/dex#${cheaters[0].id}"]`)).toHaveText('도감에서 자세히')
  // Reported countries as flags, plus one "🇰🇷 한국 2026 · …" line per origin.
  const c0 = cases.find((c: { id: string }) => c.id === cheaters[0].id)
  const flag = (code: string) => String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
  const flags = [...new Set(c0.origins.map((o: { country: string }) => o.country))].map((x) => flag(x as string)).join('')
  await expect(d.locator('.detail-flags')).toHaveText(flags)
  await expect(d.locator('.detail-origin-list li')).toHaveCount(c0.origins.length)
  for (const o of c0.origins) await expect(d.locator('.detail-origin-list')).toContainText(`${flag(o.country)} `)
  await page.keyboard.press('Escape')
  await expect(d).toBeHidden()
  await expect(rseat(page, cheaters[0].seat)).toBeFocused()
  // Innocent detail: what they did, why it is normal, and how it differs from a cheating tell.
  const inn0 = innocents.find((i: { id: string }) => i.id === innos[0].id)
  await rseat(page, innos[0].seat).click()
  await expect(d).toContainText(inn0.action)
  await expect(d).toContainText(inn0.why)
  await expect(d).toContainText(inn0.vs)
  await expect(d).not.toContainText('단정할 수 없')
  await d.getByRole('button', { name: '닫기' }).click()
  await expect(d).toBeHidden()
})

test('오해 종료 결과: 3×3 좌석에 오해·잡음·놓침 표시, 놓친 좌석을 누르면 설명', async ({ page }) => {
  await startRound(page, SEED)
  await seat(page, cheaters[0].seat).click()
  await seat(page, innos[0].seat).click()
  await expect(page.locator('#game')).toHaveAttribute('data-ended', 'lives')
  const inn = innocents.find((i: { id: string }) => i.id === innos[0].id)
  await expect(rseat(page, innos[0].seat)).toHaveAttribute('data-outcome', 'wrong')
  await rseat(page, innos[0].seat).click()
  await expect(detail(page)).toContainText(inn.why)
  await expect(detail(page)).toContainText(inn.vs)
  await page.keyboard.press('Escape')
  await expect(rseat(page, cheaters[0].seat)).toHaveAttribute('data-outcome', 'caught')
  await expect(page.locator('#end-grid [data-outcome="missed"]')).toHaveCount(cheaters.length - 1)
  // A missed seat explains itself: what the method is, the behavior shown, and the real clue.
  for (const s of cheaters.slice(1)) {
    const c = cases.find((x: { id: string }) => x.id === s.id)
    const r = rseat(page, s.seat)
    await expect(r).toHaveAttribute('data-outcome', 'missed')
    await expect(r).toContainText('놓침')
    await r.click()
    await expect(detail(page)).toContainText(c.summary)
    await expect(detail(page)).toContainText(c.tell.action)
    await expect(detail(page)).toContainText(c.cue)
    await expect(detail(page).locator(`a[href="/dex#${s.id}"]`)).toBeVisible()
    await page.keyboard.press('Escape')
  }
})

for (const vp of [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
]) {
  test(`${vp.width}×${vp.height}: 결과 좌석 9개와 공유 버튼이 스크롤 없이 한 화면에`, async ({ page }) => {
    await page.setViewportSize(vp)
    await startRound(page, SEED)
    await seat(page, innos[0].seat).click()
    await expect(page.locator('#end-grid')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    const grid = (await page.locator('#end-grid').boundingBox())!
    const share = (await page.getByRole('button', { name: '공유하기' }).boundingBox())!
    expect(grid.y + grid.height).toBeLessThanOrEqual(vp.height)
    expect(share.y + share.height).toBeLessThanOrEqual(vp.height)
  })
}

test('남은 시간 막대: 처음엔 가득·초록, 시간이 줄수록 짧아지고 10초 이하면 빨강', async ({ page }) => {
  await page.clock.install()
  await startRound(page, SEED)
  const bar = page.locator('#timebar')
  await expect(bar).toHaveAttribute('role', 'progressbar')
  await expect(bar).toHaveAttribute('aria-valuenow', '60')
  const fill = bar.locator('.timebar-fill')
  const rgb = async () => (await fill.evaluate((n) => getComputedStyle(n).backgroundColor)).match(/\d+/g)!.map(Number)
  const [r0, g0] = await rgb()
  expect(g0).toBeGreaterThan(r0)
  await expect(bar).not.toHaveAttribute('data-low', /.*/)
  await page.clock.fastForward(52000)
  await expect(bar).toHaveAttribute('aria-valuenow', '8')
  await expect(bar).toHaveAttribute('data-low', '')
  const [r1, g1] = await rgb()
  expect(r1).toBeGreaterThan(g1)
  const w = async () => (await fill.boundingBox())!.width
  const full = (await bar.boundingBox())!.width
  expect(await w()).toBeLessThan(full * 0.2)
})
