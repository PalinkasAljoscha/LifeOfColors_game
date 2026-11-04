// Star rating of a win (1-5), from the moves used and the puzzle's moves_to_win_min (the lowest
// number of moves the factory found, exported per instance; not hashed).
//   moves <= min              -> 5 stars
//   moves  = 1.4 * min        -> 2 stars, linear in between (rounded to the nearest star)
//   moves  > 1.4 * min        -> 1 star (every win gets at least one)
// Pure function, shared by the game screen and the tests.

export const MAX_STARS = 5

/** Stars for a win in `moves` moves; null if the puzzle has no valid moves_to_win_min. */
export function starsForWin(moves, minMoves) {
  if (!Number.isInteger(minMoves) || minMoves < 1 || !Number.isFinite(moves)) return null
  const extra = moves - minMoves
  if (extra <= 0) return MAX_STARS
  if (moves * 5 > minMoves * 7) return 1                 // more than 1.4 x min (exact, no float)
  // 5 - 3 * extra / (0.4 * min) = (10 * min - 15 * extra) / (2 * min), exact halves round up
  return Math.round((10 * minMoves - 15 * extra) / (2 * minMoves))
}

/** The puzzle's best-known move count, or null if the catalog has none for it. */
export function minMovesOf(instance) {
  const m = instance?.moves_to_win_min
  return Number.isInteger(m) && m >= 1 ? m : null
}

/** How much of the win animation plays (components/WinCelebration.jsx): 'full' (stars, coloured
 *  sparkling stars, text) for a 5-star win outside the training castle, 'stars' (stars and text) for any
 *  other win outside it, 'text' (the result box only) in the training castle or with reduced
 *  motion. training: truthy in the training castle; stars: 1-5 or null (unknown best). */
export function winMode({ training, stars, reduced = false }) {
  if (training || reduced) return 'text'
  return stars === MAX_STARS ? 'full' : 'stars'
}
