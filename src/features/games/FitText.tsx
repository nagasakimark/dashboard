import { useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

/**
 * Text that shrinks to fit its box instead of breaking words: never splits a
 * word, and uses at most `lines` lines (phrases may wrap between words).
 * Sizes are in px; the text starts at `max` and shrinks no further than `min`.
 */
export function FitText({
  text,
  max,
  min = 12,
  lines = 2,
  className,
  lang,
}: {
  text: string
  max: number
  min?: number
  lines?: number
  className?: string
  lang?: string
}) {
  const box = useRef<HTMLSpanElement>(null)
  const inner = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const b = box.current
    const t = inner.current
    if (!b || !t) return
    const fits = (px: number) => {
      t.style.fontSize = `${px}px`
      const lineHeight = parseFloat(getComputedStyle(t).lineHeight) || px * 1.15
      return t.scrollWidth <= b.clientWidth + 0.5 && Math.round(t.scrollHeight / lineHeight) <= (text.includes(' ') ? lines : 1)
    }
    const fit = () => {
      if (!b.clientWidth) return
      if (fits(max)) return
      let lo = min
      let hi = max
      for (let n = 0; n < 9; n++) {
        const mid = (lo + hi) / 2
        if (fits(mid)) lo = mid
        else hi = mid
      }
      t.style.fontSize = `${Math.floor(lo)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(b)
    // Web fonts can change widths after first paint.
    void document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [text, max, min, lines])

  return (
    <span ref={box} data-fit-text className={cn('flex w-full min-w-0 justify-center', className)}>
      <span
        ref={inner}
        lang={lang}
        style={{ fontSize: max }}
        className="block w-full text-center leading-[1.12] [overflow-wrap:normal] [word-break:keep-all]"
      >
        {text}
      </span>
    </span>
  )
}
