import { TEXTBOOK_PRESETS, type TextbookPreset } from '@/content/textbookPresets'
import { db } from '@/data/db'
import { patch, remove, save, saveMany } from '@/data/repo'
import type { Section, Textbook } from '@/data/schema'

export const presetById = (id: string | null | undefined): TextbookPreset | undefined => TEXTBOOK_PRESETS.find((p) => p.id === id)

type SectionDraft = Pick<Section, 'page' | 'title' | 'topic'> & Partial<Pick<Section, 'altopediaUrl' | 'notes' | 'digitalUrl'>>

/** Add sections to a textbook, skipping any page+title already present. */
export async function addSections(textbookId: string, drafts: SectionDraft[]): Promise<number> {
  const existing = await db.sections.where('textbookId').equals(textbookId).toArray()
  const key = (s: { page: number; title: string }) => `${s.page}|${s.title.trim().toLowerCase()}`
  const have = new Set(existing.map(key))
  let order = existing.reduce((n, s) => Math.max(n, s.order), -1)
  const fresh = drafts.filter((d) => !have.has(key(d)))
  await saveMany(
    'sections',
    fresh.map((d) => ({
      textbookId,
      page: d.page,
      title: d.title.trim(),
      topic: d.topic ?? '',
      notes: d.notes ?? '',
      digitalUrl: d.digitalUrl ?? '',
      altopediaUrl: d.altopediaUrl ?? '',
      order: ++order,
    })),
  )
  return fresh.length
}

export async function createFromPreset(presetId: string): Promise<Textbook> {
  const preset = presetById(presetId)
  if (!preset) throw new Error('Unknown preset')
  const book = await save('textbooks', {
    title: preset.title,
    cover: '',
    digitalUrl: '',
    altopediaUrl: preset.altopediaUrl,
    preset: preset.id,
  })
  await addSections(book.id, preset.sections)
  return book
}

/** Fill an existing textbook (e.g. imported without sections) from a preset. */
export async function fillFromPreset(textbookId: string, presetId: string): Promise<number> {
  const preset = presetById(presetId)
  const book = await db.textbooks.get(textbookId)
  if (!preset || !book) return 0
  await patch('textbooks', textbookId, { preset: preset.id, altopediaUrl: book.altopediaUrl || preset.altopediaUrl })
  return addSections(textbookId, preset.sections)
}

/** Guess a preset for a textbook title such as "New Horizon 1 - G5060". */
export function suggestPreset(title: string): TextbookPreset | undefined {
  const m = /new\s*horizon\s*([123])/i.exec(title)
  return m ? presetById(`nh${m[1]}-2025`) : undefined
}

/**
 * Parse section lists in the formats the old planner accepted:
 * `{ page, unit, content }`, `{ pageNumber, title, topic }` and
 * `{ "Page Number", "Section Name", "Topic (Grammar)" }`.
 */
export function parseSectionsJson(json: unknown): SectionDraft[] {
  if (!Array.isArray(json)) throw new Error('Expected a list of sections.')
  return json
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => {
      const page = Number(x.page ?? x.pageNumber ?? x['Page Number'] ?? 0)
      const title = String(x.title ?? x.unit ?? x['Section Name'] ?? '').trim()
      const topic = String(x.topic ?? x.content ?? x.grammar ?? x['Topic (Grammar)'] ?? '').trim()
      return {
        page: Number.isFinite(page) ? Math.max(0, Math.trunc(page)) : 0,
        title: title || `Page ${page}`,
        topic: topic === 'N/A' ? '' : topic,
      }
    })
    .filter((s) => s.page > 0)
}

/** Delete a textbook, its sections, and unlink lesson plans/curricula. */
export async function deleteTextbook(id: string): Promise<void> {
  const sectionIds = await db.sections.where('textbookId').equals(id).primaryKeys()
  const plans = await db.lessonPlans.where('textbookId').equals(id).toArray()
  await db.transaction('rw', [db.textbooks, db.sections, db.lessonPlans, db.curriculumItems, db.curricula, db.tombstones], async () => {
    for (const p of plans) await patch('lessonPlans', p.id, { textbookId: null, sectionId: null })
    const items = await db.curriculumItems.where('sectionId').anyOf(sectionIds).toArray()
    for (const i of items) await patch('curriculumItems', i.id, { sectionId: null })
    const curricula = await db.curricula.filter((c) => c.textbookId === id).toArray()
    for (const c of curricula) await patch('curricula', c.id, { textbookId: null })
    await remove('sections', sectionIds)
    await remove('textbooks', id)
  })
}

export const blankTextbook = (): Omit<Textbook, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  cover: '',
  digitalUrl: '',
  altopediaUrl: '',
  preset: null,
})
