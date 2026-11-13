// The map sites (src/sites.js): which level is which place, pictures and names for all of them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { LAND_BOX, SITE_ORDER, SITE_SOLID, TRAINING_SITE, parseLand, siteFor } from '../src/sites.js'
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

test('every landscape is flat things and standing things, each with its box inside the picture', () => {
  let standing = 0
  // a tree top may stick out of the picture's box a little
  const inside = (b) => b.length === 4 && b[0] < b[2] && b[1] < b[3]
    && b[0] >= LAND_BOX.x - 10 && b[2] <= LAND_BOX.x + LAND_BOX.w + 10 && b[1] >= LAND_BOX.y - 10 && b[3] <= LAND_BOX.y + LAND_BOX.h + 10
  for (const site of new Set([TRAINING_SITE, ...SITE_ORDER])) {
    const land = parseLand(readFileSync(new URL(`../src/assets/sites/${site}-land.svg`, import.meta.url), 'utf8'))
    assert.ok(land.flats.length || land.props.length, `${site}: an empty landscape`)
    for (const f of land.flats) assert.ok(f.svg && inside(f.box), `${site}: flat thing ${f.box}`)
    for (const p of land.props) {
      assert.ok(p.svg && inside(p.box), `${site}: standing thing ${p.box}`)
      assert.ok(p.foot >= p.box[1] && p.foot <= p.box[3] + 1, `${site}: foot ${p.foot} outside its box`)
    }
    const solid = SITE_SOLID[site]
    assert.ok(solid?.length && solid.every((b) => b.length === 4 && b[0] < b[2] && b[1] < b[3]), `SITE_SOLID.${site}`)
    assert.ok(solid.some((b) => b[1] <= 0 && b[3] >= 0 && b[0] < 0 && b[2] > 0), `SITE_SOLID.${site}: covers the ground line`)
    standing += land.props.length
  }
  assert.ok(standing > 20)
  // the tower's pond and its three water plants are ONE flat thing: they move, mirror and go together
  const tower = parseLand(readFileSync(new URL('../src/assets/sites/wizardTower-land.svg', import.meta.url), 'utf8'))
  const ponds = tower.flats.filter((f) => /<ellipse/.test(f.svg))
  assert.equal(ponds.length, 1)
  assert.equal(ponds[0].svg.match(/<rect [^>]*rx="1.5"/g)?.length, 3, 'the pond has its three plants')
  assert.ok(ponds[0].box[2] < 0 && ponds[0].box[3] < 0 && ponds[0].box[3] > -15, 'the pond lies north-west, at the foot of the tower')
  assert.ok(!tower.props.some((p) => /rx="1.5"/.test(p.svg)), 'no water plant stands apart from the pond')
  assert.throws(() => parseLand('<svg viewBox="0 0 1 1">\n<rect/>\n</svg>'), /neither flat nor/)
})
