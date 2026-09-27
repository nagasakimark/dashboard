import { Shuffle } from 'lucide-react'
import { Button } from '@/components/ui'
import { useBoardContext } from '../context'
import { makeGroups, sourceNames } from '../rosters'
import type { WidgetProps } from '../types'
import type { GroupMakerConfig, GroupNaming } from './configs'
import { NameSourcePicker, Segmented, Setting, SettingsView, Stepper, WidgetEmpty } from './controls'
import { VIVID, textOn } from './palette'

const COLOUR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Teal', 'Orange', 'Indigo', 'Lime']
const ANIMALS = ['Lions', 'Pandas', 'Dolphins', 'Eagles', 'Tigers', 'Koalas', 'Penguins', 'Foxes', 'Owls', 'Rabbits']

const groupName = (naming: GroupNaming, i: number) =>
  naming === 'colours' ? COLOUR_NAMES[i % 10] : naming === 'animals' ? ANIMALS[i % 10] : `Group ${i + 1}`

export default function GroupMaker({ config, update, settings, closeSettings }: WidgetProps<GroupMakerConfig>) {
  const { rosters, openSettings } = useBoardContext()
  const names = sourceNames(config.source, rosters)

  if (settings)
    return (
      <SettingsView onDone={closeSettings}>
        <Setting label="Names">
          <NameSourcePicker source={config.source} onChange={(source) => update({ source, groups: [] })} />
        </Setting>
        <Setting label="Number of groups">
          <Stepper label="Number of groups" value={config.groupCount} min={2} max={10} onChange={(groupCount) => update({ groupCount })} />
        </Setting>
        <Setting label="Group names">
          <Segmented
            label="Group names"
            value={config.naming}
            options={[
              { value: 'numbers', label: 'Numbers' },
              { value: 'colours', label: 'Colours' },
              { value: 'animals', label: 'Animals' },
            ]}
            onChange={(naming) => update({ naming })}
          />
        </Setting>
      </SettingsView>
    )

  if (!names.length)
    return (
      <WidgetEmpty
        action={
          <Button size="sm" onClick={() => openSettings('classes')}>
            Add a class
          </Button>
        }
      >
        Choose a class or type some names in this widget’s settings.
      </WidgetEmpty>
    )

  const shuffleNow = () => update({ groups: makeGroups(names, Math.min(config.groupCount, names.length)) })

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {config.groups.length ? (
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 overflow-y-auto">
          {config.groups.map((g, i) => {
            const bg = VIVID[i % VIVID.length]
            return (
              <section key={i} className="animate-pop-in overflow-hidden rounded-xl border border-black/5 bg-canvas">
                <h3 className="px-2.5 py-1 text-sm font-bold" style={{ backgroundColor: bg, color: textOn(bg) }}>
                  {groupName(config.naming, i)} <span className="font-medium opacity-80">· {g.length}</span>
                </h3>
                <ul className="px-2.5 py-1.5 text-sm leading-snug">
                  {g.map((n, j) => (
                    <li key={j}>{n}</li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <WidgetEmpty>
          {names.length} names into {Math.min(config.groupCount, names.length)} groups
        </WidgetEmpty>
      )}
      <div className="flex items-center justify-between gap-2">
        <Stepper label="Groups" value={config.groupCount} min={2} max={10} onChange={(groupCount) => update({ groupCount })} />
        <Button size="sm" variant="primary" icon={Shuffle} onClick={shuffleNow}>
          {config.groups.length ? 'Reshuffle' : 'Make groups'}
        </Button>
      </div>
    </div>
  )
}
