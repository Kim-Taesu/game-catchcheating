// Result screen: title, numbers, share button with fallbacks.
import { TITLE_TEXT, titleFor } from './result.js'
import { shareResult, shareText, shareUrl } from './share.js'

const REASON = { clear: '수상한 응시자를 모두 찾았어요.', timeout: '시간이 끝났어요.', lives: '기회를 모두 사용했어요.' }

function el(tag, cls, text) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text !== undefined) n.textContent = text
  return n
}

/**
 * @param {HTMLElement} root
 * @param {{c:number,m:number,f:number,t:number}} r
 * @param {{share?:Function, clipboard?:object, reason?:string}} [deps]
 */
export function showResult(root, r, deps = {}) {
  const share = deps.share ?? (typeof navigator.share === 'function' ? (d) => navigator.share(d) : undefined)
  const clipboard = deps.clipboard ?? navigator.clipboard
  const tier = titleFor(r)
  const cleared = r.m === 0

  root.replaceChildren()
  root.append(el('p', 'end-label', `시험 종료${deps.reason && REASON[deps.reason] ? ' · ' + REASON[deps.reason] : ''}`))
  const h = el('h2', 'end-title', TITLE_TEXT[tier])
  h.tabIndex = -1
  root.append(h)
  root.append(el('p', 'end-numbers', `잡은 ${r.c} · 놓친 ${r.m} · 오해 ${r.f}`))
  root.append(el('p', 'end-time', cleared ? `걸린 시간 ${r.t}초` : '시간 종료'))
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
    const out = await shareResult(text, url, { share, clipboard })
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

  root.hidden = false
  h.focus()
}
