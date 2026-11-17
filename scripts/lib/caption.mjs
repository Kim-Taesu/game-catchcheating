// Sprite captions must never reveal identity (case/innocent names of cheaters).
/** @param {{name?: string, tell?: {action?: string}, playable?: boolean}} entry @param {0|1} pose */
export function captionFor(entry, pose) {
  if (pose !== 1) return ''
  return entry.tell?.action ?? entry.name ?? ''
}
