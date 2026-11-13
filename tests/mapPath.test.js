import { test } from 'node:test'
import assert from 'node:assert/strict'
import { curvePoint, pathStones } from '../src/components/mapPath.js'

const a = { x: 40, y: 400 }, b = { x: 180, y: 250 }

test('a path is the same stones on every visit', () => {
  assert.deepEqual(pathStones(a, b, 7), pathStones(a, b, 7))
  assert.notDeepEqual(pathStones(a, b, 7), pathStones(a, b, 8))
})

test('a path is many four-cornered stones with a number 0..1 each', () => {
  const stones = pathStones(a, b, 7)
  assert.ok(stones.length > 20, `only ${stones.length} stones`)
  for (const s of stones) {
    assert.match(s.d, /^M[-\d. ]+(L[-\d. ]+){3}Z$/)
    assert.ok(s.k >= 0 && s.k < 1)
  }
})

test('the stones stay near the curve, from one place to the other', () => {
  const curve = Array.from({ length: 201 }, (_, i) => curvePoint(a, b, i / 200))
  assert.deepEqual(curve[0], a)
  assert.deepEqual(curve[200], b)
  for (const s of pathStones(a, b, 7)) {
    const nums = s.d.match(/-?\d+(\.\d+)?/g).map(Number)
    for (let i = 0; i < nums.length; i += 2) {
      const near = Math.min(...curve.map((p) => Math.hypot(p.x - nums[i], p.y - nums[i + 1])))
      assert.ok(near < 14, `a stone corner ${near.toFixed(1)} px off the path`)
    }
  }
})
