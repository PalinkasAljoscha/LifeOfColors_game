// The places' layout on the home map (components/mapLayout.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { badness, relax } from '../src/components/mapLayout.js'
import { parseLevelGraph } from '../src/engine/levelGraph.js'

const opts = { size: 70, half: 5.5 }

test('a path through another building, two paths on top of each other, and a crossing are bad', () => {
  const edges = [[0, 2]]
  const clear = badness([{ x: 0, y: 400 }, { x: 150, y: 250 }, { x: 0, y: 100 }], edges, opts)
  const blocked = badness([{ x: 0, y: 400 }, { x: 0, y: 250 }, { x: 0, y: 100 }], edges, opts)
  assert.equal(clear.through, 0)
  assert.ok(blocked.through > 0)
  const side = badness([{ x: 0, y: 400 }, { x: 0, y: 100 }, { x: 10, y: 400 }, { x: 10, y: 100 }], [[0, 1], [2, 3]], opts)
  assert.ok(side.close > 0)
  const crossing = badness([{ x: 0, y: 400 }, { x: 200, y: 100 }, { x: 230, y: 410 }, { x: 10, y: 130 }], [[0, 1], [2, 3]], opts)
  assert.equal(crossing.cross, 1)
})

test('relax moves a place out of a path, deterministically, and keeps the map', () => {
  const start = [{ x: 100, y: 400 }, { x: 100, y: 250 }, { x: 100, y: 100 }, { x: 250, y: 250 }]
  const edges = [[0, 2], [0, 3]]
  const o = { ...opts, dx: 70, dy: 150, x0: 50, x1: 300 }
  const moved = relax(start, edges, o)
  assert.deepEqual(moved, relax(start, edges, o))
  assert.ok(badness(moved, edges, opts).total < badness(start, edges, opts).total)
  for (const f of moved) assert.ok(f.x >= 50 && f.x <= 300)
  assert.deepEqual(start[1], { x: 100, y: 250 })                         // the start is not changed
})

test('on the real level graph the layout gets clearly better', () => {
  const graph = parseLevelGraph(JSON.parse(readFileSync(new URL('../public/catalog/level_graph.json', import.meta.url))))
  // as CastleMap lays them out (its stagger: the heights that keep neighbouring columns apart)
  const n = graph.columns
  let best = null
  const perm = (left, acc) => {
    if (!left.length) {
      const offsets = acc.map((k) => k / n)
      let gap = 1
      for (let c = 0; c + 1 < n; c++) { const d = Math.abs(offsets[c] - offsets[c + 1]); gap = Math.min(gap, d, 1 - d) }
      if (!best || gap > best.gap + 1e-9) best = { offsets, gap }
      return
    }
    left.forEach((k, i) => perm([...left.slice(0, i), ...left.slice(i + 1)], [...acc, k]))
  }
  perm(Array.from({ length: n }, (_, k) => k), [])
  const W = 390, size = 70, seg = Math.max(size * 1.75, (size * 1.5) / best.gap), margin = 59.5, dx = (W - 2 * margin) / (n - 1)
  const start = Array.from({ length: graph.count }, (_, i) => ({ x: margin + graph.col[i] * dx, y: 5000 - (graph.layer[i] + best.offsets[graph.col[i]]) * seg }))
  const edges = start.flatMap((f, a) => graph.children[a].map((b) => [a, b]))
  const before = badness(start, edges, opts)
  const after = badness(relax(start, edges, { ...opts, dx, dy: seg, x0: size * 0.75, x1: W - size * 0.75 }), edges, opts)
  assert.equal(before.crowd, 0)
  assert.equal(after.crowd, 0)
  assert.ok(after.through <= before.through / 4, `through ${before.through} -> ${after.through}`)
  assert.ok(after.total < before.total / 3, `total ${before.total} -> ${after.total}`)
  assert.ok(after.cross <= before.cross)
  // every path still goes up: a place stays above every place a path into it comes from
  const moved = relax(start, edges, { ...opts, dx, dy: seg, x0: size * 0.75, x1: W - size * 0.75 })
  for (const [a, b] of edges) {
    const rise = Math.min(0.45 * seg, start[a].y - start[b].y)
    assert.ok(moved[b].y <= moved[a].y - rise + 1e-6, `${a} -> ${b}`)
  }
})
