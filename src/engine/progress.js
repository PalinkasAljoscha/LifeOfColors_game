// The player's progress: which puzzles were tried / solved, the best star rating of each, and the
// stars collected per castle.
//
// Always kept in memory for the current page session. Kept ACROSS sessions only when the player
// opted in (consent banner, components/ConsentBanner.jsx): then it is mirrored to this browser's
// localStorage. Nothing here is ever sent anywhere -- not to telemetry, not to any server.
//
// localStorage keys (only these two, both written by this module only):
//   STORAGE_CONSENT_KEY  'granted' | 'denied' -- the player's answer to the banner. Storing the
//                        answer itself needs no consent; without it the banner would reappear.
//   PROGRESS_KEY         only while consent is 'granted' (deleted when it is withdrawn):
//                        {"v":2,"p":{"<instance id>": <entry>, ...},"c":{"<castle>": <stars>, ...}}
//                        entry 't'      = tried (opened), not solved yet
//                        entry 0..5     = solved; the best star rating of any solve (0 = solved,
//                                         no rating: the puzzle has no moves_to_win_min)
//                        c              = stars collected per castle (see below)
//                        h              = recently played puzzle ids, newest first, at most
//                                         HISTORY_MAX (homepage history; optional, omitted when empty)
//                        ({"v":1,"p":...} from before the castle counters is still read.)
//
// Totals: solved = number of solved puzzles; stars = sum of each solved puzzle's BEST rating
// (so at most 5 per puzzle, however often it is replayed).
//
// Castle stars (castleStars): a counter per castle, independent of which puzzles are in the
// castle now. Whenever a solve raises a puzzle's best rating, the GAIN (new best - old best) is
// added to the counter of the castle the puzzle is in at that moment. A new catalog can move
// puzzles between castles: their best stars go with them, the counters stay -- so a counter can
// be larger than the stars of its current puzzles, and it keeps growing (also beyond 5 x the
// number of puzzles) with stars gained on puzzles that entered the castle. Unlocking uses the
// counters (engine/castles.js). Progress saved before the counters existed (v1) is converted once
// by seedCastleStars: each castle starts at the stars of the puzzles it holds then.

import { MAX_STARS } from './stars.js'

export const STORAGE_CONSENT_KEY = 'loc-storage-consent'
export const PROGRESS_KEY = 'loc-progress-v1'
export const CONSENT_GRANTED = 'granted'
export const CONSENT_DENIED = 'denied'
const TRIED = 't'
export const HISTORY_MAX = 20     // recently played puzzles kept (homepage history)

// ---- storage (localStorage, or a stand-in in tests; every access may throw) ----------------

let storageOverride
function storage() {
  if (storageOverride !== undefined) return storageOverride
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null        // blocked (privacy mode, sandboxed iframe, ...): memory only
  }
}
function read(key) {
  try { return storage()?.getItem(key) ?? null } catch { return null }
}
function write(key, value) {
  try { storage()?.setItem(key, value); return true } catch { return false }
}
function remove(key) {
  try { storage()?.removeItem(key) } catch { /* nothing stored then */ }
}

// ---- state ----------------------------------------------------------------------------------

let consent = null              // null = not asked yet, else CONSENT_GRANTED / CONSENT_DENIED
let entries = new Map()         // id -> TRIED | 0..5
let castleCounts = new Map()    // castle number -> stars collected there
let history = []                // recently played ids, newest first (at most HISTORY_MAX)
let needsSeed = false           // true after loading v1 progress (no castle counters yet)
let version = 0                 // bumped on every change (useSyncExternalStore snapshot)
const listeners = new Set()

function isEntry(v) {
  return v === TRIED || (Number.isInteger(v) && v >= 0 && v <= MAX_STARS)
}

function isCount(v) {
  return Number.isInteger(v) && v >= 0
}

/** Ids, newest first, without duplicates, at most HISTORY_MAX. */
function cleanHistory(ids) {
  return [...new Set(ids.filter((id) => typeof id === 'string'))].slice(0, HISTORY_MAX)
}

/** { entries, castles, history }: castles = Map, or null for v1 progress (no castle counters yet). */
function parseStored(text) {
  const empty = { entries: new Map(), castles: new Map(), history: [] }
  try {
    const data = JSON.parse(text)
    if ((data?.v !== 1 && data?.v !== 2) || typeof data.p !== 'object' || data.p === null) return empty
    const entries = new Map(Object.entries(data.p).filter(([id, v]) => typeof id === 'string' && isEntry(v)))
    const history = Array.isArray(data.h) ? cleanHistory(data.h) : []
    if (data.v === 1) return { entries, castles: null, history }
    const c = typeof data.c === 'object' && data.c !== null ? data.c : {}
    const castles = new Map(Object.entries(c)
      .map(([k, v]) => [Number(k), v])
      .filter(([k, v]) => Number.isInteger(k) && k >= 0 && isCount(v)))
    return { entries, castles, history }
  } catch {
    return empty
  }
}

function persist() {
  if (consent === CONSENT_GRANTED) {
    const data = { v: 2, p: Object.fromEntries(entries), c: Object.fromEntries(castleCounts) }
    if (history.length) data.h = history
    write(PROGRESS_KEY, JSON.stringify(data))
  }
}

function changed() {
  version++
  for (const fn of listeners) fn()
}

/** Read the stored consent (and, if granted, the stored progress). Called once at start-up;
 *  `testStorage` replaces localStorage in tests. Session progress so far is kept (merged). */
export function initProgress(testStorage) {
  if (testStorage !== undefined) storageOverride = testStorage
  const c = read(STORAGE_CONSENT_KEY)
  consent = c === CONSENT_GRANTED || c === CONSENT_DENIED ? c : null
  const stored = consent === CONSENT_GRANTED ? parseStored(read(PROGRESS_KEY)) : { entries: new Map(), castles: new Map(), history: [] }
  if (consent !== CONSENT_GRANTED) remove(PROGRESS_KEY)    // never keep progress without consent
  for (const [id, v] of entries) stored.entries.set(id, merge(stored.entries.get(id), v))
  entries = stored.entries
  history = cleanHistory([...history, ...stored.history])  // this visit's plays are the newest
  if (stored.castles === null) {
    needsSeed = true                                       // v1: converted by seedCastleStars
  } else {
    for (const [c, n] of castleCounts) stored.castles.set(c, Math.max(stored.castles.get(c) ?? 0, n))
    castleCounts = stored.castles
  }
  persist()
  changed()
}

/** Forget everything in memory (tests). */
export function resetProgressForTests() {
  entries = new Map()
  castleCounts = new Map()
  history = []
  needsSeed = false
  consent = null
  changed()
}

// ---- consent --------------------------------------------------------------------------------

/** null (not asked yet) | 'granted' | 'denied'. */
export function storageConsent() {
  return consent
}

/** The player's answer. 'granted' saves the progress of this visit too; 'denied' deletes any
 *  saved progress (in-memory progress of this visit stays until the page is closed). */
export function setStorageConsent(value) {
  if (value !== CONSENT_GRANTED && value !== CONSENT_DENIED) throw new Error(`bad consent ${value}`)
  consent = value
  write(STORAGE_CONSENT_KEY, value)
  if (value === CONSENT_GRANTED) persist()
  else remove(PROGRESS_KEY)
  changed()
}

// ---- recording ------------------------------------------------------------------------------

// Combine two entries: solved beats tried, a higher rating beats a lower one.
function merge(a, b) {
  if (a === undefined) return b
  if (b === undefined) return a
  if (a === TRIED) return b
  if (b === TRIED) return a
  return Math.max(a, b)
}

/** The player opened this puzzle (also moves it to the front of the recently played list). */
export function recordTried(id) {
  const recent = history[0] === id
  if (entries.has(id) && recent) return
  if (!recent) history = cleanHistory([id, ...history])
  if (!entries.has(id)) entries.set(id, TRIED)
  persist()
  changed()
}

/** The player solved this puzzle with `stars` (1-5, or null when the puzzle has no rating), while
 *  it is in castle `castle` (a castle number, or null/undefined: no castle counter is touched).
 *  The gain in the puzzle's best rating is added to that castle's star counter.
 *  Returns { previousBest, best, newBest, gained }: newBest = this solve raised the puzzle's best
 *  rating above an earlier solve's (false for the first solve); gained = stars added to the castle. */
export function recordSolved(id, stars, castle = null) {
  const prev = entries.get(id)
  const previousBest = Number.isInteger(prev) ? prev : null
  const s = Number.isInteger(stars) ? Math.min(Math.max(stars, 0), MAX_STARS) : 0
  const best = merge(prev, s)
  entries.set(id, best)
  const gained = Math.max(0, best - (previousBest ?? 0))
  if (gained > 0 && Number.isInteger(castle) && castle >= 0) {
    castleCounts.set(castle, (castleCounts.get(castle) ?? 0) + gained)
  }
  persist()
  changed()
  return { previousBest, best, newBest: previousBest !== null && best > previousBest, gained }
}

/** Convert progress saved before the castle counters existed (v1), once: every castle's counter
 *  starts at the best stars of the puzzles it holds now. castles = [{ castle, pool }]
 *  (engine/castles.js assignCastles). Does nothing for current progress. */
export function seedCastleStars(castles) {
  if (!needsSeed) return
  needsSeed = false
  for (const { castle, pool } of castles) {
    let stars = 0
    for (const inst of pool) {
      const e = entries.get(inst.id)
      if (Number.isInteger(e)) stars += e
    }
    if (stars > 0) castleCounts.set(castle, Math.max(castleCounts.get(castle) ?? 0, stars))
  }
  persist()
  changed()
}

// ---- reading --------------------------------------------------------------------------------

/** 'solved' | 'played' | null for one puzzle. */
export function puzzleState(id) {
  const e = entries.get(id)
  return e === undefined ? null : e === TRIED ? 'played' : 'solved'
}

/** Best star rating of a solved puzzle (0 = solved without rating), else null. */
export function bestStars(id) {
  const e = entries.get(id)
  return Number.isInteger(e) ? e : null
}

/** Recently played puzzle ids, newest first (at most HISTORY_MAX). */
export function recentlyPlayed() {
  return [...history]
}

/** Stars collected in a castle (its counter; see the top of this file). */
export function castleStars(castle) {
  return castleCounts.get(castle) ?? 0
}

/** { solved, stars, tried } over the given ids (any iterable), or over everything recorded. */
export function progressTotals(ids) {
  let solved = 0, stars = 0, tried = 0
  const each = (e) => {
    if (e === undefined) return
    tried++
    if (e !== TRIED) { solved++; stars += e }
  }
  if (ids === undefined) for (const e of entries.values()) each(e)
  else for (const id of ids) each(entries.get(id))
  return { solved, stars, tried }
}

/** React: subscribe / snapshot pair for useSyncExternalStore (re-render on every change). */
export function subscribeProgress(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function progressVersion() {
  return version
}
