import { expect, test, type Page } from '@playwright/test'
import { dashboardPlannerExport } from '../src/data/migrate/fixtures.ts'

async function importFixture(page: Page) {
  await page.goto('./#/settings')
  await page.locator('input[type=file]').setInputFiles({
    name: 'planner.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dashboardPlannerExport)),
  })
  await page.getByRole('dialog', { name: 'Import data' }).getByRole('button', { name: 'Replace my data with this' }).click()
  await expect(page.getByText('Import complete')).toBeVisible()
}

test('home shows the class happening now with real times, and to-dos', async ({ page }, info) => {
  // Monday 6 January 2025, 09:00 — during period 1 (08:45–09:30).
  await page.clock.setFixedTime(new Date(2025, 0, 6, 9, 0))
  await importFixture(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good morning, Test')
  await expect(page.getByText(/Happening now · Today, 8:45/)).toBeVisible()
  await expect(page.getByText('Greetings review').first()).toBeVisible()
  const today = page.getByRole('heading', { name: 'Today' }).locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]')
  await expect(today.getByText('Now')).toBeVisible()
  await expect(today.getByText('08:45–09:30')).toBeVisible()

  await page.getByLabel('New to-do').fill('Laminate flashcards')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Mark “Print flashcards” done' }).click()
  await expect(page.getByRole('button', { name: 'Clear 1 done' })).toBeVisible()
  await page.screenshot({ path: `test-results/shots/home-${info.project.name}.png`, fullPage: true })
})

test('class history searches and edits a class', async ({ page }, info) => {
  await importFixture(page)
  await page.goto('./#/history')
  await expect(page.getByText('2 classes')).toBeVisible() // lunch and special periods excluded
  await page.getByLabel('Search classes').fill('warm-up')
  await expect(page.getByText('1 class', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Greetings review/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit period' })
  await dialog.getByLabel('What you did / plan to do').fill('Unit 1 greetings — played bingo')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Search classes').fill('bingo')
  await expect(page.getByText('Unit 1 greetings — played bingo')).toBeVisible()
  await page.getByLabel('Search classes').fill('')
  await page.getByText('Include lunch').click()
  await expect(page.getByText('3 classes')).toBeVisible()
  await page.screenshot({ path: `test-results/shots/history-${info.project.name}.png` })
})
