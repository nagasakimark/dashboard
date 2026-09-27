import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { WidgetMeta } from './model'

export interface WidgetProps<C> {
  id: string
  /** Saved settings merged over the widget's defaults. */
  config: C
  /** Merge changes into the saved settings. */
  update: (changes: Partial<C>) => void
  /** Show the settings view instead of the widget. */
  settings: boolean
  closeSettings: () => void
  focused: boolean
  /** Frame size in px (the design size for scaled widgets). */
  width: number
  height: number
  /** Ask the frame to grow (e.g. Scoreboard when a team is added). */
  requestResize: (size: { width?: number; height?: number }) => void
  locked: boolean
  remove: () => void
}

export interface WidgetDef<C> extends WidgetMeta {
  icon: LucideIcon
  defaults: C
  component: ComponentType<WidgetProps<C>>
  /** Widget has no settings view. */
  noSettings?: boolean
}

export type AnyConfig = Record<string, unknown>
export type AnyWidgetDef = WidgetDef<AnyConfig>
