// Castle hierarchy (src/engine/castles.js): puzzle assignment, required stars, unlocking.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CASTLE_COUNT, PUZZLES_PER_CASTLE, assignCastles, catalogHasCastles, requiredStars, castleStates,
  highestUnlocked, earnedUnlocks,
} from '../src/engine/castles.js'
import { isPlayable } from '../src/engine/engine.js'

const inst = (id, level, seq) => ({ id, level, seq })

test('required stars are 30% of the stars a castle can give', () => {
  assert.equal(requiredStars(50), 75)
  assert.equal(requiredStars(51), 77)
  assert.equal(requiredStars(1), 2)
  assert.equal(requiredStars(0), 1)
})

test('temporary mapping cuts (level, seq) order into castles of 50', () => {
  const all = []
  for (let i = 0; i < 1600; i++) all.push(inst(`p${i}`, 1 + (i % 5), i))
  const castles = assignCastles(all, false)
  assert.equal(castles.length, CASTLE_COUNT)
  for (const c of castles) assert.equal(c.pool.length, PUZZLES_PER_CASTLE)
  // castle 0 holds the first factory-level-1 puzzles by seq
  assert.ok(castles[0].pool.every((p) => p.level === 1))
  assert.deepEqual(castles[0].pool.slice(0, 2).map((p) => p.id), ['p0', 'p5'])
  // nobody twice
  const ids = castles.flatMap((c) => c.pool.map((p) => p.id))
  assert.equal(new Set(ids).size, ids.length)
})

test('native mapping uses instance.level as castle', () => {
  const index = { levels: Array.from({ length: 30 }, (_, l) => ({ level: l })) }
  assert.equal(catalogHasCastles(index), true)
  assert.equal(catalogHasCastles({ levels: [1, 2, 3, 4, 5].map((level) => ({ level })) }), false)
  const castles = assignCastles([inst('a', 3, 2), inst('b', 3, 1), inst('c', 0, 1)], true)
  assert.deepEqual(castles[3].pool.map((p) => p.id), ['b', 'a'])
  assert.deepEqual(castles[0].pool.map((p) => p.id), ['c'])
})

test('castles 0 and 1 are open; each further castle needs the stars of the one below', () => {
  const castles = Array.from({ length: CASTLE_COUNT }, (_, castle) => ({
    castle, pool: Array.from({ length: 50 }, (_, i) => inst(`c${castle}_${i}`, castle, i)),
  }))
  const stars = { 0: 0, 1: 75, 2: 74, 3: 200 }
  const states = castleStates(castles, (pool) => stars[pool[0].level] ?? 0)
  assert.deepEqual(states.slice(0, 5).map((s) => s.unlocked), [true, true, true, false, false])
  assert.equal(states[1].done, true)
  assert.equal(states[2].done, false)
  // castle 3 has stars (e.g. via a shared ?instance= link) but stays locked: castle 2 not done
  assert.equal(states[3].unlocked, false)
  assert.equal(highestUnlocked(states), 2)
  assert.equal(earnedUnlocks(states), 1)
  // castle 0 (tutorial) does not gate castle 1
  assert.equal(castleStates(castles, () => 0)[1].unlocked, true)
})

test('the shipped catalog fills all 30 castles', () => {
  const dir = new URL('../public/catalog/', import.meta.url)
  const index = JSON.parse(readFileSync(new URL('index.json', dir)))
  const all = index.levels.flatMap((l) =>
    JSON.parse(readFileSync(new URL(l.file, dir))).instances.filter(isPlayable))
  const castles = assignCastles(all, catalogHasCastles(index))
  for (const c of castles) assert.ok(c.pool.length >= PUZZLES_PER_CASTLE, `castle ${c.castle}: ${c.pool.length}`)
})
