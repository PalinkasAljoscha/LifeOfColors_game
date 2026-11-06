// Life of Colors rule engine -- pure JS, no Phaser/React, runs in the browser and in Node tests.
//
// This MUST behave exactly like the factory's reference engine (LifeOfColors_factory/instance.py),
// which is itself checked against rule_helpers.apply_click_partition. tests/vectors.json
// (written by the factory's export_catalog.py) pins that equivalence.
//
// Instance format: see schema/instance.schema.json and README.md.
//   rule.table   165 letters U/O/B/G/X, one per (orange, blue, green) neighbour-count triple
//                with o+b+g <= 8, ordered o outer, b middle, g inner (all ascending).
//   Neighbours   the up-to-8 Moore neighbours that lie on the board.
//   Click        new colour = table[counts]; X ("unchanged") or the same colour = no-op.
//   Win          goal cell has goal colour.
//
// Special cells (schema 1.1, feature tags special-blocked / -bomb / -mirror / -clock): at most ONE
// entry in board.special_cells. The rules below (tap) are the SAME as the factory's instance.py
// (initial_state / tap) and its solver model special_cells.SpecialGame -- the factory checks those
// two against each other on every export, and tests/vectors.json (kind 'special') holds this file
// to the same events and boards tap by tap. Changing any of it changes published puzzles: never
// without a new feature tag (see CLAUDE.md, "Special cells").
//   blocked  cells never coloured (uncolored for their neighbours); a tap is ignored.
//   bomb     its cell is like a blocked cell for the neighbours; a tap that turns one of its 8
//            neighbours into `trigger` sets it off; the taps_to_explode-th tap ON the bomb since the
//            last (re)start sets it off too (earlier ones only warn). Going off = Retry (start state).
//   mirror   tapping either cell gives BOTH the new colour computed from the tapped cell's neighbours.
//   clock    not tappable; shows cycle[start] at the start (also with a hidden start cell) and steps to
//            the next colour of `cycle` after every tap that changed the board (no-op, ignored and
//            bomb taps do not advance it). Its colour counts for its neighbours like any colour.

export const SCHEMA_MAJOR = 1

// Feature tags this engine can play. Add a tag here only once the variation it names is
// fully implemented below (and covered by tests). Instances requiring anything else are hidden.
export const SUPPORTED_FEATURES = new Set(['core', 'special-blocked', 'special-bomb', 'special-mirror', 'special-clock'])

export const TABLE_ORDER = []
const TABLE_INDEX = new Int16Array(9 * 9 * 9).fill(-1)
for (let o = 0; o <= 8; o++) {
  for (let b = 0; b <= 8; b++) {
    for (let g = 0; g <= 8; g++) {
      if (o + b + g > 8) continue
      TABLE_INDEX[o * 81 + b * 9 + g] = TABLE_ORDER.length
      TABLE_ORDER.push([o, b, g])
    }
  }
}
export const TABLE_SIZE = TABLE_ORDER.length // 165

export function tableIndex(o, b, g) {
  return TABLE_INDEX[o * 81 + b * 9 + g]
}

/** True if this app build can play the instance (and it is not retired). */
export function isPlayable(inst) {
  if (!inst || inst.retired) return false
  const major = parseInt(String(inst.schema_version ?? '').split('.')[0], 10)
  if (major !== SCHEMA_MAJOR) return false
  if (!(inst.requires ?? []).every((f) => SUPPORTED_FEATURES.has(f))) return false
  const t = inst.rule?.table
  return typeof t === 'string' && t.length === TABLE_SIZE && inst.rule.neighborhood === 'moore8'
}

/** True if the instance should be shown without its start cell(s): the switch is on and the
 *  factory marked the instance start_cell_required === false (its recorded solution also wins
 *  from an all-uncolored board). Missing / null / true keeps the start cell. */
export function startHidden(inst, hideIfNotRequired) {
  return Boolean(hideIfNotRequired) && inst.start_cell_required === false
}

/** Board as an array of rows of letters ('U' | 'O' | 'B' | 'G').
 *  hideStart: all cells uncolored (see startHidden). */
export function initialBoard(inst, { hideStart = false } = {}) {
  const { rows, cols, start } = inst.board
  const board = Array.from({ length: rows }, () => Array(cols).fill('U'))
  if (!hideStart) for (const s of start) board[s.at[0]][s.at[1]] = s.color
  const { clock } = specials(inst)
  if (clock) board[clock.at[0]][clock.at[1]] = clock.cycle[clock.start]
  return board
}

const SPECIALS = new WeakMap()

/** The instance's special cells, decoded (cached per instance object):
 *  { type: null | 'blocked' | 'bomb' | 'mirror' | 'clock', blocked: [[r, c], ...],
 *    bomb: { at, trigger, taps, near: Set('r,c') } | null, mirror: [[r, c], [r, c]] | null,
 *    clock: { at, cycle, start } | null, untappable: Set('r,c') } */
export function specials(inst) {
  let sp = SPECIALS.get(inst)
  if (sp) return sp
  sp = { type: null, blocked: [], bomb: null, mirror: null, clock: null, untappable: new Set() }
  const e = (inst.board.special_cells ?? [])[0]
  if (e) {
    sp.type = e.type
    const { rows, cols } = inst.board
    if (e.type === 'blocked') {
      sp.blocked = e.cells.map((x) => [x[0], x[1]])
      for (const [r, c] of sp.blocked) sp.untappable.add(`${r},${c}`)
    } else if (e.type === 'bomb') {
      const [r, c] = e.at
      const near = new Set()
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols) near.add(`${nr},${nc}`)
        }
      }
      sp.bomb = { at: [r, c], trigger: e.trigger, taps: e.taps_to_explode, near }
    } else if (e.type === 'mirror') {
      sp.mirror = e.cells.map((x) => [x[0], x[1]])
    } else if (e.type === 'clock') {
      sp.clock = { at: [e.at[0], e.at[1]], cycle: [...e.cycle], start: e.start }
      sp.untappable.add(`${e.at[0]},${e.at[1]}`)
    }
  }
  SPECIALS.set(inst, sp)
  return sp
}

/** Play state at the start: { board, bombTaps, hideStart }. */
export function initialState(inst, { hideStart = false } = {}) {
  return { board: initialBoard(inst, { hideStart }), bombTaps: 0, hideStart }
}

/** One tap on (r, c) -- the full rule incl. special cells (same as the factory's instance.tap).
 *  Returns { event, state, changed, shown, won, rule }:
 *    event   'move' (the board changed; a clock then stepped) | 'noop' (rule gives X or the same
 *            colour) | 'ignored' (blocked / clock cell) | 'bomb_warn' (tap on the bomb below
 *            taps_to_explode) | 'boom' (the bomb went off; state = the start state)
 *    state   the state after the tap (a new object when it changed; the input is never modified)
 *    changed [[r, c, colour], ...] cells changed by a move (tapped cell, mirror partner, clock
 *            step), or that would have changed in a colour-triggered boom
 *    shown   for 'boom': the board to show for a moment before the explosion (with the triggering
 *            colour; the unchanged board for a tap on the bomb), else null
 *    won     the goal reached by this move
 *    rule    rule-table index looked up (0..164), null for ignored / bomb-cell taps */
export function tap(inst, state, r, c) {
  const sp = specials(inst)
  const board = state.board
  const res = { event: 'noop', state, changed: [], shown: null, won: false, rule: null }
  const key = `${r},${c}`
  if (sp.untappable.has(key)) {
    res.event = 'ignored'
    return res
  }
  if (sp.bomb && sp.bomb.at[0] === r && sp.bomb.at[1] === c) {
    const n = state.bombTaps + 1
    if (n >= sp.bomb.taps) {
      return { ...res, event: 'boom', state: initialState(inst, { hideStart: state.hideStart }), shown: board }
    }
    return { ...res, event: 'bomb_warn', state: { ...state, bombTaps: n } }
  }
  const [o, b, g] = neighborCounts(board, r, c)
  const rule = tableIndex(o, b, g)
  res.rule = rule
  const out = inst.rule.table[rule]
  if (out === 'X' || out === board[r][c]) return res
  const next = board.map((row) => row.slice())
  next[r][c] = out
  const changed = [[r, c, out]]
  if (sp.mirror) {
    const [p, q] = sp.mirror
    const partner = p[0] === r && p[1] === c ? q : q[0] === r && q[1] === c ? p : null
    if (partner) {
      next[partner[0]][partner[1]] = out
      changed.push([partner[0], partner[1], out])
    }
  }
  if (sp.bomb && changed.some(([x, y, col]) => col === sp.bomb.trigger && sp.bomb.near.has(`${x},${y}`))) {
    return { ...res, event: 'boom', state: initialState(inst, { hideStart: state.hideStart }), shown: next, changed }
  }
  if (sp.clock) {
    const [kr, kc] = sp.clock.at
    const cy = sp.clock.cycle
    const nxt = cy[(cy.indexOf(next[kr][kc]) + 1) % cy.length]
    next[kr][kc] = nxt
    changed.push([kr, kc, nxt])
  }
  return { ...res, event: 'move', state: { ...state, board: next }, changed, won: isWon(inst, next) }
}

export function neighborCounts(board, r, c) {
  const rows = board.length, cols = board[0].length
  let o = 0, b = 0, g = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      const v = board[nr][nc]
      if (v === 'O') o++
      else if (v === 'B') b++
      else if (v === 'G') g++
    }
  }
  return [o, b, g]
}

/** Index (0..164) of the rule-table entry a click on (r, c) looks up (telemetry). */
export function clickRule(board, r, c) {
  const [o, b, g] = neighborCounts(board, r, c)
  return tableIndex(o, b, g)
}

/** Returns a NEW board if the click changes the cell, else null. */
export function applyClick(board, r, c, table) {
  const [o, b, g] = neighborCounts(board, r, c)
  const out = table[tableIndex(o, b, g)]
  if (out === 'X' || out === board[r][c]) return null
  const next = board.map((row) => row.slice())
  next[r][c] = out
  return next
}

export function isWon(inst, board) {
  const { at, color } = inst.goal
  return board[at[0]][at[1]] === color
}

/** JSON with sorted keys and no whitespace -- identical to Python
 *  json.dumps(obj, sort_keys=True, separators=(',', ':')) for the ASCII data we use. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** The string whose sha256 (first 16 hex chars, prefixed 'loc_') is the instance id. */
export function idPayload(inst) {
  return canonicalJson({ rule: inst.rule, board: inst.board, goal: inst.goal })
}
