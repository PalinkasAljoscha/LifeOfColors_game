// Star rating of a win (src/engine/stars.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { starsForWin, minMovesOf, MAX_STARS } from '../src/engine/stars.js'

test('5 stars at the minimum (and below it, if the minimum is not proven)', () => {
  assert.equal(starsForWin(10, 10), MAX_STARS)
  assert.equal(starsForWin(9, 10), MAX_STARS)
})

test('2 stars at exactly 1.4 x min, 1 star above', () => {
  assert.equal(starsForWin(14, 10), 2)
  assert.equal(starsForWin(15, 10), 1)
  assert.equal(starsForWin(7, 5), 2)
  assert.equal(starsForWin(8, 5), 1)
  assert.equal(starsForWin(100, 5), 1)
})

test('linear in between, rounded to the nearest star', () => {
  // min 10: 5 - 3 * extra / 4
  assert.deepEqual([10, 11, 12, 13, 14].map((m) => starsForWin(m, 10)), [5, 4, 4, 3, 2])
  // min 20: 5 - 3 * extra / 8
  assert.deepEqual([21, 22, 23, 24, 25, 26, 27, 28, 29].map((m) => starsForWin(m, 20)),
    [5, 4, 4, 4, 3, 3, 2, 2, 1])
  // min 3: 1.4 x 3 = 4.2 -> 4 moves = 2.5 -> 3 stars, 5 moves = 1 star
  assert.deepEqual([3, 4, 5].map((m) => starsForWin(m, 3)), [5, 3, 1])
})

test('never outside 1..5, never increasing with more moves', () => {
  for (let min = 1; min <= 40; min++) {
    let prev = MAX_STARS
    for (let m = 1; m <= 3 * min + 2; m++) {
      const s = starsForWin(m, min)
      assert.ok(Number.isInteger(s) && s >= 1 && s <= MAX_STARS, `min ${min}, moves ${m}: ${s}`)
      assert.ok(s <= prev, `min ${min}, moves ${m}: ${s} > ${prev}`)
      prev = s
    }
  }
})

test('no rating without a valid moves_to_win_min', () => {
  assert.equal(starsForWin(10, null), null)
  assert.equal(starsForWin(10, undefined), null)
  assert.equal(starsForWin(10, 0), null)
  assert.equal(starsForWin(10, 7.5), null)
  assert.equal(minMovesOf({ moves_to_win_min: 7 }), 7)
  assert.equal(minMovesOf({ meta: { moves_to_win: 7 } }), null)   // meta is never used by the app
  assert.equal(minMovesOf({}), null)
})
