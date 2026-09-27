import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { dashboardPlannerExport } from '../src/data/migrate/fixtures.ts'

// Automated accessibility check (axe-core, WCAG 2.1 A/AA) on every main screen.
const ROUTES = [
  '',
  'schedule?v=week&d=2025-01-06',
  'schedule?v=month&d=2025-01-06',
  'schedule?v=tally',
  'lessons',
  'curriculum',
  'textbooks',
  'history',
  'schools',
  'settings',
  'links',
  'help',
  'board',
  'games',
  'games?set=pd-animals',
  'jhs?book=nh1',
]

test('no serious accessibility problems on the main screens', async ({ page }, info) => {
  test.skip(info.project.name === 'tablet', 'desktop and phone layouts cover the markup')
  test.setTimeout(120_000)
  await page.goto('./#/settings')
  await page.locator('input[type=file]').setInputFiles({
    name: 'planner.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(dashboardPlannerExport)),
  })
  await page.getByRole('dialog', { name: 'Import data' }).getByRole('button', { name: 'Replace my data with this' }).click()
  await expect(page.getByText('Import complete')).toBeVisible()

  const problems: string[] = []
  for (const route of ROUTES) {
    await page.goto(`./#/${route}`)
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    for (const v of violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'))
      problems.push(
        `/${route}: ${v.id} (${v.impact}) ${v.nodes.length}× — ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
      )
  }
  expect(problems, problems.join('\n')).toEqual([])
})
