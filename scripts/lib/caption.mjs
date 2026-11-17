// Sprite captions must never reveal identity (case/innocent names of cheaters).
// Cheaters show `tell.action`, innocents their `action`: both are sentences in the same style,
// so the caption form gives no hint either.
/** @param {{name?: string, action?: string, tell?: {action?: string}, playable?: boolean}} entry @param {0|1} pose */
export function captionFor(entry, pose) {
  if (pose !== 1) return ''
  return entry.tell?.action ?? entry.action ?? ''
}
