import { classKey, type Roster, type School } from '@/data/schema'

/** Where a student widget gets its names: a saved class list, or names typed into the widget. */
export interface NameSource {
  /** Roster id, or null for the typed list. */
  rosterId: string | null
  /** Typed names, one per line. */
  names: string
}

export const emptySource = (rosterId: string | null = null): NameSource => ({ rosterId, names: '' })

export const splitLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

export function sourceNames(source: NameSource | undefined, rosters: Roster[] | undefined): string[] {
  if (!source) return []
  if (source.rosterId) return rosters?.find((r) => r.id === source.rosterId)?.students ?? []
  return splitLines(source.names)
}

export const numberedStudents = (count: number) => Array.from({ length: Math.max(1, Math.min(200, count)) }, (_, i) => String(i + 1))

/**
 * Suggest the planner class a roster belongs to from its name: "5-1",
 * "Year 5 class 1" or "Hamada 5-1" match a school class. Returns null when
 * nothing (or more than one school) matches.
 */
export function matchClassKey(name: string, schools: School[]): string | null {
  const m = name.match(/(\d)\s*[-–ー年]\s*(\d{1,2})/) ?? name.match(/year\s*(\d)\D+(\d{1,2})/i)
  if (!m) return null
  const year = Number(m[1])
  const num = Number(m[2])
  const candidates = schools.filter((s) => !s.archived && s.classes.some((c) => c.year === year && c.classNumber === num))
  const lower = name.toLowerCase()
  const named = candidates.filter((s) => lower.includes(s.name.toLowerCase()))
  const pick = named.length === 1 ? named[0] : candidates.length === 1 ? candidates[0] : null
  return pick ? classKey(pick.id, year, num) : null
}

/** Human label for a planner class key. */
export function classLabel(key: string, schools: Map<string, School>): string {
  const [schoolId, year, num] = key.split(':')
  const school = schools.get(schoolId)
  return `${school?.name ?? 'Unknown school'} · ${year}-${num}`
}

/** Fisher–Yates shuffle (returns a copy). */
export function shuffle<T>(list: T[], random = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Deal shuffled names round-robin into `count` groups. */
export function makeGroups(names: string[], count: number, random = Math.random): string[][] {
  const groups: string[][] = Array.from({ length: Math.max(1, count) }, () => [])
  shuffle(names, random).forEach((n, i) => groups[i % groups.length].push(n))
  return groups
}
