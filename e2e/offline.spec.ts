import { expect, test } from '@playwright/test'

test('works offline once installed: planner, board and a game set used before', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser is enough')
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // Wait for the service worker to install; it controls pages from the next load.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  // Open a game set online so its words and pictures are cached.
  await page.goto('./#/games?set=pd-animals&mode=flashcards')
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible()
  await page.waitForLoadState('networkidle')

  await context.setOffline(true)
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening)/)
  await page.goto('./#/board')
  await expect(page.getByRole('navigation', { name: 'Dock' })).toBeVisible()
  await page.goto('./#/games?set=pd-animals&mode=flashcards')
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible()
  await context.setOffline(false)
})
