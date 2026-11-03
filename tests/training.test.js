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

test('noteCardPlace: on the board above the neighbourhood, below when it does not fit, never over it', async () => {
  const { noteCardPlace } = await import('../src/engine/training.js')
  const board = { left: 20, top: 100, right: 380, bottom: 550 }     // 5 rows of 90 px
  const card = { width: 200, height: 60 }
  const clear = (p, hood) => p.y + card.height / 2 <= hood.top || p.y - card.height / 2 >= hood.bottom
  const onBoard = (p) => p.y - card.height / 2 >= board.top && p.y + card.height / 2 <= board.bottom
  // block = rows 1..3: one free row above -> above, on the board
  let hood = { left: 20, right: 290, top: 190, bottom: 460 }
  let p = noteCardPlace(hood, card, board)
  assert.equal(p.side, 'above'); assert.ok(clear(p, hood) && onBoard(p))
  // block = rows 0..1 (tap in the top row): no room above -> below, on the board
  hood = { left: 110, right: 380, top: 100, bottom: 280 }
  p = noteCardPlace(hood, card, board)
  assert.equal(p.side, 'below'); assert.ok(clear(p, hood) && onBoard(p))
  // horizontally centred on the block, kept inside the board
  assert.equal(p.x, 245)
  assert.equal(noteCardPlace({ left: 290, right: 380, top: 280, bottom: 460 }, card, board).x, board.right - card.width / 2)
  // no room on either side (block = whole board height): never covers the block
  hood = { left: 20, right: 290, top: 100, bottom: 550 }
  p = noteCardPlace(hood, card, board)
  assert.ok(clear(p, hood))
})
