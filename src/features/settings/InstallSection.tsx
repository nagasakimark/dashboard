import { useState } from 'react'
import { Check, HardDriveDownload, Smartphone } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Dialog, useFeedback } from '@/components/ui'
import { useInstallPrompt } from '@/app/useInstallPrompt'
import { installSteps } from './installSteps'

/** Install-as-app card: one button that installs, or explains how on this browser. */
export function InstallSection() {
  const install = useInstallPrompt()
  const { toast } = useFeedback()
  const [help, setHelp] = useState(false)
  const steps = installSteps(navigator.userAgent)

  const onInstall = async () => {
    if (!install.canInstall) {
      setHelp(true)
      return
    }
    if (await install.install()) toast('Installed. Find ALT Dashboard with your other apps.', { tone: 'success' })
  }

  return (
    <Card>
      <CardHeader
        icon={Smartphone}
        title="Install as an app"
        description={
          install.installed
            ? 'You’re using the installed app. It opens in its own window and works offline.'
            : 'Get ALT Dashboard in its own window, on your home screen or taskbar, working offline.'
        }
        actions={
          install.installed ? (
            <Badge tone="success">
              <Check size={12} /> Installed
            </Badge>
          ) : (
            <Button variant="primary" size="sm" icon={HardDriveDownload} onClick={onInstall}>
              Install app
            </Button>
          )
        }
      />
      {help && (
        <Dialog
          open
          onClose={() => setHelp(false)}
          size="sm"
          title="Install ALT Dashboard"
          description={steps.intro}
          footer={
            <Button variant="primary" onClick={() => setHelp(false)}>
              Got it
            </Button>
          }
        >
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink">
            {steps.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {steps.note && <p className="mt-4 text-sm text-ink-soft">{steps.note}</p>}
        </Dialog>
      )}
    </Card>
  )
}
