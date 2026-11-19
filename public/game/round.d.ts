export type Origin = { country: string; year: number; label: string; sourceUrl?: string }
export type Source = { title: string; url: string }
export type CaseStatus = 'confirmed' | 'investigating' | 'mentioned' | 'unverified'
export type CaseGroup = 'device' | 'collab' | 'classic' | 'proxy' | 'leak'
export type BasisKind = 'report' | 'guideline' | 'community' | 'industry'

export type Tell = {
  action: string
  basisKind: BasisKind
  basisNote?: string
  basisSources: Source[]
  swap?: boolean
}

export type CaseEntry = {
  id: string
  name: string
  group: CaseGroup
  origins: Origin[]
  summary: string
  cue: string
  detect: string
  status: CaseStatus
  sources: Source[]
  playable: boolean
  tell?: Tell
  visibility?: 'low'
  lookalike?: string
}

export type Innocent = {
  id: string
  name: string
  behavior: 'oneoff' | 'repeat'
  /** Action-pose sentence, same style as `Tell.action` (ends in "다"). */
  action: string
  /** Why it is normal, concretely. */
  why: string
  /** How it differs from the look-alike cheating tell (result-screen detail). */
  vs?: string
}

export type SeatPlan = {
  seat: number
  kind: 'cheater' | 'innocent'
  id: string
  onsets: number[]
  swapAtMs?: number
}

export type RoundPlan = { seats: SeatPlan[]; cheaterCount: 3 | 4 }

export const ACTION_MS: number
export function seededRng(seed: number): () => number
export function buildRound(
  cases: CaseEntry[],
  innocents: Innocent[],
  rng: () => number,
): RoundPlan
