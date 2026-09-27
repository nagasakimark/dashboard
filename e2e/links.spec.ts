import { expect, test } from '@playwright/test'

test('activities, bookmarks and textbook links, in the planner and on the board', async ({ page }, info) => {
  await page.goto('./#/links')
  await expect(page.getByRole('link', { name: /Tescodle/ })).toHaveAttribute('href', 'https://nagasakimark.github.io/tescodle')

  await page.getByRole('tab', { name: 'Bookmarks' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Add bookmark' })
  await dialog.getByLabel('Name').fill('Kahoot')
  await dialog.getByLabel('Link').fill('kahoot.it')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('link', { name: /Kahoot/ })).toHaveAttribute('href', 'https://kahoot.it')
  await page.screenshot({ path: `test-results/shots/links-${info.project.name}.png` })

  await page.goto('./#/board')
  await page.getByRole('button', { name: /^Links/ }).click()
  const panel = page.getByRole('dialog', { name: 'Links' })
  await panel.getByRole('tab', { name: 'Bookmarks' }).click()
  await expect(panel.getByRole('link', { name: /Kahoot/ })).toBeVisible()
  await panel.getByRole('tab', { name: 'Textbooks' }).click()
  await expect(panel.getByText('No textbooks yet')).toBeVisible()
})
