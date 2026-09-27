import { expect, test, type Page } from '@playwright/test'

async function setup(page: Page) {
  await page.goto('./#/schools')
  await page
    .getByRole('button', { name: /Add (your first )?school/ })
    .first()
    .click()
  const editor = page.getByRole('dialog', { name: 'Add a school' })
  await editor.getByLabel('School name').fill('Tomachi JHS')
  await editor.getByRole('tab', { name: /Classes/ }).click()
  await editor.getByLabel('From year').fill('1')
  await editor.getByLabel('To year').fill('1')
  await editor.getByLabel('Classes per year').fill('3')
  await editor.getByRole('button', { name: 'Add classes' }).click()
  await editor.getByRole('button', { name: 'Save school' }).click()

  await page.goto('./#/textbooks')
  await page
    .getByRole('button', { name: /Add (a )?textbook/ })
    .first()
    .click()
  await page.getByRole('button', { name: /New Horizon 1 \(2025\)/ }).click()
  await expect(page.getByText('I am Edward Trout.')).toBeVisible()
}

test('builds a curriculum from a textbook and tracks class progress', async ({ page }, info) => {
  await setup(page)
  await page.goto('./#/curriculum')
  await page
    .getByRole('button', { name: /New curriculum|Create a curriculum|New/ })
    .first()
    .click()
  const dialog = page.getByRole('dialog', { name: 'New curriculum' })
  await dialog.getByLabel('Name').fill('NH1 — first term')
  await dialog.getByLabel('Textbook (optional)').selectOption({ label: 'New Horizon 1 (2025)' })
  await dialog.getByLabel('Year (optional)').selectOption('1')
  await expect(dialog.getByText('Tracking 3 classes: 1-1, 1-2, 1-3.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Create' }).click()

  await expect(page).toHaveURL(/#\/curriculum\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { level: 1, name: 'NH1 — first term' })).toBeVisible()
  await expect(page.getByText('p.12 I am Edward Trout.')).toBeVisible()

  await page.getByRole('tab', { name: /Class progress/ }).click()
  if (info.project.name === 'phone') {
    await page.getByRole('tab', { name: '1-2' }).click()
    await page.getByRole('button', { name: /p.8 Sounds and Letters 0/ }).click()
    await expect(page.getByText(/1\/\d+ done · next: p.10/)).toBeVisible()
  } else {
    await page.getByRole('button', { name: 'p.8 Sounds and Letters 0 — 1-2' }).click()
    await expect(page.getByRole('button', { name: 'p.8 Sounds and Letters 0 — 1-2' })).toHaveAttribute('aria-pressed', 'true')
  }
  await page.screenshot({ path: `test-results/shots/curriculum-progress-${info.project.name}.png` })
})

test('links a period to the next curriculum item and offers to mark it taught', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'desktop/tablet flow')
  await setup(page)
  await page.goto('./#/curriculum')
  await page
    .getByRole('button', { name: /New curriculum|Create a curriculum/ })
    .first()
    .click()
  const dialog = page.getByRole('dialog', { name: 'New curriculum' })
  await dialog.getByLabel('Name').fill('NH1 plan')
  await dialog.getByLabel('Textbook (optional)').selectOption({ label: 'New Horizon 1 (2025)' })
  await dialog.getByLabel('Year (optional)').selectOption('1')
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/#\/curriculum\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { level: 1, name: 'NH1 plan' })).toBeVisible()

  await page.goto('./#/schedule?v=week&d=2026-09-28')
  await page
    .getByRole('button', { name: /Set school/ })
    .first()
    .click()
  await page.getByRole('radio', { name: 'Tomachi JHS' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Add a period on 2026-09-28, period 1' }).click()
  const period = page.getByRole('dialog', { name: 'Add a period' })
  await period.getByRole('button', { name: '1-1' }).click()
  await period.getByRole('button', { name: /Next for 1-1: p.8 Sounds and Letters 0/ }).click()
  await period.getByRole('button', { name: 'Save' }).click()

  const prompt = page.getByRole('status').filter({ hasText: 'Mark “p.8 Sounds and Letters 0” as taught for 1-1?' })
  await prompt.getByRole('button', { name: 'Mark taught' }).click()

  // The next period for 1-1 now suggests the following item.
  await page.getByRole('button', { name: 'Add a period on 2026-09-28, period 2' }).click()
  const next = page.getByRole('dialog', { name: 'Add a period' })
  await next.getByRole('button', { name: '1-1' }).click()
  await expect(next.getByRole('button', { name: /Next for 1-1: p.10/ })).toBeVisible()
})
