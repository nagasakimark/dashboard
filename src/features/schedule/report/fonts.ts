import { Font } from '@react-pdf/renderer'

const FONT_BASE = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/mplus1p'
let jpRegistered = false

/** Register the Japanese font (downloaded on first use, then cached). */
export function registerJapaneseFont(): string {
  if (!jpRegistered) {
    Font.register({
      family: 'MPLUS1p',
      fonts: [{ src: `${FONT_BASE}/MPLUS1p-Regular.ttf` }, { src: `${FONT_BASE}/MPLUS1p-Bold.ttf`, fontWeight: 'bold' }],
    })
    // Japanese text has no spaces; allow breaking anywhere.
    Font.registerHyphenationCallback((word) => (/[぀-ヿ㐀-鿿]/.test(word) ? [...word] : [word]))
    jpRegistered = true
  }
  return 'MPLUS1p'
}

export const hasJapanese = (text: string) => /[぀-ヿ㐀-鿿＀-￯]/.test(text)
