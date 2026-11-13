// Castles: the level hierarchy shown as a map on the home screen.
//
// The castles and the paths between them come from the level graph (engine/levelGraph.js, shipped
// by the factory as public/catalog/level_graph.json; without one: CASTLE_COUNT castles in a line,
// src/config.js). Castle 0 is the training castle:
// open from the start, played in a fixed order (puzzle k can only be played once puzzles 1..k-1
// are won: playableUpTo), and done once EVERY puzzle is won (stars do not count). Castle 1 is
// open from the start too: it does not wait for the training castle. Every other castle opens
// once ANY castle with a path into it (its parents in the graph) is open AND done: the player has
// collected its required stars there (UNLOCK_STARS, 20, however many puzzles it holds).
// Review: castleStates(..., { allOpen: true }) opens every castle (App: ?map=all in the URL).
// Unlocking is derived from the per-castle star counters (engine/progress.js castleStars), not
// from the stars of the puzzles currently in a castle: a counter only grows, so a castle stays
// done when puzzles move between castles after a new catalog.
//
// Which puzzles belong to which castle (assignCastles) -- the factory ships an order, not levels:
//   * castle 0: every playable instance with a training_position, in that order;
//   * castles 1..count-1 (count = the graph's sites): every other playable instance with a
//     difficulty_ranking, in ranking order (1 = easiest), cut into count - 1 consecutive castles
//     of nearly equal size (sizes differ by at most one), in castle-number order -- the graph's
//     ids grow from the bottom of the map to the top. Inside a castle the puzzles stay in
//     ranking order.
// A new catalog can move puzzles to another castle; their own best stars go with them.
// Pure functions (no React, no fetch) so the tests can use them.

import { CASTLE_COUNT, UNLOCK_STARS } from '../config.js'
import { chainGraph } from './levelGraph.js'

export { CASTLE_COUNT, UNLOCK_STARS }
export const TUTORIAL_CASTLE = 0

/** Split playable instances into castles: [{ castle, pool }] of length `count`. Sets
 *  `inst.level` = its castle number on every assigned instance (the app's own field: used for
 *  telemetry `level` and for the castle star counters); instances without a training_position
 *  or difficulty_ranking are left out. */
export function assignCastles(instances, count = CASTLE_COUNT) {
  const pools = Array.from({ length: count }, () => [])
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const training = instances.filter((i) => Number.isInteger(i.training_position))
    .sort((a, b) => a.training_position - b.training_position || byId(a, b))
  const ranked = instances.filter((i) => !Number.isInteger(i.training_position) && Number.isInteger(i.difficulty_ranking))
    .sort((a, b) => a.difficulty_ranking - b.difficulty_ranking || byId(a, b))
  pools[TUTORIAL_CASTLE].push(...training)
  const n = count - 1
  if (n > 0) ranked.forEach((inst, k) => pools[1 + Math.floor((k * n) / ranked.length)].push(inst))
  pools.forEach((pool, castle) => { for (const inst of pool) inst.level = castle })
  return pools.map((pool, castle) => ({ castle, pool }))
}

/** Stars needed in a castle to open the next one: UNLOCK_STARS, independent of its puzzle count. */
export function requiredStars() {
  return UNLOCK_STARS
}

/** State of every castle: [{ castle, count, stars, required, done, unlocked, fromStart, training,
 *  solved, parents, children }]. `graph` (engine/levelGraph.js) says which castles lead into which
 *  (default: one line); allOpen = every castle with puzzles is open (review). `totalsIn(pool, castle)` returns { stars, solved }: stars = the castle's star counter
 *  (engine/progress.js castleStars), solved = solved puzzles of the pool (progressTotals). Castle 0
 *  is the training castle: required = every puzzle, done = all solved. Castles 0 and 1 are open
 *  from the start (castle 1 does not wait for training). fromStart = open without having earned it. */
export function castleStates(castles, totalsIn, graph = chainGraph(Math.max(2, castles.length)), { allOpen = false } = {}) {
  const out = []
  const openAtStart = 2                       // castles 0 (training) and 1
  for (const { castle, pool } of castles) {
    const { stars, solved } = totalsIn(pool, castle)
    const isTraining = castle === TUTORIAL_CASTLE
    const required = isTraining ? pool.length : requiredStars()
    const done = isTraining ? pool.length > 0 && solved >= pool.length : stars >= required
    const parents = graph.parents[castle] ?? []
    const fromStart = castle < openAtStart
    const unlocked = pool.length > 0 && (fromStart || allOpen
      || parents.some((p) => out[p]?.unlocked === true && out[p].done === true))
    out.push({
      castle, count: pool.length, stars, solved, required, done, unlocked, fromStart, training: isTraining,
      parents, children: graph.children[castle] ?? [],
    })
  }
  return out
}

/** Training castle: index of the last puzzle of `pool` that may be played -- the first one not
 *  solved yet (all before it are solved), or the last one when all are solved.
 *  isSolved(inst, index) -> boolean. */
export function playableUpTo(pool, isSolved) {
  const next = pool.findIndex((inst, i) => !isSolved(inst, i))
  return next === -1 ? pool.length - 1 : next
}

/** Highest unlocked castle number (at least 0). */
export function highestUnlocked(states) {
  let h = 0
  for (const s of states) if (s.unlocked) h = s.castle
  return h
}

/** Number of castles opened by play (beyond the ones open from the start). */
export function earnedUnlocks(states) {
  return states.filter((s) => s.unlocked && !s.fromStart).length
}
