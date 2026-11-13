import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearPath, overlaps, placeFlat } from '../src/components/mapClear.js'

const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 })

test('boxes overlap, or come too close', () => {
  assert.ok(overlaps(box(0, 0, 10, 10), box(5, 5, 20, 20)))
  assert.ok(!overlaps(box(0, 0, 10, 10), box(12, 0, 20, 10)))
  assert.ok(overlaps(box(0, 0, 10, 10), box(12, 0, 20, 10), 3))
})

test('a box near a path, or clear of it', () => {
  const a = { x: 0, y: 200 }, b = { x: 100, y: 0 }
  assert.ok(nearPath(box(-5, 190, 5, 210), a, b, 8))                    // on its start
  assert.ok(nearPath(box(45, 95, 55, 105), a, b, 8))                    // on its middle
  assert.ok(!nearPath(box(60, 150, 90, 190), a, b, 8))                  // well beside it
  assert.ok(!nearPath(box(300, 0, 320, 20), a, b, 8))                   // far away
})

test('flat things take their first free spot, or none', () => {
  const taken = [box(0, 0, 50, 50)]
  const paths = [[{ x: 200, y: 0 }, { x: 200, y: 300 }]]
  const field = [box(10, 10, 40, 40), box(80, 10, 110, 40)]            // its spot, its mirror image
  const again = [box(80, 10, 110, 40), box(10, 10, 40, 40)]
  const onPath = [box(190, 100, 230, 130)]
  assert.deepEqual(placeFlat([field, again, onPath], taken, paths, { gap: 2, reach: 8 }), [1, -1, -1])
  assert.equal(taken.length, 2)                                          // the placed one is taken now
})

test('a flat thing stays inside the map', () => {
  const bounds = box(0, 0, 100, 100)
  assert.deepEqual(placeFlat([[box(-10, 10, 20, 30), box(10, 10, 40, 30)]], [], [], { gap: 2, reach: 8, bounds }), [1])
})
