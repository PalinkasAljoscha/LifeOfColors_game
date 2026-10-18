// Loads the game-instance catalog that the factory exports into public/catalog/.
//   index.json         { catalog_version, levels: [{level, file, count}], instances: {id: level} }
//   level-<n>.json     { catalog_version, level, instances: [ ...full instances... ] }
// In `npm run dev`, ?catalog=dev loads public/catalog-dev/ instead (factory --dev export).

import { isPlayable } from './engine.js'

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
  const playable = data.instances.filter(isPlayable)
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
  recentlyPlayed.push(inst.id)
  if (recentlyPlayed.length > Math.min(50, Math.floor(pool.length / 2))) recentlyPlayed.shift()
  return inst
}

/** For testing/sharing a specific puzzle: ?instance=loc_... */
export async function findById(id) {
  const index = await loadIndex()
  const level = index.instances?.[id]
  if (level === undefined) return null
  const pool = await loadLevel(level)
  return pool.find((i) => i.id === id) ?? null
}
