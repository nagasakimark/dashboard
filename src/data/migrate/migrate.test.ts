import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { legacyBrowserPlan, readImportFile } from '../importFile'
import { save } from '../repo'
import { validateExport } from '../transfer'
import { convertDashboard } from './dashboard'
import { dashboardPlannerExport, legacyDashboardSnapshot, originalPlannerExport, workspaceTemplateFile } from './fixtures'
import { convertPlanner, isPlannerExport, plannerVariant } from './planner'
import { contentToHtml } from './util'

const NOW = Date.parse('2026-09-27T00:00:00Z')
const identity = async (s: string) => s
const opts = { shrink: identity, now: NOW }

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('planner conversion', () => {
  it('recognises both planner variants', () => {
    expect(isPlannerExport(originalPlannerExport)).toBe(true)
    expect(plannerVariant(originalPlannerExport)).toBe('original')
    expect(plannerVariant(dashboardPlannerExport)).toBe('dashboard')
    expect(isPlannerExport({ app: 'alt-dashboard', schools: [], assignments: {}, schedule: {} })).toBe(false)
  })

  it('converts schools, JTEs, classes and timetables', () => {
    const { data } = convertPlanner(originalPlannerExport, NOW)
    const [s] = data.schools
    expect(s).toMatchObject({ id: '1736124347140.98', name: 'Sakura ES', color: '#e11d48', lunchAfter: 4 })
    expect(s.jtes.map((j) => j.name)).toEqual(['Ms. Sato', 'Mr. Ito'])
    expect(s.classes[1]).toMatchObject({ year: 5, classNumber: 2, jteId: s.jtes[1].id })
    expect(s.timetables[0]).toMatchObject({ id: '1736123669007', name: 'A', lunch: { start: '12:20', end: '13:05' } })
    expect(s.timetables[0].periods[1]).toEqual({ slot: 2, start: '09:40', end: '10:25' })
  })

  it('splits schedule keys into dated days and periods', () => {
    const { data, warnings, notes } = convertPlanner(originalPlannerExport, NOW)
    const days = Object.fromEntries(data.dayAssignments.map((d) => [d.date, d]))
    expect(days['2025-01-06']).toMatchObject({ kind: 'school', timetableId: '1736123669007' })
    expect(days['2025-01-13']).toMatchObject({ kind: 'off', dayType: 'Public Holiday', schoolId: null })
    // Deleted timetable falls back to the school's first one.
    expect(days['2025-01-07'].timetableId).toBeNull()
    expect(warnings.join(' ')).toMatch(/1 day used a timetable that had been deleted/)

    const periods = Object.fromEntries(data.periods.map((p) => [p.id, p]))
    expect(periods['2025-01-06:1']).toMatchObject({
      kind: 'class',
      year: 5,
      classNumber: 1,
      summary: 'Unit 1 greetings',
      lessonPlanId: '1739750270090',
    })
    expect(periods['2025-01-06:lunch']).toMatchObject({ slot: 'lunch', kind: 'class', year: 5, classNumber: 8 })
    // "Other" + "Lesson Planning" summary becomes a real Lesson Planning period.
    expect(periods['2025-01-06:2']).toMatchObject({ kind: 'special', specialType: 'Lesson Planning', summary: '' })
    expect(periods['2025-01-07:3']).toMatchObject({ specialType: 'Marking', summary: 'Worksheets' })
    expect(notes.join(' ')).toMatch(/1 period labelled “Other”/)
    // Links to deleted plans are dropped and reported.
    expect(periods['2025-01-07:4'].lessonPlanId).toBeNull()
    expect(warnings.join(' ')).toMatch(/linked to a lesson plan that no longer exists/)
    expect(notes.join(' ')).toMatch(/1 class from your schedule was missing .* Sakura ES \(5-8\)/)
    expect(data.schools[0].classes.map((c) => `${c.year}-${c.classNumber}`)).toEqual(['5-1', '5-2', '5-8'])
  })

  it('converts lesson plans, keeping HTML and repairing references', () => {
    const { data, warnings } = convertPlanner(originalPlannerExport, NOW)
    const [a, b] = data.lessonPlans
    expect(a).toMatchObject({
      id: '1739750270090',
      schoolId: '1736124347140.98',
      textbookId: 'textbook_1',
      sectionId: '1736200000000.5',
      content: '<p>Warm-up: <strong>Hello song</strong></p>',
      createdAt: Date.parse('2025-02-16T23:57:50.090Z'),
      updatedAt: Date.parse('2025-03-01T00:00:00.000Z'),
    })
    expect(a.resources[0]).toMatchObject({ kind: 'link', name: 'Song', url: 'https://example.com/song' })
    expect(b.schoolId).toBeNull()
    expect(b.year).toBe(6)
    expect(b.content).toBe('<p>Line one</p><p>Line &lt;two&gt;</p>')
    expect(warnings.join(' ')).toMatch(/1 lesson plan link pointed to a deleted/)
  })

  it('merges section details and converts curricula, todos and settings', () => {
    const { data } = convertPlanner(dashboardPlannerExport, NOW)
    expect(data.sections[0]).toMatchObject({
      textbookId: 'textbook_1',
      page: 12,
      title: 'Unit 1',
      notes: 'Use the song',
      digitalUrl: 'https://example.com/p12',
    })
    expect(data.curricula[0].name).toBe('Grade 5 plan')
    expect(data.curriculumItems.map((i) => [i.text, i.completed, i.order])).toEqual([
      ['Unit 1', true, 0],
      ['Unit 2', false, 1],
    ])
    expect(data.todos[0]).toMatchObject({ id: '1', text: 'Print flashcards', done: false })
    expect(Object.fromEntries(data.settings.map((s) => [s.id, s.value]))).toEqual({
      profileName: 'Test Teacher',
      accentColor: '#2563eb',
      dateFormat: 'dd/MM/yyyy',
    })
  })

  it('flattens Quill deltas but leaves HTML alone', () => {
    expect(contentToHtml('<h1>Hi</h1>')).toBe('<h1>Hi</h1>')
    expect(contentToHtml({ ops: [{ insert: 'a\n\nb\n' }] })).toBe('<p>a</p><p><br></p><p>b</p>')
    expect(contentToHtml(null)).toBe('')
  })
})

describe('dashboard conversion', () => {
  it('converts workspaces, rosters, templates, textbooks and bookmarks', () => {
    const { data, notes } = convertDashboard(legacyDashboardSnapshot, NOW)
    // The previously active workspace comes first.
    expect(data.workspaces.map((w) => w.name)).toEqual(['Grade 6', 'Workspace 1'])
    expect(data.workspaces[1]).toMatchObject({ background: 3, order: 1 })
    expect(data.workspaces[0].widgets[1]).toMatchObject({ type: 'Spinner', x: 80, y: 80, width: 300, height: 240, config: {} })
    expect(data.rosters).toEqual([
      expect.objectContaining({ name: '6-1', kind: 'names', students: ['Aoi', 'Haruto'] }),
      expect.objectContaining({ name: '5-2', kind: 'number', students: ['1', '2', '3', '4'] }),
    ])
    expect(data.templates[0]).toMatchObject({ name: 'Quiz day', background: 2, createdAt: 1757000000000 })
    expect(data.bookmarks[0]).toMatchObject({ name: 'Quizlet', url: 'https://quizlet.com' })
    expect(data.settings).toEqual([{ id: 'rotateBackground', value: false, updatedAt: NOW }])
    expect(notes[0]).toMatch(/start with default settings/)
  })
})

describe('import plans', () => {
  it('imports a planner file but keeps board data already on the device', async () => {
    await save('workspaces', { name: 'My board', order: 0, widgets: [], background: 1 })
    await save('settings', { id: 'startScreen', value: 'board' })
    const plan = await readImportFile(JSON.stringify(dashboardPlannerExport), 'calendar-export.json', opts)
    expect(plan.formatLabel).toMatch(/dashboard version/)
    expect(plan.errors).toEqual([])
    expect(plan.counts).toMatchObject({
      schools: 1,
      periods: 5,
      dayAssignments: 3,
      lessonPlans: 2,
      curricula: 1,
      curriculumItems: 2,
      todos: 1,
    })
    expect(plan.keeps.join()).toMatch(/workspaces/)

    const backupId = await plan.apply!()
    expect(backupId).toBeTruthy()
    expect(await db.periods.count()).toBe(5)
    expect((await db.workspaces.toArray())[0].name).toBe('My board')
    const settings = Object.fromEntries((await db.settings.toArray()).map((s) => [s.id, s.value]))
    expect(settings).toMatchObject({ startScreen: 'board', profileName: 'Test Teacher' })
    expect(validateExport({ app: 'alt-dashboard', schemaVersion: 1, data: {} }).ok).toBe(true)
  })

  it('adds a workspace file without replacing anything', async () => {
    await save('todos', { text: 'stay', done: false, order: 0 })
    const plan = await readImportFile(JSON.stringify(workspaceTemplateFile), 'phonics.json', opts)
    expect(plan.mode).toBe('add')
    expect(await plan.apply!()).toBeNull()
    expect(await db.todos.count()).toBe(1)
    expect((await db.workspaces.toArray())[0]).toMatchObject({ name: 'Phonics corner', background: 5 })
    expect((await db.workspaces.toArray())[0].widgets[0]).toMatchObject({ type: 'Dice', locked: true })
  })

  it('combines both old databases from the browser, merging textbook links', async () => {
    const plan = await legacyBrowserPlan({ planner: dashboardPlannerExport, dashboard: legacyDashboardSnapshot }, opts)
    expect(plan.errors).toEqual([])
    expect(plan.counts).toMatchObject({ workspaces: 2, templates: 1, rosters: 2, bookmarks: 1, textbooks: 2, schools: 1 })
    expect(plan.notes.join(' ')).toMatch(/1 dashboard textbook link was merged/)
    await plan.apply!()
    const books = await db.textbooks.orderBy('title').toArray()
    // "new horizon 1" matched the planner's "New Horizon 1" (which already had a link).
    expect(books.map((b) => b.title)).toEqual(['Blue Sky', 'New Horizon 1'])
    expect(books[1].digitalUrl).toBe('https://example.com/nh1')
    expect((await db.settings.get('legacyMigrationDone'))?.value).toBe(true)
  })
})

/* Real exported data — only runs where fixtures/private/data.json exists. */
const privateFile = resolve(process.cwd(), 'fixtures/private/data.json')
const hasPrivate = existsSync(privateFile)

describe.skipIf(!hasPrivate)('real data.json (private fixture)', () => {
  const load = () => readFileSync(privateFile, 'utf8')

  it('converts every record and passes validation', async () => {
    const raw = JSON.parse(load())
    const plan = await readImportFile(load(), 'data.json', opts)
    expect(plan.errors).toEqual([])
    expect(plan.counts).toMatchObject({
      schools: raw.schools.length,
      dayAssignments: Object.keys(raw.assignments).length,
      periods: Object.keys(raw.schedule).length,
      lessonPlans: raw.lessonPlans.length,
      textbooks: raw.textbooks.length,
      curricula: raw.curriculums.length,
      curriculumItems: raw.curriculums.reduce((n: number, c: { items: unknown[] }) => n + c.items.length, 0),
      todos: raw.todos.length,
    })
    console.info('warnings:', plan.warnings, '\nnotes:', plan.notes)
  })

  it('keeps every period, day and lesson-plan link after applying', async () => {
    const raw = JSON.parse(load())
    const plan = await readImportFile(load(), 'data.json', opts)
    await plan.apply!()

    expect(await db.periods.count()).toBe(Object.keys(raw.schedule).length)
    expect(await db.dayAssignments.count()).toBe(Object.keys(raw.assignments).length)

    // Spot-check every class period's year/class against the source.
    const periods = new Map((await db.periods.toArray()).map((p) => [p.id, p]))
    for (const [key, v] of Object.entries<Record<string, unknown>>(raw.schedule)) {
      const m = /^(\d{4}-\d{2}-\d{2})-[A-Za-z]+-(\d+|lunch)$/.exec(key)!
      const p = periods.get(`${m[1]}:${m[2]}`)!
      expect(p, key).toBeTruthy()
      if (v.type === 'class') expect([p.year, p.classNumber], key).toEqual([v.yearGroup, v.classNumber])
      if (v.lessonPlanId) expect(p.lessonPlanId, key).toBe(String(v.lessonPlanId))
    }
    const linked = [...periods.values()].filter((p) => p.lessonPlanId)
    expect(linked.length).toBe(Object.values<Record<string, unknown>>(raw.schedule).filter((v) => v.lessonPlanId).length)
    expect((await db.settings.get('profileName'))?.value).toBe(raw.settings.altName)
  })
})
