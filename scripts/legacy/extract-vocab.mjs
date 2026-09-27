// Extracts the old dashboard's vocabulary sets from the minified GameModal
// chunk on tag legacy-v1 (the source is lost). Run from the repo root:
//   node scripts/legacy/extract-vocab.mjs
// Writes public/games/sets/*.json, src/content/games/sets.json and
// scripts/legacy/images.json (new path → hashed asset, for convert-images.py).
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const git = (args) => execSync(`git ${args}`, { maxBuffer: 1 << 28 }).toString()
const chunk = git('ls-tree --name-only legacy-v1 assets/').split('\n').find((f) => /GameModal-.*\.js$/.test(f))
let src = git(`show legacy-v1:${chunk}`)

// Stub the chunk's imports (React, icons…) and expose the two glob maps.
const dir = mkdtempSync(join(tmpdir(), 'vocab-'))
writeFileSync(
  join(dir, 'stub.mjs'),
  `const h = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : h), apply: () => h, construct: () => h })
export const r = h, j = h, i = h, S = h, k = h, l = h, X = h, V = h, g = h, E = h`,
)
src = src.replace(/import\{([^}]*)\}from"[^"]*";/g, 'import{$1}from"./stub.mjs";')
const vocabVar = src.match(/([\w$]+)=Object\.assign\(\{"\.\.\/\.\.\/assets\/Elementary\/vocab\//)[1]
const imageVar = src.match(/([\w$]+)=Object\.assign\(\{"\.\.\/\.\.\/assets\/Elementary\/images\//)[1]
writeFileSync(join(dir, 'game.mjs'), `${src}\nexport{${vocabVar} as __vocab, ${imageVar} as __images};\n`)
const m = await import(join(dir, 'game.mjs'))
const unwrap = (x) => x?.default ?? x
const vocab = Object.fromEntries(Object.entries(m.__vocab).map(([k, v]) => [k.replace('../../assets/Elementary/vocab/', ''), unwrap(v)]))
const images = new Map(
  Object.entries(m.__images).map(([k, v]) => [k.replace('../../assets/Elementary/images/', '').toLowerCase(), decodeURIComponent(unwrap(v))]),
)

const decks = vocab['decks.json']
const titleFor = new Map()
for (const [group, g] of Object.entries(decks))
  for (const [name, d] of Object.entries(g.decks)) titleFor.set(d.path.replace(/^\/assets\/vocab\//, '').toLowerCase(), { group, name })

const GROUPS = { LT1: "Let's Try 1", LT2: "Let's Try 2", NH5: 'New Horizon 5', NH6: 'New Horizon 6', PD: 'Picture Dictionary' }
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const imgOut = {}
const missing = new Set()
const index = []
mkdirSync('public/games/sets', { recursive: true })
mkdirSync('src/content/games', { recursive: true })

const imagePath = (p) => {
  if (!p) return ''
  p = p.trim().replace(/\/{2,}/g, '/').replace(/\+(?=[^/]+$)/, '+/')
  const key = p.replace(/^\/?assets\/images\//i, '').toLowerCase()
  // Fall back to a unique file with the same name (typos in the old data).
  const base = key.split('/').pop()
  const byName = [...images.keys()].filter((k) => k.endsWith(`/${base}`))
  const asset = images.get(key) ?? (byName.length === 1 ? images.get(byName[0]) : undefined)
  if (!asset) {
    missing.add(p)
    return ''
  }
  const out = p.replace(/^\/?assets\/images\/categories\//i, '').replace(/^\/?assets\/images\//, '').replace(/\.(jpe?g|png)$/i, '.webp')
  const clean = out
    .split('/')
    .map((s) => slug(s.replace(/\.webp$/, '')) + (s.endsWith('.webp') ? '.webp' : ''))
    .join('/')
  imgOut[clean] = asset.replace(/^\/dashboard\//, '')
  return clean
}

for (const [file, data] of Object.entries(vocab)) {
  if (file === 'decks.json' || /\/all(LT\d)?\.json$/i.test(file) || file === 'PD/all.json') continue
  const [folder, name] = file.split('/')
  const items = Array.isArray(data) ? data : data.items
  const meta = titleFor.get(file.toLowerCase())
  const title = folder === 'PD' ? (data.metadata?.title ?? meta?.name ?? name) : (meta?.name ?? name.replace('.json', ''))
  const id = `${folder.toLowerCase()}-${slug(name.replace('.json', ''))}`
  const cards = items
    .filter((c) => c?.english)
    .map((c) => ({ en: c.english.trim(), ja: c.japanese?.kanji ?? '', kana: c.japanese?.furigana ?? '', img: imagePath(c.image) }))
  writeFileSync(`public/games/sets/${id}.json`, JSON.stringify({ id, title, group: GROUPS[folder], cards }))
  index.push({ id, title, group: GROUPS[folder], count: cards.length, cover: cards.find((c) => c.img)?.img ?? '' })
}

const order = Object.values(GROUPS)
const unitNo = (t) => Number(t.match(/Unit (\d+)/)?.[1] ?? 99)
index.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || (a.group === 'Picture Dictionary' ? a.title.localeCompare(b.title) : unitNo(a.title) - unitNo(b.title) || a.title.localeCompare(b.title)))
writeFileSync('src/content/games/sets.json', JSON.stringify(index, null, 1))
writeFileSync('scripts/legacy/images.json', JSON.stringify(imgOut, null, 1))
console.log(`${index.length} sets, ${Object.keys(imgOut).length} images, ${missing.size} missing:`, [...missing].slice(0, 20))
