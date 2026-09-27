import { describe, expect, it } from 'vitest'
import type { LessonPlan } from '@/data/schema'
import { allTags, emptyFilters, filterPlans, indexPlans, snippet } from './search'

const plan = (id: string, title: string, content: string, extra: Partial<LessonPlan> = {}): LessonPlan => ({
  id,
  title,
  content,
  schoolId: null,
  year: null,
  textbookId: null,
  sectionId: null,
  tags: [],
  resources: [],
  createdAt: 0,
  updatedAt: Number(id),
  ...extra,
})

const plans = indexPlans([
  plan('1', 'Hello song warm-up', '<p>Sing the <strong>hello</strong> song</p>', { year: 1, tags: ['song'] }),
  plan('2', 'Shopping game', '<p>Students say “What do you want?” and buy fruit</p>', { year: 5, schoolId: 'a', tags: ['game'] }),
  plan('3', 'Fruit basket', '<p>Warm-up game with fruit names</p>', { year: 5, tags: ['game', 'warm-up'] }),
])

describe('lesson plan search', () => {
  it('matches every word across title, tags and content', () => {
    expect(filterPlans(plans, { ...emptyFilters, q: 'fruit game' }).map((r) => r.plan.id)).toEqual(['3', '2'])
    expect(filterPlans(plans, { ...emptyFilters, q: 'want buy' }).map((r) => r.plan.id)).toEqual(['2'])
  })

  it('ranks title matches first, then recent edits', () => {
    expect(filterPlans(plans, { ...emptyFilters, q: 'warm-up' }).map((r) => r.plan.id)).toEqual(['1', '3'])
    expect(filterPlans(plans, emptyFilters).map((r) => r.plan.id)).toEqual(['3', '2', '1'])
  })

  it('filters by school, year and tag', () => {
    expect(filterPlans(plans, { ...emptyFilters, year: '5', tag: 'game' }).map((r) => r.plan.id)).toEqual(['3', '2'])
    expect(filterPlans(plans, { ...emptyFilters, schoolId: 'a' }).map((r) => r.plan.id)).toEqual(['2'])
  })

  it('lists tags and makes search snippets', () => {
    expect(allTags(plans.map((p) => p.plan))).toEqual(['game', 'song', 'warm-up'])
    const text = 'a '.repeat(60) + 'target word here'
    expect(snippet(text, 'target')).toMatch(/^….*target word here$/)
  })
})
