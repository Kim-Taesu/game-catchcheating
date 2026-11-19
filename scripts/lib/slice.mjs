// 시트 자르기 순수 함수 모음 (sharp 의존 없음)

/** 행 우선으로 cols×rows 칸 좌표를 만든다. */
export function gridCells(width, height, cols, rows) {
  const w = Math.floor(width / cols)
  const h = Math.floor(height / rows)
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push({ x: c * w, y: r * h, w, h })
  }
  return cells
}

/** 칸을 좌·우 반으로 나눈다. */
export function splitPair(cell) {
  const w = Math.floor(cell.w / 2)
  return [
    { x: cell.x, y: cell.y, w, h: cell.h },
    { x: cell.x + w, y: cell.y, w, h: cell.h },
  ]
}

/** #FF00FF 와 RGB 유클리드 거리 ≤ tolerance 인 픽셀의 알파를 0으로 한 새 RGBA 배열을 반환한다. */
export function keyMagenta(rgba, tolerance = 60) {
  const out = new Uint8Array(rgba)
  const limit = tolerance * tolerance
  for (let i = 0; i + 3 < out.length; i += 4) {
    const dr = out[i] - 255
    const dg = out[i + 1]
    const db = out[i + 2] - 255
    if (dr * dr + dg * dg + db * db <= limit) out[i + 3] = 0
  }
  return out
}

/**
 * Magenta despill for the anti-aliased fringe the key leaves behind. Pixels farther than
 * `keyTolerance` but within `spillTolerance` of #FF00FF get R and B pulled toward G and their
 * alpha lowered, both in proportion to how close they are to magenta (t = 1 at the key edge,
 * 0 at the spill edge, so the result is continuous). Fully transparent pixels are left alone.
 * Returns a new RGBA array.
 */
export function despillMagenta(rgba, keyTolerance = 60, spillTolerance = 140) {
  const out = new Uint8Array(rgba)
  const span = spillTolerance - keyTolerance
  for (let i = 0; i + 3 < out.length; i += 4) {
    if (out[i + 3] === 0) continue
    const d = Math.hypot(out[i] - 255, out[i + 1], out[i + 2] - 255)
    if (d > spillTolerance) continue
    const t = Math.min(1, (spillTolerance - d) / span)
    const g = out[i + 1]
    if (out[i] > g) out[i] = Math.round(out[i] - (out[i] - g) * t)
    if (out[i + 2] > g) out[i + 2] = Math.round(out[i + 2] - (out[i + 2] - g) * t)
    out[i + 3] = Math.round(out[i + 3] * (1 - t))
  }
  return out
}
