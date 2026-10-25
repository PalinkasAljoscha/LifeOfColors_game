// Anonymous telemetry -> Supabase (Postgres via its REST API). Insert-only.
//
// WHAT IS COLLECTED -- nothing personal:
//   * visit_id      random UUID created when the page loads, kept ONLY in memory (no cookie,
//                   localStorage or sessionStorage), so a reload or a new visit gets a new,
//                   unlinkable id. It only groups what happened during one page visit.
//   * screen_views  which screen was shown (home / level / game), its level, puzzle id and pick.
//   * puzzle_plays  per play of a puzzle (open it -> leave it; Retry stays in the same play):
//                   running totals (clicks, moves, colours produced, restarts, wins, best win,
//                   rule-table entries that changed a cell, visible play time) and the click list.
//   * app_version, catalog_version, env ('prod' | 'dev') on every row.
// NOT collected: no IP address (not stored by our tables), user agent, device, screen size,
//   language, location, referrer, account, cookie, browser clock time or any other identifier.
//   The only clock time is Supabase's received_at; durations are measured by the game and count
//   only time while the page is visible.
//
// SNAPSHOTS. A play can't be sent once at its end: a closed tab or killed app is often never
// seen, only "page hidden". So a play sends snapshot rows (`reason`):
//   'won'                     at every win (the play goes on: the player may Retry)
//   'hidden'                  when the page is hidden (tab/app switch, screen lock, closing)
//   'back' | 'pick_new' | 'home'   when the player leaves with a button (the play ends)
// Counters are running totals of the whole play; `clicks` holds only the entries since the
// previous snapshot. Analysis: latest snapshot per play_id = totals and exit route; concatenate
// `clicks` of all snapshots ordered by `snapshot` = full click list.
//
// CLICK LIST ENCODING (one integer per entry):
//   v >= 0   a tap:    v = dt * 128 + cell * 2 + changed
//   v <  0   a Retry:  v = -(dt + 1)
//   dt       visible time since the previous entry (or the play start), in tenths of a second
//            (rounded on the absolute time, so the dts sum up exactly), capped at MAX_DT
//   cell     row * cols + col   (boards have at most 64 cells)
//   changed  1 if the tap changed the cell's colour, else 0
// Decode: dt = v >> 7 (v // 128), cell = (v >> 1) & 63, changed = v & 1; for v < 0: dt = -v - 1.
// At most MAX_ENTRIES entries per snapshot; beyond that entries are dropped (clicks_truncated)
// but all counters keep counting.

const ENVV = import.meta.env ?? {}
const URL_ = ENVV.VITE_SUPABASE_URL
const KEY = ENVV.VITE_SUPABASE_KEY
const ENV = ENVV.DEV ? 'dev' : 'prod'
const SEND = Boolean(URL_ && KEY) && (ENV === 'prod' || ENVV.VITE_TELEMETRY_IN_DEV === '1')

// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'

export const MAX_ENTRIES = 3000   // per snapshot; ~12 KB, well under the 64 KB keepalive limit
export const MAX_DT = 16000000    // tenths of a second (~18 days); keeps v inside a 32-bit int

const COLOR_KEYS = { O: 'n_to_orange', B: 'n_to_blue', G: 'n_to_green', U: 'n_to_uncolored' }

let now = () => performance.now()
let sink = null                   // tests only: receives (table, row) instead of sending

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const visitId = uuid()
let catalogVersion = null
let lastScreenKey = null
let play = null                   // the open play

function pageHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function post(table, row) {
  if (sink) return sink(table, row)
  if (!SEND) {
    if (ENVV.DEV) console.debug(`[telemetry:${table}]`, row)
    return
  }
  const headers = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }
  // Legacy anon keys are JWTs and also go in Authorization; new publishable keys don't.
  if (!KEY.startsWith('sb_')) headers.Authorization = `Bearer ${KEY}`
  try {
    fetch(`${URL_}/rest/v1/${table}`, {
      method: 'POST', headers, body: JSON.stringify(row), keepalive: true,
    }).catch(() => {})
  } catch {
    /* telemetry must never break the game */
  }
}

function common() {
  return { visit_id: visitId, app_version: APP_VERSION, catalog_version: catalogVersion, env: ENV }
}

export function setCatalogVersion(v) {
  catalogVersion = v
}

/** A screen was shown. screen: 'home' | 'level' | 'game'. */
export function screenView(screen, { level = null, instanceId = null, pick = null } = {}) {
  const key = [screen, level, instanceId, pick].join('|')
  if (key === lastScreenKey) return   // same screen again (React StrictMode re-running effects)
  lastScreenKey = key
  post('screen_views', { ...common(), screen, level, instance_id: instanceId, pick })
}

// ---- plays ----------------------------------------------------------------------------------

function activeMs(p) {
  return p.activeMs + (p.visibleSince == null ? 0 : now() - p.visibleSince)
}

/** Appends one click-list entry; returns the play's active time (ms) at that moment. */
function pushEntry(p, encode) {
  const t = activeMs(p)
  const ds = Math.round(t / 100)
  const dt = Math.min(MAX_DT, Math.max(0, ds - p.lastEntryDs))
  p.lastEntryDs = ds
  if (p.entries.length < MAX_ENTRIES) p.entries.push(encode(dt))
  else p.truncated = true
  return t
}

function snapshot(reason) {
  const p = play
  const colors = {}
  for (const [k, col] of Object.entries(COLOR_KEYS)) colors[col] = p.colors[k]
  post('puzzle_plays', {
    ...common(),
    play_id: p.id,
    snapshot: p.snapshot,
    reason,
    instance_id: p.inst.id,
    level: p.inst.level ?? null,
    pick: p.pick,
    active_ms: Math.round(activeMs(p)),
    last_click_ms: p.lastClickMs == null ? null : Math.round(p.lastClickMs),
    n_clicks: p.nClicks,
    n_moves: p.nMoves,
    ...colors,
    n_restarts: p.nRestarts,
    n_wins: p.nWins,
    best_win_clicks: p.bestWinClicks,
    best_win_moves: p.bestWinMoves,
    rules: [...p.rules].sort((a, b) => a - b),
    clicks: p.entries,
    clicks_truncated: p.truncated,
  })
  p.snapshot += 1
  p.entries = []
  p.truncated = false
}

/** A puzzle was opened. pick: 'random' | 'grid' | 'link'. */
export function startPlay(inst, pick = null) {
  // Same puzzle opened again before anything happened (React StrictMode re-running effects): reuse.
  if (play && play.inst.id === inst.id && play.pick === pick && play.snapshot === 0
      && play.nClicks === 0 && play.nRestarts === 0) return
  if (play) endPlay('back')
  play = {
    inst, pick: pick ?? null, id: uuid(), snapshot: 0,
    activeMs: 0, visibleSince: pageHidden() ? null : now(),
    lastEntryDs: 0, lastClickMs: null,
    nClicks: 0, nMoves: 0, colors: { O: 0, B: 0, G: 0, U: 0 },
    nRestarts: 0, nWins: 0, bestWinClicks: null, bestWinMoves: null,
    attemptClicks: 0, attemptMoves: 0,
    rules: new Set(), entries: [], truncated: false,
  }
}

/** A tap on cell (r, c). rule: rule-table index looked up (0..164); color: new colour if changed. */
export function recordClick(r, c, changed, rule = null, color = null) {
  const p = play
  if (!p) return
  if (p.visibleSince == null) p.visibleSince = now()   // a tap means the page is visible
  const cell = r * p.inst.board.cols + c
  p.lastClickMs = pushEntry(p, (dt) => dt * 128 + cell * 2 + (changed ? 1 : 0))
  p.nClicks += 1
  p.attemptClicks += 1
  if (changed) {
    p.nMoves += 1
    p.attemptMoves += 1
    if (color in p.colors) p.colors[color] += 1
    if (Number.isInteger(rule) && rule >= 0 && rule < 165) p.rules.add(rule)
  }
}

/** The goal was reached (call after the winning recordClick). Sends a snapshot. */
export function recordWin() {
  const p = play
  if (!p) return
  p.nWins += 1
  if (p.bestWinClicks == null || p.attemptClicks < p.bestWinClicks) p.bestWinClicks = p.attemptClicks
  if (p.bestWinMoves == null || p.attemptMoves < p.bestWinMoves) p.bestWinMoves = p.attemptMoves
  snapshot('won')
}

/** Retry: the same puzzle starts again from its initial board, within the same play. */
export function restartPlay() {
  const p = play
  if (!p) return
  pushEntry(p, (dt) => -(dt + 1))
  p.nRestarts += 1
  p.attemptClicks = 0
  p.attemptMoves = 0
}

/** The player left the puzzle with a button. reason: 'back' | 'pick_new' | 'home'. */
export function endPlay(reason) {
  if (!play) return
  snapshot(reason)
  play = null
}

/** Page hidden (visibilitychange / pagehide): stop the clock and send a snapshot. */
export function onHidden() {
  const p = play
  if (!p || p.visibleSince == null) return   // no play, or already hidden
  p.activeMs += now() - p.visibleSince
  p.visibleSince = null
  snapshot('hidden')
}

/** Page visible again: the clock runs again. */
export function onVisible() {
  if (play && play.visibleSince == null) play.visibleSince = now()
}

export const telemetryEnabled = SEND

// Tests only.
export const __test = {
  setSink: (fn) => { sink = fn },
  setNow: (fn) => { now = fn },
  reset: () => { play = null; lastScreenKey = null; catalogVersion = null },
}
