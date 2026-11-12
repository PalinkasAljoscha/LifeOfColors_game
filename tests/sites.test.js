// The map sites (src/sites.js): which level is which place, pictures and names for all of them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { SITE_ORDER, TRAINING_SITE, siteFor } from '../src/sites.js'
import { CASTLE_COUNT } from '../src/engine/castles.js'

test('the training level is a castle; the levels loop through the sites', () => {
  assert.equal(siteFor(0), TRAINING_SITE)
  assert.equal(TRAINING_SITE, 'castle')
  assert.equal(new Set(SITE_ORDER).size, SITE_ORDER.length)
  assert.equal(SITE_ORDER.length, 8)
  for (let c = 1; c < CASTLE_COUNT; c++) {
    assert.equal(siteFor(c), SITE_ORDER[(c - 1) % SITE_ORDER.length])
    if (c > 1) assert.notEqual(siteFor(c), siteFor(c - 1))
  }
  assert.equal(siteFor(1), SITE_ORDER[0])
  assert.equal(siteFor(SITE_ORDER.length + 1), SITE_ORDER[0])
})

test('every site has its three pictures (no animation in them) and a name in every language', () => {
  const locales = ['en', 'de', 'fr'].map((l) => JSON.parse(readFileSync(new URL(`../src/locales/${l}.json`, import.meta.url))))
  for (const site of new Set([TRAINING_SITE, ...SITE_ORDER])) {
    for (const file of [`${site}.svg`, `${site}-locked.svg`, `${site}-land.svg`]) {
      const url = new URL(`../src/assets/sites/${file}`, import.meta.url)
      assert.ok(existsSync(url), `${file} missing`)
      assert.doesNotMatch(readFileSync(url, 'utf8'), /<animate/, `${file}: map pictures are still`)
    }
    for (const loc of locales) assert.ok(loc.sites?.[site], `sites.${site}`)
  }
  for (const loc of locales) assert.match(loc.castles.name, /\{\{site\}\}.*\(\{\{n\}\}\)/)
})
