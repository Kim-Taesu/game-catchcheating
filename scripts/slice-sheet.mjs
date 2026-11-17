// 사용법: node scripts/slice-sheet.mjs <sheet.png> <pair|prop> <id,id,...(9개)> <outDir>
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { despillMagenta, gridCells, keyMagenta, splitPair } from './lib/slice.mjs'

const SIZE = 192

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

const [sheetPath, kind, idArg, outDir] = process.argv.slice(2)
if (!sheetPath || !idArg || !outDir || (kind !== 'pair' && kind !== 'prop')) {
  fail('usage: node scripts/slice-sheet.mjs <sheet.png> <pair|prop> <id,id,...> <outDir>')
}
const ids = idArg.split(',').map((s) => s.trim())
if (ids.length !== 9 || ids.some((s) => !s)) fail(`ids must be exactly 9, got ${ids.length}`)

const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
// Key the magenta background, then despill the pink fringe around the figures.
const keyed = despillMagenta(keyMagenta(new Uint8Array(data.buffer, data.byteOffset, data.length)))
mkdirSync(outDir, { recursive: true })
// Zero-copy Buffer view over the keyed pixels; each cell clones the same raw input.
const base = sharp(Buffer.from(keyed.buffer, keyed.byteOffset, keyed.length), {
  raw: { width: info.width, height: info.height, channels: 4 },
})

async function save(rect, file) {
  const left = Math.max(0, rect.x)
  const top = Math.max(0, rect.y)
  const width = Math.min(rect.w, info.width - left)
  const height = Math.min(rect.h, info.height - top)
  await base
    .clone()
    .extract({ left, top, width, height })
    // Pixel art: nearest-neighbour keeps hard edges, lossless webp keeps exact colours.
    .resize(SIZE, SIZE, { fit: 'contain', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ lossless: true })
    .toFile(join(outDir, file))
}

const cells = gridCells(info.width, info.height, 3, 3)
for (let i = 0; i < 9; i++) {
  if (kind === 'prop') {
    await save(cells[i], `${ids[i]}.webp`)
  } else {
    const [idle, action] = splitPair(cells[i])
    await save(idle, `${ids[i]}-0.webp`)
    await save(action, `${ids[i]}-1.webp`)
  }
}
console.log(`wrote ${kind === 'pair' ? 18 : 9} files to ${outDir}`)
