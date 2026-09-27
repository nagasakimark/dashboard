import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Text that fills the space it's given and ends with "…" on the last line
 * that fits, instead of being cut through the middle of a line.
 */
export function ClampText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [lines, setLines] = useState(2)
  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 16
      const available =
        box.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(box).paddingBottom) || 0) - el.getBoundingClientRect().top
      setLines(Math.max(1, Math.floor(available / lineHeight)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])
  return (
    <p
      ref={ref}
      className={cn('overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]', className)}
      style={{ WebkitLineClamp: lines }}
    >
      {text}
    </p>
  )
}
