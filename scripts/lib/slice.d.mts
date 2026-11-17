export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function gridCells(width: number, height: number, cols: number, rows: number): Rect[]
export function splitPair(cell: Rect): [Rect, Rect]
export function keyMagenta(rgba: Uint8Array, tolerance?: number): Uint8Array
