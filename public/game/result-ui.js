// Result screen: title, numbers, share button with fallbacks, and the round's explanations
// (cases met, misjudged examinees, missed cases). All data goes in via textContent.
import { TITLE_TEXT, endTimeLine, titleFor } from './result.js'
import { shareResult, shareText, shareUrl } from './share.js'
import { SINGLE_ACTION_NOTE, basisLine, statusLabel } from './labels.js'

const REASON = { clear: '수상한 응시자를 모두 찾았어요.', timeout: '시간이 끝났어요.', lives: '기회를 모두 사용했어요.' }

function el(tag, cls, text) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text !== undefined) n.textContent = text
  return n
}

function dexLink(id, name) {
  const a = el('a', 'end-dex', '도감에서 자세히')
  a.href = `/dex#${encodeURIComponent(id)}`
  a.setAttribute('aria-label', `${name} 도감에서 자세히`)
  return a
}

/** A titled list section; null for an empty list so callers can filter it out. */
function section(id, heading, items) {
  if (!items.length) return null
  const sec = el('section', 'end-sec')
  sec.id = id
  const list = el('ul', 'end-list')
  list.append(...items)
  sec.append(el('h3', 'end-sec-title', heading), list)
  return sec
}

/** Lists for the recap the play screen passes to onEnd. Empty lists are left out. */
function recapSections(recap, cases, innocents) {
  const caseById = new Map(cases.map((c) => [c.id, c]))
  const innById = new Map(innocents.map((i) => [i.id, i]))
  const caseName = (id) => caseById.get(id)?.name ?? id

  const met = recap.caught.map((id) => {
    const c = caseById.get(id)
    const li = el('li', 'end-item')
    const title = el('p', 'end-item-title', caseName(id))
    const st = statusLabel(c)
    if (st) title.append(' ', el('span', 'chip', st))
    li.append(title)
    if (c?.cue) li.append(el('p', '', c.cue))
    const t = c?.tell
    if (t) li.append(el('p', 'end-basis', basisLine(t)))
    li.append(dexLink(id, caseName(id)))
    return li
  })

  const wrong = recap.misjudged.map((m) => {
    const li = el('li', 'end-item')
    if (m.beforeSwap) {
      // Name the case only when it was caught later in the round.
      const later = recap.caught.includes(m.id) ? ` (나중에 적발: ${caseName(m.id)})` : ''
      li.append(el('p', 'end-item-title', `응시자 ${m.seat + 1} — 이때는 아직 수상한 점이 보이지 않았어요${later}`))
    } else {
      const inn = innById.get(m.id)
      li.append(el('p', 'end-item-title', inn?.name ?? m.id), el('p', '', inn?.why ?? ''))
    }
    li.append(el('p', 'end-basis', SINGLE_ACTION_NOTE))
    return li
  })

  const missed = recap.missed.map((id) => {
    const li = el('li', 'end-item')
    li.append(el('p', 'end-item-title', caseName(id)), dexLink(id, caseName(id)))
    return li
  })
  return [
    section('end-met', '이번 판에서 만난 수법', met),
    section('end-misjudged', '오해한 응시자', wrong),
    section('end-missed', '놓친 수법', missed),
  ].filter(Boolean)
}

/**
 * @param {HTMLElement} root
 * @param {{c:number,m:number,f:number,t:number}} r
 * @param {{share?:Function, clipboard?:object, reason?:'clear'|'timeout'|'lives',
 *   recap?:{caught:string[], missed:string[], misjudged:{seat:number,id:string,beforeSwap:boolean}[]},
 *   cases?:any[], innocents?:any[]}} [deps]
 */
export function showResult(root, r, deps = {}) {
  const share = deps.share ?? (typeof navigator.share === 'function' ? (d) => navigator.share(d) : undefined)
  const clipboard = deps.clipboard ?? navigator.clipboard
  const tier = titleFor(r)

  root.replaceChildren()
  root.append(el('p', 'end-label', `시험 종료${deps.reason && REASON[deps.reason] ? ' · ' + REASON[deps.reason] : ''}`))
  const h = el('h2', 'end-title', TITLE_TEXT[tier])
  h.tabIndex = -1
  root.append(h)
  root.append(el('p', 'end-numbers', `잡은 ${r.c} · 놓친 ${r.m} · 오해 ${r.f}`))
  const timeLine = endTimeLine(r, deps.reason)
  if (timeLine) root.append(el('p', 'end-time', timeLine))
  root.append(
    el(
      'p',
      'end-hint',
      tier === 'eagle'
        ? '오해 없이 30초 안에 모두 잡았어요!'
        : '오해 없이 30초 안에 모두 잡으면 매의 눈 감독관',
    ),
  )

  const shareBtn = el('button', 'btn btn-primary', '자랑하기')
  shareBtn.type = 'button'
  const status = el('p', 'end-status')
  status.setAttribute('role', 'status')
  const fallback = el('input', 'end-link')
  fallback.type = 'text'
  fallback.readOnly = true
  fallback.hidden = true
  fallback.setAttribute('aria-label', '공유 링크')

  const url = shareUrl(location.origin, r)
  const text = shareText(r, url)
  shareBtn.addEventListener('click', async () => {
    status.textContent = ''
    const out = await shareResult(text, { share, clipboard })
    if (out === 'copied') {
      status.textContent = '복사했어요'
    } else if (out === 'failed') {
      fallback.value = url
      fallback.hidden = false
      fallback.focus()
      fallback.select()
      status.textContent = '링크를 길게 눌러 복사하세요'
    }
  })

  const again = el('a', 'btn', '다시 하기')
  again.href = '/play'
  const dex = el('a', 'btn', '도감 보기')
  dex.href = '/dex'
  const actions = el('div', 'end-actions')
  actions.append(shareBtn, again, dex)
  root.append(actions, status, fallback)
  if (deps.recap) root.append(...recapSections(deps.recap, deps.cases ?? [], deps.innocents ?? []))

  root.hidden = false
  h.focus()
}
