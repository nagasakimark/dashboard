import { useMemo } from 'react'
import QRCode from 'qrcode'

/** QR code as an SVG path (one square per dark module). */
export function QrSvg({ text, color, size, label }: { text: string; color: string; size: number; label?: string }) {
  const qr = useMemo(() => {
    try {
      return QRCode.create(text, { errorCorrectionLevel: 'M' })
    } catch {
      return null
    }
  }, [text])
  if (!qr) return <p className="text-sm text-danger">That link is too long for a QR code.</p>
  const n = qr.modules.size
  let d = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x + 2},${y + 2}h1v1h-1z`
  return (
    <svg
      viewBox={`0 0 ${n + 4} ${n + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `QR code for ${text}`}
      shapeRendering="crispEdges"
    >
      <rect width={n + 4} height={n + 4} fill="white" />
      <path d={d} fill={color} />
    </svg>
  )
}
