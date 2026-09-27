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

test('create a school, assign a day and add a class', async ({ page }, info) => {
  await page.goto('./#/schools')
  await page
    .getByRole('button', { name: /Add (your first )?school/ })
    .first()
    .click()
  const editor = page.getByRole('dialog', { name: 'Add a school' })
  await editor.getByLabel('School name').fill('Minato Elementary')
  await editor.getByRole('tab', { name: /Classes/ }).click()
  await editor.getByLabel('From year').fill('5')
  await editor.getByLabel('To year').fill('6')
  await editor.getByLabel('Classes per year').fill('2')
  await editor.getByRole('button', { name: 'Add classes' }).click()
  await editor.getByRole('tab', { name: /Timetables/ }).click()
  await editor.getByLabel('Period 1 starts').fill('08:45')
  await editor.getByLabel('Period 1 ends').fill('09:30')
  await editor.getByRole('button', { name: 'Save school' }).click()
  await expect(page.getByRole('heading', { name: 'Minato Elementary' })).toBeVisible()
  await expect(page.getByText('4 classes')).toBeVisible()

  await page.goto('./#/schedule?v=week&d=2026-09-28')
  const isPhone = info.project.name === 'phone'
  // Assign Monday to the school.
  if (isPhone) await page.getByRole('button', { name: /No school set/ }).click()
  else
    await page
      .getByRole('button', { name: /Set school/ })
      .first()
      .click()
  const dayDialog = page.getByRole('dialog', { name: 'Monday 28 September 2026' })
  await dayDialog.getByRole('radio', { name: 'Minato Elementary' }).click()
  await dayDialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Mon 28 Sep: Minato Elementary')).toBeVisible()

  // Add a class in period 1.
  if (isPhone) await page.getByRole('listitem').filter({ hasText: 'P1' }).getByRole('button').click()
  else await page.getByRole('button', { name: 'Add a period on 2026-09-28, period 1' }).click()
  const periodDialog = page.getByRole('dialog', { name: 'Add a period' })
  await expect(periodDialog.getByText('08:45–09:30')).toBeVisible()
  await periodDialog.getByRole('button', { name: '6-2' }).click()
  await periodDialog.getByLabel('What you did / plan to do').fill('Unit 2: “What do you want to be?”')
  await periodDialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: /6-2 Unit 2: “What do you want to be\?”/ })).toBeVisible()
  await page.screenshot({ path: `test-results/shots/schedule-week-${info.project.name}.png` })
})

test('imported schedule shows, drags to move and undoes', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'drag and drop is a desktop/tablet interaction')
  await importFixture(page)
  await page.goto('./#/schedule?v=week&d=2025-01-06')
  const monday = page.getByRole('region', { name: 'Monday 6 January' })
  await expect(monday.getByText('Sakura ES')).toBeVisible()
  await expect(monday.getByText('Greetings review')).toBeVisible() // linked lesson plan title
  await expect(monday.getByText('Lesson Planning')).toBeVisible() // promoted "Other"

  const source = monday.getByText('5-1', { exact: true })
  const target = page.getByRole('button', { name: 'Add a period on 2025-01-08, period 3' })
  const s = (await source.boundingBox())!
  const t = (await target.boundingBox())!
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2)
  await page.mouse.down()
  await page.mouse.move(s.x + 20, s.y + 20, { steps: 5 })
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByText('Period moved.')).toBeVisible()
  const wednesday = page.getByRole('region', { name: 'Wednesday 8 January' })
  await expect(wednesday.getByText('5-1', { exact: true })).toBeVisible()
  await page.screenshot({ path: `test-results/shots/schedule-dragged-${info.project.name}.png` })

  await page.getByRole('status').filter({ hasText: 'Period moved.' }).getByRole('button', { name: 'Undo' }).click()
  await expect(monday.getByText('5-1', { exact: true })).toBeVisible()
  await expect(wednesday.getByText('5-1', { exact: true })).toHaveCount(0)
})

test('month, year and tally views summarise the schedule', async ({ page }, info) => {
  await importFixture(page)
  await page.goto('./#/schedule?v=month&d=2025-01-06')
  await expect(page.getByRole('heading', { name: 'January 2025' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Monday 13 January, Public Holiday/ })).toBeVisible()
  await page.screenshot({ path: `test-results/shots/schedule-month-${info.project.name}.png` })

  await page.getByRole('tab', { name: 'Tally' }).click()
  await page.getByLabel('From').fill('2025-01-01')
  await page.getByLabel('To').fill('2025-01-31')
  await expect(page.getByRole('heading', { name: 'Sakura ES' })).toBeVisible()
  await expect(page.getByText('2 lessons · 2 days · 1 lunch')).toBeVisible()
  await page.screenshot({ path: `test-results/shots/schedule-tally-${info.project.name}.png`, fullPage: true })
})

test('creates a PDF report', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser size is enough')
  await importFixture(page)
  await page.goto('./#/schedule?v=week&d=2025-01-06')
  await page.getByRole('button', { name: 'PDF report' }).click()
  const dialog = page.getByRole('dialog', { name: 'PDF report' })
  await dialog.getByLabel('From').fill('2025-01-01')
  await dialog.getByLabel('To').fill('2025-01-31')
  await dialog.getByRole('button', { name: 'Create report' }).click()
  await expect(dialog.locator('iframe[title="Report preview"]')).toBeVisible({ timeout: 20_000 })
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download PDF' }).click()])
  expect(download.suggestedFilename()).toBe('teaching-report-2025-01-01-to-2025-01-31.pdf')
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile((await download.path())!)
  await download.saveAs('test-results/shots/report-fixture.pdf')
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  // Summary page + two weekly pages (6 Jan and 13 Jan weeks have data).
  expect((bytes.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(3)
})

test('report from real data (private fixture)', async ({ page }, info) => {
  const { existsSync, readFileSync } = await import('node:fs')
  const file = 'fixtures/private/data.json'
  test.skip(info.project.name !== 'desktop' || !existsSync(file), 'needs the private data file')
  await page.goto('./#/settings')
  await page.locator('input[type=file]').setInputFiles({ name: 'data.json', mimeType: 'application/json', buffer: readFileSync(file) })
  await page.getByRole('dialog', { name: 'Import data' }).getByRole('button', { name: 'Replace my data with this' }).click()
  await expect(page.getByText('Import complete')).toBeVisible({ timeout: 20_000 })
  await page.goto('./#/schedule?v=week&d=2025-03-24')
  await page.screenshot({ path: 'test-results/shots/real-week.png' })
  await page.getByRole('button', { name: 'PDF report' }).click()
  const dialog = page.getByRole('dialog', { name: 'PDF report' })
  await dialog.getByLabel('From').fill('2025-03-17')
  await dialog.getByLabel('To').fill('2025-03-28')
  await dialog.getByRole('button', { name: 'Create report' }).click()
  await expect(dialog.locator('iframe[title="Report preview"]')).toBeVisible({ timeout: 60_000 })
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download PDF' }).click()])
  await download.saveAs('test-results/shots/report-real.pdf')
})
