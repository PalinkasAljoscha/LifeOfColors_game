// Castles: the level hierarchy shown as a map on the home screen.
//
// 30 castles (0..29), stacked bottom to top. Castle 0 (tutorial) and castle 1 are open from the
// start; castle n >= 2 opens once castle n-1 is open AND the player has collected its required
// stars there (UNLOCK_SHARE of the stars it can give: 5 per puzzle, so 75 of 250 for 50 puzzles).
// Unlocking is derived from the saved best stars (engine/progress.js) -- nothing extra is stored.
//
// Which puzzles belong to which castle:
//   * catalog with CASTLE_COUNT levels numbered 0..CASTLE_COUNT-1 (the planned factory export):
//     castle = instance.level.
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
  return pools.map((pool, castle) => ({ castle, pool: pool.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)) }))
}

/** Stars needed in a castle with `count` puzzles to open the next one (at least 1). */
export function requiredStars(count) {
  return Math.max(1, Math.ceil(UNLOCK_SHARE * MAX_STARS * count))
}

/** State of every castle: [{ castle, count, stars, required, done, unlocked }].
 *  `starsIn(pool)` returns the collected stars over a pool (progressTotals(...).stars). */
export function castleStates(castles, starsIn) {
  const out = []
  for (const { castle, pool } of castles) {
    const stars = starsIn(pool)
    const required = requiredStars(pool.length)
    const prev = out[castle - 1]
    const unlocked = pool.length > 0 &&
      (castle < OPEN_AT_START || (prev?.unlocked === true && prev.done === true))
    out.push({ castle, count: pool.length, stars, required, done: stars >= required, unlocked })
  }
  return out
}

/** Highest unlocked castle number (at least 0). */
export function highestUnlocked(states) {
  let h = 0
  for (const s of states) if (s.unlocked) h = s.castle
  return h
}

/** Number of castles opened by play (beyond the ones open from the start). */
export function earnedUnlocks(states) {
  return states.filter((s) => s.unlocked && s.castle >= OPEN_AT_START).length
}
