import { handleShare } from './share'

export interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/r') return handleShare(url)
    return env.ASSETS.fetch(request)
  },
}
