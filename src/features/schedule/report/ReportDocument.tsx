import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { addDays, format } from 'date-fns'
import type { DayAssignment, LessonPlan, Period, School, Slot } from '@/data/schema'
import { iso, isWeekend } from '../model'
import { tallyKey, type TallyWeek, type WeeklyTally } from '../tally'

export interface ReportData {
  author: string
  weeks: TallyWeek[]
  days: Map<string, DayAssignment>
  /** Keyed `${date}:${slot}`. */
  periods: Map<string, Period>
  schools: School[]
  plans: Map<string, LessonPlan>
  tally: WeeklyTally
  includeNotes: boolean
  /** Font family to use (a Japanese-capable one when needed). */
  font: string
}

const ink = '#1e293b'
const soft = '#475569'
const faint = '#94a3b8'
const line = '#e2e8f0'
const strong = '#94a3b8'

/** A colour mixed with white; `amount` is the colour's share (0–1). */
const tint = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1, 7), 16)
  const m = (c: number) => Math.round(c * amount + 255 * (1 - amount))
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`
}
/** A colour darkened for text on its own tint. */
const shade = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16)
  const m = (c: number) => Math.round(c * 0.72)
  return `rgb(${m((n >> 16) & 255)}, ${m((n >> 8) & 255)}, ${m(n & 255)})`
}

/** Heights (pt) that make the weekly grid fill an A4 landscape page exactly. */
const PERIOD_ROWS_HEIGHT = 422
const SCHOOL_ROW_HEIGHT = 28
const NOTE_LINE = 7.5 * 1.2

const s = StyleSheet.create({
  page: { padding: 24, paddingBottom: 40, fontSize: 9, color: ink, backgroundColor: '#ffffff' },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: line,
    paddingTop: 6,
    fontSize: 8,
    color: faint,
  },
  runningHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: line,
    paddingBottom: 5,
    marginBottom: 10,
    fontSize: 9,
    color: faint,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderColor: line,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Weekly schedule
  weeksRow: { flexDirection: 'row', justifyContent: 'space-between', flexGrow: 1 },
  week: { width: '49%', flexDirection: 'column' },
  weekHead: { backgroundColor: '#1e293b', padding: 6, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  weekTitle: { fontSize: 10, textAlign: 'center', color: '#ffffff', fontWeight: 'bold', letterSpacing: 0.5 },
  grid: { borderWidth: 1, borderTopWidth: 0, borderColor: line, flexGrow: 1 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: line },
  dayHead: { flex: 1, paddingVertical: 4, alignItems: 'center', borderRightWidth: 1, borderColor: line },
  dayName: { fontSize: 9, fontWeight: 'bold', color: '#334155' },
  dayDate: { fontSize: 8, color: '#64748b', marginTop: 1 },
  schoolCell: { flex: 1, padding: 4, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderColor: line },
  cell: { flex: 1, padding: 4, alignItems: 'center', borderRightWidth: 1, borderColor: line, overflow: 'hidden' },
  classText: { fontSize: 9.5, fontWeight: 'bold', color: ink, maxLines: 1 },
  specialText: { fontSize: 8, fontWeight: 'bold', color: '#4b5563', textAlign: 'center', maxLines: 1, textOverflow: 'ellipsis' },
  note: { fontSize: 7.5, color: soft, marginTop: 2, lineHeight: 1.2, textAlign: 'center', width: '100%' },
  // Tally
  tHead: { flexDirection: 'row' },
  tCell: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 4, borderRightWidth: 1, borderColor: '#cbd5e1' },
  tWeek: { width: 88, justifyContent: 'center', paddingHorizontal: 6, borderRightWidth: 2, borderColor: strong },
})

function Footer({ label }: { label: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{label}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

const range = (d: ReportData) => {
  const first = d.weeks[0].first
  const last = d.weeks[d.weeks.length - 1].last
  return `${format(first, 'MMMM do')} – ${format(last, first.getFullYear() === last.getFullYear() ? 'MMMM do' : 'MMMM do yyyy')}`
}

function TitlePage({ d }: { d: ReportData }) {
  return (
    <Page size="A4" orientation="landscape" style={[s.page, { fontFamily: d.font }]}>
      <View
        style={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderWidth: 1,
          borderColor: line,
          borderRadius: 4,
          margin: 12,
        }}
      >
        <View
          style={{
            width: '78%',
            alignItems: 'center',
            paddingVertical: 30,
            borderTopWidth: 4,
            borderBottomWidth: 4,
            borderColor: '#3b82f6',
          }}
        >
          <Text style={{ fontSize: 30, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            Weekly Schedule Record
          </Text>
          <Text style={{ fontSize: 17, color: '#64748b', letterSpacing: 1 }}>{range(d)}</Text>
          <Text style={{ fontSize: 11, color: faint, marginTop: 6 }}>{format(d.weeks[0].first, 'yyyy')}</Text>
        </View>
        <Text style={{ marginTop: 20, color: faint, fontSize: 14 }}>{d.author || 'Assistant Language Teacher'}</Text>
      </View>
      <Footer label="ALT Dashboard" />
    </Page>
  )
}

function StaffPage({ d }: { d: ReportData }) {
  const schools = d.schools.filter((x) => x.jtes.length || x.classes.length)
  if (!schools.length) return null
  return (
    <Page size="A4" orientation="landscape" style={[s.page, { fontFamily: d.font }]}>
      <Text style={s.sectionTitle}>School & Staff Overview</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {schools.map((school) => {
          const classes = (jteId: string | null) =>
            school.classes
              .filter((c) => (c.jteId ?? null) === jteId)
              .sort((a, b) => a.year - b.year || a.classNumber - b.classNumber)
              .map((c) => `${c.year}-${c.classNumber}`)
              .join(', ')
          const unassigned = classes(null)
          return (
            <View
              key={school.id}
              wrap={false}
              style={{
                width: '49%',
                marginBottom: 12,
                padding: 10,
                backgroundColor: '#f8fafc',
                borderLeftWidth: 3,
                borderColor: school.color,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: shade(school.color), marginBottom: 6 }}>{school.name}</Text>
              {school.jtes.map((j) => (
                <View key={j.id} style={{ flexDirection: 'row', marginBottom: 3 }}>
                  <Text style={{ width: 100, fontWeight: 'bold', color: soft }}>{j.name}</Text>
                  <Text style={{ flex: 1, color: '#64748b' }}>{classes(j.id) || '—'}</Text>
                </View>
              ))}
              {unassigned && (
                <View style={{ flexDirection: 'row', marginBottom: 3 }}>
                  <Text style={{ width: 100, fontWeight: 'bold', color: faint }}>{school.jtes.length ? 'No JTE' : 'Classes'}</Text>
                  <Text style={{ flex: 1, color: '#64748b' }}>{unassigned}</Text>
                </View>
              )}
            </View>
          )
        })}
      </View>
      <Footer label="ALT Dashboard" />
    </Page>
  )
}

function WeekSchedule({ d, week }: { d: ReportData; week: TallyWeek }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.start, i)).filter(
    (day) => !isWeekend(day) || d.days.has(iso(day)) || [...d.periods.keys()].some((k) => k.startsWith(`${iso(day)}:`)),
  )
  const schoolOf = (day: Date) => {
    const a = d.days.get(iso(day))
    return { a, school: a?.schoolId ? d.schools.find((x) => x.id === a.schoolId) : undefined }
  }
  // Rows: the most periods any school this week has (at least 6); lunch only if used.
  const periodCount = Math.max(
    6,
    ...days.map((day) => schoolOf(day).school?.periodCount ?? 0),
    ...[...d.periods.values()]
      .filter((p) => days.some((day) => iso(day) === p.date) && typeof p.slot === 'number')
      .map((p) => p.slot as number),
  )
  const hasLunch = days.some((day) => d.periods.has(`${iso(day)}:lunch`))
  const lunchAfter = days.map((day) => schoolOf(day).school?.lunchAfter).find((n) => n != null) ?? 4
  const rows: Slot[] = []
  for (let n = 1; n <= periodCount; n++) {
    rows.push(n)
    if (hasLunch && n === Math.min(lunchAfter, periodCount)) rows.push('lunch')
  }
  // Fixed row heights so a week always fits its page: long notes end in "…"
  // instead of pushing the grid onto the next page.
  const unit = PERIOD_ROWS_HEIGHT / rows.reduce<number>((n, r) => n + (r === 'lunch' ? 0.5 : 1), 0)
  const heightOf = (slot: Slot) => (slot === 'lunch' ? unit / 2 : unit)
  const noteLines = (slot: Slot) => Math.max(1, Math.floor((heightOf(slot) - 8 - 13) / NOTE_LINE))

  return (
    <View style={s.week}>
      <View style={s.weekHead}>
        <Text style={s.weekTitle}>
          {format(week.first, 'MMMM do')} – {format(week.last, 'MMMM do')}
        </Text>
      </View>
      <View style={s.grid}>
        <View style={s.row}>
          {days.map((day, i) => {
            const { a } = schoolOf(day)
            return (
              <View
                key={iso(day)}
                style={[
                  s.dayHead,
                  { backgroundColor: a?.kind === 'off' ? '#cbd5e1' : '#f1f5f9' },
                  i === days.length - 1 ? { borderRightWidth: 0 } : {},
                ]}
              >
                <Text style={s.dayName}>{format(day, 'EEE').toUpperCase()}</Text>
                <Text style={s.dayDate}>{format(day, 'd')}</Text>
              </View>
            )
          })}
        </View>
        <View style={[s.row, { height: SCHOOL_ROW_HEIGHT }]}>
          {days.map((day, i) => {
            const { a, school } = schoolOf(day)
            return (
              <View
                key={iso(day)}
                style={[
                  s.schoolCell,
                  school
                    ? { backgroundColor: tint(school.color, 0.19), borderBottomWidth: 2, borderBottomColor: school.color }
                    : { backgroundColor: a?.kind === 'off' ? '#e2e8f0' : '#ffffff' },
                  i === days.length - 1 ? { borderRightWidth: 0 } : {},
                ]}
              >
                <Text style={school ? { fontSize: 8, fontWeight: 'bold', color: shade(school.color), textAlign: 'center' } : s.specialText}>
                  {school?.name ?? (a?.kind === 'off' ? (a.dayType ?? 'Day off') : ' ')}
                </Text>
                {a?.note ? (
                  <Text style={{ fontSize: 6.5, color: soft, textAlign: 'center', marginTop: 1, maxLines: 1, textOverflow: 'ellipsis' }}>
                    {a.note}
                  </Text>
                ) : null}
              </View>
            )
          })}
        </View>
        {rows.map((slot, r) => (
          <View key={String(slot)} style={[s.row, { height: heightOf(slot) }, r === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
            {days.map((day, i) => {
              const { a, school } = schoolOf(day)
              const p = d.periods.get(`${iso(day)}:${slot}`)
              const bg = school
                ? tint(school.color, slot === 'lunch' ? 0.06 : 0.125)
                : a?.kind === 'off'
                  ? r % 2 === 0
                    ? '#f1f5f9'
                    : '#e2e8f0'
                  : '#ffffff'
              const note = p && d.includeNotes ? p.summary || (p.lessonPlanId ? (d.plans.get(p.lessonPlanId)?.title ?? '') : '') : ''
              return (
                <View key={iso(day)} style={[s.cell, { backgroundColor: bg }, i === days.length - 1 ? { borderRightWidth: 0 } : {}]}>
                  {p?.kind === 'class' && p.year && p.classNumber ? (
                    <Text style={s.classText}>
                      {slot === 'lunch' ? 'Lunch ' : ''}
                      {p.year} - {p.classNumber}
                    </Text>
                  ) : p?.kind === 'special' ? (
                    <Text style={s.specialText}>{p.specialType ?? 'Other'}</Text>
                  ) : slot === 'lunch' ? (
                    <Text style={{ fontSize: 7, color: faint }}>{p ? 'Lunch' : ' '}</Text>
                  ) : null}
                  {note ? <Text style={[s.note, { maxLines: noteLines(slot), textOverflow: 'ellipsis' }]}>{note}</Text> : null}
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

function WeekPages({ d }: { d: ReportData }) {
  const pairs: TallyWeek[][] = []
  for (let i = 0; i < d.weeks.length; i += 2) pairs.push(d.weeks.slice(i, i + 2))
  return (
    <>
      {pairs.map((pair) => (
        // wrap={false}: a week page never continues onto another page; anything that
        // doesn't fit is cut off (cells are sized to fit, with notes ending in "…").
        <Page key={iso(pair[0].start)} size="A4" orientation="landscape" style={[s.page, { fontFamily: d.font }]} wrap={false}>
          <View style={s.runningHead}>
            <Text>SCHEDULE RECORD</Text>
            <Text>{format(pair[0].first, 'MMMM yyyy').toUpperCase()}</Text>
          </View>
          <View style={s.weeksRow}>
            {pair.map((w) => (
              <WeekSchedule key={iso(w.start)} d={d} week={w} />
            ))}
          </View>
          <Footer label={d.author || 'ALT Dashboard'} />
        </Page>
      ))}
    </>
  )
}

function TallyPage({ d }: { d: ReportData }) {
  const { groups, rows, totals } = d.tally
  const edge = (i: number, n: number) => (i === n - 1 ? { borderRightWidth: 2, borderColor: strong } : {})
  return (
    <Page size="A4" orientation="landscape" style={[s.page, { fontFamily: d.font }]}>
      <Text style={s.sectionTitle}>Class Stats Summary</Text>
      {!groups.length ? (
        <Text style={{ color: soft }}>No classes were taught in these weeks.</Text>
      ) : (
        <View style={{ borderWidth: 2, borderColor: strong }}>
          <View style={[s.tHead, { borderBottomWidth: 2, borderColor: strong }]}>
            <View style={[s.tWeek, { paddingVertical: 5 }]}>
              <Text style={{ fontWeight: 'bold' }}>School</Text>
            </View>
            {groups.map(({ school, classes }) => (
              <View
                key={school.id}
                style={{
                  flex: classes.length,
                  paddingVertical: 5,
                  paddingHorizontal: 2,
                  alignItems: 'center',
                  backgroundColor: tint(school.color, 0.2),
                  borderRightWidth: 2,
                  borderColor: strong,
                }}
              >
                <Text style={{ fontWeight: 'bold', color: shade(school.color), textAlign: 'center' }}>{school.name}</Text>
              </View>
            ))}
          </View>
          <View style={[s.tHead, { borderBottomWidth: 2, borderColor: strong }]}>
            <View style={[s.tWeek, { paddingVertical: 4 }]}>
              <Text style={{ fontSize: 7.5, color: soft }}>Week / Class</Text>
            </View>
            {groups.map(({ school, classes }) =>
              classes.map((c, i) => (
                <View key={`${school.id}-${c}`} style={[s.tCell, { backgroundColor: tint(school.color, 0.1) }, edge(i, classes.length)]}>
                  <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{c}</Text>
                </View>
              )),
            )}
          </View>
          {rows.map(({ week, counts }) => (
            <View key={iso(week.start)} style={[s.tHead, { borderBottomWidth: 1, borderColor: '#cbd5e1', minHeight: 18 }]} wrap={false}>
              <View style={s.tWeek}>
                <Text style={{ fontSize: 8, color: soft }}>
                  {format(week.first, 'MMM d')} – {format(week.last, 'MMM d')}
                </Text>
              </View>
              {groups.map(({ school, classes }) =>
                classes.map((c, i) => {
                  const n = counts.get(tallyKey(school.id, c)) ?? 0
                  return (
                    <View
                      key={`${school.id}-${c}`}
                      style={[s.tCell, { backgroundColor: tint(school.color, n ? 0.2 : 0.06) }, edge(i, classes.length)]}
                    >
                      <Text style={n ? { fontSize: 8.5, fontWeight: 'bold' } : { fontSize: 8, color: '#cbd5e1' }}>{n || '–'}</Text>
                    </View>
                  )
                }),
              )}
            </View>
          ))}
          <View style={[s.tHead, { borderTopWidth: 1, borderColor: strong, minHeight: 22 }]} wrap={false}>
            <View style={s.tWeek}>
              <Text style={{ fontWeight: 'bold' }}>TOTAL</Text>
            </View>
            {groups.map(({ school, classes }) =>
              classes.map((c, i) => (
                <View key={`${school.id}-${c}`} style={[s.tCell, { backgroundColor: tint(school.color, 0.3) }, edge(i, classes.length)]}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{totals.get(tallyKey(school.id, c)) ?? 0}</Text>
                </View>
              )),
            )}
          </View>
        </View>
      )}
      <Footer label={d.author || 'ALT Dashboard'} />
    </Page>
  )
}

export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document title={`Weekly Schedule Record, ${range(data)}`} author={data.author} creator="ALT Dashboard">
      <TitlePage d={data} />
      <StaffPage d={data} />
      <WeekPages d={data} />
      <TallyPage d={data} />
    </Document>
  )
}
