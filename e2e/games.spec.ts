import { expect, test } from '@playwright/test'

test('choose a set and play the quiz, flashcards and memory match', async ({ page }, info) => {
  await page.goto('./#/board')
  await page.getByRole('link', { name: /Games/ }).click()
  await expect(page).toHaveURL(/#\/games$/)
  await page.getByRole('button', { name: /Picture Dictionary/ }).click()
  await page.getByRole('button', { name: /^Animals/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Animals')
  await page.screenshot({ path: `test-results/shots/games-modes-${info.project.name}.png` })

  // Quiz: pick an answer, then next.
  await page.getByRole('button', { name: /^Quiz/ }).click()
  const options = page.locator('main .grid-cols-2 button')
  await expect(options).toHaveCount(4)
  await options.first().click()
  await expect(page.getByRole('button', { name: /Next/ })).toBeVisible()
  await expect(page.getByTitle('Rounds')).toContainText('1')
  await page.screenshot({ path: `test-results/shots/games-quiz-${info.project.name}.png` })

  // Switch game from the header.
  await page.getByLabel('Game').selectOption('flashcards')
  await page.getByRole('button', { name: 'Flip the card' }).click()
  await expect(page.getByRole('button', { name: /Show the picture/ })).toBeVisible()

  await page.getByLabel('Game').selectOption('memory')
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(page.getByRole('button', { name: 'Hidden card' })).toHaveCount(12)
})

test('JHS unit words work in word games, and textbook units can include earlier units', async ({ page }) => {
  await page.goto('./#/games')
  await page.getByRole('button', { name: /Let's Try 1/ }).click()
  await page.getByText('With previous units').click()
  await page.getByRole('button', { name: /Unit 3/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('+ previous units')

  await page.goto('./#/games')
  await page.getByRole('tab', { name: 'JHS words' }).click()
  await page.getByRole('button', { name: /New Horizon 2 \(JHS\)/ }).click()
  await page.getByRole('button', { name: /^Unit 1/ }).click()
  // Words without pictures: picture games are unavailable.
  await expect(page.getByRole('button', { name: /^Quiz/ })).toBeDisabled()
  await page.getByRole('button', { name: /^Word Scramble/ }).click()
  await expect(page.getByLabel('Letters').getByRole('button').first()).toBeVisible()
})

test('make a custom word set with a library picture', async ({ page }) => {
  await page.goto('./#/games')
  await page.getByRole('tab', { name: /My sets/ }).click()
  await page.getByRole('button', { name: 'New word set' }).click()
  const dialog = page.getByRole('dialog', { name: 'New word set' })
  await dialog.getByLabel('Set name').fill('Pets')
  await dialog.getByLabel('English 1', { exact: true }).fill('cat')
  await dialog.getByLabel('Japanese 1', { exact: true }).fill('ねこ')
  await dialog.getByRole('button', { name: 'Add a picture for cat' }).click()
  const picker = page.getByRole('dialog', { name: 'Choose a picture' })
  await picker.locator('button:has(img)').first().click()
  await dialog.getByText('Paste a list').click()
  await dialog.getByLabel('Paste words').fill('dog, いぬ\nbird, とり\nfish, さかな')
  await dialog.getByRole('button', { name: 'Add these words' }).click()
  await dialog.getByRole('button', { name: 'Save set' }).click()
  await expect(page.getByText('4 words')).toBeVisible()
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Pets')
  await page.getByRole('button', { name: /^Flashcards/ }).click()
  await expect(page.getByText('1 / 4')).toBeVisible()
})

test('JHS Classroom Mode runs an exercise set', async ({ page }, info) => {
  await page.goto('./#/games')
  await page.getByRole('link', { name: 'JHS Classroom Mode' }).click()
  await page.getByRole('button', { name: /New Horizon 1/ }).click()
  await page
    .getByRole('button', { name: /KS 1\b/ })
    .first()
    .click()
  await expect(page.getByText(/1 \/ \d+/)).toBeVisible()

  // Question 1 is a reorder: build the sentence from the answer shown by the teacher reveal.
  await page.getByRole('button', { name: 'Show answer' }).click()
  const answer = (await page.getByLabel('Your sentence').textContent())!.trim()
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Previous question' }).click()
  for (const word of answer.split(' ')) await page.getByLabel('Words').getByRole('button', { name: word, exact: true }).first().click()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText('Correct!')).toBeVisible()
  await page.getByRole('button', { name: '日本語' }).click()
  await page.screenshot({ path: `test-results/shots/jhs-${info.project.name}.png` })

  // Grammar library search.
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('tab', { name: /Grammar library/ }).click()
  await page.getByLabel('Search grammar').fill('word order')
  await expect(page.getByText('English Word Order')).toBeVisible()
})
