// Extracts New Horizon 1–3 (JHS) data from the old jhsData chunk on tag
// legacy-v1: unit word lists become game sets, and each book's grammar
// points and exercise sets go to public/games/jhs/<id>.json. Run after
// extract-vocab.mjs (it appends to src/content/games/sets.json):
//   node scripts/legacy/extract-jhs.mjs
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const git = (args) => execSync(`git ${args}`, { maxBuffer: 1 << 28 }).toString()
const chunk = git('ls-tree --name-only legacy-v1 assets/').split('\n').find((f) => /jhsData-.*\.js$/.test(f))
const src = git(`show legacy-v1:${chunk}`)
const names = [...src.matchAll(/([\w$]+)=\{curriculum_title:/g)].map((m) => m[1])
const dir = mkdtempSync(join(tmpdir(), 'jhs-'))
writeFileSync(join(dir, 'jhs.mjs'), `${src}\nexport{${names.map((n, i) => `${n} as __b${i}`).join(',')}};\n`)
const m = await import(join(dir, 'jhs.mjs'))
const raw = names.map((_, i) => m[`__b${i}`])
const books = m.J

mkdirSync('public/games/jhs', { recursive: true })
const index = JSON.parse(readFileSync('src/content/games/sets.json', 'utf8')).filter((s) => !s.id.startsWith('jhs-'))
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

books.forEach((book, i) => {
  const { cover, ...rest } = book
  const coverFile = decodeURIComponent(cover).replace(/^\/dashboard\//, '')
  execSync(`python3 -c "import io,sys;from PIL import Image;im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB');im.thumbnail((360,360));im.save('public/games/jhs/${book.id}.webp','WEBP',quality=75)"`, {
    input: execSync(`git show legacy-v1:${coverFile}`, { maxBuffer: 1 << 26 }),
  })
  writeFileSync(`public/games/jhs/${book.id}.json`, JSON.stringify({ ...rest, cover: `${book.id}.webp` }))

  const group = `${book.title} (JHS)`
  for (const unit of raw[i].units) {
    const cards = []
    const seen = new Set()
    for (const part of unit.parts ?? unit.sections ?? [])
      for (const w of part.new_words ?? []) {
        const en = clean(w.english_word)
        if (!en || seen.has(en.toLowerCase())) continue
        seen.add(en.toLowerCase())
        cards.push({ en, ja: clean(w.japanese_translation), kana: '', img: '' })
      }
    if (!cards.length) continue
    const id = `jhs-${book.id}-unit-${unit.unit_number}`
    const title = `Unit ${unit.unit_number} - ${clean(unit.unit_title)}`
    const pages = (unit.parts ?? []).map((p) => p.page).filter(Number.isFinite)
    writeFileSync(`public/games/sets/${id}.json`, JSON.stringify({ id, title, group, book: book.id, pages, cards }))
    index.push({ id, title, group, count: cards.length, cover: '', pages })
  }
})
writeFileSync('src/content/games/sets.json', JSON.stringify(index, null, 1))
console.log(`${books.length} books, ${index.filter((s) => s.id.startsWith('jhs-')).length} JHS word sets`)
