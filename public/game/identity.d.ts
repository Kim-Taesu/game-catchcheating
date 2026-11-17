import type { TapOutcome } from './engine.js'
export function seatLabel(seatIndex: number, state?: 'idle' | 'caught' | 'cleared', caseName?: string): string
export function tapMessage(
  outcome: TapOutcome,
  caseById: Map<string, { name?: string; status?: string }>,
): { toast: string; label: string } | null
export function beforeSwapLine(seatIndex: number, laterCaseName?: string): string
