// Loads the game-instance catalog that the factory exports into public/catalog/.
//   index.json         { catalog_version, levels: [{level, file, count}], instances: {id: level},
//                        names: {normalized name: id} }
//   level-<n>.json     { catalog_version, level, instances: [ ...full instances, by seq... ] }
// Every instance has a verbose `name` ("Crimson Delta"), its tile colour `name_color` and its
// publication order `seq` (assigned by the factory, never changed).
// In `npm run dev`, ?catalog=dev loads public/catalog-dev/ instead (factory --dev export).

import { isPlayable } from './engine.js'
import { recordSolved, recordTried, puzzleState } from './progress.js'

function catalogDir() {
  const params = new URLSearchParams(window.location.search)
  const dev = import.meta.env.DEV && params.get('catalog') === 'dev'
  return `${import.meta.env.BASE_URL}${dev ? 'catalog-dev' : 'catalog'}/`
}

let indexPromise = null
const levelCache = new Map()

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

export async function loadLevel(level) {
  if (levelCache.has(level)) return levelCache.get(level)
  const index = await loadIndex()
  const entry = index.levels.find((l) => l.level === level)
  if (!entry) throw new Error(`level ${level} not in catalog`)
  const r = await fetch(`${catalogDir()}${entry.file}?v=${encodeURIComponent(index.catalog_version)}`)
  if (!r.ok) throw new Error(`catalog level ${level}: HTTP ${r.status}`)
  const data = await r.json()
  const playable = data.instances.filter(isPlayable).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
  levelCache.set(level, playable)
  return playable
}

/** Levels that have at least one instance this build can play. */
export async function playableLevels() {
  const index = await loadIndex()
  return index.levels.filter((l) => l.count > 0)
}

// Instances played in this page session, so "random" avoids immediate repeats.
const recentlyPlayed = []

export async function pickRandom(level) {
  const pool = await loadLevel(level)
  if (pool.length === 0) throw new Error(`no playable instances in level ${level}`)
  const fresh = pool.filter((i) => !recentlyPlayed.includes(i.id))
  const from = fresh.length ? fresh : pool
  const inst = from[Math.floor(Math.random() * from.length)]
  markPlayed(inst, pool.length)
  return inst
}

// Puzzles opened / solved, for the marks on the level grid: engine/progress.js (in memory for
// this page session; also saved in this browser only if the player opted in).

/** Mark a puzzle as solved with `stars` (1-5 or null); returns recordSolved's result. */
export function markSolved(inst, stars = null) {
  return recordSolved(inst.id, stars)
}

/** 'solved' | 'played' | null -- what happened to this puzzle so far. */
export function playState(inst) {
  return puzzleState(inst.id)
}

/** Remember a played puzzle (also one chosen in the grid), so "random" doesn't repeat it soon. */
export function markPlayed(inst, poolSize = 100) {
  recordTried(inst.id)
  if (!recentlyPlayed.includes(inst.id)) recentlyPlayed.push(inst.id)
  while (recentlyPlayed.length > Math.min(50, Math.floor(poolSize / 2))) recentlyPlayed.shift()
}

/** Same rule as the factory's instance_names.normalize_name: lower case, letters and digits only. */
export function normalizeName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** For testing/sharing a specific puzzle: ?instance=<name or id>, e.g. ?instance=crimson-delta */
export async function findById(ref) {
  const index = await loadIndex()
  const id = index.instances?.[ref] !== undefined ? ref : index.names?.[normalizeName(ref)]
  const level = index.instances?.[id]
  if (level === undefined) return null
  const pool = await loadLevel(level)
  return pool.find((i) => i.id === id) ?? null
}
