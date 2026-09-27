import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import type { DayAssignment, LessonPlan, Period, School } from '@/data/schema'
import { classLabel, fromIso, iso, slotLabel } from '../model'
import { classesByYear, type Tally } from '../tally'

export interface ReportWeek {
  start: Date
  days: Date[]
}

export interface ReportData {
  title: string
  author: string
  from: string
  to: string
  generatedAt: Date
  tally: Tally
  weeks: ReportWeek[]
  days: Map<string, DayAssignment>
  periods: Map<string, Period>
  schools: Map<string, School>
  plans: Map<string, LessonPlan>
  includeNotes: boolean
  /** Font family to use (a Japanese-capable one when needed). */
  font: string
  /** Where each tracked class is in each curriculum. */
  curricula: { name: string; rows: { label: string; color: string; done: number; total: number; next: string | null }[] }[]
}

const ink = '#1e2233'
const soft = '#545b73'
const faint = '#8a90a6'
const line = '#e2e5ee'

const tint = (hex: string, amount = 0.12) => {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c * amount + 255 * (1 - amount))
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 40, paddingHorizontal: 34, fontSize: 9, color: ink },
  header: {
    position: 'absolute',
    top: 14,
    left: 34,
    right: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: faint,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: faint,
  },
  h1: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  h2: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  muted: { color: soft },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  stat: { flex: 1, borderWidth: 1, borderColor: line, borderRadius: 6, padding: 8 },
  statLabel: { fontSize: 7, color: faint, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  schoolBlock: { borderWidth: 1, borderColor: line, borderRadius: 6, marginBottom: 10 },
  schoolHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3 },
  chip: {
    borderWidth: 1,
    borderColor: line,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    marginRight: 4,
    marginBottom: 2,
    flexDirection: 'row',
  },
  cols: { flexDirection: 'row', gap: 14 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderColor: line, paddingVertical: 2 },
  grid: { flexDirection: 'row', borderWidth: 1, borderColor: line, borderRadius: 6, flexGrow: 1 },
  slotCol: { width: 34, borderRightWidth: 1, borderColor: line },
  dayCol: { flex: 1, borderRightWidth: 1, borderColor: line },
  dayHead: { height: 40, padding: 4, borderBottomWidth: 1, borderColor: line },
  cell: { flex: 1, padding: 3, borderBottomWidth: 0.5, borderColor: line, overflow: 'hidden' },
})

function Chrome({ d }: { d: ReportData }) {
  return (
    <>
      <View style={s.header} fixed>
        <Text>{d.title}</Text>
        <Text>{d.author}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>Generated {format(d.generatedAt, 'd MMM yyyy, HH:mm')} · ALT Dashboard</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  )
}

function SummaryPage({ d }: { d: ReportData }) {
  const t = d.tally
  const range = `${format(fromIso(d.from), 'd MMMM yyyy')} – ${format(fromIso(d.to), 'd MMMM yyyy')}`
  const activities = [...t.activities].sort((a, b) => b[1] - a[1])
  const dayTypes = [...t.dayTypes].sort((a, b) => b[1] - a[1])
  return (
    <Page size="A4" orientation="landscape" style={[s.page, { fontFamily: d.font }]}>
      <Chrome d={d} />
      <Text style={s.h1}>{d.title}</Text>
      <Text style={s.muted}>
        {d.author ? `${d.author} · ` : ''}
        {range}
      </Text>

      <View style={s.stats}>
        {[
          ['Lessons', t.totalLessons],
          ['School days', t.schools.reduce((n, x) => n + x.days, 0)],
          ['Schools', t.schools.length],
          ['Lunches', t.schools.reduce((n, x) => n + x.lunches, 0)],
          ['Other activities', activities.reduce((n, [, v]) => n + v, 0)],
        ].map(([label, value]) => (
          <View key={label} style={s.stat}>
            <Text style={s.statLabel}>{label}</Text>
            <Text style={s.statValue}>{String(value)}</Text>
          </View>
        ))}
      </View>

      <View style={s.cols}>
        <View style={{ flex: 2 }}>
          <Text style={s.h2}>Lessons by class</Text>
          {t.schools.map((st) => (
            <View key={st.school.id} style={s.schoolBlock} wrap={false}>
              <View style={[s.schoolHead, { backgroundColor: tint(st.school.color) }]}>
                <View style={[s.dot, { backgroundColor: st.school.color }]} />
                <Text style={{ fontWeight: 'bold' }}>{st.school.name}</Text>
                <Text style={[s.muted, { marginLeft: 8 }]}>
                  {st.lessons} lesson{st.lessons === 1 ? '' : 's'} · {st.days} day{st.days === 1 ? '' : 's'}
                  {st.lunches ? ` · ${st.lunches} lunch${st.lunches === 1 ? '' : 'es'}` : ''}
                </Text>
              </View>
              {classesByYear(st).map(([year, list]) => (
                <View key={year} style={s.row}>
                  <Text style={{ width: 40, color: soft, fontWeight: 'bold' }}>Year {year}</Text>
                  {list.map((c) => (
                    <View key={c.classNumber} style={s.chip}>
                      <Text style={{ color: st.school.color, fontWeight: 'bold' }}>
                        {year}-{c.classNumber}
                      </Text>
                      <Text style={{ marginLeft: 3 }}>{c.count}</Text>
                    </View>
                  ))}
                  <Text style={{ color: faint, marginLeft: 2 }}>= {list.reduce((n, c) => n + c.count, 0)}</Text>
                </View>
              ))}
              {st.byJte.size > 0 && (
                <View style={[s.row, { borderTopWidth: 0.5, borderColor: line }]}>
                  <Text style={{ width: 40, color: soft, fontWeight: 'bold' }}>JTEs</Text>
                  <Text style={s.muted}>{[...st.byJte].map(([name, n]) => `${name}: ${n}`).join('   ·   ')}</Text>
                </View>
              )}
            </View>
          ))}
          {t.unassignedLessons > 0 && (
            <Text style={[s.muted, { fontSize: 8 }]}>{t.unassignedLessons} lessons on days without a school are not included.</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          {activities.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={s.h2}>Other activities</Text>
              {activities.map(([k, v]) => (
                <View key={k} style={s.listRow}>
                  <Text style={s.muted}>{k}</Text>
                  <Text style={{ fontWeight: 'bold' }}>{v}</Text>
                </View>
              ))}
            </View>
          )}
          {d.curricula.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={s.h2}>Curriculum progress</Text>
              {d.curricula.map((c) => (
                <View key={c.name} style={{ marginBottom: 6 }} wrap={false}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>{c.name}</Text>
                  {c.rows.map((r) => (
                    <View key={r.label} style={s.listRow}>
                      <Text style={{ width: 70, color: r.color, fontWeight: 'bold' }}>{r.label}</Text>
                      <Text style={{ flex: 1, color: soft, fontSize: 7.5 }}>{r.next ? `Next: ${r.next}` : 'Finished'}</Text>
                      <Text style={{ fontWeight: 'bold' }}>
                        {r.done}/{r.total}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
          {dayTypes.length > 0 && (
            <View>
              <Text style={s.h2}>Days off & events</Text>
              {dayTypes.map(([k, v]) => (
                <View key={k} style={s.listRow}>
                  <Text style={s.muted}>{k}</Text>
                  <Text style={{ fontWeight: 'bold' }}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Page>
  )
}

function WeekPage({ d, week }: { d: ReportData; week: ReportWeek }) {
  const maxSlot = Math.max(
    6,
    ...week.days.flatMap((day) =>
      [...d.periods.values()].filter((p) => p.date === iso(day) && typeof p.slot === 'number').map((p) => p.slot as number),
    ),
  )
  const rows = [...Array.from({ length: maxSlot }, (_, i) => i + 1), 'lunch' as const]
  return (
    <Page size="A4" orientation="landscape" style={[s.page, { fontFamily: d.font }]}>
      <Chrome d={d} />
      <Text style={[s.h2, { fontSize: 13 }]}>Week of {format(week.start, 'd MMMM yyyy')}</Text>
      <View style={s.grid}>
        <View style={s.slotCol}>
          <View style={s.dayHead} />
          {rows.map((r) => (
            <View key={String(r)} style={[s.cell, { justifyContent: 'center', flex: r === 'lunch' ? 0.6 : 1 }]}>
              <Text style={{ color: faint, fontSize: 7.5, fontWeight: 'bold' }}>{slotLabel(r, true)}</Text>
            </View>
          ))}
        </View>
        {week.days.map((day, i) => {
          const k = iso(day)
          const a = d.days.get(k)
          const school = a?.schoolId ? d.schools.get(a.schoolId) : undefined
          return (
            <View key={k} style={[s.dayCol, i === week.days.length - 1 ? { borderRightWidth: 0 } : {}]}>
              <View style={[s.dayHead, school ? { backgroundColor: tint(school.color) } : {}]}>
                <Text style={{ fontWeight: 'bold' }}>{format(day, 'EEE d MMM')}</Text>
                <Text style={{ color: school?.color ?? soft, fontSize: 8, marginTop: 1 }}>
                  {school?.name ?? (a?.kind === 'off' ? a.dayType : '')}
                </Text>
                {a?.note ? <Text style={{ color: faint, fontSize: 6.5 }}>{a.note}</Text> : null}
              </View>
              {rows.map((r) => {
                const p = d.periods.get(`${k}:${r}`)
                const detail = p ? (p.lessonPlanId ? d.plans.get(p.lessonPlanId)?.title : '') || p.summary : ''
                return (
                  <View key={String(r)} style={[s.cell, { flex: r === 'lunch' ? 0.6 : 1 }]}>
                    {p?.kind === 'class' ? (
                      <Text style={{ fontWeight: 'bold', fontSize: 10, color: school?.color ?? ink }}>{classLabel(p)}</Text>
                    ) : p ? (
                      <Text style={{ fontSize: 7.5, color: soft, fontWeight: 'bold' }}>{p.specialType}</Text>
                    ) : null}
                    {d.includeNotes && detail ? (
                      <Text style={{ fontSize: 6.5, color: soft, marginTop: 1 }}>
                        {detail.length > 90 ? `${detail.slice(0, 88)}…` : detail}
                      </Text>
                    ) : null}
                  </View>
                )
              })}
            </View>
          )
        })}
      </View>
    </Page>
  )
}

export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Document title={data.title} author={data.author} creator="ALT Dashboard">
      <SummaryPage d={data} />
      {data.weeks.map((w) => (
        <WeekPage key={iso(w.start)} d={data} week={w} />
      ))}
    </Document>
  )
}
