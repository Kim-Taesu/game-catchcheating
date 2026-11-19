// Share link/text and the share-or-copy flow. Pure + injectable for tests.
import { TITLE_TEXT, rewardLine, shareQuery, titleFor } from './result.js'

export function shareUrl(origin, r) {
  return `${origin}/r?${shareQuery(r)}`
}

export function shareText(r, url) {
  // Same reward line as the result screen; numbers on their own line, the link last.
  return `치팅 파인더 — ${TITLE_TEXT[titleFor(r)]}! ${rewardLine(r)}\n잡은 ${r.c} · 놓친 ${r.m} · 오해 ${r.f}\n${url}`
}

/**
 * @returns {Promise<'shared'|'cancelled'|'copied'|'failed'>}
 */
export async function shareResult(text, deps) {
  if (deps.share) {
    try {
      await deps.share({ text })
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
    }
  }
  if (deps.clipboard) {
    try {
      await deps.clipboard.writeText(text)
      return 'copied'
    } catch {
      // fall through
    }
  }
  return 'failed'
}
