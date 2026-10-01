import { expect, test } from '@playwright/test'

test('adds a New Horizon preset and fills an existing textbook', async ({ page }) => {
  await page.goto('./#/textbooks')
  await page
    .getByRole('button', { name: /Add (a )?textbook/ })
    .first()
    .click()
  await page.getByRole('button', { name: /New Horizon 1 \(2025\)/ }).click()
  await expect(page.getByRole('heading', { name: 'New Horizon 1 (2025)' })).toBeVisible()
  await expect(page.getByText('I am Edward Trout.')).toBeVisible()
  await page.getByLabel('Search sections').fill('gyoza')
  await expect(page.getByText('I can make gyoza. / Can you read hiragana?')).toBeVisible()

  // A custom textbook named like NH2 gets offered the matching preset.
  await page.goto('./#/textbooks')
  await page.getByRole('button', { name: /Add/ }).first().click()
  await page.getByRole('tab', { name: 'Other textbook' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a textbook' })
  await dialog.getByLabel('Title').fill('New Horizon 2 - G5061')
  await dialog.getByRole('button', { name: 'Add textbook' }).click()
  await page.getByRole('button', { name: 'Fill sections' }).click()
  await expect(page.getByText(/Added \d+ sections/)).toBeVisible()

  // Elementary books are recognised too, and filled by unit.
  await page.goto('./#/textbooks')
  await page.getByRole('button', { name: /Add/ }).first().click()
  await page.getByRole('tab', { name: 'Other textbook' }).click()
  await dialog.getByLabel('Title').fill('NH5')
  await dialog.getByRole('button', { name: 'Add textbook' }).click()
  await expect(page.getByText(/Fill in all 8 units/)).toBeVisible()
  await page.getByRole('button', { name: 'Fill sections' }).click()
  await expect(page.getByText('Added 8 sections.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Unit 2: Happy Birthday/ })).toBeVisible()
  await expect(page.getByText('p.0')).toHaveCount(0)
})

test('writes a lesson plan with autosave, tags and printing', async ({ page }, info) => {
  await page.goto('./#/lessons')
  await page.getByRole('button', { name: /New/ }).first().click()
  await expect(page).toHaveURL(/#\/lessons\/[0-9a-f-]{36}$/)
  await page.getByLabel('Lesson title').fill('Shopping role-play')
  const editor = page.getByRole('textbox', { name: 'Lesson content' })
  await editor.click()
  await page.keyboard.type('Warm-up: ')
  await page.keyboard.press('Control+b')
  await page.keyboard.type('fruit chant')
  await page.keyboard.press('Control+b')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Role-play at the shop')
  await page.getByLabel('Tags').fill('game')
  await page.keyboard.press('Enter')
  await page.getByLabel('Year').selectOption('5')
  await expect(page.getByText('Saved')).toBeVisible()
  await page.screenshot({ path: `test-results/shots/lesson-editor-${info.project.name}.png`, fullPage: true })

  await page.reload()
  await expect(page.getByLabel('Lesson title')).toHaveValue('Shopping role-play')
  await expect(editor.locator('strong')).toHaveText('fruit chant')

  await page.goto('./#/lessons')
  await page.getByLabel('Search lesson plans').fill('chant')
  await expect(page.getByRole('heading', { name: 'Shopping role-play' })).toBeVisible()
  await page.screenshot({ path: `test-results/shots/lessons-list-${info.project.name}.png` })

  // Print view; print() is stubbed so the system dialog doesn't block the test.
  await page.evaluate(() => {
    window.print = () => {}
  })
  await page.getByRole('heading', { name: 'Shopping role-play' }).click()
  await page.getByRole('button', { name: 'Print' }).click()
  await expect(page).toHaveURL(/#\/print\/lessons\?ids=/)
  await expect(page.locator('article').getByText('fruit chant')).toBeVisible()
  await expect(page.locator('article').getByText('Year 5')).toBeVisible()
})

test('creates and links a plan from a period', async ({ page }, info) => {
  test.skip(info.project.name === 'phone', 'covered on larger screens')
  await page.goto('./#/schools')
  await page
    .getByRole('button', { name: /Add (your first )?school/ })
    .first()
    .click()
  const editor = page.getByRole('main')
  await editor.getByLabel('Name', { exact: true }).fill('Minato ES')
  await editor.getByRole('button', { name: 'Add classes' }).click()
  await page.getByRole('button', { name: 'Save school' }).click()
  await expect(page).toHaveURL(/#\/schools$/)

  await page.goto('./#/schedule?v=week&d=2026-09-28')
  await page
    .getByRole('button', { name: /Set school/ })
    .first()
    .click()
  await page.getByRole('radio', { name: 'Minato ES' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Add a period on 2026-09-28, period 2' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a period' })
  await dialog.getByRole('button', { name: '3-1' }).click()
  await dialog.getByLabel('What you did / plan to do').fill('Colours bingo')
  await dialog.getByRole('button', { name: 'New', exact: true }).click()

  await expect(page).toHaveURL(/#\/lessons\/[0-9a-f-]{36}$/)
  await expect(page.getByLabel('Lesson title')).toHaveValue('Colours bingo')
  await expect(page.getByText('Used in 1 class')).toBeVisible()
  await page.getByRole('link', { name: /28 Sep 26\s*3-1/ }).click()
  await expect(page.getByRole('region', { name: 'Monday 28 September' }).getByText('Colours bingo')).toBeVisible()
})

test('lesson files: several at once, by drag and drop, and a stray drop does not leave the app', async ({ page }) => {
  await page.goto('./#/lessons/new')
  await page.waitForURL(/#\/lessons\/[0-9a-f-]{36}/)
  const resources = page.getByRole('heading', { name: 'Resources' }).locator('xpath=ancestor::*[contains(@class,"p-4")][1]')
  await page.locator('input[type=file]').setInputFiles([
    { name: 'one.txt', mimeType: 'text/plain', buffer: Buffer.from('1') },
    { name: '日本語 #2.pdf', mimeType: 'application/pdf', buffer: Buffer.from('2') },
    { name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) },
  ])
  await expect(resources.getByRole('link')).toHaveCount(3)
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'big.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(1_600_000) })
  await expect(page.getByRole('status').filter({ hasText: /big\.bin.*over 1\.5 MB/ })).toBeVisible()

  // Drop a file on the Resources card: it's attached.
  const drop = async (target: string) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel)!
      const dt = new DataTransfer()
      dt.items.add(new File(['dropped'], 'dropped.txt', { type: 'text/plain' }))
      const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
      el.dispatchEvent(over)
      const e = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
      el.dispatchEvent(e)
      return { overPrevented: over.defaultPrevented, dropPrevented: e.defaultPrevented }
    }, target)
  expect(await drop('[data-file-drop]')).toEqual({ overPrevented: true, dropPrevented: true })
  await expect(resources.getByRole('link', { name: 'dropped.txt' })).toBeVisible()

  // A file dropped anywhere else is ignored, so the browser doesn't open it and leave the app.
  expect(await drop('main')).toEqual({ overPrevented: true, dropPrevented: true })
  await expect(page).toHaveURL(/#\/lessons\/[0-9a-f-]{36}/)

  // A new plan from a period that doesn't exist yet still opens.
  await page.goto('./#/lessons/new?period=2030-01-01:3&title=Ghost')
  await page.waitForURL(/#\/lessons\/[0-9a-f-]{36}/)
  await expect(page.getByLabel('Lesson title')).toHaveValue('Ghost')
})
