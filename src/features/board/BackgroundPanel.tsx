import { Check } from 'lucide-react'
import { Switch } from '@/components/ui'
import type { Workspace } from '@/data/schema'
import { useSettings } from '@/data/settings'
import { cn } from '@/lib/cn'
import { setWorkspaceBackground } from './actions'
import { BACKGROUNDS, dailyWallpaperIndex } from './backgrounds'

export function BackgroundPanel({ workspace }: { workspace: Workspace }) {
  const { settings, setSetting } = useSettings()
  const shown = settings.rotateBackground ? dailyWallpaperIndex(new Date()) : workspace.background
  return (
    <div className="space-y-4">
      <Switch
        label="Rotate wallpaper daily"
        description="A different photo every day, on every workspace. Picking a background turns this off."
        checked={settings.rotateBackground}
        onChange={(v) => void setSetting('rotateBackground', v)}
      />
      <Switch
        label="Snap widgets to a grid"
        description="Widgets line up on a 20 px grid while you move and resize them."
        checked={settings.snapToGrid}
        onChange={(v) => void setSetting('snapToGrid', v)}
      />
      <div role="radiogroup" aria-label="Background" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {BACKGROUNDS.map((bg) => {
          const selected = bg.index === shown
          return (
            <button
              key={bg.index}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={bg.kind === 'gradient' ? `Gradient ${bg.index + 1}` : `Wallpaper ${bg.index - 3}`}
              onClick={() => {
                void setWorkspaceBackground(workspace.id, bg.index)
                if (settings.rotateBackground) void setSetting('rotateBackground', false)
              }}
              className={cn(
                'relative aspect-video overflow-hidden rounded-xl ring-offset-2 transition-transform hover:scale-[1.03]',
                selected ? 'ring-3 ring-accent' : 'ring-1 ring-black/10',
              )}
              style={{ background: bg.thumb }}
            >
              {selected && (
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-accent text-white">
                  <Check size={13} strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
