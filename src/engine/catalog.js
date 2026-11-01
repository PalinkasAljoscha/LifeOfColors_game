// Loads the game-instance catalog that the factory exports into public/catalog/.
//   index.json     { catalog_version, file, count, ranked, training, names: {normalized name: id} }
//   puzzles.json   { catalog_version, instances: [ ...full instances, by seq... ] }
// Every instance has a verbose `name` ("Crimson Delta"), its tile colour `name_color`, its
// publication order `seq` (assigned by the factory, never changed) and, when shipped live, a
// `difficulty_ranking` (1 = easiest) and/or a `training_position`. Which castle a puzzle is in is
// decided by the app (engine/castles.js), not by the catalog.
// In `npm run dev`, ?catalog=dev loads public/catalog-dev/ instead (factory --dev export).

import { isPlayable } from './engine.js'
import { recordSolved, recordTried, puzzleState } from './progress.js'

function catalogDir() {
  const params = new URLSearchParams(window.location.search)
  const dev = import.meta.env.DEV && params.get('catalog') === 'dev'
  return `${import.meta.env.BASE_URL}${dev ? 'catalog-dev' : 'catalog'}/`
}

let indexPromise = null
let allPromise = null

export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${catalogDir()}index.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`catalog index: HTTP ${r.status}`)
        return r.json()
      })
      .catch((e) => {
        indexPromise = null // allow a retry
        throw e
      })
  }
  return indexPromise
}

/** Every playable instance of the catalog, in seq order (the same objects on every call). */
export function loadAll() {
  if (!allPromise) {
    allPromise = loadIndex()
      .then(async (index) => {
        const r = await fetch(`${catalogDir()}${index.file}?v=${encodeURIComponent(index.catalog_version)}`)
        if (!r.ok) throw new Error(`catalog puzzles: HTTP ${r.status}`)
        const data = await r.json()
        return data.instances.filter(isPlayable).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
      })
      .catch((e) => {
        allPromise = null // allow a retry
        throw e
      })
  }
  return allPromise
}

// Puzzles opened / solved, for the marks on the castle grid: engine/progress.js (in memory for
// this page session; also saved in this browser only if the player opted in).

/** Mark a puzzle as solved with `stars` (1-5 or null); returns recordSolved's result. New stars
 *  also count for the castle the puzzle is in now (inst.level, set by engine/castles.js). */
export function markSolved(inst, stars = null) {
  return recordSolved(inst.id, stars, inst.level)
}

/** 'solved' | 'played' | null -- what happened to this puzzle so far. */
export function playState(inst) {
  return puzzleState(inst.id)
}

/** Remember a played puzzle (opened from the grid or a link). */
export function markPlayed(inst) {
  recordTried(inst.id)
}

/** Same rule as the factory's instance_names.normalize_name: lower case, letters and digits only. */
export function normalizeName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** For testing/sharing a specific puzzle: ?instance=<name or id>, e.g. ?instance=crimson-delta */
export async function findById(ref) {
  const index = await loadIndex()
  const id = index.names?.[normalizeName(ref)] ?? ref
  return (await loadAll()).find((i) => i.id === id) ?? null
}
