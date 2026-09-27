import { emptyDraft, type PollDraft } from '@/features/polls/session'
import type { ResultView } from '@/features/polls/model'
import { emptySource, type NameSource } from '../rosters'

/*
 * Saved settings for each widget, with defaults. Everything a teacher sets
 * (and the state worth keeping, such as scores or a running timer) lives in
 * `widget.config`, so it survives reloads and workspace switches.
 */

export interface TimerConfig {
  /** Length in seconds. */
  duration: number
  color: string
  alarm: boolean
  /** Epoch ms when a running timer ends; null when paused/stopped. */
  endsAt: number | null
  /** Seconds left while paused. */
  remaining: number
}
export const timerDefaults: TimerConfig = { duration: 300, color: '#4f46e5', alarm: true, endsAt: null, remaining: 300 }

export interface StopwatchConfig {
  showMs: boolean
  /** Epoch ms of the current run's start; null when stopped. */
  startedAt: number | null
  /** Milliseconds accumulated before the current run. */
  elapsed: number
  /** Lap split times in ms (oldest first). */
  laps: number[]
}
export const stopwatchDefaults: StopwatchConfig = { showMs: true, startedAt: null, elapsed: 0, laps: [] }

export interface ClockConfig {
  analog: boolean
  hour24: boolean
  seconds: boolean
  date: boolean
}
export const clockDefaults: ClockConfig = { analog: false, hour24: false, seconds: true, date: true }

export interface RandomNameConfig {
  source: NameSource
  removeAfterPick: boolean
  /** Names already picked (skipped while removeAfterPick is on). */
  picked: string[]
  history: string[]
}
export const randomNameDefaults: RandomNameConfig = { source: emptySource(), removeAfterPick: false, picked: [], history: [] }

export type GroupNaming = 'numbers' | 'colours' | 'animals'
export interface GroupMakerConfig {
  source: NameSource
  groupCount: number
  naming: GroupNaming
  groups: string[][]
}
export const groupMakerDefaults: GroupMakerConfig = { source: emptySource(), groupCount: 4, naming: 'numbers', groups: [] }

export interface Team {
  id: string
  name: string
  color: string
  score: number
}
export interface ScoreboardConfig {
  teams: Team[]
  step: number
  bars: boolean
}
export const scoreboardDefaults: ScoreboardConfig = {
  teams: [
    { id: 't1', name: 'Team 1', color: '#ef4444', score: 0 },
    { id: 't2', name: 'Team 2', color: '#3b82f6', score: 0 },
  ],
  step: 1,
  bars: true,
}

export interface DiceConfig {
  count: number
  sides: number
}
export const diceDefaults: DiceConfig = { count: 1, sides: 6 }

export interface SpinnerConfig {
  source: NameSource
  removeAfterSpin: boolean
  removed: string[]
  /** Wheel angle in degrees (kept so the wheel doesn't jump on reload). */
  angle: number
  result: string | null
}
export const spinnerDefaults: SpinnerConfig = {
  source: { rosterId: null, names: 'Red\nBlue\nGreen\nYellow\nPurple\nOrange' },
  removeAfterSpin: false,
  removed: [],
  angle: 0,
  result: null,
}

export interface TextConfig {
  text: string
  fontSize: number
  color: string
  background: string
  bold: boolean
  align: 'left' | 'center' | 'right'
}
export const textDefaults: TextConfig = {
  text: 'Double-click to edit',
  fontSize: 36,
  color: '#111827',
  background: '#ffffff',
  bold: true,
  align: 'center',
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}
export interface ChecklistConfig {
  title: string
  items: ChecklistItem[]
}
export const checklistDefaults: ChecklistConfig = {
  title: 'Today',
  items: [
    { id: 'i1', text: 'Greetings', done: false },
    { id: 'i2', text: 'Warm-up game', done: false },
    { id: 'i3', text: 'Main activity', done: false },
    { id: 'i4', text: 'Review', done: false },
  ],
}

export type Light = 'red' | 'yellow' | 'green'
export interface TrafficLightConfig {
  active: Light | null
  showLabels: boolean
  labels: Record<Light, string>
}
export const trafficLightDefaults: TrafficLightConfig = {
  active: null,
  showLabels: true,
  labels: { red: 'Stop', yellow: 'Get ready', green: 'Go' },
}

export interface UpcomingConfig {
  count: number
  showSummary: boolean
  includeSpecial: boolean
}
export const upcomingDefaults: UpcomingConfig = { count: 5, showSummary: true, includeSpecial: false }

export interface SoundLevelConfig {
  sensitivity: number
  threshold: number
  style: 'bar' | 'emoji'
}
export const soundLevelDefaults: SoundLevelConfig = { sensitivity: 1.5, threshold: 70, style: 'bar' }

export interface Stroke {
  color: string
  size: number
  erase: boolean
  /** Flat [x, y, x, y, …] in board px. */
  points: number[]
}
export interface DrawingConfig {
  color: string
  size: number
  white: boolean
  strokes: Stroke[]
}
export const drawingDefaults: DrawingConfig = { color: '#111827', size: 6, white: false, strokes: [] }

export interface QrConfig {
  url: string
  color: string
  caption: string
}
export const qrDefaults: QrConfig = { url: '', color: '#111827', caption: '' }

export interface PollConfig {
  /** Room code kept with the widget, so the same code works after a reload. */
  room: string | null
  draft: PollDraft
  view: ResultView | null
}
export const pollDefaults: PollConfig = { room: null, draft: emptyDraft(), view: null }
