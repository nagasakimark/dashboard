import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RichTextView } from './RichTextView'
import { htmlToText, isEmptyHtml, normalizeLegacyHtml } from './richText'

describe('rich text', () => {
  it('converts Quill alignment classes to styles', () => {
    expect(normalizeLegacyHtml('<h1 class="ql-align-center">Title</h1>')).toBe(
      '<h1 class="ql-align-center" style="text-align: center;">Title</h1>',
    )
    expect(normalizeLegacyHtml('<p>plain</p>')).toBe('<p>plain</p>')
  })

  it('extracts plain text for search', () => {
    expect(htmlToText('<h1>Warm-up</h1><p>Hello <strong>song</strong></p><ul><li>a</li><li>b</li></ul>')).toBe('Warm-up Hello song a b')
    expect(isEmptyHtml('<p><br></p>')).toBe(true)
  })

  it('renders only safe, supported markup', () => {
    const { container } = render(
      <RichTextView
        html={
          '<p class="ql-align-center" onclick="alert(1)">Hi <a href="javascript:alert(1)">bad</a> <a href="https://quizlet.com">ok</a></p><script>alert(2)</script><img src=x onerror=alert(3)>'
        }
      />,
    )
    const html = container.innerHTML
    expect(html).not.toMatch(/onclick|onerror|<script|javascript:/i)
    expect(html).toContain('text-align: center')
    expect(container.querySelector('a[href="https://quizlet.com"]')).toBeTruthy()
  })
})
