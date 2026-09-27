import { expect, test } from '@playwright/test'

test('home loads and navigates to the schedule', async ({ page }, info) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening)/)
  await page.screenshot({ path: `test-results/shots/home-${info.project.name}.png`, fullPage: true })

  // Phones use the bottom tab bar; larger screens use the sidebar.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: /Schedule/ })
    .first()
    .click()
  await expect(page).toHaveURL(/#\/schedule$/)
  await expect(page.getByText('Add a school to start planning')).toBeVisible()
})

test('phone "More" sheet lists secondary sections', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only')
  await page.goto('./')
  await page.getByRole('button', { name: 'More' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.screenshot({ path: 'test-results/shots/more-sheet-phone.png' })
  await page.getByRole('dialog').getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL(/#\/settings$/)
})

test('classroom board opens full-screen and returns', async ({ page }) => {
  await page.goto('./#/board')
  await expect(page.getByRole('heading', { name: 'Classroom board' })).toBeVisible()
  await page.getByRole('link', { name: 'Planner' }).click()
  await expect(page).toHaveURL(/#\/$/)
})

test('student join page answers on the hash route', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pollBackend', 'local'))
  await page.goto('./#/student?room=12345')
  await expect(page.getByRole('heading', { name: 'Join a poll' })).toBeVisible()
  await expect(page.getByLabel('Room code')).toHaveValue('12345')
  await expect(page.getByRole('alert')).toHaveText('That room code wasn’t found.')
})

test('web app manifest is served', async ({ request }) => {
  const res = await request.get('manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  expect(manifest.name).toBe('ALT Dashboard')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
})
