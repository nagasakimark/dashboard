import { beforeEach, describe, expect, it } from 'vitest'
import { TEXTBOOK_PRESETS } from '@/content/textbookPresets'
import { db } from '@/data/db'
import { save } from '@/data/repo'
import { addSections, createFromPreset, deleteTextbook, fillFromPreset, parseSectionsJson, suggestPreset } from './actions'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('textbook presets', () => {
  it('ship page-ordered sections for New Horizon 1–3 (2025)', () => {
    expect(TEXTBOOK_PRESETS.map((p) => p.id)).toEqual(['nh1-2025', 'nh2-2025', 'nh3-2025'])
    for (const p of TEXTBOOK_PRESETS) {
      expect(p.sections.length).toBeGreaterThan(30)
      const pages = p.sections.map((s) => s.page)
      expect(pages).toEqual([...pages].sort((a, b) => a - b))
      expect(p.sections.every((s) => s.altopediaUrl.startsWith('https://www.altopedia.net/textbook_pages/'))).toBe(true)
    }
    expect(TEXTBOOK_PRESETS[0].sections[2]).toMatchObject({ page: 12, title: 'I am Edward Trout.', topic: 'Be verb' })
  })

  it('suggests a preset from a textbook title', () => {
    expect(suggestPreset('New Horizon 1 - G5060')?.id).toBe('nh1-2025')
    expect(suggestPreset('NEW HORIZON 3')?.id).toBe('nh3-2025')
    expect(suggestPreset('Blue Sky')).toBeUndefined()
  })

  it('creates a textbook from a preset, and fills an existing one without duplicates', async () => {
    const book = await createFromPreset('nh2-2025')
    const n = await db.sections.where('textbookId').equals(book.id).count()
    expect(n).toBe(TEXTBOOK_PRESETS[1].sections.length)

    const imported = await save('textbooks', { title: 'New Horizon 1 - G5060', cover: '', digitalUrl: 'x', altopediaUrl: '', preset: null })
    await addSections(imported.id, [{ page: 12, title: 'I am Edward Trout.', topic: '' }])
    const added = await fillFromPreset(imported.id, 'nh1-2025')
    expect(added).toBe(TEXTBOOK_PRESETS[0].sections.length - 1)
    expect((await db.textbooks.get(imported.id))?.preset).toBe('nh1-2025')
  })
})

describe('section import and textbook deletion', () => {
  it('parses all legacy section formats', () => {
    expect(
      parseSectionsJson([
        { page: 12, unit: 'Unit 1', content: 'be-verbs' },
        { pageNumber: '20', title: 'Unit 2', topic: 'can' },
        { 'Page Number': 30, 'Section Name': 'Unit 3', 'Topic (Grammar)': 'N/A' },
        { title: 'no page' },
      ]),
    ).toEqual([
      { page: 12, title: 'Unit 1', topic: 'be-verbs' },
      { page: 20, title: 'Unit 2', topic: 'can' },
      { page: 30, title: 'Unit 3', topic: '' },
    ])
    expect(() => parseSectionsJson({})).toThrow()
  })

  it('deletes sections and unlinks lesson plans', async () => {
    const book = await createFromPreset('nh3-2025')
    const section = (await db.sections.where('textbookId').equals(book.id).first())!
    const plan = await save('lessonPlans', {
      title: 'x',
      schoolId: null,
      year: 3,
      textbookId: book.id,
      sectionId: section.id,
      content: '',
      tags: [],
      resources: [],
    })
    await deleteTextbook(book.id)
    expect(await db.sections.count()).toBe(0)
    expect(await db.lessonPlans.get(plan.id)).toMatchObject({ textbookId: null, sectionId: null })
  })
})
