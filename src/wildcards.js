// WILDCARDS -- a way up the map for strong players (2026-11-18).
//
// A few locked places carry a wildcard (a playing card with a key, components/WildcardCard.jsx)
// next to them on the home map. Tapping one opens the wildcard scroll (WildcardScroll.jsx): every
// wildcard whose place is still locked, each with its challenge puzzle. Winning that puzzle with
// 5 stars ("Wildcard try" on the game screen; tries are unlimited) opens the wildcard's place and
// every place on the map rows below it (wildcardOpens). The opened places keep 0 stars: they are
// open, not done -- what lies above them still needs its 20 stars the usual way. The opened places
// are saved as their own list (engine/progress.js `w`), never as stars. The puzzle's own stars count
// for its place as usual. Telemetry records the play as pick 'grid'.
//
// The CONFIG below: one wildcard on each of the map rows 3, 5, 8 and 9 (row 7, House of the Tulip,
// level 19, dropped 2026-11-19; the upper rows are
// reached the usual way). `level` = the place (castle number = level graph node id), `puzzle` = the
// challenge (instance id). Chosen from the export of 2026-11-13: per row the place leading to the
// most places above, and its hardest puzzle without special cells (except level 22, Argon Castle:
// Pondering Dune, chosen by hand on 2026-11-19). If an export moves the puzzle
// away, the place's hardest puzzle (without special cells, if it has one) is used instead.
// No React here, so the tests can load it.

export const WILDCARDS = [
  { level: 6, puzzle: 'loc_6653af70ea938070' },
  { level: 13, puzzle: 'loc_e772c6bfcd967426' },
  { level: 22, puzzle: 'loc_fab22bddba31f028' },   // Argon Castle: Pondering Dune (special cell; changed 2026-11-19)
  { level: 24, puzzle: 'loc_ef3c7e69b5c6cb47' },
]

export const WILDCARD_STARS = 5          // a wildcard needs a perfect win

const special = (inst) => (inst.board?.special_cells?.length ?? 0) > 0

/** The places a won wildcard opens: its own place and every place on a lower row of the level
 *  graph (engine/levelGraph.js), ascending. */
export function wildcardOpens(graph, level) {
  const row = graph.layer[level]
  if (row === undefined) return []
  return graph.layer.map((l, c) => (l < row || c === level ? c : null)).filter((c) => c !== null)
}

/** The challenge of a wildcard: its configured puzzle if it is still in the wildcard's place, else
 *  the place's hardest puzzle without special cells, else its hardest; null if the place is empty.
 *  castles = [{ castle, pool }] (pools in ranking order). */
export function wildcardPuzzle(castles, entry) {
  const pool = castles[entry.level]?.pool ?? []
  if (!pool.length) return null
  return pool.find((inst) => inst.id === entry.puzzle)
    ?? [...pool].reverse().find((inst) => !special(inst))
    ?? pool[pool.length - 1]
}

/** The wildcards a player can try now: those whose place is still locked, with their challenge:
 *  [{ level, inst }] in config order. states = engine/castles.js castleStates. */
export function availableWildcards(states, castles, wildcards = WILDCARDS) {
  return wildcards
    .filter((w) => states[w.level] && !states[w.level].unlocked)
    .map((w) => ({ level: w.level, inst: wildcardPuzzle(castles, w) }))
    .filter((w) => w.inst !== null)
}
