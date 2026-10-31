// Training castle (castle 0) helps -- pure helpers, no React / Phaser, so the tests can use them.
//
// The board shows (src/game/GameScene.js, registry 'training'):
//   * at the start, the goal object blinking in the gold-framed goal cell for INTRO_MS, with a
//     pointing hand next to it;
//   * on hover, the neighbours of the cell under the pointer slightly brighter (neighbourCells).
// The game screen (components/GameScreen.jsx, components/TrainingNotes.jsx) keeps a scroll of every
// transformation the player has observed: the coloured neighbours of a changed cell -> its new
// state (observation). It lies rolled up below the board and unrolls over the board after a move
// that shows a NEW transformation (rolling up again after NOTES_AUTO_CLOSE_MS) or when tapped. A
// move that repeats a noted transformation does not open it.

import { TABLE_ORDER } from './engine.js'

export const INTRO_MS = 2000
export const NOTES_AUTO_CLOSE_MS = 4000   // the scroll unrolled by a move rolls up again after this

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
