import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { QrSvg } from '@/components/QrSvg'
import { Button, Input } from '@/components/ui'
import type { WidgetProps } from '../types'
import type { QrConfig } from './configs'
import { ColorPicker, Setting, SettingsView, WidgetEmpty } from './controls'

export default function QrCode({ config, update, settings, closeSettings, width, height }: WidgetProps<QrConfig>) {
  const [copied, setCopied] = useState(false)

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Link">
          <Input
            aria-label="Link"
            type="url"
            placeholder="https://…"
            value={config.url}
            onChange={(e) => update({ url: e.target.value.trim() })}
            className="h-9"
          />
        </Setting>
        <Setting label="Caption">
          <Input
            aria-label="Caption"
            placeholder="Optional"
            value={config.caption}
            onChange={(e) => update({ caption: e.target.value })}
            className="h-9"
          />
        </Setting>
        <Setting label="Colour">
          <ColorPicker
            label="QR colour"
            colors={['#111827', '#1e3a8a', '#4f46e5', '#047857', '#b91c1c', '#7c2d12']}
            value={config.color}
            onChange={(color) => update({ color })}
          />
        </Setting>
      </SettingsView>
    )

  if (!config.url) return <WidgetEmpty>Add a link in this widget’s settings to show its QR code.</WidgetEmpty>

  const size = Math.max(80, Math.min(width - 24, height - (config.caption ? 84 : 60)))
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(config.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2">
      <QrSvg text={config.url} color={config.color} size={size} />
      {config.caption && <p className="max-w-full truncate text-base font-bold">{config.caption}</p>}
      <div className="flex max-w-full items-center gap-1">
        <a
          href={config.url}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-1 truncate text-xs text-ink-soft hover:text-accent"
        >
          <span className="truncate">{config.url.replace(/^https?:\/\//, '')}</span>
          <ExternalLink size={12} aria-hidden className="shrink-0" />
        </a>
        <Button
          size="sm"
          variant="ghost"
          icon={copied ? Check : Copy}
          onClick={() => void copy()}
          aria-label="Copy link"
          className="h-7 px-2"
        />
      </div>
    </div>
  )
}
