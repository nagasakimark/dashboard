import type {
  Curriculum,
  CurriculumItem,
  DayAssignment,
  LessonPlan,
  Period,
  School,
  Section,
  SettingRow,
  Textbook,
  Timetable,
  Todo,
} from '../schema'
import { arr, contentToHtml, hexColor, idStr, int, isObj, objs, pluralize, str, toMs, type Json } from './util'

/**
 * Converts ALT Planner exports into the new model. Handles both the original
 * planner (6 stores: schools, assignments, schedule, textbooks, lessonPlans,
 * settings) and the dashboard-embedded planner (adds todos, sections,
 * curriculums).
 */

export interface PlannerData {
  schools: School[]
  dayAssignments: DayAssignment[]
  periods: Period[]
  lessonPlans: LessonPlan[]
  textbooks: Textbook[]
  sections: Section[]
  curricula: Curriculum[]
  curriculumItems: CurriculumItem[]
  todos: Todo[]
  settings: SettingRow[]
}

export interface ConversionResult<T> {
  data: T
  warnings: string[]
  /** Informational notes (not problems). */
  notes: string[]
}

const PLANNER_KEYS = ['schools', 'assignments', 'schedule', 'textbooks', 'lessonPlans'] as const

export function isPlannerExport(json: unknown): json is Json {
  return isObj(json) && PLANNER_KEYS.filter((k) => k in json).length >= 3 && !('app' in json)
}

export function plannerVariant(json: Json): 'dashboard' | 'original' {
  return 'curriculums' in json || 'todos' in json ? 'dashboard' : 'original'
}

const SCHOOL_COLORS = ['#4f46e5', '#059669', '#d97706', '#db2777', '#0891b2', '#7c3aed']
const KEY_RE = /^(\d{4}-\d{2}-\d{2})-([A-Za-z]+)(?:-(\d+|lunch))?$/
/** Legacy "Other" periods whose summary is really a type of work. */
const PROMOTED_SPECIALS: Record<string, string> = { 'lesson planning': 'Lesson Planning', marking: 'Marking' }
const promotedType = (summary: string) => PROMOTED_SPECIALS[summary.trim().replace(/\.$/, '').toLowerCase()]

export function convertPlanner(json: Json, now = Date.now()): ConversionResult<PlannerData> {
  const warnings: string[] = []
  const notes: string[] = []
  const stamp = (created: unknown, updated?: unknown) => {
    const createdAt = toMs(created, now)
    return { createdAt, updatedAt: toMs(updated, createdAt) }
  }

  /* ---------------------------------------------------------- schools */
  const timetableIds = new Map<string, Set<string>>()
  const schools: School[] = objs(json.schools).map((s, i) => {
    const id = idStr(s.id) ?? `school-${i + 1}`
    const jteNames = arr(s.jtes)
      .map((j) => str(isObj(j) ? j.name : j).trim())
      .filter(Boolean)
    const jtes = jteNames.map((name, j) => ({ id: `${id}:jte${j}`, name }))
    const classes = objs(s.classes)
      .map((c, j) => {
        const year = int(c.yearGroup ?? c.year)
        const classNumber = int(c.classNumber)
        if (!year || !classNumber) return null
        const jteIndex = typeof c.jteIndex === 'number' ? c.jteIndex : -1
        return { id: `${id}:c${j}`, year, classNumber, jteId: jtes[jteIndex]?.id ?? null }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)

    let timetables: Timetable[] = objs(s.timeSchedules).map((t, j) => ({
      id: idStr(t.id) ?? `${id}:t${j}`,
      name: str(t.name).trim() || `Timetable ${j + 1}`,
      periods: objs(t.periods)
        .map((p) => ({ slot: int(p.id) ?? 0, start: str(p.startTime), end: str(p.endTime) }))
        .filter((p) => p.slot > 0),
      lunch: { start: str(isObj(t.lunchTime) ? t.lunchTime.startTime : ''), end: str(isObj(t.lunchTime) ? t.lunchTime.endTime : '') },
    }))
    if (!timetables.length) timetables = [{ id: `${id}:t0`, name: 'Default', periods: [], lunch: { start: '', end: '' } }]
    timetableIds.set(id, new Set(timetables.map((t) => t.id)))

    return {
      id,
      name: str(s.name).trim() || `School ${i + 1}`,
      color: hexColor(s.accentColor, SCHOOL_COLORS[i % SCHOOL_COLORS.length]),
      lunchAfter: Math.min(8, Math.max(0, int(s.lunchPeriod) ?? 3)),
      periodCount: 6,
      jtes,
      classes,
      timetables,
      archived: false,
      ...stamp(s.dateCreated),
    }
  })
  const schoolById = new Map(schools.map((s) => [s.id, s]))

  /* ------------------------------------------------- day assignments */
  const days = new Map<string, DayAssignment>()
  let danglingTimetables = 0
  let unknownSchools = 0
  const assignments = isObj(json.assignments) ? json.assignments : {}
  for (const [key, value] of Object.entries(assignments)) {
    const m = KEY_RE.exec(key)
    if (!m || m[3]) continue
    const date = m[1]
    const rawSchool = isObj(value) ? idStr(value.schoolId) : typeof value === 'string' ? value : null
    if (!rawSchool) continue
    const base = { id: date, date, note: '', ...stamp(now) }
    if (rawSchool.startsWith('special_')) {
      days.set(date, { ...base, kind: 'off', schoolId: null, timetableId: null, dayType: rawSchool.slice('special_'.length) || 'Other' })
      continue
    }
    if (!schoolById.has(rawSchool)) {
      // A free-text value or a deleted school: keep it visible as a day note.
      unknownSchools++
      days.set(date, { ...base, kind: 'off', schoolId: null, timetableId: null, dayType: 'Other', note: rawSchool })
      continue
    }
    let timetableId = isObj(value) ? idStr(value.scheduleId) : null
    if (timetableId && !timetableIds.get(rawSchool)?.has(timetableId)) {
      danglingTimetables++
      timetableId = null
    }
    days.set(date, { ...base, kind: 'school', schoolId: rawSchool, timetableId, dayType: null })
  }
  if (danglingTimetables)
    warnings.push(
      `${pluralize(danglingTimetables, 'day')} used a timetable that had been deleted. They now use their school’s first timetable.`,
    )
  if (unknownSchools)
    warnings.push(`${pluralize(unknownSchools, 'day')} referred to a school that no longer exists and became “Other” days.`)

  /* ---------------------------------------------------- lesson plans */
  const lessonPlanIds = new Set(
    objs(json.lessonPlans)
      .map((p) => idStr(p.id))
      .filter(Boolean) as string[],
  )

  /* --------------------------------------------------------- periods */
  const periods: Period[] = []
  let promoted = 0
  let orphanPeriods = 0
  let missingPlans = 0
  /** Classes taught but missing from their school's class list. */
  const offRoster = new Map<string, { schoolId: string; year: number; classNumber: number }>()
  const schedule = isObj(json.schedule) ? json.schedule : {}
  for (const [key, value] of Object.entries(schedule)) {
    const m = KEY_RE.exec(key)
    if (!m || !m[3] || !isObj(value)) continue
    const date = m[1]
    const slot = m[3] === 'lunch' ? ('lunch' as const) : Number(m[3])
    const year = int(value.yearGroup)
    const classNumber = int(value.classNumber)
    let special = str(value.special).trim() || null
    let summary = str(value.summary ?? value.note)
    const isClass = !special && value.type !== 'special' && value.type !== 'other' && !!year && !!classNumber
    if (!isClass && !special) special = 'Other'
    if (special === 'Other' && promotedType(summary)) {
      special = promotedType(summary)
      summary = ''
      promoted++
    }
    let lessonPlanId = idStr(value.lessonPlanId)
    if (lessonPlanId && !lessonPlanIds.has(lessonPlanId)) {
      missingPlans++
      lessonPlanId = null
    }
    const day = days.get(date)
    if (!day) orphanPeriods++
    if (isClass && day?.schoolId) {
      const school = schoolById.get(day.schoolId)
      if (school && !school.classes.some((c) => c.year === year && c.classNumber === classNumber))
        offRoster.set(`${school.id}|${year}|${classNumber}`, { schoolId: school.id, year: year!, classNumber: classNumber! })
    }
    periods.push({
      id: `${date}:${slot}`,
      date,
      slot,
      kind: isClass ? 'class' : 'special',
      year: isClass ? year : null,
      classNumber: isClass ? classNumber : null,
      specialType: isClass ? null : special,
      summary,
      lessonPlanId,
      curriculumItemId: null,
      ...stamp(now),
    })
  }
  if (promoted)
    notes.push(`${pluralize(promoted, 'period')} labelled “Other” with the summary “Lesson Planning” or “Marking” now use those types.`)
  if (orphanPeriods) warnings.push(`${pluralize(orphanPeriods, 'period')} are on days with no school assigned.`)
  if (missingPlans)
    warnings.push(`${pluralize(missingPlans, 'period')} linked to a lesson plan that no longer exists; the link was removed.`)
  if (offRoster.size) {
    // Add them so per-class features (curriculum progress, history) see them.
    const added = new Map<string, string[]>()
    for (const { schoolId, year, classNumber } of [...offRoster.values()].sort(
      (a, b) => a.year - b.year || a.classNumber - b.classNumber,
    )) {
      const school = schoolById.get(schoolId)!
      school.classes.push({ id: `${schoolId}:y${year}c${classNumber}`, year, classNumber, jteId: null })
      added.set(school.name, [...(added.get(school.name) ?? []), `${year}-${classNumber}`])
    }
    const list = [...added].map(([name, classes]) => `${name} (${classes.join(', ')})`).join('; ')
    notes.push(
      `${pluralize(offRoster.size, 'class', 'classes')} from your schedule ${offRoster.size === 1 ? 'was' : 'were'} missing from school class lists and ${offRoster.size === 1 ? 'has' : 'have'} been added: ${list}. Remove any that look wrong in Schools.`,
    )
  }

  /* ---------------------------------------------- textbooks/sections */
  const textbooks: Textbook[] = []
  const sections: Section[] = []
  const sectionDetails = new Map(objs(json.sections).map((d) => [idStr(d.sectionId) ?? '', d]))
  for (const t of objs(json.textbooks)) {
    const id = idStr(t.id)
    if (!id) continue
    textbooks.push({
      id,
      title: str(t.title).trim() || 'Untitled textbook',
      cover: str(t.image),
      digitalUrl: str(t.digitalLink),
      altopediaUrl: str(t.altopediaLink),
      preset: null,
      ...stamp(t.dateCreated),
    })
    objs(t.sections).forEach((s, i) => {
      const sid = idStr(s.id) ?? `${id}:s${i}`
      const detail = sectionDetails.get(sid)
      sections.push({
        id: sid,
        textbookId: id,
        page: int(s.pageNumber ?? s.page) ?? 0,
        title: str(s.title).trim() || `Page ${str(s.pageNumber)}`,
        topic: str(s.topic),
        notes: str(detail?.notes),
        digitalUrl: str(detail?.digitalLink),
        altopediaUrl: '',
        order: i,
        ...stamp(s.dateCreated),
      })
    })
  }
  const sectionIds = new Set(sections.map((s) => s.id))
  const textbookIds = new Set(textbooks.map((t) => t.id))

  /* ---------------------------------------------------- lesson plans */
  let brokenRefs = 0
  const lessonPlans: LessonPlan[] = objs(json.lessonPlans).map((p, i) => {
    const ref = (v: unknown, known: Set<string> | Map<string, unknown>) => {
      const r = idStr(v)
      if (r && !known.has(r)) {
        brokenRefs++
        return null
      }
      return r
    }
    return {
      id: idStr(p.id) ?? `plan-${i + 1}`,
      title: str(p.title).trim() || 'Untitled lesson',
      schoolId: ref(p.school, schoolById),
      year: int(p.yearGroup),
      textbookId: ref(p.textbook, textbookIds),
      sectionId: ref(p.section, sectionIds),
      content: contentToHtml(p.content),
      tags: arr(p.tags)
        .map((t) => str(t).trim())
        .filter(Boolean),
      resources: objs(p.resources).map((r, j) => ({
        id: idStr(r.id) ?? `res-${j}`,
        kind: r.type === 'file' || typeof r.data === 'string' ? ('file' as const) : ('link' as const),
        name: str(r.name ?? r.title ?? r.url, 'Resource'),
        url: str(r.url),
        ...(typeof r.data === 'string' ? { data: r.data } : {}),
        ...(typeof r.mime === 'string' || typeof r.fileType === 'string' ? { mime: str(r.mime ?? r.fileType) } : {}),
      })),
      ...stamp(p.dateCreated, p.dateModified),
    }
  })
  if (brokenRefs)
    warnings.push(
      `${pluralize(brokenRefs, 'lesson plan link')} pointed to a deleted school, textbook or section and ${brokenRefs === 1 ? 'was' : 'were'} cleared.`,
    )

  /* ------------------------------------------------ curricula/todos */
  const curricula: Curriculum[] = []
  const curriculumItems: CurriculumItem[] = []
  for (const c of objs(json.curriculums)) {
    const id = idStr(c.id)
    if (!id) continue
    curricula.push({
      id,
      name: str(c.name).trim() || 'Curriculum',
      description: '',
      textbookId: null,
      schoolId: null,
      year: null,
      ...stamp(c.dateCreated),
    })
    objs(c.items).forEach((item, order) =>
      curriculumItems.push({
        id: idStr(item.id) ?? `${id}:i${order}`,
        curriculumId: id,
        order,
        text: str(item.text),
        sectionId: null,
        lessonPlanId: null,
        completed: item.completed === true,
        ...stamp(c.dateCreated),
      }),
    )
  }
  const todos: Todo[] = objs(json.todos).map((t, i) => ({
    id: idStr(t.id) ?? `todo-${i}`,
    text: str(t.text),
    done: t.completed === true || t.done === true,
    order: i,
    ...stamp(t.createdAt),
  }))

  /* -------------------------------------------------------- settings */
  const legacy = isObj(json.settings) ? json.settings : {}
  const settings: SettingRow[] = []
  const setting = (id: string, value: unknown) => settings.push({ id, value, updatedAt: now })
  if (str(legacy.altName).trim()) setting('profileName', str(legacy.altName).trim())
  if (typeof legacy.accentColor === 'string') setting('accentColor', hexColor(legacy.accentColor, '#4f46e5'))
  if (['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd'].includes(str(legacy.dateFormat))) setting('dateFormat', legacy.dateFormat)

  return {
    data: {
      schools,
      dayAssignments: [...days.values()],
      periods,
      lessonPlans,
      textbooks,
      sections,
      curricula,
      curriculumItems,
      todos,
      settings,
    },
    warnings,
    notes,
  }
}
