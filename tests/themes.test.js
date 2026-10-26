// Validates the theme config (src/themes.js): every theme is complete and its texts exist.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { THEMES, ACTIVE_THEME, CELL_STATES, activeThemeName, themedKey, cursorCss, emojiHue, emojiStyle } from '../src/themes.js'
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
      if (cell.emojiHue !== undefined) assert.ok(cell.emoji && Number.isFinite(cell.emojiHue), `${name}.${v}.emojiHue`)
      if (cell.emojiAlpha !== undefined) assert.ok(cell.emojiAlpha > 0 && cell.emojiAlpha <= 1, `${name}.${v}.emojiAlpha`)
      return cell.emoji ?? palette[cell.fill]
    })
    assert.equal(new Set(looks).size, CELL_STATES.length, `${name}: two states look the same`)
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

test('emoji recolouring follows the theme', () => {
  assert.equal(emojiHue('🍬', THEMES.halloween), 130)
  assert.deepEqual(emojiStyle('🍬', THEMES.halloween), { filter: 'hue-rotate(130deg)' })
  assert.equal(emojiStyle('🎃', THEMES.halloween), undefined)
  assert.equal(emojiHue('🍬', THEMES.classic), 0)
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
