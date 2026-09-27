import { describe, expect, it } from 'vitest'
import type { School, Widget } from '@/data/schema'
import { BACKGROUNDS, dailyWallpaperIndex, resolveBackground } from './backgrounds'
import { createWidget, placeOnBoard, sanitizeWidgets, snap, WIDGET_META } from './model'
import { WIDGETS, widgetConfig } from './registry'
import { makeGroups, matchClassKey, numberedStudents, sourceNames, splitLines } from './rosters'
import { parseLink, formatClock, formatStopwatch } from './widgets/format'
import { segmentAt } from './widgets/wheel'

const board = { width: 1366, height: 820 }
const w = (over: Partial<Widget>): Widget => ({
  id: 'w',
  type: 'Timer',
  x: 0,
  y: 0,
  width: 220,
  height: 236,
  z: 1,
  locked: false,
  config: {},
  ...over,
})

describe('widget registry', () => {
  it('has all 15 board widgets with metadata and defaults', () => {
    expect(WIDGET_META).toHaveLength(15)
    for (const m of WIDGET_META) expect(WIDGETS.get(m.type)?.defaults).toBeTypeOf('object')
  })

  it('merges saved config over defaults', () => {
    expect(widgetConfig('Timer', { duration: 60 })).toMatchObject({ duration: 60, alarm: true, color: '#4f46e5' })
  })
})

describe('layout', () => {
  it('cascades new widgets like the old dashboard', () => {
    const a = createWidget('Timer', [], board)
    const b = createWidget('Timer', [a], board)
    expect([a.x, a.y]).toEqual([60, 80])
    expect([b.x, b.y]).toEqual([105, 125])
    expect(b.z).toBe(a.z + 1)
  })

  it('opens Drawing over the whole board', () => {
    expect(createWidget('Drawing', [], board)).toMatchObject({ x: 0, y: 0, width: 1366, height: 820 })
  })

  it('snaps to the grid only when on', () => {
    expect(snap(47, true)).toBe(40)
    expect(snap(47, false)).toBe(47)
  })

  it('clamps sizes but keeps unknown widget types', () => {
    const out = sanitizeWidgets([w({ width: 10, height: 10 }), w({ id: 'p', type: 'Poll' })])
    expect(out[0]).toMatchObject({ width: 160, height: 172 })
    expect(out[1].type).toBe('Poll')
  })

  it('pulls widgets saved on a bigger screen back onto the board', () => {
    const r = placeOnBoard(w({ x: 1800, y: 1000 }), { width: 800, height: 600 })
    expect(r.x).toBeLessThanOrEqual(800 - 120)
    expect(r.y).toBeLessThanOrEqual(600 - 60)
  })
})

describe('backgrounds', () => {
  it('has 4 gradients and 24 wallpapers, indexed like the old app', () => {
    expect(BACKGROUNDS).toHaveLength(28)
    expect(BACKGROUNDS[0].kind).toBe('gradient')
    expect(BACKGROUNDS[4].kind).toBe('image')
  })

  it('rotates wallpapers by day of the year', () => {
    const jan1 = new Date(2026, 0, 1)
    expect(dailyWallpaperIndex(jan1)).toBe(4 + 1)
    expect(resolveBackground(2, false, jan1).index).toBe(2)
    expect(resolveBackground(2, true, jan1).index).toBe(5)
  })
})

describe('rosters', () => {
  const school = {
    id: 's1',
    name: 'Hamada',
    archived: false,
    classes: [{ id: 'c', year: 5, classNumber: 1, jteId: null }],
  } as unknown as School

  it('reads names from a roster or typed lines', () => {
    const rosters = [{ id: 'r', students: ['Aki', 'Ben'] }] as never
    expect(sourceNames({ rosterId: 'r', names: '' }, rosters)).toEqual(['Aki', 'Ben'])
    expect(sourceNames({ rosterId: null, names: ' Aki \n\nBen\r\n' }, rosters)).toEqual(['Aki', 'Ben'])
    expect(splitLines('a\n b ')).toEqual(['a', 'b'])
    expect(numberedStudents(3)).toEqual(['1', '2', '3'])
  })

  it('links roster names to planner classes', () => {
    expect(matchClassKey('5-1', [school])).toBe('s1:5:1')
    expect(matchClassKey('Hamada 5年1組', [school])).toBe('s1:5:1')
    expect(matchClassKey('6-1', [school])).toBeNull()
    expect(matchClassKey('Blue team', [school])).toBeNull()
  })

  it('deals names into even groups', () => {
    const groups = makeGroups(['a', 'b', 'c', 'd', 'e'], 2)
    expect(groups.map((g) => g.length).sort()).toEqual([2, 3])
    expect(groups.flat().sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('widget helpers', () => {
  it('formats times', () => {
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatStopwatch(61_230, true)).toBe('1:01.23')
    expect(formatStopwatch(61_230, false)).toBe('1:01')
  })

  it('parses checklist links', () => {
    expect(parseLink('[Song](https://youtu.be/x)')).toEqual({ label: 'Song', url: 'https://youtu.be/x' })
    expect(parseLink('Just text')).toBeNull()
  })

  it('finds the spinner segment under the pointer', () => {
    expect(segmentAt(0, 4)).toBe(0)
    expect(segmentAt(10, 4)).toBe(3) // turned slightly clockwise: the last segment reaches the top
    expect(segmentAt(360 * 5 + 100, 4)).toBe(2)
  })
})
