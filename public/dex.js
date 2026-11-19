import { filterCases } from '/dex-logic.js'
import { safeStorage, loadDiscovered } from '/game/storage.js'
import { BASIS_LABEL, STATUS_LABEL } from '/game/labels.js'

const STATUS = { ...STATUS_LABEL, unverified: '미검증 소문' }
const GROUP = { device: '전자기기', collab: '협력', classic: '고전', proxy: '대리응시', leak: '사전 유출' }
const COUNTRY = { KR: '한국', JP: '일본', IN: '인도', TH: '태국', TW: '대만', IT: '이탈리아', TR: '튀르키예', VN: '베트남', CN: '중국', US: '미국', ES: '스페인' }
const PROP = {
  'button-camera': 'prop-button-camera',
  'calculator-mod': 'prop-calculator-back',
  'body-writing': 'prop-cheat-note',
  'disguised-item': 'prop-cheat-note',
  'phone-in-bag': 'prop-phone-glow',
  'proxy-id': 'prop-id-card',
  'shoe-device': 'prop-earbud',
  'wig-device': 'prop-earbud',
  'camera-ai-watch': 'prop-smartwatch',
  'eraser-receiver': 'prop-earbud',
  'sms-relay': 'prop-phone-glow',
  'online-ask': 'prop-phone-glow',
  'outside-help': 'prop-cheat-note',
  'restroom-relay': 'prop-cheat-note',
  'insider-leak': 'prop-cheat-note',
}
const PLAYABLE_TOTAL = 12

function el(tag, props = {}, kids = []) {
  const n = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'text') n.textContent = v
    else if (k === 'class') n.className = v
    else n.setAttribute(k, v)
  }
  for (const c of kids) n.append(c)
  return n
}

function link(src) {
  return el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: src.title })
}

function imageFor(c) {
  if (c.status === 'unverified') return null
  const name = c.playable ? `${c.id}-0` : PROP[c.id]
  if (!name) return null
  return `/px/${name}.webp`
}

function img(c, cls) {
  const src = imageFor(c)
  if (!src) return null
  const i = el('img', { class: `px ${cls}`, src, alt: '', loading: 'lazy' })
  i.addEventListener('error', () => { i.hidden = true })
  return i
}

let cases = []
let discovered = new Set()
const $ = (id) => document.getElementById(id)

function card(c) {
  const found = c.playable && discovered.has(c.id)
  const chips = el('div', { class: 'chips' }, [
    el('span', { class: `chip s-${c.status}`, text: STATUS[c.status] }),
    el('span', { class: 'chip', text: GROUP[c.group] }),
  ])
  if (found) chips.append(el('span', { class: 'chip found-chip', text: '발견' }))
  if (c.visibility === 'low') chips.append(el('span', { class: 'chip', text: '행동으로 알아채기 어려움' }))
  const btn = el('button', { type: 'button', class: `card dcard${found ? ' found' : ''}`, 'data-id': c.id })
  const im = img(c, 'thumb')
  if (im) btn.append(im)
  btn.append(el('span', { class: 'nm', text: c.name }), chips)
  btn.addEventListener('click', () => { location.hash = c.id })
  return el('li', {}, [btn])
}

function render() {
  const f = { region: $('f-region').value, group: $('f-group').value, status: $('f-status').value }
  // 소문 코너는 필터와 무관하게 별도로 채운다.
  const list = filterCases(cases, { ...f, status: f.status === 'unverified' ? 'all' : f.status })
  const grid = $('grid')
  grid.replaceChildren(...list.map(card))
  $('empty').hidden = list.length > 0
  const n = cases.filter((c) => c.playable && discovered.has(c.id)).length
  $('progress').textContent = `${n} / ${PLAYABLE_TOTAL}`
}

function renderRumors() {
  const rumors = cases.filter((c) => c.status === 'unverified')
  $('rumor-grid').replaceChildren(...rumors.map(card))
}

function section(title, ...kids) {
  return [el('h3', { text: title }), ...kids]
}

function originText(o) {
  return `${COUNTRY[o.country] ?? o.country} ${o.year} · ${o.label}`
}

let lastFocus = null
function openDetail(id) {
  const c = cases.find((x) => x.id === id)
  if (!c) return closeDetail(false)
  const body = $('d-body')
  const kids = []
  const hi = img(c, 'hero-img')
  if (hi) kids.push(hi)
  kids.push(el('h2', { id: 'd-title', text: c.name }))
  const chips = el('div', { class: 'chips' }, [
    el('span', { class: `chip s-${c.status}`, text: STATUS[c.status] }),
    el('span', { class: 'chip', text: GROUP[c.group] }),
  ])
  if (c.visibility === 'low') chips.append(el('span', { class: 'chip', text: '행동으로 알아채기 어려움' }))
  kids.push(chips)
  if (c.status === 'unverified') {
    kids.push(el('p', { class: 'rumor-note', text: '확인되지 않은 소문입니다. 사실로 확인된 수법이 아닙니다.' }))
  }
  if (c.visibility === 'low') {
    kids.push(el('p', { class: 'low-note', text: '겉으로 드러나는 행동만으로는 알아채기 어려운 수법입니다.' }))
  }
  kids.push(...section('개요', el('p', { text: c.summary })))
  kids.push(...section('알아챈 단서', el('p', { text: c.cue })))
  if (c.tell) {
    const t = c.tell
    const basis = el('p', { class: 'tell-basis' }, [
      el('span', { class: 'chip', text: `근거: ${BASIS_LABEL[t.basisKind] ?? t.basisKind}` }),
    ])
    if (t.basisNote) basis.append(' ', el('span', { text: t.basisNote }))
    const parts = [el('p', { text: t.action }), basis]
    if (t.basisSources?.length) {
      parts.push(el('ul', {}, t.basisSources.map((s) => el('li', {}, [link(s)]))))
    }
    kids.push(...section('의심 행동과 근거', ...parts))
  }
  kids.push(...section('감독 확인 방법', el('p', { text: c.detect })))
  if (c.sources.length) {
    kids.push(...section('출처', el('ul', {}, c.sources.map((s) => el('li', {}, [link(s)])))))
  }
  if (c.origins.length) {
    kids.push(...section('보도된 사례', el('ul', {}, c.origins.map((o) => {
      const li = el('li', { text: originText(o) })
      if (o.sourceUrl) li.append(' ', el('a', { href: o.sourceUrl, target: '_blank', rel: 'noopener noreferrer', text: '보도' }))
      return li
    }))))
  }
  body.replaceChildren(...kids)
  const wasHidden = $('detail').hidden
  if (wasHidden && document.activeElement instanceof HTMLElement) lastFocus = document.activeElement
  $('detail').hidden = false
  document.body.style.overflow = 'hidden'
  $('detail').scrollTop = 0
  $('detail').querySelector('.sheet').focus()
}

function closeDetail(clearHash = true) {
  $('detail').hidden = true
  document.body.style.overflow = ''
  if (clearHash && location.hash) history.replaceState(null, '', location.pathname + location.search)
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus()
  lastFocus = null
}

function syncHash() {
  let id = ''
  try {
    id = decodeURIComponent(location.hash.slice(1))
  } catch {
    // Malformed hash (e.g. "#%E0"): ignore it and show the list.
  }
  if (id) openDetail(id)
  else closeDetail(false)
}

async function main() {
  discovered = loadDiscovered(safeStorage())
  $('d-close').addEventListener('click', () => closeDetail())
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('detail').hidden) closeDetail()
  })
  for (const id of ['f-region', 'f-group', 'f-status']) $(id).addEventListener('change', render)
  window.addEventListener('hashchange', syncHash)
  try {
    const res = await fetch('/data/cases.json')
    if (!res.ok) throw new Error(String(res.status))
    cases = await res.json()
  } catch {
    $('empty').textContent = '도감 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
    $('empty').hidden = false
    return
  }
  render()
  renderRumors()
  syncHash()
}
main()
