import { useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { Switch, Textarea } from '@/components/ui'
import type { WidgetProps } from '../types'
import type { TextConfig } from './configs'
import { ColorPicker, Segmented, Setting, SettingsView, Stepper } from './controls'

const BACKGROUNDS = ['#ffffff', '#fef9c3', '#dcfce7', '#dbeafe', '#fce7f3', '#ede9fe', '#111827', '#1e3a8a']

export default function Text({ config, update, settings, closeSettings, locked }: WidgetProps<TextConfig>) {
  const [editing, setEditing] = useState(false)

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Text">
          <Textarea aria-label="Text" value={config.text} onChange={(e) => update({ text: e.target.value })} />
        </Setting>
        <Setting label="Font size">
          <Stepper label="Font size" value={config.fontSize} min={16} max={120} step={4} onChange={(fontSize) => update({ fontSize })} />
        </Setting>
        <Setting label="Alignment">
          <Segmented
            label="Alignment"
            value={config.align}
            options={[
              { value: 'left', label: <AlignLeft size={15} aria-label="Left" /> },
              { value: 'center', label: <AlignCenter size={15} aria-label="Centre" /> },
              { value: 'right', label: <AlignRight size={15} aria-label="Right" /> },
            ]}
            onChange={(align) => update({ align })}
          />
        </Setting>
        <Switch label="Bold" checked={config.bold} onChange={(bold) => update({ bold })} />
        <Setting label="Text colour">
          <ColorPicker label="Text colour" value={config.color} onChange={(color) => update({ color })} />
        </Setting>
        <Setting label="Background">
          <ColorPicker
            label="Background colour"
            colors={BACKGROUNDS}
            value={config.background}
            onChange={(background) => update({ background })}
          />
        </Setting>
      </SettingsView>
    )

  const style = {
    fontSize: config.fontSize,
    color: config.color,
    backgroundColor: config.background,
    fontWeight: config.bold ? 700 : 400,
    textAlign: config.align,
  } as const

  if (editing)
    return (
      <textarea
        aria-label="Text"
        autoFocus
        value={config.text}
        onChange={(e) => update({ text: e.target.value })}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        className="size-full resize-none p-3 leading-tight outline-none"
        style={style}
      />
    )

  return (
    <div
      className="flex size-full items-center overflow-auto p-3 leading-tight break-words whitespace-pre-wrap"
      style={style}
      onDoubleClick={() => !locked && setEditing(true)}
      title={locked ? undefined : 'Double-click to edit'}
    >
      <div className="w-full">{config.text}</div>
    </div>
  )
}
