// App configuration (build time: change, then rebuild / redeploy).

// Puzzles whose recorded solution also wins without the green start cell carry
// start_cell_required: false in the catalog (computed by the factory). With this switch on, the
// app shows those puzzles with an all-uncolored board -- the player must solve them without a
// start cell. All other puzzles (start_cell_required true / missing) keep their start cell.
// Note: the puzzle id is the same either way, so telemetry and the factory cannot tell from the
// id alone which version was played -- keep this switch fixed once the game is live.
export const HIDE_START_CELL_IF_NOT_REQUIRED = true

// Castles (src/engine/castles.js): the levels of the home-screen map. How many there are and which
// lead into which comes from the level graph the factory ships next to the catalog
// (public/catalog/level_graph.json, src/engine/levelGraph.js). The factory ships an ORDER
// (instance.difficulty_ranking, 1 = easiest) plus the training castle's puzzles
// (instance.training_position); castle 0 = the training castle, the remaining ranked puzzles are
// cut, in ranking order, into the other castles (nearly equal sizes).
// CASTLE_COUNT is only used when the catalog has no level graph: then CASTLE_COUNT castles form
// one line, as before the graph.
export const CASTLE_COUNT = 30
// A castle opens when a castle with a path into it is open and the player has collected this many stars
// there -- the same for every castle, however many puzzles it holds. Collected stars per castle
// are counted on their own (engine/progress.js castleStars), so they are kept when puzzles move
// to another castle.
export const UNLOCK_STARS = 20
