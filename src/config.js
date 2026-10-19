// App configuration (build time: change, then rebuild / redeploy).

// Puzzles whose recorded solution also wins without the green start cell carry
// start_cell_required: false in the catalog (computed by the factory). With this switch on, the
// app shows those puzzles with an all-uncolored board -- the player must solve them without a
// start cell. All other puzzles (start_cell_required true / missing) keep their start cell.
// Note: the puzzle id is the same either way, so telemetry and the factory cannot tell from the
// id alone which version was played -- keep this switch fixed once the game is live.
export const HIDE_START_CELL_IF_NOT_REQUIRED = true
