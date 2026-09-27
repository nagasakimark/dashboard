import { db } from './db'
import { dataUrlBytes, formatBytes, shrinkImage, type ImageShrinker } from './images'
import { convertDashboard, convertWorkspaceFile, isWorkspaceFile, type DashboardData } from './migrate/dashboard'
import { convertPlanner, isPlannerExport, plannerVariant, type PlannerData } from './migrate/planner'
import type { LegacyBrowserData } from './migrate/browser'
import { isObj } from './migrate/util'
import { save } from './repo'
import { SYNCED_TABLES, type SettingRow, type SyncedTable, type Textbook } from './schema'
import { countRecords, isAppExport, replaceAllData, SCHEMA_VERSION, validateExport, APP_ID, type ExportFile } from './transfer'

/** What an import would do, shown to the user before anything changes. */
export interface ImportPlan {
  fileName: string
  formatLabel: string
  counts: Record<string, number>
  /** Blocking problems: when present the plan can't be applied. */
  errors: string[]
  /** Things worth checking after import. */
  warnings: string[]
  /** Informational notes. */
  notes: string[]
  /** 'replace' overwrites this device's data; 'add' only adds records. */
  mode: 'replace' | 'add'
  /** Tables on this device that a replace keeps (human-readable). */
  keeps: string[]
  /** Performs the import. Resolves to the backup id (replace mode). */
  apply?: () => Promise<string | null>
}

export interface ImportOptions {
  shrink?: ImageShrinker
  now?: number
}

const BOARD_TABLES: SyncedTable[] = ['workspaces', 'templates', 'rosters', 'bookmarks']

const emptyData = () => Object.fromEntries(SYNCED_TABLES.map((t) => [t, []])) as unknown as ExportFile['data']

/** Overlay setting rows onto the current ones (keys in `rows` win). */
async function mergedSettings(rows: SettingRow[]): Promise<SettingRow[]> {
  const current = new Map((await db.settings.toArray()).map((r) => [r.id, r]))
  for (const r of rows) current.set(r.id, r)
  return [...current.values()]
}

/** Add dashboard textbook links to planner textbooks, matching by title. */
function mergeTextbooks(planner: Textbook[], links: Textbook[]): { textbooks: Textbook[]; merged: number } {
  const byTitle = new Map(planner.map((t) => [t.title.trim().toLowerCase(), t]))
  const out = [...planner]
  let merged = 0
  for (const link of links) {
    const match = byTitle.get(link.title.trim().toLowerCase())
    if (match) {
      if (!match.digitalUrl) match.digitalUrl = link.digitalUrl
      if (!match.cover) match.cover = link.cover
      merged++
    } else out.push(link)
  }
  return { textbooks: out, merged }
}

async function shrinkCovers(textbooks: Textbook[], shrink: ImageShrinker): Promise<string | null> {
  const before = textbooks.reduce((n, t) => n + dataUrlBytes(t.cover), 0)
  for (const t of textbooks) if (t.cover) t.cover = await shrink(t.cover)
  const after = textbooks.reduce((n, t) => n + dataUrlBytes(t.cover), 0)
  return before - after > 10_000 ? `Textbook covers were resized from ${formatBytes(before)} to ${formatBytes(after)}.` : null
}

/** Build a replace-plan from converted data; validates the result. */
function replacePlan(
  fileName: string,
  formatLabel: string,
  build: () => Promise<ExportFile>,
  preview: ExportFile,
  extra: Partial<ImportPlan>,
  backupReason = `Before importing ${fileName}`,
): ImportPlan {
  const check = validateExport(JSON.parse(JSON.stringify(preview)))
  const errors = check.ok ? [] : ['The converted data didn’t pass validation (this is a bug; please report it):', ...check.errors]
  return {
    fileName,
    formatLabel,
    counts: check.counts,
    errors,
    warnings: [],
    notes: [],
    mode: 'replace',
    keeps: [],
    ...extra,
    apply: errors.length
      ? undefined
      : async () => {
          const file = await build()
          const valid = validateExport(JSON.parse(JSON.stringify(file)))
          if (!valid.ok || !valid.file) throw new Error(valid.errors.join('\n'))
          return (await replaceAllData(valid.file, backupReason)).id
        },
  }
}

/* ------------------------------------------------------------ planner */

async function plannerPlan(json: Record<string, unknown>, fileName: string, opts: ImportOptions): Promise<ImportPlan> {
  const { data, warnings, notes } = convertPlanner(json, opts.now)
  const coverNote = await shrinkCovers(data.textbooks, opts.shrink ?? shrinkImage)
  if (coverNote) notes.push(coverNote)

  const assemble = async (): Promise<ExportFile> => {
    const file: ExportFile = { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: emptyData() }
    Object.assign(file.data, data as Partial<PlannerData>)
    // Planner files carry no classroom-board data: keep what's on this device.
    for (const t of BOARD_TABLES) (file.data as Record<string, unknown[]>)[t] = await db.syncedTable(t).toArray()
    file.data.settings = await mergedSettings(data.settings)
    return file
  }
  const preview: ExportFile = { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: '', data: { ...emptyData(), ...data } }
  const variant = plannerVariant(json)
  return replacePlan(
    fileName,
    variant === 'dashboard' ? 'ALT Planner export (dashboard version)' : 'ALT Planner export (original version)',
    assemble,
    preview,
    {
      warnings,
      notes,
      keeps: ['Classroom board workspaces, templates, class rosters and bookmarks', 'Settings not in the file'],
    },
  )
}

/* ------------------------------------------------------ browser data */

/** Everything the old apps left in this browser, as one replace-plan. */
export async function legacyBrowserPlan(legacy: LegacyBrowserData, opts: ImportOptions = {}): Promise<ImportPlan> {
  const planner = legacy.planner ? convertPlanner(legacy.planner, opts.now) : null
  const board = legacy.dashboard ? convertDashboard(legacy.dashboard, opts.now) : null
  const warnings = [...(planner?.warnings ?? []), ...(board?.warnings ?? [])]
  const notes = [...(planner?.notes ?? []), ...(board?.notes ?? [])]

  const data = emptyData()
  if (planner) Object.assign(data, planner.data)
  if (board) {
    const d: DashboardData = board.data
    Object.assign(data, { workspaces: d.workspaces, templates: d.templates, rosters: d.rosters, bookmarks: d.bookmarks })
    const { textbooks, merged } = mergeTextbooks(data.textbooks as Textbook[], d.textbooks)
    data.textbooks = textbooks
    if (merged) notes.push(`${merged} dashboard textbook link${merged === 1 ? ' was' : 's were'} merged into matching planner textbooks.`)
  }
  data.settings = [
    ...(planner?.data.settings ?? []),
    ...(board?.data.settings ?? []),
    { id: 'legacyMigrationDone', value: true, updatedAt: Date.now() },
  ]
  const coverNote = await shrinkCovers(data.textbooks as Textbook[], opts.shrink ?? shrinkImage)
  if (coverNote) notes.push(coverNote)

  const file: ExportFile = { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }
  const build = async () => ({ ...file, data: { ...file.data, settings: await mergedSettings(file.data.settings) } })
  return replacePlan(
    'Found in this browser',
    'Old dashboard and planner (this browser)',
    build,
    file,
    { warnings, notes },
    'Before importing the old dashboard’s data',
  )
}

/* ---------------------------------------------------------- dispatch */

/** Parse a chosen file and work out how to import it. Never writes data. */
export async function readImportFile(text: string, fileName: string, opts: ImportOptions = {}): Promise<ImportPlan> {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }
  const base = { fileName, warnings: [], notes: [], keeps: [], mode: 'replace' as const }

  if (isAppExport(json)) {
    const r = validateExport(json)
    return {
      ...base,
      formatLabel: 'ALT Dashboard export',
      counts: r.counts,
      errors: r.errors,
      apply: r.file ? async () => (await replaceAllData(r.file!, `Before importing ${fileName}`)).id : undefined,
    }
  }

  if (isPlannerExport(json)) return plannerPlan(json, fileName, opts)

  if (isWorkspaceFile(json)) {
    const workspace = convertWorkspaceFile(json, opts.now)
    return {
      ...base,
      mode: 'add',
      formatLabel: 'Classroom board workspace',
      counts: countRecords({ workspaces: [workspace] }),
      errors: [],
      notes: [`Adds the workspace “${workspace.name}” (${workspace.widgets.length} widgets). Nothing else changes.`],
      apply: async () => {
        const count = await db.workspaces.count()
        await save('workspaces', { ...workspace, order: count })
        return null
      },
    }
  }

  const hint = isObj(json) && 'data' in json ? ' It may come from a different app.' : ''
  return {
    ...base,
    formatLabel: 'Unknown format',
    counts: {},
    errors: [`This file wasn’t recognised as an ALT Dashboard, ALT Planner or dashboard workspace export.${hint}`],
  }
}
