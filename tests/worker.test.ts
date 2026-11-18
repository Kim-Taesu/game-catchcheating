import { describe, expect, it } from 'vitest'
import worker, { type Env } from '../src/worker'
import { TITLE_TEXT } from '../public/game/result.js'

const env = { ASSETS: { fetch: async () => new Response('asset') } } as unknown as Env

const call = (path: string) => worker.fetch(new Request(`https://example.test${path}`), env)

describe('/r share landing', () => {
  it('renders OG tags for a valid result', async () => {
    const res = await call('/r?c=4&m=0&f=0&t=28')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const body = await res.text()
    expect(body).toContain('<meta property="og:title" content="잡은 4 · 놓친 0 · 오해 0">')
    expect(body).toMatch(
      new RegExp(`<meta property="og:description" content="[^"]*${TITLE_TEXT.eagle}`),
    )
    expect(body).toContain(
      '<meta property="og:image" content="https://example.test/og/eagle.png?v=1">',
    )
    expect(body).toContain('<meta property="og:type" content="website">')
    expect(body).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(body).toContain('<title>')
  })

  it('uses the suspicious image for c=3&m=1&f=1&t=60', async () => {
    const body = await (await call('/r?c=3&m=1&f=1&t=60')).text()
    expect(body).toContain('https://example.test/og/suspicious.png?v=1')
  })

  it('ignores a client supplied title', async () => {
    const body = await (await call('/r?c=4&m=0&f=0&t=28&title=sleepy')).text()
    expect(body).toContain('/og/eagle.png?v=1')
    expect(body).not.toContain('sleepy')
  })

  it.each([
    ['c=abc&m=0&f=0&t=28'],
    ['m=0&f=0&t=28'],
    [''],
    ['c=3&m=2&f=0&t=40'],
    ['c=4&m=0&f=4&t=28'],
    ['c=3&m=1&f=2&t=60'],
    ['c=4&m=0&f=0&t=61'],
    ['c=3.5&m=0&f=0&t=28'],
    ['c=9&m=9&f=9&t=99'],
  ])('redirects invalid query "%s" to /', async (qs) => {
    const res = await call(`/r?${qs}`)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://example.test/')
  })

  it('has a play link and no meta refresh', async () => {
    const body = await (await call('/r?c=4&m=0&f=0&t=28')).text()
    expect(body).not.toContain('<meta http-equiv="refresh"')
    expect(body).toMatch(/<a [^>]*href="\/play"[^>]*>나도 해보기<\/a>/)
  })
})

describe('asset delegation', () => {
  it.each(['/', '/dex'])('delegates %s to ASSETS', async (path) => {
    const res = await call(path)
    expect(await res.text()).toBe('asset')
  })
})
