// Training castle (castle 0) helps -- pure helpers, no React / Phaser, so the tests can use them.
//
// The board shows (src/game/GameScene.js, registry 'training'):
//   * at the start, the goal object blinking in the gold-framed goal cell for INTRO_MS, with a
//     pointing hand next to it;
//   * on hover, the neighbours of the cell under the pointer slightly brighter (neighbourCells).
// The game screen (components/GameScreen.jsx, components/TrainingNotes.jsx) keeps a notebook of
// every transformation the player has observed: the coloured neighbours of a changed cell -> its
// new state (observation). Its top peeks in at the bottom of the screen; it opens when tapped. A move that
// shows a NEW transformation plays the note animation (components/NoteFlight.jsx): the neighbours
// light up, the neighbour objects and the changed cell are circled, fly into a note card that
// forms the rule (flightSources), and the card drops into the notebook. A move that repeats
// a noted transformation shows nothing.

import { TABLE_ORDER } from './engine.js'

export const INTRO_MS = 2000
export const NOTE_MAX_REPEAT = 3   // a note draws up to 3 neighbours of one kind one by one, more as "4 × X"

/** [[r, c], ...] of the up-to-8 Moore neighbours of (r, c) that lie on a rows x cols board. */
export function neighbourCells(r, c, rows, cols) {
  const out = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc])
    }
  }
  return out
}

/** The transformation a cell-changing click showed: { key, counts: { O, B, G }, result }.
 *  rule = the rule-table index the click looked up (GameScene's boardClick `rule`), result = the
 *  cell's new state ('U' | 'O' | 'B' | 'G'). Same key = same transformation (same rule entry
 *  and outcome; the outcome of an entry never changes within a puzzle). */
export function observation(rule, result) {
  const [O, B, G] = TABLE_ORDER[rule]
  return { key: `${rule}:${result}`, counts: { O, B, G }, result }
}

/** notes (array of observations) after observing `obs`: appended if new, unchanged otherwise.
 *  Returns { notes, isNew }. */
export function addObservation(notes, obs) {
  if (notes.some((n) => n.key === obs.key)) return { notes, isNew: false }
  return { notes: [...notes, obs], isNew: true }
}

/** The objects that fly into the note card of a move on (r, c): every coloured neighbour and the
 *  changed cell itself, each with the card slot it lands in: '<state><i>' for the i-th neighbour
 *  of that state (reading order; all of them in '<state>0' when the card writes "n × X", i.e.
 *  more than NOTE_MAX_REPEAT), 'R' for the changed cell (the result). board = after the move.
 *  Returns [{ r, c, state, slot }]. */
export function flightSources(board, r, c) {
  const rows = board.length, cols = board[0].length
  const byState = { O: [], B: [], G: [] }
  for (const [nr, nc] of neighbourCells(r, c, rows, cols)) {
    const v = board[nr][nc]
    if (byState[v]) byState[v].push([nr, nc])
  }
  const out = []
  for (const s of ['O', 'B', 'G']) {
    const many = byState[s].length > NOTE_MAX_REPEAT
    byState[s].sort((a, b) => a[0] - b[0] || a[1] - b[1]).forEach(([nr, nc], i) => {
      out.push({ r: nr, c: nc, state: s, slot: `${s}${many ? 0 : i}` })
    })
  }
  out.push({ r, c, state: board[r][c], slot: 'R' })
  return out
}
