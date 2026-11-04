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

/** The example field of the first training puzzle's explanation (components/TrainingIntro.jsx):
 *  the cell with the most on-board neighbours (an inner cell where possible) that is neither a
 *  start cell nor the goal and whose neighbourhood does not contain the goal; ties go to the
 *  cell nearest the top left. Returns [r, c]. */
export function introExampleCell(inst) {
  const { rows, cols } = inst.board
  const [gr, gc] = inst.goal.at
  const starts = new Set((inst.board.start ?? []).map((s) => s.at.join(',')))
  let best = null
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (starts.has(`${r},${c}`) || (r === gr && c === gc)) continue
      const nearGoal = Math.abs(r - gr) <= 1 && Math.abs(c - gc) <= 1
      const score = neighbourCells(r, c, rows, cols).length - (nearGoal ? 9 : 0)
      if (!best || score > best.score) best = { score, at: [r, c] }
    }
  }
  return best ? best.at : [0, 0]
}

/** Where the note card goes: ON the board, but never over the tapped cell or its neighbours.
 *  It is centred horizontally on the neighbourhood (the block of the tapped cell and its
 *  neighbours, at most 3 x 3 cells) and placed in the board's free space right ABOVE that block, or
 *  right BELOW it when the card does not fit above. When it fits on neither side, it goes on the
 *  side with more room and may stick out of the board a little (it never covers the block).
 *  Horizontally it stays inside the board (centred on it if wider).
 *  hood = { left, top, right, bottom } (the block), card = { width, height },
 *  board = { left, top, right, bottom }, all in page px; gap = space between block and card.
 *  Returns { x, y, side } -- the card's centre and 'above' | 'below'. */
export function noteCardPlace(hood, card, board, gap = 6) {
  const roomAbove = hood.top - board.top - gap
  const roomBelow = board.bottom - hood.bottom - gap
  const side = card.height <= roomAbove ? 'above'
    : card.height <= roomBelow ? 'below'
      : roomAbove >= roomBelow ? 'above' : 'below'
  const halfH = card.height / 2
  // in the middle of the free space when it fits there, else right next to the block
  const y = side === 'above'
    ? (card.height <= roomAbove ? board.top + (roomAbove) / 2 : hood.top - gap - halfH)
    : (card.height <= roomBelow ? hood.bottom + gap + roomBelow / 2 : hood.bottom + gap + halfH)
  const halfW = card.width / 2
  const x = card.width >= board.right - board.left ? (board.left + board.right) / 2
    : Math.min(Math.max((hood.left + hood.right) / 2, board.left + halfW), board.right - halfW)
  return { x, y, side }
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
