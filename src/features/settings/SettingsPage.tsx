import { format } from 'date-fns'
import { HardDriveDownload, Palette, Smartphone, UserRound } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button, Card, CardHeader, Field, Input, Select } from '@/components/ui'
import { useSettings } from '@/data/settings'
import { useInstallPrompt } from '@/app/useInstallPrompt'
import { cn } from '@/lib/cn'
import { useDraft } from '@/lib/useDraft'
import { DataSection } from './DataSection'

const ACCENTS = ['#4f46e5', '#2563eb', '#0891b2', '#059669', '#65a30d', '#d97706', '#dc2626', '#db2777', '#9333ea', '#475569']

const DATE_FORMATS = ['d MMM yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd', 'yyyy-MM-dd']

export default function SettingsPage() {
  const { settings, setSetting } = useSettings()
  const install = useInstallPrompt()
  const [name, setName, flushName] = useDraft(settings.profileName, (v) => setSetting('profileName', v))
  const sample = new Date(2026, 8, 27)

  return (
    <Page title="Settings" description="Personalise the dashboard and manage your data.">
      <div className="space-y-5">
        <Card>
          <CardHeader icon={UserRound} title="Profile" description="Used on reports and printed lesson plans." />
          <div className="px-5 pb-5">
            <Field label="Your name">
              {(id) => (
                <Input
                  id={id}
                  value={name}
                  placeholder="e.g. Alex Smith"
                  onChange={(e) => setName(e.target.value)}
                  onBlur={flushName}
                  autoComplete="name"
                />
              )}
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Palette} title="Appearance" />
          <div className="grid gap-5 px-5 pb-5 sm:grid-cols-2">
            <Field label="Accent colour" className="sm:col-span-2">
              {(id) => (
                <div id={id} role="radiogroup" aria-label="Accent colour" className="flex flex-wrap items-center gap-2">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={settings.accentColor === c}
                      aria-label={c}
                      onClick={() => setSetting('accentColor', c)}
                      className={cn(
                        'size-9 rounded-full ring-offset-2 transition-transform hover:scale-110',
                        settings.accentColor === c && 'ring-2 ring-ink',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-canvas">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSetting('accentColor', e.target.value)}
                      className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    />
                    Custom
                  </label>
                </div>
              )}
            </Field>
            <Field label="Date format">
              {(id) => (
                <Select id={id} value={settings.dateFormat} onChange={(e) => setSetting('dateFormat', e.target.value)}>
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {format(sample, f)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Week starts on">
              {(id) => (
                <Select id={id} value={settings.weekStartsOn} onChange={(e) => setSetting('weekStartsOn', Number(e.target.value) as 0 | 1)}>
                  <option value={1}>Monday</option>
                  <option value={0}>Sunday</option>
                </Select>
              )}
            </Field>
            <Field label="When the app opens, show" className="sm:col-span-2">
              {(id) => (
                <Select
                  id={id}
                  value={settings.startScreen}
                  onChange={(e) => setSetting('startScreen', e.target.value as typeof settings.startScreen)}
                >
                  <option value="home">Planner home</option>
                  <option value="board">Classroom board</option>
                  <option value="last">Whichever I used last</option>
                </Select>
              )}
            </Field>
          </div>
        </Card>

        <DataSection />

        <Card>
          <CardHeader
            icon={Smartphone}
            title="Install as an app"
            description={
              install.installed
                ? 'The dashboard is installed on this device and works offline.'
                : 'Install the dashboard for a full-screen app that works offline. On iPhone, use Share → Add to Home Screen.'
            }
            actions={
              install.canInstall && (
                <Button variant="primary" size="sm" icon={HardDriveDownload} onClick={install.install}>
                  Install
                </Button>
              )
            }
          />
        </Card>

        <p className="pt-2 pb-4 text-center text-xs text-ink-faint">
          ALT Dashboard {__APP_VERSION__} ·{' '}
          <a className="underline" href="https://github.com/nagasakimark/dashboard">
            source
          </a>
        </p>
      </div>
    </Page>
  )
}
