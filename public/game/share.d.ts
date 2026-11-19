import type { Result } from './result.js'

export type ShareDeps = {
  share?: (d: { text: string }) => Promise<void>
  clipboard?: { writeText(t: string): Promise<void> }
}
export function shareUrl(origin: string, r: Result): string
export function shareText(r: Result, url: string): string
export function shareResult(text: string, deps: ShareDeps): Promise<'shared' | 'cancelled' | 'copied' | 'failed'>
