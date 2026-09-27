import { Gamepad2, Presentation } from 'lucide-react'
import { Button, ButtonLink, Card, CardHeader, Switch, useFeedback } from '@/components/ui'
import { useSettings } from '@/data/settings'
import { BACKGROUNDS, dailyWallpaperIndex } from '@/features/board/backgrounds'

/** Classroom board and games preferences. */
export function ClassroomSection() {
  const { settings, setSetting } = useSettings()
  const { toast } = useFeedback()
  const today = BACKGROUNDS[dailyWallpaperIndex(new Date())]
  return (
    <>
      <Card>
        <CardHeader
          icon={Presentation}
          title="Classroom board"
          description="Each workspace keeps its own background, chosen on the board."
          actions={
            <ButtonLink to="/board" size="sm">
              Open board
            </ButtonLink>
          }
        />
        <div className="space-y-4 px-5 pb-5">
          <div className="flex items-center gap-4">
            <span className="aspect-video w-28 shrink-0 rounded-xl ring-1 ring-black/10" style={{ background: today.thumb }} aria-hidden />
            <Switch
              label="Rotate wallpaper daily"
              description="Show a different photo every day on every workspace (today's is on the left)."
              checked={settings.rotateBackground}
              onChange={(v) => void setSetting('rotateBackground', v)}
            />
          </div>
          <Switch
            label="Snap widgets to a grid"
            description="Widgets line up on a 20 px grid while you move and resize them."
            checked={settings.snapToGrid}
            onChange={(v) => void setSetting('snapToGrid', v)}
          />
        </div>
      </Card>
      <Card>
        <CardHeader
          icon={Gamepad2}
          title="Games"
          description="Best streaks are kept on this device for each game."
          actions={
            <Button
              size="sm"
              onClick={() => {
                try {
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith('games:best:'))
                    .forEach((k) => localStorage.removeItem(k))
                } catch {
                  /* storage unavailable */
                }
                toast('Best streaks reset.')
              }}
            >
              Reset best streaks
            </Button>
          }
        />
      </Card>
    </>
  )
}
