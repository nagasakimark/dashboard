import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('accent colour persists across reloads', async ({ page }) => {
  await page.goto('./#/settings')
  await page.getByRole('radio', { name: '#059669' }).click()
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
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  })
  const dialog = page.getByRole('dialog', { name: 'Import data' })
  await expect(dialog.getByText('ALT Dashboard export')).toBeVisible()
  await dialog.getByRole('button', { name: 'Replace my data with this file' }).click()
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
  await expect(page.getByText('This file can’t be imported')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Replace my data with this file' })).toHaveCount(0)
})
