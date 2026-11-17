import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import { gridCells, keyMagenta, splitPair } from '../scripts/lib/slice.mjs'

const dir = mkdtempSync(join(tmpdir(), 'cf-slice-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('gridCells', () => {
  it('splits row-major', () => {
    const cells = gridCells(2400, 1200, 3, 3)
    expect(cells).toHaveLength(9)
    expect(cells[0]).toEqual({ x: 0, y: 0, w: 800, h: 400 })
    expect(cells[8]).toEqual({ x: 1600, y: 800, w: 800, h: 400 })
  })
})

describe('splitPair', () => {
  it('splits left and right halves', () => {
    expect(splitPair({ x: 0, y: 0, w: 800, h: 400 })).toEqual([
      { x: 0, y: 0, w: 400, h: 400 },
      { x: 400, y: 0, w: 400, h: 400 },
    ])
  })
})

describe('keyMagenta', () => {
  it('clears alpha of magenta-ish pixels only', () => {
    const src = new Uint8Array([255, 0, 255, 255, 250, 10, 250, 255, 10, 200, 30, 255])
    const out = keyMagenta(src)
    expect([out[3], out[7], out[11]]).toEqual([0, 0, 255])
    expect(src[3]).toBe(255)
  })
})

describe('slice-sheet CLI', () => {
  it('writes 18 transparent 192x192 webp files', async () => {
    const overlays: sharp.OverlayOptions[] = []
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (const half of [0, 1]) {
      overlays.push({
        input: { create: { width: 100, height: 200, channels: 3, background: { r: 20, g: 120, b: 40 } } },
        left: c * 800 + half * 400 + 150, top: r * 400 + 100,
      })
    }
    const sheet = join(dir, 'sheet.png')
    await sharp({ create: { width: 2400, height: 1200, channels: 3, background: { r: 255, g: 0, b: 255 } } })
      .composite(overlays).png().toFile(sheet)
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
    const out = join(dir, 'out')
    execFileSync('node', ['scripts/slice-sheet.mjs', sheet, 'pair', ids.join(','), out])
    for (const id of ids) for (const n of [0, 1]) {
      const file = join(out, `${id}-${n}.webp`)
      expect(existsSync(file)).toBe(true)
      const meta = await sharp(file).metadata()
      expect([meta.width, meta.height, meta.hasAlpha]).toEqual([192, 192, true])
      const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      expect(data[3]).toBe(0)
    }
  })

  it('rejects wrong id count', () => {
    expect(() => execFileSync('node', ['scripts/slice-sheet.mjs', 'x.png', 'pair', 'a,b', dir], { stdio: 'pipe' })).toThrow()
  })
})
