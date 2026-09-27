import { expect, test, type Page } from '@playwright/test'

/** Compressed JavaScript fetched while a screen loads (first visit, no service worker cache). */
async function jsBytes(page: Page, url: string) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  const sizes = new Map<string, number>()
  const types = new Map<string, string>()
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type))
  cdp.on('Network.loadingFinished', (e) => sizes.set(e.requestId, e.encodedDataLength))
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  return [...sizes].filter(([id]) => types.get(id) === 'Script').reduce((n, [, s]) => n + s, 0)
}

// Budgets for the first load of each mode (gzip over the wire). Raise them
// deliberately, never by accident.
const BUDGETS: [string, string, number][] = [
  ['planner home', './', 250_000],
  ['classroom board', './#/board', 280_000],
  ['student poll page', './#/student', 95_000],
]

for (const [name, url, budget] of BUDGETS)
  test(`first load of the ${name} stays under ${budget / 1000} KB of JavaScript`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'size does not depend on the viewport')
    await page.addInitScript(() => localStorage.setItem('pollBackend', 'local'))
    const bytes = await jsBytes(page, url)
    console.log(`${name}: ${(bytes / 1024).toFixed(0)} KB`)
    expect(bytes).toBeLessThan(budget)
  })
