import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { chainGraph, parseLevelGraph } from '../src/engine/levelGraph.js'
import { assignCastles, castleStates } from '../src/engine/castles.js'

// T -> 1 -> {2, 3}; 2 -> 4; 3 -> 4, 5
const SMALL = {
  graph_version: 'test',
  nodes: [
    { id: 0, layer: 0, col: 1 }, { id: 1, layer: 1, col: 1 }, { id: 2, layer: 2, col: 0 }, { id: 3, layer: 2, col: 2 },
    { id: 4, layer: 3, col: 0 }, { id: 5, layer: 3, col: 2 },
  ],
  edges: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [3, 5]],
}

test('parseLevelGraph: parents, children, rows, columns', () => {
  const g = parseLevelGraph(SMALL)
  assert.equal(g.count, 6)
  assert.equal(g.rows, 4)
  assert.equal(g.columns, 3)
  assert.deepEqual(g.children[1], [2, 3])
  assert.deepEqual(g.parents[4], [2, 3])
  assert.deepEqual(g.parents[0], [])
  assert.equal(g.version, 'test')
})

test('parseLevelGraph refuses graphs the app cannot use', () => {
  const bad = (change) => () => parseLevelGraph(change(structuredClone(SMALL)))
  assert.throws(bad((d) => { d.nodes[5].id = 7; return d }), /ids/)
  assert.throws(bad((d) => { d.edges.push([1, 4]); return d }), /one layer up/)
  assert.throws(bad((d) => { d.edges = d.edges.filter(([, b]) => b !== 5); return d }), /path into it/)
  assert.throws(bad((d) => { d.nodes[2].layer = 3; d.nodes[4].layer = 2; return d }), /ordered by layer/)
})

test('chainGraph: one line', () => {
  const g = chainGraph(4)
  assert.deepEqual(g.children, [[1], [2], [3], []])
  assert.equal(g.columns, 1)
})

test('castleStates with a graph: a castle opens when ANY castle leading into it is done', () => {
  const g = parseLevelGraph(SMALL)
  const castles = Array.from({ length: 6 }, (_, castle) => ({ castle, pool: [{ id: `p${castle}` }] }))
  const run = (stars, opts) => castleStates(castles, (pool, c) => ({ stars: stars[c] ?? 0, solved: 0 }), g, opts)
  let s = run({})
  assert.deepEqual(s.map((x) => x.unlocked), [true, true, false, false, false, false])
  s = run({ 1: 20 })                                   // site 1 done: 2 and 3 open
  assert.deepEqual(s.map((x) => x.unlocked), [true, true, true, true, false, false])
  assert.deepEqual(s[1].children, [2, 3])
  s = run({ 1: 20, 3: 20 })                            // 3 done: 4 (also below 2) and 5 open
  assert.deepEqual(s.map((x) => x.unlocked), [true, true, true, true, true, true])
  s = run({ 3: 20 })                                   // 3 done but not open: nothing more
  assert.deepEqual(s.map((x) => x.unlocked), [true, true, false, false, false, false])
  s = run({}, { allOpen: true })                       // review: everything open
  assert.ok(s.every((x) => x.unlocked))
})

const SHIPPED = new URL('../public/catalog/level_graph.json', import.meta.url)
test('the shipped level graph is usable and every site gets puzzles', { skip: !existsSync(SHIPPED) }, () => {
  const g = parseLevelGraph(JSON.parse(readFileSync(SHIPPED)))
  const { instances } = JSON.parse(readFileSync(new URL('../public/catalog/puzzles.json', import.meta.url)))
  const castles = assignCastles(instances.filter((i) => !i.retired), g.count)
  assert.equal(castles.length, g.count)
  const sizes = castles.slice(1).map((c) => c.pool.length)
  assert.ok(Math.min(...sizes) > 0, 'every site has puzzles')
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, 'evenly spread')
  assert.deepEqual(g.children[0], [1], 'the training castle leads to site 1 only')
})
