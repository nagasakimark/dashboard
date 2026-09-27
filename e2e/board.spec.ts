import { expect, test, type Page } from '@playwright/test'
import { dashboardPlannerExport } from '../src/data/migrate/fixtures.ts'

const widget = (page: Page, type: string) => page.locator(`section[data-widget="${type}"]`)

async function openBoard(page: Page) {
  await page.goto('./#/board')
  await expect(page.getByRole('button', { name: /^Workspace: / })).toBeVisible()
}

test('widgets keep their settings and position across reloads', async ({ page }, info) => {
  await openBoard(page)
  await page.getByRole('button', { name: 'Add Timer' }).click()
  const timer = widget(page, 'Timer')
  await expect(timer.getByRole('timer')).toHaveText('5:00')

  // Settings: pick the 1-minute preset.
  await timer.hover()
  await timer.getByRole('button', { name: 'Timer settings' }).click()
  await timer.getByRole('radio', { name: '1m' }).click()
  await timer.getByRole('button', { name: 'Done' }).click()
  await expect(timer.getByRole('timer')).toHaveText('1:00')

  // Drag it by the title bar.
  const header = timer.locator('header')
  const before = (await timer.boundingBox())!
  const h = (await header.boundingBox())!
  await page.mouse.move(h.x + 30, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + 130, h.y + 90, { steps: 6 })
  await page.mouse.up()
  const after = (await timer.boundingBox())!
  expect(after.x - before.x).toBeGreaterThan(60)

  await page.waitForTimeout(600) // autosave runs 400 ms after the last change
  await page.reload()
  await expect(widget(page, 'Timer').getByRole('timer')).toHaveText('1:00')
  const reloaded = (await widget(page, 'Timer').boundingBox())!
  expect(Math.abs(reloaded.x - after.x)).toBeLessThan(2)
  await page.screenshot({ path: `test-results/shots/board-${info.project.name}.png` })

  // Close with undo.
  await widget(page, 'Timer').hover()
  await widget(page, 'Timer').getByRole('button', { name: 'Close Timer' }).click()
  await expect(widget(page, 'Timer')).toHaveCount(0)
  await page.getByRole('status').filter({ hasText: 'Closed Timer' }).getByRole('button', { name: 'Undo' }).click()
  await expect(widget(page, 'Timer')).toHaveCount(1)
})

test('class lists feed Random Name, Group Maker and Spinner', async ({ page }) => {
  await openBoard(page)
  await page.getByRole('button', { name: 'Board settings', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Board settings' })
  await dialog.getByRole('tab', { name: /Classes/ }).click()
  await dialog.getByRole('button', { name: 'Add class' }).click()
  await dialog.getByLabel('Class name').fill('6-2')
  await dialog.getByLabel('Students').fill('Aoi\nHaruto\nMei\nSota')
  await dialog.getByRole('button', { name: 'Save class' }).click()
  await expect(dialog.getByText('4 students')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: 'Add Random Name' }).click()
  const picker = widget(page, 'Random Name')
  await picker.hover()
  await picker.getByRole('button', { name: 'Random Name settings' }).click()
  await picker.getByLabel('Class list').selectOption({ label: '6-2 (4)' })
  await picker.getByRole('button', { name: 'Done' }).click()
  await picker.getByRole('button', { name: 'Pick' }).click()
  await expect(picker.getByText(/^(Aoi|Haruto|Mei|Sota)$/)).toBeVisible({ timeout: 4000 })

  // A new Group Maker starts on the class used last.
  await page.getByRole('button', { name: 'Add Group Maker' }).click()
  const groups = widget(page, 'Group Maker')
  await groups.getByRole('button', { name: 'Make groups' }).click()
  await expect(groups.getByText(/Group 1/)).toBeVisible()
})

test('workspaces, templates and backgrounds', async ({ page }, info) => {
  await openBoard(page)
  await page.getByRole('button', { name: 'Add Clock' }).click()
  await page.getByRole('button', { name: 'Add Scoreboard' }).click()
  const score = widget(page, 'Scoreboard')
  await score.getByRole('button', { name: 'Give 1 to Team 1' }).click()
  await expect(score.getByLabel('Team 1 score')).toHaveText('1')

  // Save as a template.
  await page.getByRole('button', { name: 'Board settings', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Board settings' })
  await dialog.getByRole('tab', { name: 'Templates' }).click()
  await dialog.getByLabel('Template name').first().fill('Warm-up')
  await dialog.getByRole('button', { name: 'Save template' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved template' })).toBeVisible()

  // New empty workspace, then apply the template there.
  await dialog.getByRole('tab', { name: /Workspaces/ }).click()
  await dialog.getByRole('button', { name: 'New workspace' }).click()
  await expect(page.getByRole('button', { name: 'Workspace: Workspace 2' })).toBeVisible()
  await expect(widget(page, 'Clock')).toHaveCount(0)
  await dialog.getByRole('tab', { name: 'Templates' }).click()
  await dialog.getByRole('button', { name: 'Use here' }).click()
  await expect(widget(page, 'Clock')).toHaveCount(1)
  await expect(widget(page, 'Scoreboard').getByLabel('Team 1 score')).toHaveText('1')

  // Background: choosing one turns daily rotation off.
  await dialog.getByRole('tab', { name: 'Background' }).click()
  await dialog.getByRole('radio', { name: 'Gradient 4' }).click()
  await expect(dialog.getByRole('switch', { name: /Rotate wallpaper daily/ })).toHaveAttribute('aria-checked', 'false')
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(page.locator('[data-background="3"]')).toBeVisible()

  // Keyboard: previous workspace.
  await page.keyboard.press('[')
  await expect(page.getByRole('button', { name: 'Workspace: Workspace 1' })).toBeVisible()
  await page.keyboard.press('h')
  await expect(page.getByRole('navigation', { name: 'Dock' })).toHaveCount(0)
  await page.screenshot({ path: `test-results/shots/board-present-${info.project.name}.png` })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('navigation', { name: 'Dock' })).toBeVisible()
})

test('Upcoming Lessons uses real timetable times and links to the planner', async ({ page }, info) => {
  await page.clock.setFixedTime(new Date(2025, 0, 6, 8, 0))
  await page.goto('./#/settings')
  await page.locator('input[type=file]').setInputFiles({
    name: 'planner.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dashboardPlannerExport)),
  })
  await page.getByRole('dialog', { name: 'Import data' }).getByRole('button', { name: 'Replace my data with this' }).click()
  await expect(page.getByText('Import complete')).toBeVisible()

  await openBoard(page)
  await page.getByRole('button', { name: /More widgets/ }).click()
  await page
    .getByRole('dialog', { name: 'Add widget' })
    .getByRole('button', { name: /Upcoming Lessons/ })
    .click()
  const upcoming = widget(page, 'Upcoming Lessons')
  const first = upcoming.getByRole('button').filter({ hasText: 'Greetings review' })
  await expect(first).toContainText('8:45')
  await expect(first).toContainText('Today')
  await page.screenshot({ path: `test-results/shots/board-upcoming-${info.project.name}.png` })
  await first.click()
  await expect(page).toHaveURL(/#\/schedule\?d=2025-01-06/)
})
