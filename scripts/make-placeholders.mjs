// Generates placeholder art at the final asset paths. Existing files (real art) are kept
// unless --force is passed. Finally re-runs make-og.
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { esc, makeOg } from './make-og.mjs'
import { captionFor } from './lib/caption.mjs'

const pub = (rel) => fileURLToPath(new URL(`../public/${rel}`, import.meta.url))
const readJson = (rel) => JSON.parse(readFileSync(pub(rel), 'utf8'))
const force = process.argv.includes('--force')
const FONT = 'Apple SD Gothic Neo, sans-serif'

const PROPS = [
  ['prop-smart-glasses', '스마트안경', '🕶'], ['prop-earbud', '이어폰', '🎧'],
  ['prop-button-camera', '단추 카메라', '🔘'], ['prop-calculator-back', '개조 계산기', '🧮'],
  ['prop-id-card', '위조 신분증', '🪪'], ['prop-bone-band', '뼈 전도', '〰'],
  ['prop-smartwatch', '스마트워치', '⌚'], ['prop-cheat-note', '쪽지', '📝'],
  ['prop-phone-glow', '가방 속 폰', '📱'],
]

function hue(id) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h % 360
}

/** Wrap text into at most 3 lines (by words, hard-split if needed) and fit the font to 176px. */
function caption(text) {
  if (!text) return { lines: [], size: 0 }
  const chars = [...text]
  const per = Math.max(8, Math.ceil(chars.length / 3))
  const words = text.split(' ')
  let lines = []
  let cur = ''
  for (const w of words) {
    if (cur && [...(cur + ' ' + w)].length > per) { lines.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w
  }
  if (cur) lines.push(cur)
  if (lines.length > 3 || lines.some((l) => [...l].length > per + 4)) {
    lines = [0, 1, 2].map((i) => chars.slice(i * per, (i + 1) * per).join('')).filter(Boolean)
  }
  const longest = Math.max(...lines.map((l) => [...l].length))
  const size = Math.max(13, Math.min(22, Math.floor(176 / longest)))
  return { lines, size }
}

function personSvg(id, entry, pose) {
  const name = captionFor(entry, pose)
  const h = hue(id)
  const action = pose === 1
  const bg = action ? `hsl(${(h + 40) % 360} 85% 82%)` : `hsl(${h} 60% 88%)`
  const body = `hsl(${h} 55% 52%)`
  const dx = action ? 14 : 0
  const { lines, size } = caption(name)
  const text = lines
    .map((l, i) => `<text x="96" y="${180 - (lines.length - 1 - i) * (size + 2)}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#222">${esc(l)}</text>`)
    .join('')
  const marker = action
    ? `<circle cx="160" cy="34" r="20" fill="#e5322d"/><text x="160" y="46" text-anchor="middle" font-family="${FONT}" font-size="32" font-weight="800" fill="#fff">!</text>`
    : ''
  const arm = action ? `<path d="M${96 + dx + 24} 110 L${96 + dx + 52} 84" stroke="${body}" stroke-width="10" stroke-linecap="round"/>` : ''
  const tilt = action ? `transform="rotate(8 ${96 + dx} 76)"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
<rect x="4" y="4" width="184" height="184" rx="28" fill="${bg}" stroke="${action ? '#e5322d' : 'none'}" stroke-width="${action ? 4 : 0}"/>
<g transform="translate(0 -18)">
${arm}
<rect x="${96 + dx - 34}" y="100" width="68" height="48" rx="22" fill="${body}"/>
<circle cx="${96 + dx}" cy="76" r="26" fill="#f6d2b0" ${tilt}/>
<circle cx="${96 + dx - 9}" cy="74" r="3" fill="#333"/><circle cx="${96 + dx + 9}" cy="74" r="3" fill="#333"/>
</g>
${marker}${text}
</svg>`
}

function propSvg(id, label, glyph) {
  const h = hue(id)
  const { lines, size } = caption(label)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
<rect x="4" y="4" width="184" height="184" rx="28" fill="hsl(${h} 55% 90%)"/>
<circle cx="96" cy="86" r="48" fill="hsl(${h} 55% 62%)"/>
<text x="96" y="104" text-anchor="middle" font-size="52" font-family="${FONT}">${esc(glyph)}</text>
<text x="96" y="${lines.length > 1 ? 162 : 174}" text-anchor="middle" font-family="${FONT}" font-size="${Math.min(size, 20)}" font-weight="700" fill="#222">${esc(lines[0])}</text>
${lines[1] ? `<text x="96" y="182" text-anchor="middle" font-family="${FONT}" font-size="${Math.min(size, 20)}" font-weight="700" fill="#222">${esc(lines[1])}</text>` : ''}
</svg>`
}

const classroomSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="648">
<rect width="1152" height="648" fill="#efe6d2"/>
<rect width="1152" height="120" fill="#cfe0d4"/>
<rect x="360" y="14" width="432" height="92" rx="8" fill="#2f5d46"/>
<rect y="520" width="1152" height="128" fill="#c9b48e"/>
<g fill="#b78f5c">${[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<rect x="${160 + c * 360}" y="${190 + r * 140}" width="270" height="22" rx="6"/>`)).join('')}</g>
</svg>`

const jobs = []
for (const c of readJson('data/cases.json').filter((x) => x.playable)) jobs.push(c)
for (const c of readJson('data/innocents.json')) jobs.push(c)

let written = 0
let skipped = 0
async function put(rel, svg) {
  const file = pub(rel)
  if (existsSync(file) && !force) { skipped++; return }
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(file)
  written++
}

await mkdir(pub('px'), { recursive: true })
for (const e of jobs) {
  await put(`px/${e.id}-0.webp`, personSvg(e.id, e, 0))
  await put(`px/${e.id}-1.webp`, personSvg(e.id, e, 1))
}
for (const [id, label, glyph] of PROPS) await put(`px/${id}.webp`, propSvg(id, label, glyph))
await put('px/classroom.webp', classroomSvg)
await makeOg()
console.log(`placeholders: ${written} written, ${skipped} skipped${force ? ' (--force)' : ''}; og regenerated`)
