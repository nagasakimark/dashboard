import type { Section } from '@/data/schema'

/** How a section's page is shown: "p.12", or nothing for whole units. */
export const pageRef = (page: number) => (page > 0 ? `p.${page}` : '')

/** "p.12 · Title", or just the title for a unit without a page. */
export const sectionLabel = (s: Pick<Section, 'page' | 'title'>) => [pageRef(s.page), s.title].filter(Boolean).join(' · ')

/** Sort sections by page, then by their stored order (units have no page). */
export const bySectionOrder = (a: Pick<Section, 'page' | 'order'>, b: Pick<Section, 'page' | 'order'>) =>
  a.page - b.page || a.order - b.order
