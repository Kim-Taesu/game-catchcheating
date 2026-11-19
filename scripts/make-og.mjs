// Builds public/og/<tier>.png (800x400). Composes idle sprites from public/px when present,
// so re-running after real art arrives produces real cards.
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { TITLE_TEXT } from '../public/game/result.js'
import { esc } from './lib/esc.mjs'

const pub = (rel) => fileURLToPath(new URL(`../public/${rel}`, import.meta.url))
const FONT = 'Apple SD Gothic Neo, sans-serif'
const BRAND = '치팅 파인더'

const THEME = {
  eagle: { bg: ['#fff3c4', '#ffd36b'], ink: '#5a3b00' },
  veteran: { bg: ['#d9ecff', '#8fc1f5'], ink: '#0f3257' },
  suspicious: { bg: ['#ffe0dc', '#f5a39a'], ink: '#5c1a14' },
  rookie: { bg: ['#dff5e1', '#9bdaa4'], ink: '#14461d' },
  sleepy: { bg: ['#e9e3fa', '#b9a8ec'], ink: '#2f2166' },
}
const SPRITES = {
  eagle: ['peek', 'smartwatch', 'think-chin', 'smart-glasses-frame'],
  veteran: ['earpiece-hidden', 'look-up', 'plain-glasses', 'bone-conduction'],
  suspicious: ['signal-fingers', 'phone-in-clothes', 'yawn', 'glasses-swap'],
  rookie: ['stretch', 'drink-water', 'cheat-sheet-sleeve', 'sneeze'],
  sleepy: ['yawn', 'rub-eyes', 'stretch', 'scratch-head'],
}

function cardSvg(tier) {
  const t = THEME[tier]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bg[0]}"/><stop offset="1" stop-color="${t.bg[1]}"/></linearGradient></defs>
<rect width="800" height="400" fill="url(#g)"/>
<text x="40" y="62" font-family="${FONT}" font-size="30" font-weight="700" fill="${t.ink}" fill-opacity="0.75">${esc(BRAND)}</text>
<text x="400" y="170" text-anchor="middle" font-family="${FONT}" font-size="68" font-weight="800" fill="${t.ink}">${esc(TITLE_TEXT[tier])}</text>
</svg>`
}

export async function makeOg() {
  await mkdir(pub('og'), { recursive: true })
  const tiers = Object.keys(TITLE_TEXT)
  for (const tier of tiers) {
    if (!SPRITES[tier]) throw new Error(`make-og: no SPRITES entry for tier "${tier}"`)
    if (!THEME[tier]) throw new Error(`make-og: no THEME entry for tier "${tier}"`)
    const layers = []
    const files = SPRITES[tier].map((id) => pub(`px/${id}-0.webp`)).filter(existsSync)
    const w = 128
    const gap = 20
    const total = files.length * w + (files.length - 1) * gap
    for (let i = 0; i < files.length; i++) {
      // Decode to raw first: WebP shrink-on-load would otherwise bypass the chosen
      // kernel.
      const { data, info } = await sharp(files[i]).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const input = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize(w, w, { kernel: 'lanczos3' })
        .png()
        .toBuffer()
      layers.push({ input, left: Math.round(400 - total / 2 + i * (w + gap)), top: 230 })
    }
    await sharp(Buffer.from(cardSvg(tier))).composite(layers).png().toFile(pub(`og/${tier}.png`))
  }
  return tiers.length
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`og: ${await makeOg()} cards`)
}
