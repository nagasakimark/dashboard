import { useSearchParams } from 'react-router'
import { Page } from '@/components/layout/Page'
import { LinksPanel, type LinksTab } from './LinksPanel'

const TABS: LinksTab[] = ['activities', 'bookmarks', 'textbooks']

export default function LinksPage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab') as LinksTab) ? (params.get('tab') as LinksTab) : 'activities'
  return (
    <Page title="Links" description="Classroom activities, bookmarks and your textbooks' digital links." width="wide">
      <LinksPanel tab={tab} onTab={(t) => setParams({ tab: t }, { replace: true })} />
    </Page>
  )
}
