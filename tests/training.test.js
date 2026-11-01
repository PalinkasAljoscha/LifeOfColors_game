import { test } from 'node:test'
import assert from 'node:assert/strict'
import { neighbourCells, observation, addObservation, flightSources } from '../src/engine/training.js'
import { tableIndex } from '../src/engine/engine.js'

test('neighbourCells: corner, edge and inner cells', () => {
  assert.equal(neighbourCells(0, 0, 5, 4).length, 3)
  assert.equal(neighbourCells(0, 1, 5, 4).length, 5)
  assert.equal(neighbourCells(2, 1, 5, 4).length, 8)
  assert.deepEqual(neighbourCells(4, 3, 5, 4).sort(), [[3, 2], [3, 3], [4, 2]])
})

test('observation decodes the rule entry; repeats are not added twice', () => {
  const obs = observation(tableIndex(2, 1, 0), 'G')
  assert.deepEqual(obs.counts, { O: 2, B: 1, G: 0 })
  assert.equal(obs.result, 'G')
  let { notes, isNew } = addObservation([], obs)
  assert.ok(isNew)
  ;({ notes, isNew } = addObservation(notes, observation(tableIndex(2, 1, 0), 'G')))
  assert.ok(!isNew)
  assert.equal(notes.length, 1)
  ;({ notes, isNew } = addObservation(notes, observation(tableIndex(0, 0, 1), 'B')))
  assert.ok(isNew)
  assert.equal(notes.length, 2)
})

test('flightSources: coloured neighbours to their card slots, the changed cell to R', () => {
  const board = [
    ['O', 'B', 'U'],
    ['O', 'G', 'U'],
    ['U', 'U', 'U'],
  ]
  // move on (1, 1) turned it G: neighbours O (0,0), O (1,0), B (0,1)
  assert.deepEqual(flightSources(board, 1, 1), [
    { r: 0, c: 0, state: 'O', slot: 'O0' },
    { r: 1, c: 0, state: 'O', slot: 'O1' },
    { r: 0, c: 1, state: 'B', slot: 'B0' },
    { r: 1, c: 1, state: 'G', slot: 'R' },
  ])
  // more than 3 of a kind share one slot ("4 × O")
  const full = [['O', 'O', 'O'], ['O', 'B', 'U'], ['U', 'U', 'U']]
  assert.ok(flightSources(full, 1, 1).filter((f) => f.state === 'O').every((f) => f.slot === 'O0'))
})
