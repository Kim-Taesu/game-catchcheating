import { TITLE_TEXT, parseShare, titleFor, type Result } from '../public/game/result.js'

/** Bump when the og/*.png images change so crawlers refetch them. */
export const OG_VERSION = '2'

const BRAND = '치팅 파인더'

/**
 * HTML for the share landing. Only integers (already validated by parseShare),
 * our own constants and `origin` (from `new URL(...).origin`) reach the markup.
 */
export function renderShare(r: Result, origin: string): string {
  const tier = titleFor(r)
  const title = TITLE_TEXT[tier]
  const ogTitle = `잡은 ${r.c} · 놓친 ${r.m} · 오해 ${r.f}`
  const ogDescription = `${title} - ${BRAND}에서 시험장 부정행위를 잡아보세요`
  const ogImage = `${origin}/og/${tier}.png?v=${OG_VERSION}`

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${BRAND} - ${title}</title>
<meta property="og:site_name" content="${BRAND}">
<meta property="og:type" content="website">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f6f4ee;color:#222}
main{text-align:center;padding:24px}
h1{font-size:1rem;margin:0 0 16px;color:#666}
.title{font-size:1.75rem;font-weight:700;margin:0 0 12px}
.nums{font-size:1.125rem;margin:0 0 28px}
a{display:inline-block;padding:12px 28px;border-radius:999px;background:#222;color:#fff;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<main>
<h1>${BRAND}</h1>
<p class="title">${title}</p>
<p class="nums">${ogTitle}</p>
<a href="/play">나도 해보기</a>
</main>
</body>
</html>
`
}

export function handleShare(url: URL): Response {
  const result = parseShare(url.searchParams)
  if (!result) return Response.redirect(new URL('/', url).href, 302)
  return new Response(renderShare(result, url.origin), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
