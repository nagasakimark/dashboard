import { expect, test, type Page } from '@playwright/test'

// Polls run on the local test backend (localStorage + BroadcastChannel), so
// the teacher's board and the student page talk inside one browser.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('pollBackend', 'local'))
})

const pollWidget = (page: Page) => page.locator('section[data-widget="Poll"]')

async function openPoll(page: Page) {
  await page.goto('./#/board')
  await page.getByRole('button', { name: /More widgets/ }).click()
  await page.getByRole('dialog', { name: 'Add widget' }).getByRole('button', { name: /^Poll/ }).click()
  const code = await pollWidget(page).locator('.font-mono').first().textContent()
  expect(code).toMatch(/^\d{5}$/)
  return code!
}

test('a class votes and the board shows live results', async ({ page, context }, info) => {
  const code = await openPoll(page)
  const poll = pollWidget(page)
  await poll.getByLabel('Question', { exact: true }).fill('Favourite fruit?')
  await poll.getByLabel('Answer 1', { exact: true }).fill('Apple')
  await poll.getByLabel('Answer 2', { exact: true }).fill('Banana')
  await poll.getByRole('button', { name: 'Add answer' }).click()
  await poll.getByLabel('Answer 3', { exact: true }).fill('Cherry')
  await poll.getByRole('button', { name: 'Start poll' }).click()
  await expect(poll.getByRole('tab', { name: 'Live' })).toHaveAttribute('aria-selected', 'true')

  // Two students join from the QR link.
  for (const answer of ['Banana', 'Banana']) {
    const student = await context.newPage()
    await student.goto(`./#/student?room=${code}`)
    await expect(student.getByRole('heading', { name: 'Favourite fruit?' })).toBeVisible()
    await student.getByRole('radio', { name: answer }).click()
    await student.getByRole('button', { name: 'Submit' }).click()
    await expect(student.getByRole('heading', { name: 'Vote submitted!' })).toBeVisible()
    if (info.project.name === 'phone') await student.screenshot({ path: `test-results/shots/poll-student-${info.project.name}.png` })
    await student.close()
  }

  await expect(poll.getByText('2 votes')).toBeVisible()
  await expect(poll.getByRole('list', { name: 'Results' })).toContainText('Banana2 · 100%')
  await poll.getByRole('radio', { name: 'Pie' }).click()
  await expect(poll.getByRole('img', { name: 'Pie chart of results' })).toBeVisible()
  await page.screenshot({ path: `test-results/shots/poll-live-${info.project.name}.png` })

  // End: archived with its results.
  await poll.getByRole('button', { name: 'End poll' }).click()
  await expect(poll.getByText('Ended')).toBeVisible()
  await poll.getByRole('tab', { name: /Past/ }).click()
  await expect(poll.getByRole('button', { name: /Favourite fruit\?/ })).toContainText('2 votes')

  // QR view.
  await poll.getByRole('button', { name: 'QR' }).click()
  await expect(poll.getByRole('img', { name: `QR code to join room ${code}` })).toBeVisible()

  // The room survives a reload of the board.
  await page.waitForTimeout(600)
  await page.reload()
  await expect(pollWidget(page).getByText(code, { exact: true })).toBeVisible()
})

test('students rank, rate and add words', async ({ page, context }) => {
  const code = await openPoll(page)
  const poll = pollWidget(page)
  const student = await context.newPage()
  await student.goto(`./#/student?room=${code}`)
  await expect(student.getByRole('heading', { name: 'Waiting for a question…' })).toBeVisible()

  // Ranking with the arrow buttons.
  await poll.getByLabel('Question', { exact: true }).fill('Order these')
  await poll.getByLabel('Question type').selectOption('rank')
  await poll.getByLabel('Answer 1', { exact: true }).fill('Red')
  await poll.getByLabel('Answer 2', { exact: true }).fill('Blue')
  await poll.getByRole('button', { name: 'Start poll' }).click()
  await student.getByRole('button', { name: 'Move Blue up' }).click()
  await student.getByRole('button', { name: 'Submit' }).click()
  await expect(student.getByRole('heading', { name: 'Vote submitted!' })).toBeVisible()
  await expect(poll.getByRole('list', { name: 'Average ranking' }).getByRole('listitem').first()).toContainText('Blue')

  // Word cloud with re-voting.
  await poll.getByRole('button', { name: 'End poll' }).click()
  await poll.getByRole('button', { name: 'New question' }).click()
  await poll.getByLabel('Question', { exact: true }).fill('One word for today')
  await poll.getByLabel('Question type').selectOption('wordcloud')
  await poll.getByText('Allow voting more than once').click()
  await poll.getByRole('button', { name: 'Start poll' }).click()
  await student.getByLabel('Your answer').fill('<b>Sunny</b>')
  await student.getByRole('button', { name: 'Submit' }).click()
  await expect(student.getByLabel('Your answer')).toBeVisible({ timeout: 4000 })
  await student.getByLabel('Your answer').fill('sunny')
  await student.getByRole('button', { name: 'Submit' }).click()
  await expect(poll.getByLabel('Word cloud')).toContainText('Sunny')
  await expect(poll.getByText('2 votes')).toBeVisible()

  // Star rating.
  await poll.getByRole('button', { name: 'End poll' }).click()
  await poll.getByRole('button', { name: 'New question' }).click()
  await poll.getByLabel('Question', { exact: true }).fill('Rate the lesson')
  await poll.getByLabel('Question type').selectOption('rating')
  await poll.getByRole('button', { name: 'Start poll' }).click()
  await student.getByRole('radio', { name: '4 stars' }).click()
  await student.getByRole('button', { name: 'Submit' }).click()
  await expect(poll.getByLabel('Average 4.0 stars')).toBeVisible()
})
