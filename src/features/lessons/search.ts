import { htmlToText } from '@/components/editor/richText'
import type { LessonPlan } from '@/data/schema'

export interface PlanFilters {
  q: string
  schoolId: string
  year: string
  textbookId: string
  tag: string
}

export const emptyFilters: PlanFilters = { q: '', schoolId: '', year: '', textbookId: '', tag: '' }

export interface IndexedPlan {
  plan: LessonPlan
  text: string
}

/** Precompute plain text once per plan for fast searching. */
export const indexPlans = (plans: LessonPlan[]): IndexedPlan[] => plans.map((plan) => ({ plan, text: htmlToText(plan.content) }))

/** Every word of the query must match the title, tags or content. */
export function filterPlans(items: IndexedPlan[], f: PlanFilters): IndexedPlan[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean)
  return items
    .filter(({ plan, text }) => {
      if (f.schoolId && plan.schoolId !== f.schoolId) return false
      if (f.year && String(plan.year ?? '') !== f.year) return false
      if (f.textbookId && plan.textbookId !== f.textbookId) return false
      if (f.tag && !plan.tags.includes(f.tag)) return false
      if (!words.length) return true
      const hay = `${plan.title} ${plan.tags.join(' ')} ${text}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    .sort((a, b) => {
      // Title matches first, then most recently edited.
      if (words.length) {
        const ta = words.every((w) => a.plan.title.toLowerCase().includes(w))
        const tb = words.every((w) => b.plan.title.toLowerCase().includes(w))
        if (ta !== tb) return ta ? -1 : 1
      }
      return b.plan.updatedAt - a.plan.updatedAt
    })
}

export const allTags = (plans: LessonPlan[]) => [...new Set(plans.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b))

export function snippet(text: string, q: string, length = 140): string {
  const w = q.toLowerCase().split(/\s+/).find(Boolean)
  const i = w ? text.toLowerCase().indexOf(w) : -1
  const start = i > 40 ? i - 40 : 0
  const s = text.slice(start, start + length)
  return `${start > 0 ? '…' : ''}${s}${start + length < text.length ? '…' : ''}`
}
