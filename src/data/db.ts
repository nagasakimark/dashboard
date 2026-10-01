import { Dexie, type EntityTable } from 'dexie'
import type {
  Bookmark,
  ClassProgress,
  Curriculum,
  CurriculumItem,
  DayAssignment,
  LessonPlan,
  Period,
  Roster,
  School,
  Section,
  SettingRow,
  SyncedTable,
  Template,
  Textbook,
  Todo,
  Tombstone,
  VocabSet,
  Workspace,
} from './schema'

export interface Backup {
  id: string
  createdAt: number
  reason: string
  /** Record counts per table, for display. */
  counts: Record<string, number>
  /** Serialized export file (JSON). */
  json: string
}

/** Device-only bookkeeping (never exported or synced), e.g. the database's identity marker. */
export interface MetaRow {
  key: string
  value: unknown
}

/**
 * The app database. Name chosen so it never collides with the legacy
 * `alt-planner-db` / `livepoll` databases that share this origin (those are
 * read once by the migrator and never written).
 */
export class AppDB extends Dexie {
  schools!: EntityTable<School, 'id'>
  dayAssignments!: EntityTable<DayAssignment, 'id'>
  periods!: EntityTable<Period, 'id'>
  lessonPlans!: EntityTable<LessonPlan, 'id'>
  textbooks!: EntityTable<Textbook, 'id'>
  sections!: EntityTable<Section, 'id'>
  curricula!: EntityTable<Curriculum, 'id'>
  curriculumItems!: EntityTable<CurriculumItem, 'id'>
  classProgress!: EntityTable<ClassProgress, 'id'>
  todos!: EntityTable<Todo, 'id'>
  workspaces!: EntityTable<Workspace, 'id'>
  templates!: EntityTable<Template, 'id'>
  rosters!: EntityTable<Roster, 'id'>
  bookmarks!: EntityTable<Bookmark, 'id'>
  vocabSets!: EntityTable<VocabSet, 'id'>
  settings!: EntityTable<SettingRow, 'id'>
  tombstones!: EntityTable<Tombstone, 'id'>
  backups!: EntityTable<Backup, 'id'>
  meta!: EntityTable<MetaRow, 'key'>

  constructor(name = 'alt-dashboard') {
    super(name)
    // Only indexed fields are listed; all other fields are stored as-is.
    this.version(1).stores({
      schools: 'id, name, updatedAt',
      dayAssignments: 'id, date, schoolId, updatedAt',
      periods: 'id, date, lessonPlanId, curriculumItemId, [year+classNumber], updatedAt',
      lessonPlans: 'id, title, schoolId, textbookId, sectionId, *tags, updatedAt',
      textbooks: 'id, title, updatedAt',
      sections: 'id, textbookId, [textbookId+page], updatedAt',
      curricula: 'id, name, updatedAt',
      curriculumItems: 'id, curriculumId, [curriculumId+order], sectionId, lessonPlanId, updatedAt',
      classProgress: 'id, itemId, curriculumId, classKey, updatedAt',
      todos: 'id, order, updatedAt',
      workspaces: 'id, order, updatedAt',
      templates: 'id, updatedAt',
      rosters: 'id, name, updatedAt',
      bookmarks: 'id, order, updatedAt',
      settings: 'id, updatedAt',
      tombstones: 'id, table, deletedAt',
      backups: 'id, createdAt',
    })
    // v2 (Phase 10): custom vocabulary sets for the games.
    this.version(2).stores({ vocabSets: 'id, name, updatedAt' })
    // v3: device-only bookkeeping, used to notice when the browser has cleared the database.
    this.version(3).stores({ meta: 'key' })
  }

  /** Untyped access to a synced table by name (export/import/sync). */
  syncedTable(name: SyncedTable) {
    return this[name] as unknown as EntityTable<Record<string, unknown> & { id: string }, 'id'>
  }
}

export const db = new AppDB()
