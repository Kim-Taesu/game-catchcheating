// Hub metrics (POST https://ktslab.xyz/event). Failures never affect the game.
// The hub tells games apart by Origin, so only the production host sends; local dev and e2e send nothing.
// The hub counts a visitor by a cookie it sets on the first response, so a page load sends its first
// events in ONE request (two at once would count two visitors).
export const HUB = 'https://ktslab.xyz'
export const GAME_HOST = 'cheatfinder.ktslab.xyz'
const GAME = 'cheatfinder'

/** Request body; `game` is only read by a local hub. */
export function eventBody(events) {
  return JSON.stringify({ game: GAME, events })
}

/** Send events with sendBeacon. Returns whether a beacon was queued. */
export function sendHubEvents(events, opts = {}) {
  const host = 'host' in opts ? opts.host : globalThis.location?.hostname
  const beacon =
    'beacon' in opts ? opts.beacon : globalThis.navigator?.sendBeacon?.bind(globalThis.navigator)
  if (host !== GAME_HOST || typeof beacon !== 'function') return false
  try {
    return beacon(`${HUB}/event`, eventBody(events)) === true
  } catch {
    return false
  }
}

/** One round = page load (the game starts at once) to the result screen. */
export function createPlayTracker(send = sendHubEvents, now = Date.now) {
  let startedAt = null
  const safe = (events) => {
    try {
      send(events)
    } catch {
      /* ignore */
    }
  }
  return {
    start() {
      if (startedAt !== null) return
      startedAt = now()
      safe([{ type: 'enter' }, { type: 'play_start' }])
    },
    end() {
      if (startedAt === null) return
      const ms = now() - startedAt
      startedAt = null
      safe([{ type: 'play_end', ms }])
    },
  }
}
