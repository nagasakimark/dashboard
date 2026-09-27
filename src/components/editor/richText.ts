/**
 * Helpers for lesson-plan HTML. Content is always rendered through TipTap's
 * schema (never injected raw), so unknown tags/attributes are dropped.
 */

/** Convert Quill-specific markup into standard HTML TipTap understands. */
export function normalizeLegacyHtml(html: string): string {
  if (!html.includes('ql-')) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('[class*="ql-align-"]').forEach((el) => {
    const m = /ql-align-(center|right|justify)/.exec(el.className)
    if (m) (el as HTMLElement).style.textAlign = m[1]
  })
  // Quill indents list items/paragraphs with classes; TipTap nests lists.
  doc.querySelectorAll('[class*="ql-indent-"]').forEach((el) => {
    const m = /ql-indent-(\d)/.exec(el.className)
    if (m && el.tagName !== 'LI') (el as HTMLElement).style.marginLeft = `${Number(m[1]) * 2}em`
  })
  doc.querySelectorAll('.ql-syntax').forEach((el) => {
    const pre = doc.createElement('pre')
    pre.textContent = el.textContent
    el.replaceWith(pre)
  })
  return doc.body.innerHTML
}

/** Plain text of an HTML fragment (for search and previews). */
export function htmlToText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html.replace(/<(\/p|br|\/li|\/h\d)>/gi, '$& '), 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export const isEmptyHtml = (html: string) => htmlToText(html) === '' && !/<img/i.test(html)
