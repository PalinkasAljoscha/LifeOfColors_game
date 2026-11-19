// Wildcards (src/wildcards.js): the config, what a won wildcard opens, its challenge puzzle, and how
// the opened places take part in unlocking (engine/castles.js) and saving (engine/progress.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { WILDCARDS, WILDCARD_STARS, wildcardOpens, wildcardPuzzle, availableWildcards } from '../src/wildcards.js'
import { parseLevelGraph } from '../src/engine/levelGraph.js'
import { assignCastles, castleStates } from '../src/engine/castles.js'
import { fitToScenes } from '../src/workshops.js'
import {
  initProgress, resetProgressForTests, setStorageConsent, recordWildcard, wildcardOpened, PROGRESS_KEY, CONSENT_GRANTED,
} from '../src/engine/progress.js'

const graph = parseLevelGraph(JSON.parse(readFileSync(new URL('../public/catalog/level_graph.json', import.meta.url))))
const catalog = JSON.parse(readFileSync(new URL('../public/catalog/puzzles.json', import.meta.url))).instances
const { castles } = fitToScenes(assignCastles(catalog, graph.count))

test('the config: one wildcard on each of the rows 3, 5, 8 and 9, its puzzle in its place', () => {
  assert.equal(WILDCARD_STARS, 5)
  assert.deepEqual(WILDCARDS.map((w) => graph.layer[w.level]), [3, 5, 8, 9])
  for (const w of WILDCARDS) {
    const inst = wildcardPuzzle(castles, w)
    assert.equal(inst?.id, w.puzzle, `wildcard ${w.level}: its configured puzzle is in its place`)
    assert.ok(inst.moves_to_win_min > 0, 'a 5-star win must be possible')
  }
})

test('a won wildcard opens its place and every place on the rows below it', () => {
  const level = WILDCARDS[0].level
  const opens = wildcardOpens(graph, level)
  const row = graph.layer[level]
  assert.ok(opens.includes(level))
  for (let c = 0; c < graph.count; c++) assert.equal(opens.includes(c), graph.layer[c] < row || c === level, `castle ${c}`)
  assert.deepEqual(wildcardOpens(graph, 999), [])
})

test('the challenge falls back to the hardest puzzle without special cells', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c', board: { special_cells: [{}] } }]
  assert.equal(wildcardPuzzle([{}, { pool }], { level: 1, puzzle: 'a' }).id, 'a')
  assert.equal(wildcardPuzzle([{}, { pool }], { level: 1, puzzle: 'gone' }).id, 'b')
  assert.equal(wildcardPuzzle([{}, { pool: [] }], { level: 1, puzzle: 'a' }), null)
})

test('opened places are open but not done; the places above them still need their stars', () => {
  const run = (opened, stars = {}) => castleStates(castles, (pool, c) => ({ stars: stars[c] ?? 0, solved: 0 }), graph, { opened })
  const w = WILDCARDS[1]
  const before = run(new Set())
  assert.equal(before[w.level].unlocked, false)
  assert.deepEqual(availableWildcards(before, castles).map((x) => x.level), WILDCARDS.map((x) => x.level))
  const opens = wildcardOpens(graph, w.level)
  const after = run(new Set(opens))
  for (const c of opens) if (castles[c].pool.length) assert.equal(after[c].unlocked, true, `castle ${c}`)
  assert.equal(after[w.level].wildcard, true)
  assert.equal(after[w.level].done, false)
  for (const c of graph.children[w.level]) assert.equal(after[c].unlocked, opens.includes(c), `child ${c} waits for stars`)
  // the wildcards of opened places are gone, the higher ones stay
  assert.deepEqual(availableWildcards(after, castles).map((x) => x.level), WILDCARDS.slice(2).map((x) => x.level))
  // 20 stars in the wildcard's place open what lies above it the usual way
  const done = run(new Set(opens), { [w.level]: 20 })
  for (const c of graph.children[w.level]) assert.equal(done[c].unlocked, true)
})

test('wildcard openings are saved as their own list, only with consent', () => {
  resetProgressForTests()
  const store = new Map()
  const fake = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  initProgress(fake)
  assert.equal(recordWildcard([3, 1, 2]), 3)
  assert.equal(recordWildcard([2, 4]), 1)
  assert.deepEqual([...wildcardOpened()].sort(), [1, 2, 3, 4])
  assert.equal(store.has(PROGRESS_KEY), false)            // nothing saved before the opt-in
  setStorageConsent(CONSENT_GRANTED)
  assert.deepEqual(JSON.parse(store.get(PROGRESS_KEY)).w, [1, 2, 3, 4])
  resetProgressForTests()
  initProgress(fake)
  assert.deepEqual([...wildcardOpened()].sort(), [1, 2, 3, 4])
  resetProgressForTests()
})

// Exception chosen by hand (2026-11-19): Argon Castle (level 22) uses Fleeting Fractal, a special puzzle.
const SPECIAL_OK = new Set([22])
test('no wildcard challenge has special cells (except the ones chosen so)', () => {
  for (const w of WILDCARDS.filter((x) => !SPECIAL_OK.has(x.level))) assert.equal(wildcardPuzzle(castles, w).board.special_cells?.length ?? 0, 0, `wildcard ${w.level}`)
})
