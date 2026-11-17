export type Tier = 'eagle' | 'veteran' | 'suspicious' | 'rookie' | 'sleepy'
export type Result = { c: number; m: number; f: number; t: number }

export const TITLE_TEXT: Record<Tier, string>
export function titleFor(r: Result): Tier
export function endTimeLine(r: Result, reason?: 'clear' | 'timeout' | 'lives'): string | null
export function shareQuery(r: Result): string
export function parseShare(params: URLSearchParams): Result | null
