import { useCallback, useState } from 'react'
import type { Card } from './data'

/** Fisher–Yates shuffle (copy). */
export function shuffle<T>(list: readonly T[], random = Math.random): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const key = (c: Card) => `${c.en}::${c.img}`.toLowerCase()

/** The answer plus up to `count` other cards with different words, shuffled. */
export function withDistractors(answer: Card, pool: Card[], count = 3, random = Math.random): Card[] {
  const others = shuffle(
    pool.filter((c) => key(c) !== key(answer) && c.en.toLowerCase() !== answer.en.toLowerCase()),
    random,
  )
  const picked: Card[] = []
  for (const c of others) {
    if (picked.length >= count) break
    if (!picked.some((p) => p.en.toLowerCase() === c.en.toLowerCase())) picked.push(c)
  }
  return shuffle([answer, ...picked], random)
}

/** Letters of a word, shuffled so they don't spell it (when possible). */
export function scramble(word: string, random = Math.random): { char: string; id: number }[] {
  const letters = word
    .toUpperCase()
    .split('')
    .map((char, id) => ({ char, id }))
  if (new Set(letters.map((l) => l.char)).size < 2) return letters
  let out = letters
  for (let i = 0; i < 20 && out.map((l) => l.char).join('') === word.toUpperCase(); i++) out = shuffle(letters, random)
  return out
}

/** Characters a student types (letters and digits); spaces and punctuation are shown. */
export const isTypeable = (ch: string) => /[a-z0-9]/i.test(ch)

/** Memory pairs: a picture card and a word card each (word + Japanese without pictures). */
export function memoryCards(cards: Card[], random = Math.random) {
  return shuffle(
    cards.flatMap((c, i) => [
      { id: `${i}a`, pair: i, face: c.img ? ('image' as const) : ('word' as const), card: c },
      { id: `${i}b`, pair: i, face: c.img ? ('word' as const) : ('japanese' as const), card: c },
    ]),
    random,
  )
}

function readBest(mode: string): number {
  try {
    return Number(localStorage.getItem(`games:best:${mode}`)) || 0
  } catch {
    return 0
  }
}

/** Streak, best streak (remembered per game) and rounds played. */
export function useScore(mode: string) {
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(() => readBest(mode))
  const [rounds, setRounds] = useState(0)
  const record = useCallback(
    (correct: boolean) => {
      setRounds((r) => r + 1)
      setStreak((s) => {
        const next = correct ? s + 1 : 0
        setBest((b) => {
          if (next <= b) return b
          try {
            localStorage.setItem(`games:best:${mode}`, String(next))
          } catch {
            /* private mode */
          }
          return next
        })
        return next
      })
    },
    [mode],
  )
  const reset = useCallback(() => {
    setStreak(0)
    setRounds(0)
  }, [])
  return { streak, best, rounds, record, reset }
}

/** Say a word with the browser's English voice (Corner Pop, Spelling). */
export function speak(text: string) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.92
  window.speechSynthesis.speak(u)
}
