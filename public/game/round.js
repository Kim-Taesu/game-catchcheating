// Round builder. Pure functions: shared by browser and tests. All randomness comes from the injected rng.

/** How long an action pose stays visible, in ms. */
export const ACTION_MS = 4000

const SEATS = 9
const ROUND_MS = 60000

/** mulberry32: small deterministic PRNG returning floats in [0, 1). */
export function seededRng(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Integer in [lo, hi], inclusive. */
function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

/** Fisher-Yates on a copy. */
function shuffled(rng, items) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

function isEligible(c) {
  return c.playable === true && c.status !== 'unverified' && Boolean(c.tell)
}

function isOverseas(c) {
  return c.origins.some((o) => o.country !== 'KR')
}

/** Repeating onsets: first in [0, firstMax], then gaps in [gapMin, gapMax], all < ROUND_MS. */
function repeatingOnsets(rng, firstMax, gapMin, gapMax) {
  const onsets = []
  let t = randInt(rng, 0, firstMax)
  while (t < ROUND_MS) {
    onsets.push(t)
    t += randInt(rng, gapMin, gapMax)
  }
  return onsets
}

// One-off innocents act twice, both inside a round that usually ends in 20–30 s:
// first at 2–10 s, second 8–14 s later. Still fewer than a cheater's 7 s rhythm.
function oneoffOnsets(rng) {
  const first = randInt(rng, 2000, 10000)
  return [first, randInt(rng, first + 8000, first + 14000)]
}

function cheaterSeat(rng, c) {
  if (c.tell.swap === true) {
    // Swaps early (6–12 s) like every other seat's first move; before that it looks normal.
    return { kind: 'cheater', id: c.id, onsets: [], swapAtMs: randInt(rng, 6000, 12000) }
  }
  return { kind: 'cheater', id: c.id, onsets: repeatingOnsets(rng, 6000, 5500, 8500) }
}

function innocentSeat(rng, inn) {
  const onsets =
    inn.behavior === 'repeat' ? repeatingOnsets(rng, 8000, 6000, 10000) : oneoffOnsets(rng)
  return { kind: 'innocent', id: inn.id, onsets }
}

/**
 * Build one round: 9 seats = 3 or 4 cheaters + innocents.
 * Deterministic given `rng`. Throws if the data cannot fill a round.
 */
export function buildRound(cases, innocents, rng) {
  const eligible = cases.filter(isEligible)
  const cheaterCount = rng() < 0.5 ? 3 : 4
  if (eligible.length < cheaterCount) {
    throw new Error(`need at least ${cheaterCount} playable cases, got ${eligible.length}`)
  }

  const order = shuffled(rng, eligible)
  const picked = order.slice(0, cheaterCount)
  if (!picked.some(isOverseas)) {
    const overseas = order.slice(cheaterCount).find(isOverseas)
    if (overseas) picked[cheaterCount - 1] = overseas
  }

  // Lookalike innocents go in first (deduped), the rest are filled randomly.
  const innocentById = new Map(innocents.map((i) => [i.id, i]))
  const required = []
  for (const c of picked) {
    const inn = c.lookalike ? innocentById.get(c.lookalike) : undefined
    if (inn && !required.includes(inn)) required.push(inn)
  }
  const innocentCount = SEATS - cheaterCount
  const rest = shuffled(
    rng,
    innocents.filter((i) => !required.includes(i)),
  )
  const chosen = required.concat(rest).slice(0, innocentCount)
  if (chosen.length < innocentCount) {
    throw new Error(`need at least ${innocentCount} innocents, got ${chosen.length}`)
  }

  const entries = [
    ...picked.map((c) => cheaterSeat(rng, c)),
    ...chosen.map((i) => innocentSeat(rng, i)),
  ]
  const seats = shuffled(rng, entries).map((s, seat) => ({ seat, ...s }))
  return { seats, cheaterCount }
}
