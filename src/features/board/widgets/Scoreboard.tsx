import { useEffect, useRef } from 'react'
import { Minus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button, IconButton, Input } from '@/components/ui'
import type { WidgetProps } from '../types'
import type { ScoreboardConfig, Team } from './configs'
import { ColorPicker, Segmented, Setting, SettingsView } from './controls'
import { VIVID } from './palette'

const ROW = 46

export default function Scoreboard({ config, update, settings, closeSettings, height, requestResize }: WidgetProps<ScoreboardConfig>) {
  const teams = config.teams
  const count = useRef(teams.length)

  // Grow the frame when a team is added so every row stays visible.
  useEffect(() => {
    if (teams.length > count.current) {
      const need = 64 + teams.length * ROW
      if (need > height) requestResize({ height: need })
    }
    count.current = teams.length
  }, [teams.length, height, requestResize])

  const setTeam = (id: string, changes: Partial<Team>) => update({ teams: teams.map((t) => (t.id === id ? { ...t, ...changes } : t)) })
  const addTeam = () =>
    update({
      teams: [...teams, { id: `t${Date.now()}`, name: `Team ${teams.length + 1}`, color: VIVID[teams.length % VIVID.length], score: 0 }],
    })

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Teams">
          <ul className="space-y-3">
            {teams.map((t, i) => (
              <li key={t.id} className="space-y-1.5 rounded-xl border border-line p-2">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Team ${i + 1} name`}
                    value={t.name}
                    onChange={(e) => setTeam(t.id, { name: e.target.value })}
                    className="h-9"
                  />
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    label={`Remove ${t.name}`}
                    disabled={teams.length <= 2}
                    onClick={() => update({ teams: teams.filter((x) => x.id !== t.id) })}
                  />
                </div>
                <ColorPicker label={`${t.name} colour`} colors={VIVID} value={t.color} onChange={(color) => setTeam(t.id, { color })} />
              </li>
            ))}
          </ul>
          {teams.length < 8 && (
            <Button size="sm" icon={Plus} onClick={addTeam} className="mt-2">
              Add team
            </Button>
          )}
        </Setting>
        <Setting label="Points per click">
          <Segmented
            label="Points per click"
            value={config.step}
            options={[1, 5, 10, 25, 100].map((n) => ({ value: n, label: String(n) }))}
            onChange={(step) => update({ step })}
          />
        </Setting>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={config.bars}
            onChange={(e) => update({ bars: e.target.checked })}
            className="size-4 accent-accent"
          />
          Show score bars
        </label>
        <Button size="sm" icon={RotateCcw} onClick={() => update({ teams: teams.map((t) => ({ ...t, score: 0 })) })}>
          Reset all scores
        </Button>
      </SettingsView>
    )

  const max = Math.max(1, ...teams.map((t) => t.score))
  const lead = Math.max(...teams.map((t) => t.score))
  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto p-2.5">
      {teams.map((t) => (
        <div key={t.id} className="relative flex min-h-10 flex-1 items-center gap-2 overflow-hidden rounded-xl bg-canvas px-2">
          {config.bars && (
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-300"
              style={{ width: `${(Math.max(0, t.score) / max) * 100}%`, backgroundColor: t.color, opacity: 0.18 }}
              aria-hidden
            />
          )}
          <span className="relative size-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />
          <span className="relative min-w-0 flex-1 truncate text-sm font-semibold">
            {t.name}
            {lead > 0 && t.score === lead && <span aria-label="leading"> 👑</span>}
          </span>
          <button
            type="button"
            aria-label={`Take ${config.step} from ${t.name}`}
            onClick={() => setTeam(t.id, { score: t.score - config.step })}
            className="relative grid size-8 place-items-center rounded-lg bg-surface shadow-xs hover:bg-white active:scale-95"
          >
            <Minus size={15} aria-hidden />
          </button>
          <output className="relative min-w-10 text-center text-xl font-bold tabular-nums" aria-label={`${t.name} score`}>
            {t.score}
          </output>
          <button
            type="button"
            aria-label={`Give ${config.step} to ${t.name}`}
            onClick={() => setTeam(t.id, { score: t.score + config.step })}
            className="relative grid size-8 place-items-center rounded-lg text-white shadow-xs active:scale-95"
            style={{ backgroundColor: t.color }}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
