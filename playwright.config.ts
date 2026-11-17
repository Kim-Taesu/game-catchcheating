import { defineConfig } from '@playwright/test'

// Playwright 번들 브라우저는 설치하지 않는다. 시스템 Chrome을 쓴다.
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://127.0.0.1:8788',
    launchOptions: { executablePath: CHROME },
  },
  webServer: {
    command: 'npx wrangler dev --port 8788 --ip 127.0.0.1',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
