import { z } from 'zod'

/*
 * Canonical data model. Every synced record carries `id`, `createdAt` and
 * `updatedAt` (epoch ms). Deletions are recorded in the `tombstones` table so
 * sync can propagate them. These schemas validate imports and describe the
 * export file format.
 */

const id = z.string().min(1)
const ts = z.number().int().nonnegative()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const time = z.string().regex(/^(\d{1,2}:\d{2})?$/, 'Expected HH:MM')
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB')

export const base = z.object({ id, createdAt: ts, updatedAt: ts })

/* ------------------------------------------------------------- schools */

export const Timetable = z.object({
  id,
  name: z.string(),
  /** Period start/end times keyed by slot number (1–6 usually). */
  periods: z.array(z.object({ slot: z.number().int().positive(), start: time, end: time })),
  lunch: z.object({ start: time, end: time }),
})

export const SchoolClass = z.object({
  id,
  year: z.number().int().positive(),
  classNumber: z.number().int().positive(),
  jteId: z.string().nullable().default(null),
})

export const School = base.extend({
  name: z.string().min(1),
  color,
  /** Lunch happens after this period number. */
  lunchAfter: z.number().int().min(0).max(8),
  periodCount: z.number().int().min(1).max(8).default(6),
  jtes: z.array(z.object({ id, name: z.string() })),
  classes: z.array(SchoolClass),
  timetables: z.array(Timetable).min(1),
  archived: z.boolean().default(false),
})

/* ------------------------------------------------------------ calendar */

/** Special day types (not at a school). Free text is allowed too. */
export const DAY_TYPES = ['Public Holiday', 'Substitute Holiday', 'Paid Leave', 'Special Leave', 'BoE', 'Event'] as const

export const DayAssignment = base.extend({
  /** id === date */
  date: isoDate,
  kind: z.enum(['school', 'off']),
  schoolId: z.string().nullable().default(null),
  /** null → school's first timetable */
  timetableId: z.string().nullable().default(null),
  dayType: z.string().nullable().default(null),
  note: z.string().default(''),
})

export const PERIOD_TYPES = [
  'Lesson Planning',
  'Marking',
  'Other',
  'Event',
  'BoE',
  'Public Holiday',
  'Special Leave',
  'Substitute Holiday',
] as const

export const Slot = z.union([z.number().int().positive(), z.literal('lunch')])

export const Period = base.extend({
  /** id === `${date}:${slot}` */
  date: isoDate,
  slot: Slot,
  kind: z.enum(['class', 'special']),
  year: z.number().int().positive().nullable().default(null),
  classNumber: z.number().int().positive().nullable().default(null),
  /** For kind === 'special': Lesson Planning, Marking, Other, … */
  specialType: z.string().nullable().default(null),
  summary: z.string().default(''),
  lessonPlanId: z.string().nullable().default(null),
  curriculumItemId: z.string().nullable().default(null),
})

/* ------------------------------------------------- lessons & textbooks */

export const Resource = z.object({
  id,
  kind: z.enum(['link', 'file']),
  name: z.string(),
  url: z.string().default(''),
  /** data: URL for small attached files */
  data: z.string().optional(),
  mime: z.string().optional(),
})

export const LessonPlan = base.extend({
  title: z.string(),
  schoolId: z.string().nullable().default(null),
  year: z.number().int().positive().nullable().default(null),
  textbookId: z.string().nullable().default(null),
  sectionId: z.string().nullable().default(null),
  /** Rich text as HTML (legacy Quill HTML is kept as-is). */
  content: z.string().default(''),
  tags: z.array(z.string()).default([]),
  resources: z.array(Resource).default([]),
})

export const Textbook = base.extend({
  title: z.string().min(1),
  /** Small data: URL (≈300px WebP) */
  cover: z.string().default(''),
  digitalUrl: z.string().default(''),
  altopediaUrl: z.string().default(''),
  /** Preset key for bundled data, e.g. 'nh1' */
  preset: z.string().nullable().default(null),
})

export const Section = base.extend({
  textbookId: id,
  page: z.number().int().nonnegative(),
  title: z.string(),
  topic: z.string().default(''),
  notes: z.string().default(''),
  digitalUrl: z.string().default(''),
  order: z.number().default(0),
})

/* ----------------------------------------------------------- curricula */

export const Curriculum = base.extend({
  name: z.string().min(1),
  description: z.string().default(''),
  textbookId: z.string().nullable().default(null),
  schoolId: z.string().nullable().default(null),
  year: z.number().int().positive().nullable().default(null),
})

export const CurriculumItem = base.extend({
  curriculumId: id,
  order: z.number(),
  text: z.string(),
  sectionId: z.string().nullable().default(null),
  lessonPlanId: z.string().nullable().default(null),
  /** Curriculum-wide tick (legacy behaviour); per-class ticks live in classProgress. */
  completed: z.boolean().default(false),
})

/** A "class" is school + year + class number. */
export const classKey = (schoolId: string, year: number, classNumber: number) => `${schoolId}:${year}:${classNumber}`

export const ClassProgress = base.extend({
  /** id === `${itemId}|${classKey}` */
  itemId: id,
  curriculumId: id,
  classKey: z.string(),
  doneAt: ts,
  periodId: z.string().nullable().default(null),
})

export const Todo = base.extend({
  text: z.string(),
  done: z.boolean().default(false),
  order: z.number().default(0),
})

/* ------------------------------------------------------ classroom board */

export const Widget = z.object({
  id,
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  z: z.number(),
  locked: z.boolean().default(false),
  /** Per-widget settings (timer length, team names, …). */
  config: z.record(z.string(), z.unknown()).default({}),
})

export const Workspace = base.extend({
  name: z.string(),
  order: z.number().default(0),
  widgets: z.array(Widget).default([]),
  background: z.number().int().nonnegative().default(0),
})

export const Template = base.extend({
  name: z.string(),
  widgets: z.array(Widget).default([]),
  background: z.number().int().nonnegative().default(0),
})

export const Roster = base.extend({
  name: z.string(),
  /** Student names; for number-only rosters these are "1".."N". */
  students: z.array(z.string()),
  kind: z.enum(['names', 'number']).default('names'),
  /** Optional link to a planner class. */
  classKey: z.string().nullable().default(null),
})

export const Bookmark = base.extend({
  name: z.string(),
  url: z.string(),
  image: z.string().default(''),
  order: z.number().default(0),
})

/* ------------------------------------------------------------- system */

export const SettingRow = z.object({ id, value: z.unknown(), updatedAt: ts })

export const Tombstone = z.object({
  /** `${table}:${recordId}` */
  id,
  table: z.string(),
  recordId: id,
  deletedAt: ts,
})

export type Timetable = z.infer<typeof Timetable>
export type SchoolClass = z.infer<typeof SchoolClass>
export type School = z.infer<typeof School>
export type DayAssignment = z.infer<typeof DayAssignment>
export type Slot = z.infer<typeof Slot>
export type Period = z.infer<typeof Period>
export type Resource = z.infer<typeof Resource>
export type LessonPlan = z.infer<typeof LessonPlan>
export type Textbook = z.infer<typeof Textbook>
export type Section = z.infer<typeof Section>
export type Curriculum = z.infer<typeof Curriculum>
export type CurriculumItem = z.infer<typeof CurriculumItem>
export type ClassProgress = z.infer<typeof ClassProgress>
export type Todo = z.infer<typeof Todo>
export type Widget = z.infer<typeof Widget>
export type Workspace = z.infer<typeof Workspace>
export type Template = z.infer<typeof Template>
export type Roster = z.infer<typeof Roster>
export type Bookmark = z.infer<typeof Bookmark>
export type SettingRow = z.infer<typeof SettingRow>
export type Tombstone = z.infer<typeof Tombstone>

/** Tables included in export/import and sync, with their record schemas. */
export const syncedTables = {
  schools: School,
  dayAssignments: DayAssignment,
  periods: Period,
  lessonPlans: LessonPlan,
  textbooks: Textbook,
  sections: Section,
  curricula: Curriculum,
  curriculumItems: CurriculumItem,
  classProgress: ClassProgress,
  todos: Todo,
  workspaces: Workspace,
  templates: Template,
  rosters: Roster,
  bookmarks: Bookmark,
  settings: SettingRow,
} as const

export type SyncedTable = keyof typeof syncedTables
export const SYNCED_TABLES = Object.keys(syncedTables) as SyncedTable[]

export const periodId = (date: string, slot: Slot) => `${date}:${slot}`
