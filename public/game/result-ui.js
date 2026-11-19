// Result screen: title, numbers, the round's 3x3 seats labelled with their outcome (a tap opens
// the explanation), and the share button with fallbacks. All text goes in via textContent.
import { TITLE_TEXT, endTimeLine, rewardLine, titleFor } from './result.js'
import { shareResult, shareText, shareUrl } from './share.js'
import { BEFORE_SWAP_NOTE, basisLine, originFlags, originLine, statusLabel } from './labels.js'

const REASON = { clear: '수상한 응시자를 모두 찾았어요.', timeout: '시간이 끝났어요.', lives: '정상 응시자를 잡아 시험이 끝났어요' }

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

/** Outcome of a seat on the result grid. */
const OUTCOME = {
  caught: { badge: '잡음', cls: 'ok' },
  missed: { badge: '놓침', cls: 'miss' },
  wrong: { badge: '오해', cls: 'wrong' },
  innocent: { badge: '정상', cls: 'calm' },
}

/** The seat's action-pose image (it shows what the examinee did). */
function poseImg(id, cls) {
  const img = el('img', cls)
  img.src = `/px/${id}-1.webp`
  img.alt = ''
  img.addEventListener('error', () => img.remove())
  return img
}

/** "<label> <text>" paragraph; null when there is no text. */
function fact(label, text, cls = 'detail-fact') {
  if (!text) return null
  const p = el('p', cls)
  p.append(el('strong', '', label), ' ', text)
  return p
}

/** "보도된 사례" with one line per origin ("🇯🇵 일본 2024 · 와세다대 입시"); null when there is none. */
function origins(list) {
  if (!list?.length) return null
  const box = el('div', 'detail-fact detail-origins')
  const ul = el('ul', 'detail-origin-list')
  ul.append(...list.map((o) => el('li', '', originLine(o))))
  box.append(el('strong', '', '보도된 사례'), ul)
  return box
}

/**
 * The round's nine seats in their play positions, each labelled with its outcome and name.
 * A tap opens a dialog with the explanation. Returns the grid and the dialog.
 */
function resultGrid(recap, cases, innocents) {
  const caseById = new Map(cases.map((c) => [c.id, c]))
  const innById = new Map(innocents.map((i) => [i.id, i]))
  const caught = new Set(recap.caught)
  const wrongBySeat = new Map(recap.misjudged.map((m) => [m.seat, m]))

  const dialog = el('dialog', 'detail')
  dialog.id = 'end-detail'
  dialog.setAttribute('aria-labelledby', 'end-detail-title')
  // A click on the backdrop (the dialog box itself, outside its content) closes it.
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) dialog.close()
  })
  let opener = null
  dialog.addEventListener('close', () => opener?.focus())

  function openDetail(btn, s, outcome) {
    const isCheater = s.kind === 'cheater'
    const c = isCheater ? caseById.get(s.id) : undefined
    const inn = isCheater ? undefined : innById.get(s.id)
    const name = (isCheater ? c?.name : inn?.name) ?? s.id
    const o = OUTCOME[outcome]
    const title = el('h3', 'detail-title', `응시자 ${s.seat + 1} · ${name}`)
    title.id = 'end-detail-title'
    const tags = el('p', 'detail-tags')
    tags.append(el('span', `badge badge-${o.cls}`, o.badge))
    const st = statusLabel(c)
    if (st) tags.append(' ', el('span', 'chip', st))
    // Where the case was reported: one flag per country.
    const flags = isCheater ? originFlags(c?.origins) : ''
    if (flags) tags.append(' ', el('span', 'detail-flags', flags))
    const head = el('div', 'detail-head')
    const headText = el('div')
    headText.append(title, tags)
    head.append(poseImg(s.id, 'detail-img'), headText)

    const facts = isCheater
      ? [
          wrongBySeat.get(s.seat)?.beforeSwap ? el('p', 'end-note', BEFORE_SWAP_NOTE) : null,
          fact('수법', c?.summary),
          fact('게임에서 보인 행동', c?.tell?.action),
          fact('실제로 알아챈 단서', c?.cue),
          origins(c?.origins),
          c?.tell ? el('p', 'end-basis', basisLine(c.tell)) : null,
          dexLink(s.id, name),
        ]
      : [
          outcome === 'wrong' ? el('p', 'end-note', '이 응시자를 잡아서 시험이 끝났어요.') : null,
          fact('보인 행동', inn?.action),
          fact('정상인 이유', inn?.why),
          fact('부정행위와 다른 점', inn?.vs),
        ]
    const close = el('button', 'btn detail-close', '닫기')
    close.type = 'button'
    close.addEventListener('click', () => dialog.close())
    dialog.replaceChildren(head, ...facts.filter(Boolean), close)
    opener = btn
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    close.focus()
  }

  const grid = el('div', 'seats rgrid')
  grid.id = 'end-grid'
  for (const s of [...recap.seats].sort((a, b) => a.seat - b.seat)) {
    const isCheater = s.kind === 'cheater'
    const outcome = isCheater ? (caught.has(s.id) ? 'caught' : 'missed') : wrongBySeat.has(s.seat) ? 'wrong' : 'innocent'
    const name = (isCheater ? caseById.get(s.id)?.name : innById.get(s.id)?.name) ?? s.id
    const o = OUTCOME[outcome]
    const btn = el('button', `seat rseat is-${outcome}`)
    btn.type = 'button'
    btn.dataset.resultSeat = String(s.seat)
    btn.dataset.outcome = outcome
    btn.setAttribute('aria-haspopup', 'dialog')
    btn.setAttribute('aria-label', `응시자 ${s.seat + 1} ${o.badge}: ${name}. 설명 보기`)
    // 🔍 on every seat says "tap for the explanation"; the button's aria-label already says it.
    const zoom = el('span', 'rseat-zoom', '🔍')
    zoom.setAttribute('aria-hidden', 'true')
    btn.append(poseImg(s.id, 'rseat-img'), el('span', `badge badge-${o.cls} rseat-badge`, o.badge), zoom, el('span', 'rseat-name', name))
    btn.addEventListener('click', () => openDetail(btn, s, outcome))
    grid.append(btn)
  }
  return { grid, dialog }
}

/**
 * @param {HTMLElement} root
 * @param {{c:number,m:number,f:number,t:number}} r
 * @param {{share?:Function, clipboard?:object, reason?:'clear'|'timeout'|'lives',
 *   recap?:{caught:string[], misjudged:{seat:number,id:string,beforeSwap:boolean}[],
 *     seats:{seat:number,kind:'cheater'|'innocent',id:string}[]},
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
  root.append(el('p', `end-reward${r.c > 0 ? '' : ' is-zero'}`, rewardLine(r)))
  root.append(el('p', 'end-numbers', `잡은 ${r.c} · 놓친 ${r.m} · 오해 ${r.f}`))
  const timeLine = endTimeLine(r, deps.reason)
  if (timeLine) root.append(el('p', 'end-time', timeLine))
  const board = deps.recap ? resultGrid(deps.recap, deps.cases ?? [], deps.innocents ?? []) : null
  if (board) root.append(board.grid, el('p', 'end-hint', '🔍 좌석을 누르면 설명을 볼 수 있어요'))
  // Below the buttons: the seats and the share button come first on a small screen.
  const goal = el(
    'p',
    'end-hint end-goal',
    tier === 'eagle' ? '오해 없이 30초 안에 모두 잡았어요!' : '오해 없이 30초 안에 모두 잡으면 매의 눈 감독관',
  )

  const shareBtn = el('button', 'btn btn-primary', '공유하기')
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
  // Skips the how-to-play intro: the player has just seen it.
  again.href = '/play?again=1'
  const dex = el('a', 'btn', '도감 보기')
  dex.href = '/dex'
  const actions = el('div', 'end-actions')
  actions.append(shareBtn, again, dex)
  root.append(actions, status, fallback, goal)
  if (board) root.append(board.dialog)

  root.hidden = false
  h.focus()
}
