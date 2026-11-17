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
