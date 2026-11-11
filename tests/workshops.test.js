// The workshop scenes (src/workshops.js): every castle gets a scene, every scene is complete, and
// the current catalog's castles fit into their scenes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { WORKSHOPS, WORKSHOP_WIDTH, WORKSHOP_HEIGHT, STOPPERS, STOPPER_SHADES, workshopFor, placePuzzles, potionLook, isLying } from '../src/workshops.js'
import { assignCastles, CASTLE_COUNT, TUTORIAL_CASTLE } from '../src/engine/castles.js'
import { palette } from '../src/theme.js'

const isSpecial = (inst) => (inst.board?.special_cells?.length ?? 0) > 0

test('every scene has its picture, its rail colour and places inside the picture', () => {
  assert.equal(new Set(WORKSHOPS.map((s) => s.key)).size, WORKSHOPS.length)
  for (const scene of WORKSHOPS) {
    assert.ok(existsSync(new URL(`../src/assets/workshops/${scene.key}.svg`, import.meta.url)), `${scene.key}: picture missing`)
    assert.match(palette[scene.rail] ?? '', /^#[0-9a-f]{6}$/, `${scene.key}: rail colour ${scene.rail}`)
    assert.ok(scene.slots.length >= 30, `${scene.key}: slots`)
    for (const [x, y] of scene.slots) {
      assert.ok(x > 20 && x < WORKSHOP_WIDTH - 20 && y > 200 && y < WORKSHOP_HEIGHT, `${scene.key}: slot ${x},${y}`)
    }
    if (scene.banner) assert.ok(scene.banner.maxW > 100 && scene.banner.size > 10)
  }
  assert.equal(WORKSHOPS.filter((s) => s.banner).length, 1, 'only one scene carries the "Pick your poison" line')
  assert.equal(WORKSHOPS.filter((s) => s.window).length, 1, 'one scene has a window for the bat')
  for (let k = 1; k <= STOPPER_SHADES; k++) assert.ok(palette[`wsWax${k}`] && palette[`wsCloth${k}`], `shade ${k}`)
})

test('castles walk through the scenes; neighbours differ', () => {
  for (let c = 1; c < CASTLE_COUNT; c++) {
    assert.ok(WORKSHOPS.includes(workshopFor(c)))
    if (c > 1) assert.notEqual(workshopFor(c), workshopFor(c - 1))
  }
  assert.equal(workshopFor(1), WORKSHOPS[0])
  assert.equal(workshopFor(WORKSHOPS.length + 1), WORKSHOPS[0])
})

test('every castle of the current catalog fits its scene, each puzzle exactly once', () => {
  const { instances } = JSON.parse(readFileSync(new URL('../public/catalog/puzzles.json', import.meta.url)))
  for (const { castle, pool } of assignCastles(instances)) {
    if (castle === TUTORIAL_CASTLE) continue
    const scene = workshopFor(castle)
    const placed = placePuzzles(scene, pool, isSpecial)
    assert.ok(placed, `castle ${castle}: ${pool.length} puzzles, ${scene.slots.length} places in ${scene.key}`)
    assert.deepEqual(placed.map((p) => p.inst), pool)
    assert.equal(new Set(placed.map((p) => p.slot)).size, pool.length)
  }
})

test('placePuzzles: too many puzzles -> null; flasks stand before test tubes do', () => {
  const tower = WORKSHOPS.find((s) => s.slots.some(isLying))
  const standing = tower.slots.filter((s) => !isLying(s)).length
  const make = (n, special) => Array.from({ length: n }, (_, k) => ({ id: `p${k}`, board: special(k) ? { special_cells: [{}] } : {} }))
  assert.equal(placePuzzles(tower, make(tower.slots.length + 1, () => false), isSpecial), null)
  // specials at the end of the pool still get standing places
  const pool = make(tower.slots.length, (k) => k >= tower.slots.length - 5)
  const placed = placePuzzles(tower, pool, isSpecial)
  assert.ok(placed.filter((p) => isSpecial(p.inst)).every((p) => !isLying(p.slot)))
  assert.equal(placed.filter((p) => !isLying(p.slot)).length, standing)
  // more specials than standing places: nothing is lost
  const many = placePuzzles(tower, make(tower.slots.length, () => true), isSpecial)
  assert.equal(new Set(many.map((p) => p.slot)).size, tower.slots.length)
})

test('potionLook depends only on the puzzle id', () => {
  const scene = WORKSHOPS[0]
  assert.deepEqual(potionLook('abc', scene, false, false), potionLook('abc', scene, false, false))
  const looks = Array.from({ length: 300 }, (_, k) => potionLook(`id-${k}`, scene, false, k % 4 === 0))
  for (const l of looks) {
    assert.ok(STOPPERS.includes(l.stopper))
    assert.ok(l.shade >= 1 && l.shade <= STOPPER_SHADES)
    assert.ok(Math.abs(l.tilt) <= scene.tilt + 7 && Math.abs(l.dx) <= scene.jitter)
    assert.ok(l.level < -19 && l.level > -53)
  }
  assert.ok(new Set(looks.map((l) => l.stopper)).size === new Set(STOPPERS).size, 'every stopper kind turns up')
  const lively = looks.filter((l) => l.life).length
  assert.ok(lively > 60 && lively < 180, `most potions are still (${lively} of 300 move)`)
  assert.ok(looks.filter((l) => l.life?.kind === 'bolt').length < 60, 'electric flashes are rare')
})
