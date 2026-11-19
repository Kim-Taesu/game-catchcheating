import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { captionFor } from '../scripts/lib/caption.mjs'
import { PROP_IDS } from '../scripts/lib/assets.mjs'

const root = new URL('../public/', import.meta.url)
const p = (rel: string) => new URL(rel, root).pathname
const readJson = (rel: string) => JSON.parse(readFileSync(p(rel), 'utf8')) as { id: string; playable?: boolean }[]

const ids = [
  ...readJson('data/cases.json').filter((c) => c.playable).map((c) => c.id),
  ...readJson('data/innocents.json').map((c) => c.id),
]
const props = PROP_IDS
const cases = readJson('data/cases.json') as unknown as { id: string; name: string; playable?: boolean; tell?: { action: string } }[]
const tiers = ['eagle', 'veteran', 'suspicious', 'rookie', 'sleepy']

async function size(file: string) {
  const m = await sharp(p(file)).metadata()
  return [m.width, m.height]
}

describe('placeholder art', () => {
  it('has 32 people', () => expect(ids).toHaveLength(32))

  it('prop ids are unique, and every dex icon points at one of them', () => {
    expect(new Set(props).size).toBe(props.length)
    const dexSrc = readFileSync(p('dex.js'), 'utf8')
    const block = dexSrc.slice(dexSrc.indexOf('const PROP = {'), dexSrc.indexOf('}', dexSrc.indexOf('const PROP = {')))
    const used = [...block.matchAll(/:\s*'(prop-[a-z-]+)'/g)].map((m) => m[1])
    expect(used.length).toBe(12)
    for (const id of used) expect(props, id).toContain(id)
  })

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

  it('sprite captions never reveal case names', () => {
    for (const c of cases.filter((x) => x.playable)) {
      expect(captionFor(c, 0), c.id).toBe('')
      expect(captionFor(c, 1), c.id).toBe(c.tell!.action)
      expect(captionFor(c, 1), c.id).not.toBe(c.name)
    }
    // Innocents use their action sentence, same form as tell.action, so the caption style gives no hint.
    const inn = readJson('data/innocents.json') as unknown as { id: string; name: string; action: string }[]
    for (const i of inn) {
      expect(captionFor(i, 0)).toBe('')
      expect(captionFor(i, 1), i.id).toBe(i.action)
      expect(captionFor(i, 1), i.id).not.toBe(i.name)
    }
  })
})
