import { expect, test } from '@playwright/test'

test('activities, bookmarks and textbook links, in the planner and on the board', async ({ page }, info) => {
  // The Activities list refreshes from the home page; a new tile there shows up first.
  await page.route('https://nagasakimark.github.io/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<div class="box"><a href="https://nagasakimark.github.io/newgame"><img src="./images/newgame.png" alt="New Game"></a></div>
        <div class="box"><a href="https://nagasakimark.github.io/tescodle"><img src="./images/tescodle.png" alt="tescodle"></a></div>
        <div class="box"><a href="https://nagasakimark.github.io/wordle"><img src="./images/wordle.png" alt="Wordle"></a></div>`,
    }),
  )
  await page.goto('./#/links')
  await expect(page.getByRole('link', { name: /Tescodle/ })).toHaveAttribute('href', 'https://nagasakimark.github.io/tescodle')
  await expect(page.getByRole('status').filter({ hasText: '1 new activity' })).toBeVisible()
  await expect(page.getByRole('listitem').first().getByRole('link')).toHaveAttribute('href', 'https://nagasakimark.github.io/newgame')

  await page.getByRole('tab', { name: 'Bookmarks' }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Add bookmark' })
  await dialog.getByLabel('Name').fill('Kahoot')
  await dialog.getByLabel('Link').fill('kahoot.it')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('link', { name: /Kahoot/ })).toHaveAttribute('href', 'https://kahoot.it')
  await page.screenshot({ path: `test-results/shots/links-${info.project.name}.png` })

  await page.goto('./#/board')
  // On the board, each opens as a small window above its dock button.
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Bookmarks' }).getByRole('link', { name: /Kahoot/ })).toBeVisible()
  await page.getByRole('button', { name: 'Textbooks', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Bookmarks' })).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Textbooks' }).getByText('No textbooks yet')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Textbooks' })).toBeHidden()
})
