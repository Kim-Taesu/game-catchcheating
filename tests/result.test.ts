import { describe, expect, it } from 'vitest'
import { TITLE_TEXT, endTimeLine, parseShare, shareQuery, titleFor } from '../public/game/result.js'

describe('titleFor', () => {
  it('eagle needs m=0, f=0, t<=30', () => {
    expect(titleFor({ c: 4, m: 0, f: 0, t: 30 })).toBe('eagle')
    expect(titleFor({ c: 4, m: 0, f: 0, t: 31 })).toBe('veteran')
  })
  it('veteran allows m<=1 and f<=1', () => {
    expect(titleFor({ c: 3, m: 1, f: 1, t: 60 })).toBe('veteran')
    expect(titleFor({ c: 3, m: 1, f: 2, t: 60 })).toBe('rookie')
  })
  it('suspicious (f>=3) outranks rookie', () => {
    expect(titleFor({ c: 1, m: 2, f: 3, t: 60 })).toBe('suspicious')
    expect(titleFor({ c: 4, m: 0, f: 3, t: 20 })).toBe('suspicious')
  })
  it('sleepy is the fallback', () => {
    expect(titleFor({ c: 1, m: 2, f: 0, t: 60 })).toBe('sleepy')
    expect(titleFor({ c: 0, m: 3, f: 0, t: 60 })).toBe('sleepy')
  })
})

describe('TITLE_TEXT', () => {
  it('has the five Korean titles', () => {
    expect(TITLE_TEXT).toEqual({
      eagle: '매의 눈 감독관',
      veteran: '베테랑 감독관',
      suspicious: '의심 많은 감독관',
      rookie: '신입 감독관',
      sleepy: '졸고 있는 감독관',
    })
  })
})

describe('parseShare', () => {
  it('parses valid params', () => {
    expect(parseShare(new URLSearchParams('c=3&m=1&f=0&t=40'))).toEqual({ c: 3, m: 1, f: 0, t: 40 })
  })
  it.each([
    'c=abc&m=1&f=0&t=40',
    'c=3&m=1&f=0',
    'c=3&m=2&f=0&t=40',
    'c=2&m=0&f=0&t=40',
    'c=3&m=1&f=4&t=40',
    'c=3&m=1&f=0&t=61',
    'c=3&m=1&f=0&t=-1',
    'c=3.5&m=0.5&f=0&t=40',
    'c=&m=1&f=0&t=40',
    'c=3&m=1&f=0&t=1e1',
  ])('rejects %s', (q) => {
    expect(parseShare(new URLSearchParams(q))).toBeNull()
  })
  it('round-trips shareQuery', () => {
    const r = { c: 4, m: 0, f: 0, t: 28 }
    expect(shareQuery(r)).toBe('c=4&m=0&f=0&t=28')
    expect(parseShare(new URLSearchParams(shareQuery(r)))).toEqual(r)
  })
})

describe('endTimeLine (M-4)', () => {
  it('clear shows the elapsed seconds', () => {
    expect(endTimeLine({ c: 3, m: 0, f: 0, t: 21 }, 'clear')).toBe('걸린 시간 21초')
  })
  it('timeout says the time ran out', () => {
    expect(endTimeLine({ c: 1, m: 2, f: 0, t: 60 }, 'timeout')).toBe('시간 종료')
  })
  it('lives-out has no time line (the reason line already says so)', () => {
    expect(endTimeLine({ c: 0, m: 3, f: 3, t: 60 }, 'lives')).toBeNull()
  })
  it('without a reason falls back to the numbers', () => {
    expect(endTimeLine({ c: 3, m: 0, f: 0, t: 12 })).toBe('걸린 시간 12초')
    expect(endTimeLine({ c: 1, m: 2, f: 3, t: 60 })).toBeNull()
  })
})
