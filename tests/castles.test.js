// Castle hierarchy (src/engine/castles.js): puzzle assignment, required stars, unlocking.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CASTLE_COUNT, assignCastles, requiredStars, castleStates, highestUnlocked, earnedUnlocks, playableUpTo,
} from '../src/engine/castles.js'
import { isPlayable } from '../src/engine/engine.js'

const ranked = (id, difficulty_ranking) => ({ id, difficulty_ranking })
const training = (id, training_position, difficulty_ranking) => ({ id, training_position, difficulty_ranking })

test('every castle needs 20 stars, however many puzzles it holds', () => {
  assert.equal(requiredStars(), 20)
  const states = castleStates([{ castle: 0, pool: [] }, { castle: 1, pool: [{ id: 'a' }] },
    { castle: 2, pool: Array.from({ length: 80 }, (_, i) => ({ id: `b${i}` })) }], () => ({ stars: 0, solved: 0 }))
  assert.deepEqual(states.slice(1).map((s) => s.required), [20, 20])
})

test('training puzzles go to castle 0 in their order, the rest is cut by ranking', () => {
  const all = []
  for (let r = 1; r <= 100; r++) all.push(ranked(`p${r}`, r))
  all.push(training('t2', 2, 50), training('t1', 1))    // a training puzzle may also have a ranking
  all.push({ id: 'x' })                                // neither: left out
  const castles = assignCastles(all.reverse(), 5)
  assert.equal(castles.length, 5)
  assert.deepEqual(castles[0].pool.map((p) => p.id), ['t1', 't2'])
  // the 100 ranked puzzles (t2's own ranking is ignored: it is in training) -> 4 castles of 25
  const sizes = castles.slice(1).map((c) => c.pool.length)
  assert.equal(sizes.reduce((a, b) => a + b), 100)
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1)
  assert.deepEqual(castles[1].pool.slice(0, 3).map((p) => p.id), ['p1', 'p2', 'p3'])
  assert.equal(castles[4].pool.at(-1).id, 'p100')
  // in ranking order across castles, nobody twice, level = castle
  const ids = castles.slice(1).flatMap((c) => c.pool.map((p) => p.id))
  assert.deepEqual(ids, Array.from({ length: 100 }, (_, i) => `p${i + 1}`))
  for (const c of castles) for (const p of c.pool) assert.equal(p.level, c.castle)
  assert.equal(all.find((p) => p.id === 'x').level, undefined)
})

test('the number of castles is only a parameter', () => {
  const all = Array.from({ length: 10 }, (_, i) => ranked(`p${i}`, i + 1))
  for (const n of [2, 3, 11, 30]) {
    const castles = assignCastles(all.map((p) => ({ ...p })), n)
    assert.equal(castles.length, n)
    assert.equal(castles.reduce((a, c) => a + c.pool.length, 0), 10)
  }
  assert.equal(assignCastles(all, undefined).length, CASTLE_COUNT)
})

function sampleCastles(trainingCount = 10) {
  return Array.from({ length: CASTLE_COUNT }, (_, castle) => ({
    castle, pool: Array.from({ length: castle === 0 ? trainingCount : 50 }, (_, i) => ({ id: `c${castle}_${i}` })),
  }))
}

test('castle 0 needs every puzzle won (no stars); then each castle needs the stars of the one below', () => {
  const castles = sampleCastles()
  const stars = { 0: 50, 1: 20, 2: 19, 3: 200 }
  const totals = (solved0) => (pool, c) => ({ stars: stars[c] ?? 0, solved: c === 0 ? solved0 : 0 })
  let states = castleStates(castles, totals(9))
  assert.equal(states[0].required, 10)
  assert.equal(states[0].done, false)                   // 50 stars, but one puzzle not won
  assert.deepEqual(states.slice(0, 2).map((s) => s.unlocked), [true, false])
  assert.equal(highestUnlocked(states), 0)
  states = castleStates(castles, totals(10))
  assert.deepEqual(states.slice(0, 5).map((s) => s.unlocked), [true, true, true, false, false])
  assert.equal(states[1].done, true)
  assert.equal(states[2].done, false)
  // castle 3 has stars (e.g. via a shared ?instance= link) but stays locked: castle 2 not done
  assert.equal(states[3].unlocked, false)
  assert.equal(highestUnlocked(states), 2)
  assert.equal(earnedUnlocks(states), 2)
})

test('without training puzzles castle 1 is open from the start', () => {
  const states = castleStates(sampleCastles(0), () => ({ stars: 0, solved: 0 }))
  assert.deepEqual(states.slice(0, 3).map((s) => s.unlocked), [false, true, false])
  assert.equal(earnedUnlocks(states), 0)
})

test('a castle counter above its puzzles\' stars keeps the castle done', () => {
  // castle 1 counter 25 (>= 20 required) even if its puzzles changed: castle 2 stays open
  const states = castleStates(sampleCastles(), (pool, c) => ({ stars: c === 1 ? 25 : 0, solved: c === 0 ? 10 : 0 }))
  assert.equal(states[1].done, true)
  assert.equal(states[2].unlocked, true)
})

test('playableUpTo: the first unsolved puzzle, or the last when all are solved', () => {
  const pool = ['a', 'b', 'c'].map((id) => ({ id }))
  assert.equal(playableUpTo(pool, () => false), 0)
  assert.equal(playableUpTo(pool, (p) => p.id === 'a'), 1)
  assert.equal(playableUpTo(pool, (p) => p.id === 'b'), 0)   // order is enforced: 'a' first
  assert.equal(playableUpTo(pool, () => true), 2)
})

test('the shipped catalog fills every castle', () => {
  const dir = new URL('../public/catalog/', import.meta.url)
  const index = JSON.parse(readFileSync(new URL('index.json', dir)))
  const all = JSON.parse(readFileSync(new URL(index.file, dir))).instances.filter(isPlayable)
  const castles = assignCastles(all)
  assert.equal(castles.reduce((a, c) => a + c.pool.length, 0), index.count)
  for (const c of castles) assert.ok(c.pool.length > 0, `castle ${c.castle} is empty`)
})
