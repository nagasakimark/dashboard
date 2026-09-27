import { expect, test, type Page } from '@playwright/test'
import { dashboardPlannerExport, legacyDashboardSnapshot } from '../src/data/migrate/fixtures.ts'

/** Recreate the old apps' IndexedDB databases exactly as they stored data. */
async function seedLegacyDatabases(page: Page) {
  await page.evaluate(
    async ({ planner, dash }) => {
      const open = (name: string, version: number, stores: [string, string][]) =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(name, version)
          req.onupgradeneeded = () => stores.forEach(([s, keyPath]) => req.result.createObjectStore(s, { keyPath }))
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      const put = (db: IDBDatabase, store: string, rows: unknown[]) =>
        new Promise<void>((resolve) => {
          const tx = db.transaction(store, 'readwrite')
          rows.forEach((r) => tx.objectStore(store).put(r))
          tx.oncomplete = () => resolve()
        })

      const pdb = await open(
        'alt-planner-db',
        8,
        ['schools', 'textbooks', 'lessonPlans', 'assignments', 'schedule', 'sections', 'settings', 'todos', 'curriculums'].map((s) => [
          s,
          'id',
        ]),
      )
      await put(pdb, 'schools', planner.schools)
      await put(pdb, 'textbooks', planner.textbooks)
      await put(pdb, 'lessonPlans', planner.lessonPlans)
      await put(pdb, 'todos', planner.todos)
      await put(pdb, 'curriculums', planner.curriculums)
      await put(pdb, 'sections', planner.sections)
      await put(pdb, 'assignments', [{ id: 'default', data: planner.assignments }])
      await put(pdb, 'schedule', [{ id: 'default', data: planner.schedule }])
      await put(pdb, 'settings', [{ id: 'default', data: planner.settings }])
      pdb.close()

      const ldb = await open('livepoll', 1, [
        ['workspaces', 'id'],
        ['settings', 'key'],
        ['templates', 'id'],
        ['textbooks', 'id'],
      ])
      await put(ldb, 'workspaces', dash.workspaces)
      await put(ldb, 'settings', dash.settings)
      await put(ldb, 'templates', dash.templates)
      await put(ldb, 'textbooks', dash.textbooks)
      ldb.close()
      localStorage.setItem('customBookmarks', JSON.stringify(dash.bookmarks))
    },
    { planner: dashboardPlannerExport, dash: legacyDashboardSnapshot },
  )
}

test('offers and performs a one-click import of the old apps’ data', async ({ page }, info) => {
  await page.goto('./')
  await seedLegacyDatabases(page)
  await page.reload()

  const banner = page.getByText('Bring over your data from the old dashboard')
  await expect(banner).toBeVisible()
  await page.getByRole('button', { name: 'Review & import' }).click()

  const dialog = page.getByRole('dialog', { name: 'Import from the old dashboard' })
  await expect(dialog.getByText('Old dashboard and planner (this browser)')).toBeVisible()
  await expect(dialog.getByText('Board workspaces')).toBeVisible()
  await expect(dialog.getByText('1 day used a timetable that had been deleted')).toBeVisible()
  await page.screenshot({ path: `test-results/shots/legacy-import-${info.project.name}.png` })
  await dialog.getByRole('button', { name: 'Import my data' }).click()

  await expect(page.getByText('Import complete')).toBeVisible()
  await expect(banner).toBeHidden()

  // The banner stays away after a reload, and the old databases are untouched.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(banner).toBeHidden()
  const stillThere = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))
  expect(stillThere).toEqual(expect.arrayContaining(['alt-planner-db', 'livepoll', 'alt-dashboard']))

  // Settings reflects the migrated profile name.
  await page.goto('./#/settings')
  await expect(page.getByLabel('Your name')).toHaveValue('Test Teacher')
})

test('imports a legacy planner file from Settings', async ({ page }) => {
  await page.goto('./#/settings')
  await page.locator('input[type=file]').setInputFiles({
    name: 'calendar-export-2026-09-27.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dashboardPlannerExport)),
  })
  const dialog = page.getByRole('dialog', { name: 'Import data' })
  await expect(dialog.getByText('ALT Planner export (dashboard version)')).toBeVisible()
  await expect(dialog.getByText(/Kept as they are: classroom board workspaces/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Replace my data with this' }).click()
  await expect(page.getByText('Import complete')).toBeVisible()
  await expect(page.getByLabel('Your name')).toHaveValue('Test Teacher')
})

test('shrinks large textbook covers during import', async ({ page }) => {
  await page.goto('./#/settings')
  // A noisy 1200×1600 JPEG, similar in size to a scanned textbook cover.
  const bigCover = await page.evaluate(() => {
    const c = Object.assign(document.createElement('canvas'), { width: 1200, height: 1600 })
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(1200, 1600)
    for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 2654435761) % 256
    ctx.putImageData(img, 0, 0)
    return c.toDataURL('image/jpeg', 0.9)
  })
  const file = structuredClone(dashboardPlannerExport)
  file.textbooks[0].image = bigCover

  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'planner.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) })
  const dialog = page.getByRole('dialog', { name: 'Import data' })
  await expect(dialog.getByText(/Textbook covers were resized from .* to/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Replace my data with this' }).click()
  await expect(page.getByText('Import complete')).toBeVisible()

  const cover = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open('alt-dashboard')
        req.onsuccess = () => {
          const get = req.result.transaction('textbooks').objectStore('textbooks').get('textbook_1')
          get.onsuccess = () => resolve(get.result.cover)
        }
      }),
  )
  expect(cover.startsWith('data:image/webp') || cover.startsWith('data:image/jpeg')).toBe(true)
  expect(cover.length).toBeLessThan(bigCover.length / 5)
})
