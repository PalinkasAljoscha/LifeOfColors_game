// The player's progress: which puzzles were tried / solved, and the best star rating of each.
//
// Always kept in memory for the current page session. Kept ACROSS sessions only when the player
// opted in (consent banner, components/ConsentBanner.jsx): then it is mirrored to this browser's
// localStorage. Nothing here is ever sent anywhere -- not to telemetry, not to any server.
//
// localStorage keys (only these two, both written by this module only):
//   STORAGE_CONSENT_KEY  'granted' | 'denied' -- the player's answer to the banner. Storing the
//                        answer itself needs no consent; without it the banner would reappear.
//   PROGRESS_KEY         only while consent is 'granted' (deleted when it is withdrawn):
//                        {"v":1,"p":{"<instance id>": <entry>, ...}} with
//                        entry 't'      = tried (opened), not solved yet
//                        entry 0..5     = solved; the best star rating of any solve (0 = solved,
//                                         no rating: the puzzle has no moves_to_win_min)
//
// Totals: solved = number of solved puzzles; stars = sum of each solved puzzle's BEST rating
// (so at most 5 per puzzle, however often it is replayed).

import { MAX_STARS } from './stars.js'

export const STORAGE_CONSENT_KEY = 'loc-storage-consent'
export const PROGRESS_KEY = 'loc-progress-v1'
export const CONSENT_GRANTED = 'granted'
export const CONSENT_DENIED = 'denied'
const TRIED = 't'

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
let version = 0                 // bumped on every change (useSyncExternalStore snapshot)
const listeners = new Set()

function isEntry(v) {
  return v === TRIED || (Number.isInteger(v) && v >= 0 && v <= MAX_STARS)
}

function parseStored(text) {
  try {
    const data = JSON.parse(text)
    if (data?.v !== 1 || typeof data.p !== 'object' || data.p === null) return new Map()
    return new Map(Object.entries(data.p).filter(([id, v]) => typeof id === 'string' && isEntry(v)))
  } catch {
    return new Map()
  }
}

function persist() {
  if (consent === CONSENT_GRANTED) write(PROGRESS_KEY, JSON.stringify({ v: 1, p: Object.fromEntries(entries) }))
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
  const stored = consent === CONSENT_GRANTED ? parseStored(read(PROGRESS_KEY)) : new Map()
  if (consent !== CONSENT_GRANTED) remove(PROGRESS_KEY)    // never keep progress without consent
  for (const [id, v] of entries) stored.set(id, merge(stored.get(id), v))
  entries = stored
  persist()
  changed()
}

/** Forget everything in memory (tests). */
export function resetProgressForTests() {
  entries = new Map()
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

/** The player opened this puzzle. */
export function recordTried(id) {
  if (entries.has(id)) return
  entries.set(id, TRIED)
  persist()
  changed()
}

/** The player solved this puzzle with `stars` (1-5, or null when the puzzle has no rating).
 *  Returns { previousBest, best, newBest }: newBest = this solve raised the puzzle's best rating
 *  above an earlier solve's (false for the first solve). */
export function recordSolved(id, stars) {
  const prev = entries.get(id)
  const previousBest = Number.isInteger(prev) ? prev : null
  const s = Number.isInteger(stars) ? Math.min(Math.max(stars, 0), MAX_STARS) : 0
  const best = merge(prev, s)
  entries.set(id, best)
  persist()
  changed()
  return { previousBest, best, newBest: previousBest !== null && best > previousBest }
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
