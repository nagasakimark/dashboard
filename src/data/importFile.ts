import { isAppExport, validateExport, type ExportFile } from './transfer'

/** What an import would do, shown to the user before anything changes. */
export interface ImportPlan {
  fileName: string
  formatLabel: string
  /** Present only when the file can be imported. */
  file?: ExportFile
  counts: Record<string, number>
  errors: string[]
  warnings: string[]
}

/** Parse a chosen file and work out how to import it. Never writes data. */
export async function readImportFile(text: string, fileName: string): Promise<ImportPlan> {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('That file isn’t valid JSON.')
  }

  if (isAppExport(json)) {
    const r = validateExport(json)
    return { fileName, formatLabel: 'ALT Dashboard export', file: r.file, counts: r.counts, errors: r.errors, warnings: [] }
  }

  return {
    fileName,
    formatLabel: 'Unknown format',
    counts: {},
    errors: ['This file wasn’t recognised as an ALT Dashboard, ALT Planner or dashboard workspace export.'],
    warnings: [],
  }
}
