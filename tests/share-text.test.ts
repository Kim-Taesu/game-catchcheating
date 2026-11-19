import { describe, expect, it, vi } from 'vitest'
import { TITLE_TEXT } from '../public/game/result.js'
import { shareResult, shareText, shareUrl } from '../public/game/share.js'

const r = { c: 4, m: 0, f: 0, t: 28 }

describe('shareUrl / shareText', () => {
  it('builds the /r link', () => {
    expect(shareUrl('https://x.test', r)).toBe('https://x.test/r?c=4&m=0&f=0&t=28')
  })
  it('text has title, numbers, and the link once on the last line', () => {
    const url = shareUrl('https://x.test', r)
    const text = shareText(r, url)
    expect(text).toContain(TITLE_TEXT.eagle)
    expect(text).toContain('잡은 4 · 놓친 0 · 오해 0')
    expect(text.split('\n')[0]).toBe(`치팅 파인더 — ${TITLE_TEXT.eagle}! 💰 포상금 4억!`)
    expect(text.split('\n').at(-1)).toBe(url)
    expect(text.split(url).length - 1).toBe(1)
  })
})

describe('shareText reward', () => {
  it('nobody caught shares 0억', () => {
    expect(shareText({ c: 0, m: 5, f: 1, t: 60 }, 'u').split('\n')[0]).toContain('💸 포상금 0억')
  })
})

describe('shareResult', () => {
  const url = 'https://x.test/r?c=4&m=0&f=0&t=28'
  it('prefers navigator.share', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    expect(await shareResult('t', { share })).toBe('shared')
    expect(share).toHaveBeenCalledWith({ text: 't' })
  })
  it('treats AbortError as cancelled', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }))
    const clipboard = { writeText: vi.fn() }
    expect(await shareResult('t', { share, clipboard })).toBe('cancelled')
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })
  it('falls back to clipboard, then to failed', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await shareResult('t', { clipboard: { writeText } })).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('t')
    const bad = { writeText: vi.fn().mockRejectedValue(new Error('no')) }
    expect(await shareResult('t', { clipboard: bad })).toBe('failed')
    expect(await shareResult('t', {})).toBe('failed')
  })
  it('share failure (non-abort) falls back to clipboard', async () => {
    const share = vi.fn().mockRejectedValue(new Error('x'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await shareResult('t', { share, clipboard: { writeText } })).toBe('copied')
  })
})
