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

export const SCHEMA_MAJOR = 1

// Feature tags this engine can play. Add a tag here only once the variation it names is
// fully implemented below (and covered by tests). Instances requiring anything else are hidden.
export const SUPPORTED_FEATURES = new Set(['core'])

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

/** Board as an array of rows of letters ('U' | 'O' | 'B' | 'G'). */
export function initialBoard(inst) {
  const { rows, cols, start } = inst.board
  const board = Array.from({ length: rows }, () => Array(cols).fill('U'))
  for (const s of start) board[s.at[0]][s.at[1]] = s.color
  return board
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
