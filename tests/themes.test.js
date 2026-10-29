// Validates the theme config (src/themes.js): every theme is complete and its texts exist.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { THEMES, ACTIVE_THEME, CELL_STATES, activeThemeName, themedKey, cursorCss, drawLook, defaultLook, emojiStyleIn } from '../src/themes.js'
import { recolourPixel, rgbToHsl } from '../src/game/emojiTexture.js'
import { palette } from '../src/theme.js'

const locale = (l) => JSON.parse(readFileSync(new URL(`../src/locales/${l}.json`, import.meta.url)))
const LOCALES = Object.fromEntries(['en', 'de', 'fr'].map((l) => [l, locale(l)]))
const get = (obj, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)

test('ACTIVE_THEME names a theme; classic exists', () => {
  assert.ok(THEMES[ACTIVE_THEME], ACTIVE_THEME)
  assert.ok(THEMES.classic)
})

for (const [name, theme] of Object.entries(THEMES)) {
  test(`theme ${name}: every cell state has palette colours, states tell apart`, () => {
    const looks = CELL_STATES.map((v) => {
      const cell = theme.cells[v]
      assert.ok(cell, `${name}: no look for state ${v}`)
      assert.ok(palette[cell.fill], `${name}.${v}.fill ${cell.fill} not in palette`)
      assert.ok(palette[cell.border], `${name}.${v}.border ${cell.border} not in palette`)
      const emojis = Array.isArray(cell.emoji) ? cell.emoji : cell.emoji ? [cell.emoji] : []
      for (const e of emojis) assert.ok(typeof e === 'string' && e.length > 0, `${name}.${v}.emoji`)
      if (Array.isArray(cell.emoji)) assert.equal(new Set(cell.emoji).size, cell.emoji.length, `${name}.${v}: duplicate choice`)
      const colours = Array.isArray(cell.emojiColor) ? cell.emojiColor : cell.emojiColor ? [cell.emojiColor] : []
      for (const c of colours) {
        assert.ok(emojis.length, `${name}.${v}.emojiColor without an emoji`)
        assert.ok(Number.isFinite(c.hue), `${name}.${v}.emojiColor.hue`)
      }
      if (cell.emojiGlow !== undefined) assert.ok(palette[cell.emojiGlow], `${name}.${v}.emojiGlow ${cell.emojiGlow} not in palette`)
      if (cell.emojiAlpha !== undefined) assert.ok(cell.emojiAlpha > 0 && cell.emojiAlpha <= 1, `${name}.${v}.emojiAlpha`)
      return cell
    })
    // In every drawn look (and the default look) the four states must look different.
    const lookKey = (l) => CELL_STATES.map((v) => l[v].emoji ?? palette[l[v].fill])
    assert.equal(new Set(lookKey(defaultLook(theme))).size, CELL_STATES.length, `${name}: default look repeats a state`)
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 300; i++) {
      assert.equal(new Set(lookKey(drawLook(theme, random))).size, CELL_STATES.length, `${name}: drawn look repeats a state`)
    }
    assert.ok(looks.length === CELL_STATES.length)
  })

  test(`theme ${name}: themed texts exist in every locale`, () => {
    const keys = [...Object.entries(theme.text).flat(), ...(theme.tagline ? [theme.tagline] : [])]
    for (const [lang, msgs] of Object.entries(LOCALES)) {
      for (const k of keys) assert.equal(typeof get(msgs, k), 'string', `${lang}: missing ${k}`)
    }
  })

  test(`theme ${name}: cursor is a valid CSS value`, () => {
    const css = cursorCss(theme, palette)
    if (theme.cursor) assert.match(css, /^url\("data:image\/svg\+xml,.+"\) \d+ \d+, pointer$/)
    else assert.equal(css, null)
  })
}

test('?theme= picks a theme, unknown names fall back', () => {
  assert.equal(activeThemeName('?theme=halloween'), 'halloween')
  assert.equal(activeThemeName('?theme=nope'), ACTIVE_THEME)
  assert.equal(activeThemeName('?theme=toString'), ACTIVE_THEME)
  assert.equal(activeThemeName(''), ACTIVE_THEME)
  assert.equal(themedKey('win.title', THEMES.halloween), 'themes.halloween.winTitle')
  assert.equal(themedKey('win.title', THEMES.classic), 'win.title')
})

test('halloween: every object and candy colour gets drawn, Retry-stable look, default look', () => {
  const t = THEMES.halloween
  const seen = { O: new Set(), B: new Set(), colour: new Set() }
  for (let i = 0; i < 2000; i++) {
    const l = drawLook(t)
    assert.notEqual(l.O.emoji, l.B.emoji)
    assert.equal(l.G.emoji, '🍬')
    assert.equal(l.U.emoji, '🕸️')
    seen.O.add(l.O.emoji); seen.B.add(l.B.emoji); seen.colour.add(l.G.emojiColor.name)
  }
  assert.equal(seen.O.size, t.cells.O.emoji.length)
  assert.equal(seen.B.size, t.cells.B.emoji.length)
  assert.deepEqual([...seen.colour].sort(), ['blue', 'green', 'red', 'yellow'])
  for (const o of ['🕷️', '🧙‍♀️']) assert.ok(t.cells.O.emoji.includes(o), `missing ${o}`)

  const d = defaultLook(t)
  assert.deepEqual([d.O.emoji, d.B.emoji, d.G.emojiColor.name], ['🎃', '👻', 'green'])
  assert.deepEqual(emojiStyleIn(d, '🍬', palette).color.name, 'green')
  assert.equal(emojiStyleIn(d, '🕸️', palette), null)
  assert.equal(emojiStyleIn(d, '🎃', palette).glow, palette.hwEmojiGlow)
  assert.equal(emojiStyleIn(defaultLook(THEMES.classic), '🍬', palette), null)
})

test('recolouring keeps whites and greys, sets the hue of coloured pixels', () => {
  const opts = { hue: 125, sat: 1, light: 0 }
  assert.equal(recolourPixel(255, 255, 255, opts), null)     // white wrapper
  assert.equal(recolourPixel(120, 118, 122, opts), null)     // grey shading
  const [r, g, b] = recolourPixel(240, 80, 110, opts)        // pink-red stripe -> green
  const [h, s, l] = rgbToHsl(r, g, b)
  assert.ok(Math.abs(h * 360 - 125) < 2, `hue ${h * 360}`)
  const [, s0, l0] = rgbToHsl(240, 80, 110)
  assert.ok(Math.abs(s - s0) < 0.02 && Math.abs(l - l0) < 0.02)
})

test('all locale files have the same keys', () => {
  const keys = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
    (v && typeof v === 'object' ? keys(v, `${pre}${k}.`) : [`${pre}${k}`]))
  const [ref, ...rest] = Object.entries(LOCALES).map(([l, m]) => [l, new Set(keys(m))])
  for (const [lang, ks] of rest) {
    assert.deepEqual([...ks].filter((k) => !ref[1].has(k)), [], `${lang} has keys en lacks`)
    assert.deepEqual([...ref[1]].filter((k) => !ks.has(k)), [], `${lang} lacks keys of en`)
  }
})

test('sorcerer: crown goal, stone on uncoloured, every object drawn, two different objects', () => {
  const t = THEMES.sorcerer
  const seen = new Set()
  for (let i = 0; i < 2000; i++) {
    const l = drawLook(t)
    assert.notEqual(l.O.emoji, l.B.emoji)
    assert.equal(l.G.emoji, '👑')
    assert.equal(l.U.emoji, '🪨')
    seen.add(l.O.emoji); seen.add(l.B.emoji)
  }
  assert.equal(seen.size, 7)
  assert.equal(activeThemeName('?theme=sorcerer'), 'sorcerer')
})
