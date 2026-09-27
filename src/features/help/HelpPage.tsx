import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BookOpen, CalendarDays, CloudUpload, Gamepad2, HardDriveDownload, Link2, Presentation, School, Sparkles, Vote } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Card, CardHeader } from '@/components/ui'

const K = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-md border border-line bg-canvas px-1.5 py-0.5 font-mono text-xs font-semibold">{children}</kbd>
)
const A = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="font-semibold text-accent underline underline-offset-2">
    {children}
  </Link>
)

function Section({ icon, title, children }: { icon: typeof BookOpen; title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader icon={icon} title={title} />
      <div className="space-y-2 px-5 pb-5 text-[15px] leading-relaxed text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </Card>
  )
}

/** Short user guide. */
export default function HelpPage() {
  const legacy = import.meta.env.BASE_URL === '/dashboard/'
  return (
    <Page title="Help" description="How the dashboard fits together, in two minutes.">
      <div className="space-y-5">
        <Section icon={Sparkles} title="Getting started">
          <ul>
            <li>
              Your data stays in this browser and works offline. Coming from the old dashboard or ALT Planner? Home shows a one-click
              import, or use <A to="/settings">Settings → Your data → Import</A> with an exported file.
            </li>
            <li>
              Add your <A to="/schools">schools</A> (classes, JTEs and timetables with real period times), then fill in the{' '}
              <A to="/schedule">schedule</A>.
            </li>
            <li>Install it as an app from Settings (on iPhone: Share → Add to Home Screen) for a full-screen window.</li>
          </ul>
        </Section>

        <Section icon={CalendarDays} title="Planner">
          <ul>
            <li>
              <strong>Schedule:</strong> pick a school for each day, then tap a period to set the class, what you did and the lesson plan.
              Drag periods to move them (hold Ctrl or Alt to copy); every change can be undone. The Tally view counts lessons, and{' '}
              <strong>PDF report</strong> prints your weekly schedule record, two weeks to a page, with the class tally.
            </li>
            <li>
              <strong>Lesson plans</strong> save as you type, can hold links and small files, and print one or many at a time.{' '}
              <strong>Textbooks</strong> hold pages (sections); the New Horizon presets fill them in for you.
            </li>
            <li>
              <strong>Curriculum</strong> tracks each class's progress; the period editor suggests the class's next item.{' '}
              <strong>Class history</strong> searches everything you've taught and exports CSV.
            </li>
          </ul>
        </Section>

        <Section icon={Presentation} title="Classroom board">
          <ul>
            <li>
              Open it with the <A to="/board">Classroom board</A> button. Add widgets from the dock; drag them by their title bar, resize
              from the edges, and use the gear for settings (they're remembered). Double-click a title bar to focus it.
            </li>
            <li>
              <strong>Workspaces</strong> (top right) hold different layouts; <strong>templates</strong> copy a layout to any workspace.{' '}
              <strong>Classes</strong> (board settings) feed Random Name, Group Maker and Spinner.
            </li>
            <li>
              Keys: <K>N</K> add widget, <K>D</K> draw, <K>[</K> <K>]</K> workspaces, <K>H</K> hide controls for the projector, <K>F</K>{' '}
              full screen, <K>G</K> games, <K>L</K> links, <K>?</K> all shortcuts.
            </li>
          </ul>
        </Section>

        <Section icon={Vote} title="Live polls">
          <ul>
            <li>
              Add the Poll widget, write a question and press Start. Students scan the QR code (or type the 5-digit room code at the student
              page) on their own devices; results appear live.
            </li>
            <li>
              The room code stays the same until you replace it, and old QR codes still open the student page. Ended polls are kept under
              Past, with CSV export.
            </li>
          </ul>
        </Section>

        <Section icon={Gamepad2} title="Games and JHS mode">
          <ul>
            <li>
              <A to="/games">Games</A>: choose a word set (textbook units or picture categories), then one of eight games. The 日本語 button
              shows Japanese. Make your own sets under <strong>My sets</strong>.
            </li>
            <li>
              <A to="/jhs">JHS Classroom Mode</A>: New Horizon 1–3 exercise sets (with hints, Japanese and a teacher “Show answer”) and a
              grammar library.
            </li>
          </ul>
        </Section>

        <Section icon={Link2} title="Links">
          <p>
            <A to="/links">Links</A> keeps your classroom activities, bookmarks and textbooks' digital links in one place (also on the
            board, under Links).
          </p>
        </Section>

        <Section icon={HardDriveDownload} title="Your data and backups">
          <ul>
            <li>Export everything to one file from Settings. Imports replace your data, but a backup is taken first and you can undo.</li>
            <li>The last five backups are kept on the device; restore or download them from Settings.</li>
          </ul>
        </Section>

        <Section icon={CloudUpload} title="Sync (optional)">
          <p>
            Sign in with Google in <A to="/settings#sync">Settings</A> to keep every device the same. Changes sync in the background (the
            newest edit wins); the sidebar shows whether you're synced. You can turn it off, or remove the cloud copy, at any time.
          </p>
        </Section>

        {legacy && (
          <Section icon={School} title="The old dashboard">
            <p>
              The previous version stays available for a while at{' '}
              <a className="font-semibold text-accent underline underline-offset-2" href={`${import.meta.env.BASE_URL}legacy/`}>
                /dashboard/legacy/
              </a>
              .
            </p>
          </Section>
        )}
      </div>
    </Page>
  )
}
