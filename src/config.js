// App configuration (build time: change, then rebuild / redeploy).

// Puzzles whose recorded solution also wins without the green start cell carry
// start_cell_required: false in the catalog (computed by the factory). With this switch on, the
// app shows those puzzles with an all-uncolored board -- the player must solve them without a
// start cell. All other puzzles (start_cell_required true / missing) keep their start cell.
// Note: the puzzle id is the same either way, so telemetry and the factory cannot tell from the
// id alone which version was played -- keep this switch fixed once the game is live.
export const HIDE_START_CELL_IF_NOT_REQUIRED = true

// Castles (src/engine/castles.js): the level hierarchy of the home-screen map. The factory only
// ships an ORDER (instance.difficulty_ranking, 1 = easiest) plus the training castle's puzzles
// (instance.training_position); how many castles there are is decided here, nothing else needs
// to change (no new catalog export). Castle 0 = the training castle; the remaining ranked
// puzzles are cut, in ranking order, into CASTLE_COUNT - 1 castles of (nearly) equal size.
export const CASTLE_COUNT = 30
// A castle opens when the castle below it is open and the player has collected this many stars
// there -- the same for every castle, however many puzzles it holds. Collected stars per castle
// are counted on their own (engine/progress.js castleStars), so they are kept when puzzles move
// to another castle.
export const UNLOCK_STARS = 20
