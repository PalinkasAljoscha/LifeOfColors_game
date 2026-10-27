// Session-only played/solved marks of the level grid (src/engine/catalog.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { markPlayed, markSolved, playState } from '../src/engine/catalog.js'

test('playState: unseen -> played -> solved', () => {
  const a = { id: 'loc_test_a' }
  const b = { id: 'loc_test_b' }
  assert.equal(playState(a), null)
  markPlayed(a)
  assert.equal(playState(a), 'played')
  markSolved(a)
  assert.equal(playState(a), 'solved')
  markPlayed(a)                       // opening it again keeps the check
  assert.equal(playState(a), 'solved')
  assert.equal(playState(b), null)
})

test('playState: marks survive the random pick history trimming', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ id: `loc_trim_${i}` }))
  for (const inst of many) markPlayed(inst, 10)   // history keeps only 5 of these
  assert.ok(many.every((inst) => playState(inst) === 'played'))
})
