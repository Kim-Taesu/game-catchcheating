import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'

const root = new URL('../public/', import.meta.url)
const p = (rel: string) => new URL(rel, root).pathname
const readJson = (rel: string) => JSON.parse(readFileSync(p(rel), 'utf8')) as { id: string; playable?: boolean }[]

const ids = [
  ...readJson('data/cases.json').filter((c) => c.playable).map((c) => c.id),
  ...readJson('data/innocents.json').map((c) => c.id),
]
const props = [
  'prop-smart-glasses', 'prop-earbud', 'prop-button-camera', 'prop-calculator-back', 'prop-id-card',
  'prop-bone-band', 'prop-smartwatch', 'prop-cheat-note', 'prop-phone-glow',
]
const tiers = ['eagle', 'veteran', 'suspicious', 'rookie', 'sleepy']

async function size(file: string) {
  const m = await sharp(p(file)).metadata()
  return [m.width, m.height]
}

describe('placeholder art', () => {
  it('has 27 people', () => expect(ids).toHaveLength(27))

  it('every person has idle and action sprites at 192x192', async () => {
    for (const id of ids) {
      for (const n of [0, 1]) {
        const f = `px/${id}-${n}.webp`
        expect(existsSync(p(f)), f).toBe(true)
        expect(await size(f), f).toEqual([192, 192])
      }
    }
  })

  it('idle and action pixels differ', async () => {
    for (const id of ids) {
      const a = await sharp(p(`px/${id}-0.webp`)).raw().toBuffer()
      const b = await sharp(p(`px/${id}-1.webp`)).raw().toBuffer()
      expect(a.equals(b), id).toBe(false)
    }
  })

  it('props are 192x192 and classroom is 1152x648', async () => {
    for (const id of props) expect(await size(`px/${id}.webp`), id).toEqual([192, 192])
    expect(await size('px/classroom.webp')).toEqual([1152, 648])
  })

  it('og cards are 800x400', async () => {
    for (const t of tiers) expect(await size(`og/${t}.png`), t).toEqual([800, 400])
  })
})
