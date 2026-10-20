// Anonymous gameplay telemetry -> Supabase (Postgres via its REST API).
//
// WHAT IS COLLECTED -- nothing personal:
//   * session_id   random UUID created when the page loads, kept ONLY in memory. It is not
//                  stored in cookies/localStorage/sessionStorage, so a reload or a new visit is a
//                  new, unlinkable session. It only groups the attempts of one page visit.
//   * app_version, catalog_version, env ('prod' | 'dev')
//   * per attempt: instance id, level, how the puzzle was chosen (pick: 'random' button, 'grid'
//                  tile, or 'link' = ?instance= URL), outcome, duration, click counts and the
//                  click list [ms since attempt start, row, col, changed(0/1)]
// NOT collected: no IP address (not stored by our tables), no user agent, device, screen size,
//   language, location, referrer, account, cookie or any other identifier.
//
// Attempts are sent as "segments": a segment ends when the puzzle is won, the player taps
// Retry or Home, or the page is hidden (tab switch, app switch, closing). If the player comes
// back to a hidden page and goes on playing, a new segment of the same attempt starts, carrying
// the current board in `start_board`. Concatenate segments by (attempt_id, segment) to get the
// whole attempt. Rows are insert-only; the public key cannot read anything back.

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_KEY
const ENV = import.meta.env.DEV ? 'dev' : 'prod'
const SEND = Boolean(URL_ && KEY) && (ENV === 'prod' || import.meta.env.VITE_TELEMETRY_IN_DEV === '1')

// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'

const MAX_EVENTS = 3000 // per segment; keeps payloads well under the 64 KB keepalive limit

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const sessionId = uuid()
const sessionT0 = performance.now()
let sessionSent = false
let catalogVersion = null
let attemptNo = 0
let current = null // the open segment

function post(table, row) {
  if (!SEND) {
    if (import.meta.env.DEV) console.debug(`[telemetry:${table}]`, row)
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

export function setCatalogVersion(v) {
  catalogVersion = v
  if (!sessionSent) {
    sessionSent = true
    post('sessions', { session_id: sessionId, app_version: APP_VERSION, catalog_version: v, env: ENV })
  }
}

function openSegment(inst, pick, attemptId, segment, startBoard) {
  current = {
    inst, pick, attemptId, segment, startBoard,
    t0: performance.now(),
    startedInSession: Math.round(performance.now() - sessionT0),
    events: [], nClicks: 0, nChanged: 0, closed: false,
  }
}

/** Call when a puzzle (re)starts from its initial board. pick: 'random' | 'grid' | 'link'. */
export function startAttempt(inst, pick = null) {
  // Same puzzle re-started before any click (e.g. React StrictMode re-running effects): reuse.
  if (current && !current.closed && current.inst.id === inst.id && current.nClicks === 0 && current.segment === 0) return
  if (current && !current.closed) endAttempt('home')
  attemptNo += 1
  openSegment(inst, pick, uuid(), 0, null)
  current.attemptNo = attemptNo
}

export function recordClick(r, c, changed) {
  if (!current || current.closed) return
  current.nClicks += 1
  if (changed) current.nChanged += 1
  if (current.events.length < MAX_EVENTS) {
    current.events.push([Math.round(performance.now() - current.t0), r, c, changed ? 1 : 0])
  }
}

/** outcome: 'won' | 'retry' | 'home' | 'hidden' */
export function endAttempt(outcome) {
  if (!current || current.closed) return
  current.closed = true
  const s = current
  post('attempt_segments', {
    session_id: sessionId,
    attempt_id: s.attemptId,
    segment: s.segment,
    attempt_no: s.attemptNo,
    instance_id: s.inst.id,
    level: s.inst.level ?? null,
    pick: s.pick ?? null,
    catalog_version: catalogVersion,
    app_version: APP_VERSION,
    env: ENV,
    outcome,
    started_ms_in_session: s.startedInSession,
    duration_ms: Math.round(performance.now() - s.t0),
    n_clicks: s.nClicks,
    n_changed: s.nChanged,
    start_board: s.startBoard,
    events: s.events,
  })
}

// Page hidden -> close the open segment. Page visible again with the same game still
// running -> the game screen calls resumeAttempt(board) to open the next segment.
export function onHidden() {
  if (current && !current.closed) {
    current.hiddenOpen = true
    endAttempt('hidden')
  }
}

export function resumeAttempt(board) {
  if (!board || !current || !current.closed || !current.hiddenOpen) return
  const prev = current
  openSegment(prev.inst, prev.pick, prev.attemptId, prev.segment + 1, board.map((row) => row.join('')))
  current.attemptNo = prev.attemptNo
}

/** True while a segment is open (used by the game screen). */
export function hasOpenAttempt() {
  return Boolean(current && !current.closed)
}

export const telemetryEnabled = SEND
