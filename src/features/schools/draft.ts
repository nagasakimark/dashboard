import { newId } from '@/data/repo'
import type { School, Timetable } from '@/data/schema'

export const SCHOOL_COLORS = ['#4f46e5', '#2563eb', '#0891b2', '#059669', '#65a30d', '#d97706', '#ea580c', '#dc2626', '#db2777', '#9333ea']

export type SchoolDraft = Omit<School, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: number }

export const blankTimetable = (name: string, periodCount: number): Timetable => ({
  id: newId(),
  name,
  periods: Array.from({ length: periodCount }, (_, i) => ({ slot: i + 1, start: '', end: '' })),
  lunch: { start: '', end: '' },
})

export function newSchoolDraft(): SchoolDraft {
  return {
    name: '',
    color: SCHOOL_COLORS[Math.floor(Math.random() * SCHOOL_COLORS.length)],
    lunchAfter: 4,
    periodCount: 6,
    jtes: [],
    classes: [],
    timetables: [blankTimetable('Normal', 6)],
    archived: false,
  }
}
