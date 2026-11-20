// App configuration (build time: change, then rebuild / redeploy).

// Puzzles whose recorded solution also wins without the green start cell carry
// start_cell_required: false in the catalog (computed by the factory). With this switch on, the
// app shows those puzzles with an all-uncolored board -- the player must solve them without a
// start cell. All other puzzles (start_cell_required true / missing) keep their start cell.
// Note: the puzzle id is the same either way, so telemetry and the factory cannot tell from the
// id alone which version was played -- keep this switch fixed once the game is live.
export const HIDE_START_CELL_IF_NOT_REQUIRED = true

// The goal intro (game/GameScene.js _showGoalIntro): in the first GOAL_INTRO_LEVELS levels after
// the training castle (castles 1..GOAL_INTRO_LEVELS; now only the very first one) a puzzle opens
// -- not after Retry -- with the goal object blinking on the goal field and a hand quickly
// pointing at it, for GOAL_INTRO_MS (two blinks).
export const GOAL_INTRO_LEVELS = 1
export const GOAL_INTRO_MS = 1000

// Castles (src/engine/castles.js): the levels of the home-screen map. How many there are and which
// lead into which comes from the level graph the factory ships next to the catalog
// (public/catalog/level_graph.json, src/engine/levelGraph.js). The factory ships an ORDER
// (instance.difficulty_ranking, 1 = easiest) plus the training castle's puzzles
// (instance.training_position); castle 0 = the training castle. The remaining ranked puzzles go
// to their instance.site (the castle the factory placed them in); in catalogs without sites they
// are cut, in ranking order, into the other castles (nearly equal sizes).
// CASTLE_COUNT is only used when the catalog has no level graph: then CASTLE_COUNT castles form
// one line, as before the graph.
export const CASTLE_COUNT = 30
// A castle opens when a castle with a path into it is open and the player has collected this many stars
// there -- the same for every castle, however many puzzles it holds. Collected stars per castle
// are counted on their own (engine/progress.js castleStars), so they are kept when puzzles move
// to another castle.
export const UNLOCK_STARS = 20
