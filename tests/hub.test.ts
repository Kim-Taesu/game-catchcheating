import { describe, expect, it } from 'vitest'
import { GAME_HOST, createPlayTracker, eventBody, sendHubEvents } from '../public/game/hub.js'

type Sent = { url: string; body: string }
function fakeBeacon(sent: Sent[], ok = true) {
  return (url: string, body: string) => {
    sent.push({ url, body })
    return ok
  }
}

describe('hub metrics', () => {
  it('sends only from the production host (local and e2e send nothing)', () => {
    const sent: Sent[] = []
    expect(sendHubEvents([{ type: 'enter' }], { host: 'localhost', beacon: fakeBeacon(sent) })).toBe(false)
    expect(sendHubEvents([{ type: 'enter' }], { host: 'game.example.com', beacon: fakeBeacon(sent) })).toBe(false)
    expect(sent).toHaveLength(0)
    expect(sendHubEvents([{ type: 'enter' }], { host: GAME_HOST, beacon: fakeBeacon(sent) })).toBe(true)
    expect(sent).toEqual([{ url: 'https://ktslab.xyz/event', body: eventBody([{ type: 'enter' }]) }])
  })

  it('body names the game and carries the events', () => {
    expect(JSON.parse(eventBody([{ type: 'play_end', ms: 1200 }]))).toEqual({
      game: 'cheatfinder',
      events: [{ type: 'play_end', ms: 1200 }],
    })
  })

  it('never throws when the beacon is missing or throws', () => {
    expect(sendHubEvents([{ type: 'enter' }], { host: GAME_HOST, beacon: undefined })).toBe(false)
    const boom = () => {
      throw new Error('blocked')
    }
    expect(sendHubEvents([{ type: 'enter' }], { host: GAME_HOST, beacon: boom })).toBe(false)
  })

  it('with the how-to-play intro: enter on page load, play_start at "게임 시작", play_end at the result, once each', () => {
    const calls: unknown[][] = []
    let t = 1000
    const tr = createPlayTracker((e) => void calls.push(e), () => t)
    tr.enter()
    tr.enter()
    t = 4000
    tr.start()
    tr.start()
    t = 7500
    tr.end()
    tr.end()
    expect(calls).toEqual([[{ type: 'enter' }], [{ type: 'play_start' }], [{ type: 'play_end', ms: 3500 }]])
  })

  it('replay without the intro: enter + play_start go in ONE request (two before the hub cookie = two visitors)', () => {
    const calls: unknown[][] = []
    const tr = createPlayTracker((e) => void calls.push(e), () => 0)
    tr.start()
    expect(calls).toEqual([[{ type: 'enter' }, { type: 'play_start' }]])
  })

  it('end before start sends nothing; a throwing sender does not break the game', () => {
    const calls: unknown[][] = []
    createPlayTracker((e) => void calls.push(e)).end()
    expect(calls).toHaveLength(0)
    const tr = createPlayTracker(() => {
      throw new Error('x')
    })
    expect(() => {
      tr.start()
      tr.end()
    }).not.toThrow()
  })
})
