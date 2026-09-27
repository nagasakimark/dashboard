import { useMemo } from 'react'
import { generateHTML, generateJSON } from '@tiptap/html'
import { cn } from '@/lib/cn'
import { richTextExtensions } from './extensions'
import { normalizeLegacyHtml } from './richText'

/**
 * Read-only rendering of stored lesson HTML. The HTML is parsed through the
 * editor schema and re-serialised, so only supported, safe markup survives.
 */
export function RichTextView({ html, className }: { html: string; className?: string }) {
  const safe = useMemo(() => {
    const ext = richTextExtensions()
    return generateHTML(generateJSON(normalizeLegacyHtml(html), ext), ext)
  }, [html])
  return <div className={cn('prose-lesson', className)} dangerouslySetInnerHTML={{ __html: safe }} />
}
