import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { boldParts, clozeAnswers, reorderTiles, sameAnswer, stripCitations } from '@/features/jhs/data'
import { BUILT_IN_SETS, ELEMENTARY_GROUPS, JHS_GROUPS, setIdsWithPrevious, uniqueCards, type Card } from './data'
import { memoryCards, scramble, withDistractors } from './engine'
import { MODES, modeAvailable } from './modes'

const card = (en: string, img = ''): Card => ({ en, ja: '', kana: '', img })

describe('built-in word sets', () => {
  it('has the 58 picture-dictionary categories and the textbook units', () => {
    expect(BUILT_IN_SETS.filter((s) => s.group === 'Picture Dictionary')).toHaveLength(58)
    expect(ELEMENTARY_GROUPS).toEqual(["Let's Try 1", "Let's Try 2", 'New Horizon 5', 'New Horizon 6', 'Picture Dictionary'])
    expect(JHS_GROUPS).toHaveLength(3)
  })

  it('ships every set file and every picture it uses', () => {
    for (const s of BUILT_IN_SETS) {
      const file = `public/games/sets/${s.id}.json`
      expect(existsSync(file), file).toBe(true)
      const deck = JSON.parse(readFileSync(file, 'utf8')) as { cards: Card[] }
      expect(deck.cards).toHaveLength(s.count)
      for (const c of deck.cards) if (c.img) expect(existsSync(`public/games/img/${c.img}`), c.img).toBe(true)
    }
  })

  it('adds previous units in order', () => {
    expect(setIdsWithPrevious('lt1-unit3', true)).toEqual(['lt1-unit1', 'lt1-unit2', 'lt1-unit3'])
    expect(setIdsWithPrevious('lt1-unit3', false)).toEqual(['lt1-unit3'])
    expect(setIdsWithPrevious('pd-animals', true)).toEqual(['pd-animals'])
  })

  it('drops duplicate cards', () => {
    expect(uniqueCards([card('cat', 'a'), card('Cat', 'A'), card('cat', 'b')])).toHaveLength(2)
  })
})

describe('game engine', () => {
  const pool = ['cat', 'dog', 'bird', 'fish', 'cow'].map((w) => card(w, `${w}.webp`))

  it('builds four different options including the answer', () => {
    const opts = withDistractors(pool[0], [...pool, card('cat', 'other.webp')])
    expect(opts).toHaveLength(4)
    expect(opts.map((o) => o.en)).toContain('cat')
    expect(new Set(opts.map((o) => o.en)).size).toBe(4)
  })

  it('scrambles letters without spelling the word', () => {
    const s = scramble('apple', () => 0.3)
    expect(s.map((l) => l.char).join('')).not.toBe('APPLE')
    expect(
      s
        .map((l) => l.char)
        .sort()
        .join(''),
    ).toBe('AELPP')
  })

  it('pairs pictures with words, or words with Japanese', () => {
    const tiles = memoryCards([card('cat', 'cat.webp'), { ...card('dog'), ja: '犬' }])
    expect(tiles).toHaveLength(4)
    expect(
      tiles
        .filter((t) => t.pair === 0)
        .map((t) => t.face)
        .sort(),
    ).toEqual(['image', 'word'])
    expect(
      tiles
        .filter((t) => t.pair === 1)
        .map((t) => t.face)
        .sort(),
    ).toEqual(['japanese', 'word'])
  })

  it('offers picture games only when there are pictures', () => {
    const words = [card('a'), card('b'), card('c'), card('d')]
    expect(MODES.filter((m) => modeAvailable(m, words)).map((m) => m.id)).toEqual([
      'flashcards',
      'missing',
      'scramble',
      'spelling',
      'memory',
    ])
    expect(MODES.every((m) => modeAvailable(m, pool))).toBe(true)
  })
})

describe('JHS helpers', () => {
  it('checks answers leniently', () => {
    expect(sameAnswer('I am Edward Trout.', 'i am  edward trout')).toBe(true)
    expect(sameAnswer('I’m fine', "I'm fine!")).toBe(true)
    expect(sameAnswer('I am', 'You are')).toBe(false)
  })

  it('splits tiles, blanks and bold text, and drops citations', () => {
    expect(reorderTiles('I / am / Edward / Trout.')).toEqual(['I', 'am', 'Edward', 'Trout.'])
    expect(clozeAnswers('am / is')).toEqual(['am', 'is'])
    expect(boldParts('**I am** here.')).toEqual([
      { text: 'I am', bold: true },
      { text: ' here.', bold: false },
    ])
    expect(stripCitations('It is used [1, 2]. Yes [3].')).toBe('It is used. Yes.')
  })
})
