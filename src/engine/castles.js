// Castles: the level hierarchy shown as a map on the home screen.
//
// 30 castles (0..29), stacked bottom to top. Castle n opens once castle n-1 is open AND done:
// the player has collected its required stars there (UNLOCK_SHARE of the stars it can give:
// 5 per puzzle, so 75 of 250 for 50 puzzles).
// Training rules (catalog with native castles, see catalogHasCastles): castle 0 is the training
// castle -- open from the start, played in a fixed order (puzzle k can only be played once puzzles
// 1..k-1 are won: playableUpTo), and done once EVERY puzzle is won (stars do not count). Castle 1
// then opens only when castle 0 is done. Without training rules (older catalog, temporary
// mapping): castles 0 and 1 are open from the start, castle 0 is done like any other.
// Unlocking is derived from the saved results (engine/progress.js) -- nothing extra is stored.
//
// Which puzzles belong to which castle:
//   * catalog with CASTLE_COUNT levels numbered 0..CASTLE_COUNT-1 (the planned factory export):
//     castle = instance.level. Inside a castle: instance.level_order first (hand-set order, e.g.
//     the training castle), then seq.
//   * older catalog (5 levels, today): TEMPORARY mapping -- every playable puzzle sorted by
//     (factory level, seq) and cut into chunks of PUZZLES_PER_CASTLE; puzzles beyond the last
//     castle are left out. Stable as long as the catalog does not change.
// Pure functions (no React, no fetch) so the tests can use them.

import { MAX_STARS } from './stars.js'

export const CASTLE_COUNT = 30
export const PUZZLES_PER_CASTLE = 50
export const UNLOCK_SHARE = 0.3
export const TUTORIAL_CASTLE = 0
export const OPEN_AT_START = 2          // castles 0 and 1

/** True if the catalog index already numbers its levels as castles (0..CASTLE_COUNT-1). */
export function catalogHasCastles(index) {
  const levels = new Set((index?.levels ?? []).map((l) => l.level))
  for (let c = 0; c < CASTLE_COUNT; c++) if (!levels.has(c)) return false
  return true
}

/** Split playable instances into castles: [{ castle, pool }] (pool in seq order).
 *  `nativeLevels`: true = castle is instance.level (see catalogHasCastles). */
export function assignCastles(instances, nativeLevels) {
  const bySeq = (a, b) => (a.level - b.level) || ((a.seq ?? 0) - (b.seq ?? 0)) || (a.id < b.id ? -1 : 1)
  const sorted = [...instances].sort(bySeq)
  const pools = Array.from({ length: CASTLE_COUNT }, () => [])
  if (nativeLevels) {
    for (const inst of sorted) if (inst.level >= 0 && inst.level < CASTLE_COUNT) pools[inst.level].push(inst)
  } else {
    sorted.forEach((inst, i) => {
      const c = Math.floor(i / PUZZLES_PER_CASTLE)
      if (c < CASTLE_COUNT) pools[c].push(inst)
    })
  }
  const byOrder = (a, b) => (a.level_order ?? Infinity) - (b.level_order ?? Infinity) || (a.seq ?? 0) - (b.seq ?? 0)
  return pools.map((pool, castle) => ({ castle, pool: pool.sort(byOrder) }))
}

/** Stars needed in a castle with `count` puzzles to open the next one (at least 1). */
export function requiredStars(count) {
  return Math.max(1, Math.ceil(UNLOCK_SHARE * MAX_STARS * count))
}

/** State of every castle: [{ castle, count, stars, required, done, unlocked, fromStart, training,
 *  solved }]. `totalsIn(pool)` returns { stars, solved } over a pool (progressTotals). With
 *  `training` (see the top of this file) castle 0 is the training castle: required = every puzzle,
 *  done = all solved, and castle 1 waits for it. fromStart = open without having earned it. */
export function castleStates(castles, totalsIn, { training = false } = {}) {
  const out = []
  const openAtStart = training ? 1 : OPEN_AT_START
  for (const { castle, pool } of castles) {
    const { stars, solved } = totalsIn(pool)
    const isTraining = training && castle === TUTORIAL_CASTLE
    const required = isTraining ? pool.length : requiredStars(pool.length)
    const done = isTraining ? pool.length > 0 && solved >= pool.length : stars >= required
    const prev = out[castle - 1]
    const fromStart = castle < openAtStart
    const unlocked = pool.length > 0 && (fromStart || (prev?.unlocked === true && prev.done === true))
    out.push({ castle, count: pool.length, stars, solved, required, done, unlocked, fromStart, training: isTraining })
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
