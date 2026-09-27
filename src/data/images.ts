/** Image helpers for keeping stored pictures (textbook covers etc.) small. */

export type ImageShrinker = (dataUrl: string) => Promise<string>

const DEFAULT_MAX = 300

/**
 * Downscale an image (data: URL, blob URL or File) so its longest side is at
 * most `max` px, re-encoded as WebP (JPEG fallback). Small images that are
 * already compact are returned unchanged. On failure the input is returned.
 */
export async function shrinkImage(input: string | Blob, max = DEFAULT_MAX, quality = 0.82): Promise<string> {
  if (typeof input === 'string' && (!input.startsWith('data:image/') || input.length < 20_000)) return input
  try {
    const blob = typeof input === 'string' ? await (await fetch(input)).blob() : input
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return typeof input === 'string' ? input : ''
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    let out = canvas.toDataURL('image/webp', quality)
    if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', quality)
    return typeof input === 'string' && out.length >= input.length ? input : out
  } catch {
    return typeof input === 'string' ? input : ''
  }
}

/** Approximate decoded size of a data: URL, in bytes. */
export const dataUrlBytes = (s: string) => (s.startsWith('data:') ? Math.round(((s.length - s.indexOf(',') - 1) * 3) / 4) : 0)

export const formatBytes = (n: number) =>
  n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`
