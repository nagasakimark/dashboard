import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('accent colour persists across reloads', async ({ page }) => {
  await page.goto('./#/settings')
  const green = page.getByRole('radio', { name: '#059669' })
  await green.click()
  // Wait until the saved setting has round-tripped through the database.
  await expect(green).toHaveAttribute('aria-checked', 'true')
  await page.reload()
  await expect(page.getByRole('radio', { name: '#059669' })).toHaveAttribute('aria-checked', 'true')
  const accent = await page.evaluate(() => document.documentElement.style.getPropertyValue('--accent'))
  expect(accent).toBe('#059669')
})

test('export then import round-trips data with an undo', async ({ page }, info) => {
  await page.goto('./#/settings')
  await page.getByLabel('Your name').fill('Alex Smith')
  await page.screenshot({ path: `test-results/shots/settings-${info.project.name}.png`, fullPage: true })

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export everything' }).click()])
  expect(download.suggestedFilename()).toMatch(/^alt-dashboard-\d{4}-\d{2}-\d{2}\.json$/)
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(exported.app).toBe('alt-dashboard')
  expect(exported.data.settings.find((s: { id: string }) => s.id === 'profileName').value).toBe('Alex Smith')

  // Change the name, then import the earlier export to bring it back.
  await page.getByLabel('Your name').fill('Changed')
  await expect(page.getByLabel('Your name')).toHaveValue('Changed')
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  })
  const dialog = page.getByRole('dialog', { name: 'Import data' })
  await expect(dialog.getByText('ALT Dashboard export')).toBeVisible()
  await dialog.getByRole('button', { name: 'Replace my data with this' }).click()
  await expect(page.getByText('Import complete')).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('Alex Smith')

  // Undo restores the pre-import state.
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByLabel('Your name')).toHaveValue('Changed')
  await expect(page.getByText(/Before importing backup\.json/)).toBeVisible()
})

test('rejects files it does not recognise', async ({ page }) => {
  await page.goto('./#/settings')
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
  await expect(page.getByText('This can’t be imported')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace my data with this' })).toHaveCount(0)
})

test('sync is off by default and offers Google sign-in', async ({ page }) => {
  await page.goto('./#/settings')
  const card = page.locator('#sync')
  await expect(card.getByRole('heading', { name: 'Sync between devices' })).toBeVisible()
  await expect(card.getByRole('button', { name: 'Sign in with Google and turn on sync' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Sync:/ })).toHaveCount(0)
})

test('Google sign-in uses Google’s own window (accounts.google.com), not Firebase’s', async ({ page }) => {
  // Stand-in for Google's sign-in script: record the request and report the window being closed.
  await page.addInitScript(() => {
    const w = window as unknown as { google: unknown; gisRequests: unknown[] }
    w.gisRequests = []
    w.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config: { client_id: string; scope: string; error_callback: (e: { type: string }) => void }) => ({
            requestAccessToken: () => {
              w.gisRequests.push({ client: config.client_id, scope: config.scope })
              config.error_callback({ type: 'popup_closed' })
            },
          }),
        },
      },
    }
  })
  const popups: string[] = []
  page.on('popup', (p) => popups.push(p.url()))
  await page.goto('./#/settings')
  const card = page.locator('#sync')
  await card.getByRole('button', { name: 'Sign in with Google and turn on sync' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Sign-in didn’t finish' })).toBeVisible()
  const requests = await page.evaluate(() => (window as unknown as { gisRequests: { client: string; scope: string }[] }).gisRequests)
  expect(requests).toEqual([
    { client: expect.stringMatching(/^457862393597-.*\.apps\.googleusercontent\.com$/), scope: 'openid email profile' },
  ])
  expect(popups.filter((u) => u.includes('firebaseapp.com'))).toEqual([])
  await expect(card.getByRole('button', { name: 'Try Firebase’s sign-in window' })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Sync:/ })).toHaveCount(0)
})

test('the install button is always there, with steps when the browser has no prompt', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByRole('button', { name: 'Install app' }).click()
  const dialog = page.getByRole('dialog', { name: 'Install ALT Dashboard' })
  await expect(dialog.getByRole('listitem').first()).toBeVisible()
  await dialog.getByRole('button', { name: 'Got it' }).click()
  await expect(dialog).toBeHidden()
})
