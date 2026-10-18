// The original Maze Inc. game (src/games/LifeOfColors/GameScene.js, branch color-rules-2) had one
// hard-coded rule. Expressed as a table, the new engine must play it exactly like the old code.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyClick, TABLE_ORDER } from '../src/engine/engine.js'

// Old rule, verbatim logic: green>=1 & orange>=1 & no blue -> BLUE; blue>=1 & no orange & no green
// -> GREEN; no green & no blue -> ORANGE; else unchanged.
function oldApplyClick(board, r, c) {
  const rows = board.length, cols = board[0].length
  let g = 0, o = 0, b = 0
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      const s = board[nr][nc]
      if (s === 'G') g++; else if (s === 'O') o++; else if (s === 'B') b++
    }
  }
  let ns
  if (g >= 1 && o >= 1 && b === 0) ns = 'B'
  else if (b >= 1 && o === 0 && g === 0) ns = 'G'
  else if (g === 0 && b === 0) ns = 'O'
  else ns = board[r][c]
  if (ns === board[r][c]) return null
  const nb = board.map((row) => row.slice()); nb[r][c] = ns; return nb
}

const CLASSIC_TABLE = TABLE_ORDER.map(([o, b, g]) => {
  if (g >= 1 && o >= 1 && b === 0) return 'B'
  if (b >= 1 && o === 0 && g === 0) return 'G'
  if (g === 0 && b === 0) return 'O'
  return 'X'
}).join('')

test('classic Maze Inc. rule = engine with the classic table', () => {
  let seed = 7
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed % n }
  for (let game = 0; game < 300; game++) {
    const rows = 1 + rnd(9), cols = 1 + rnd(6)
    let a = Array.from({ length: rows }, () => Array(cols).fill('U'))
    a[0][0] = 'G'
    let b = a.map((row) => row.slice())
    for (let k = 0; k < 120; k++) {
      const r = rnd(rows), c = rnd(cols)
      const na = oldApplyClick(a, r, c), nb = applyClick(b, r, c, CLASSIC_TABLE)
      assert.equal(na === null, nb === null)
      if (na) { a = na; b = nb; assert.deepEqual(a, b) }
    }
  }
})
