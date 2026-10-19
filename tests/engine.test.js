// Golden vectors from the factory (tests/vectors.json, written by export_catalog.py):
// the JS engine must reproduce the factory's reference engine click by click.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initialBoard, applyClick, isWon, TABLE_ORDER, tableIndex } from '../src/engine/engine.js'

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
  for (const v of vectors) {
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
