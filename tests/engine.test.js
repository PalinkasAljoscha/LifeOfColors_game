// Golden vectors from the factory (tests/vectors.json, written by export_catalog.py):
// the JS engine must reproduce the factory's reference engine click by click.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialBoard, applyClick, isWon, TABLE_ORDER, tableIndex, initialState, tap, isPlayable } from '../src/engine/engine.js'

const { vectors } = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url)))

test('table order: 165 triples, o outer / b middle / g inner', () => {
  assert.equal(TABLE_ORDER.length, 165)
  assert.deepEqual(TABLE_ORDER[0], [0, 0, 0])
  assert.deepEqual(TABLE_ORDER[1], [0, 0, 1])
  assert.deepEqual(TABLE_ORDER[164], [8, 0, 0])
  TABLE_ORDER.forEach(([o, b, g], i) => assert.equal(tableIndex(o, b, g), i))
})

test(`golden vectors (${vectors.length}) replay identically`, () => {
  assert.ok(vectors.length > 0)
  for (const v of vectors.filter((x) => x.clicks)) {
    let board = initialBoard(v.instance)
    let firstWon = null
    v.clicks.forEach(([r, c], i) => {
      const next = applyClick(board, r, c, v.instance.rule.table)
      assert.equal(next !== null, v.changed[i], `${v.instance.id} click ${i}`)
      if (next) {
        board = next
        if (firstWon === null && isWon(v.instance, board)) firstWon = i
      }
    })
    assert.deepEqual(board.map((row) => row.join('')), v.final_board, v.instance.id)
    assert.equal(firstWon, v.first_won_at, v.instance.id)
  }
})

test('start cell hidden only when the switch is on and start_cell_required === false', async () => {
  const { startHidden } = await import('../src/engine/engine.js')
  const inst = vectors[0].instance
  const withFlag = (f) => ({ ...inst, start_cell_required: f })
  assert.equal(startHidden(withFlag(false), true), true)
  assert.equal(startHidden(withFlag(false), false), false)
  assert.equal(startHidden(withFlag(true), true), false)
  assert.equal(startHidden(withFlag(null), true), false)
  assert.equal(startHidden({ ...inst, start_cell_required: undefined }, true), false)
  const hidden = initialBoard(inst, { hideStart: true })
  assert.ok(hidden.every((row) => row.every((v) => v === 'U')))
  assert.deepEqual(initialBoard(inst), initialBoard(inst, { hideStart: false }))
})

// Special cells (kind 'special' / 'special-random'): every tap's event, board after the tap, the
// board shown before an explosion, and the win -- exactly as the factory's instance.tap.
const special = vectors.filter((x) => x.taps)
test(`special-cell golden vectors (${special.length}) replay identically`, (t) => {
  if (!special.length) return t.skip('no special-cell vectors in tests/vectors.json (export from the factory)')
  const types = new Set()
  for (const v of special) {
    const inst = v.instance
    assert.ok(isPlayable(inst), `${inst.id} must be playable`)
    types.add(inst.board.special_cells[0].type)
    let state = initialState(inst, { hideStart: v.hide_start })
    let wonAt = null
    v.taps.forEach(([r, c], i) => {
      const res = tap(inst, state, r, c)
      const where = `${inst.id} (${v.kind}, hide_start ${v.hide_start}) tap ${i} at ${r},${c}`
      assert.equal(res.event, v.events[i], where)
      assert.deepEqual(res.state.board.map((row) => row.join('')), v.boards[i], where)
      assert.deepEqual(res.shown ? res.shown.map((row) => row.join('')) : null, v.shown[i], where)
      if (res.won && wonAt === null) wonAt = i
      state = res.state
    })
    assert.equal(wonAt, v.won_at, inst.id)
  }
  assert.deepEqual([...types].sort(), ['blocked', 'bomb', 'clock', 'mirror'])
})

test('tap() on a core instance equals applyClick', () => {
  for (const v of vectors.filter((x) => x.clicks).slice(0, 20)) {
    let state = initialState(v.instance)
    let board = initialBoard(v.instance)
    for (const [r, c] of v.clicks) {
      const res = tap(v.instance, state, r, c)
      const next = applyClick(board, r, c, v.instance.rule.table)
      assert.equal(res.event, next ? 'move' : 'noop')
      if (next) board = next
      state = res.state
      assert.deepEqual(state.board, board)
    }
  }
})

