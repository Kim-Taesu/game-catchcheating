import type { RoundPlan, SeatPlan } from './round.js'
import type { Result } from './result.js'

export const DURATION_MS: number
export const LIVES: number

/** Opaque engine state. Mutated in place by `tap` and lazily by `status`. */
export type Engine = { readonly __engine: unique symbol }

export type TapOutcome = {
  kind: 'caught' | 'innocent' | 'ignored'
  seat: number
  id: string
  reason?: 'before-swap'
}

export type Status = {
  remainingMs: number
  lives: number
  caught: number
  total: number
  ended: null | 'clear' | 'timeout' | 'lives'
}

export function createEngine(plan: RoundPlan, startMs: number): Engine
export function poseAt(seat: SeatPlan, nowMs: number, startMs: number): 0 | 1
export function tap(e: Engine, seat: number, nowMs: number): TapOutcome
export function status(e: Engine, nowMs: number): Status
export function result(e: Engine, nowMs: number): Result
