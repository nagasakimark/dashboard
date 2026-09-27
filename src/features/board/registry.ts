import {
  Clock as ClockIcon,
  Dices,
  Grid3x3,
  ListChecks,
  Mic,
  PenLine,
  QrCode as QrIcon,
  Shuffle,
  Timer as TimerIcon,
  TrafficCone,
  Trophy,
  Type,
  UsersRound,
  CalendarClock,
  Watch,
  Vote,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { META_BY_TYPE, WIDGET_META } from './model'
import type { AnyConfig, AnyWidgetDef, WidgetProps } from './types'
import * as C from './widgets/configs'
import Checklist from './widgets/Checklist'
import Clock from './widgets/Clock'
import Dice from './widgets/Dice'
import Drawing from './widgets/Drawing'
import GroupMaker from './widgets/GroupMaker'
import Poll from './widgets/Poll'
import QrCode from './widgets/QrCode'
import RandomName from './widgets/RandomName'
import Scoreboard from './widgets/Scoreboard'
import SoundLevel from './widgets/SoundLevel'
import Spinner from './widgets/Spinner'
import Stopwatch from './widgets/Stopwatch'
import Text from './widgets/Text'
import Timer from './widgets/Timer'
import TrafficLight from './widgets/TrafficLight'
import UpcomingLessons from './widgets/UpcomingLessons'

function def<Cfg>(
  type: string,
  icon: LucideIcon,
  defaults: Cfg,
  component: ComponentType<WidgetProps<Cfg>>,
  extra: { noSettings?: boolean } = {},
) {
  const meta = META_BY_TYPE.get(type)
  if (!meta) throw new Error(`No metadata for ${type}`)
  return { ...meta, icon, defaults, component, ...extra } as unknown as AnyWidgetDef
}

const defs: AnyWidgetDef[] = [
  def('Timer', TimerIcon, C.timerDefaults, Timer),
  def('Stopwatch', Watch, C.stopwatchDefaults, Stopwatch),
  def('Clock', ClockIcon, C.clockDefaults, Clock),
  def('Random Name', Shuffle, C.randomNameDefaults, RandomName),
  def('Group Maker', UsersRound, C.groupMakerDefaults, GroupMaker),
  def('Scoreboard', Trophy, C.scoreboardDefaults, Scoreboard),
  def('Poll', Vote, C.pollDefaults, Poll),
  def('Dice', Dices, C.diceDefaults, Dice),
  def('Spinner', LifeBuoy, C.spinnerDefaults, Spinner),
  def('Text', Type, C.textDefaults, Text),
  def('Checklist', ListChecks, C.checklistDefaults, Checklist),
  def('Traffic Light', TrafficCone, C.trafficLightDefaults, TrafficLight),
  def('Upcoming Lessons', CalendarClock, C.upcomingDefaults, UpcomingLessons),
  def('Sound Level', Mic, C.soundLevelDefaults, SoundLevel),
  def('Drawing', PenLine, C.drawingDefaults, Drawing, { noSettings: true }),
  def('QR Code', QrIcon, C.qrDefaults, QrCode),
]

export const WIDGETS = new Map(defs.map((d) => [d.type, d]))

/** Fallback icon for unknown widget types. */
export const UnknownIcon = Grid3x3

if (import.meta.env.DEV && defs.length !== WIDGET_META.length) console.warn('Widget registry and metadata are out of sync')

/** Saved config merged over the widget's defaults. */
export const widgetConfig = (type: string, config: AnyConfig): AnyConfig => ({ ...(WIDGETS.get(type)?.defaults ?? {}), ...config })
