// The level graph: how the levels ("castles" in the code) are joined on the home map.
//
// The factory makes it (LifeOfColors_factory level_graph.ipynb, export_level_graph.py) and ships it
// next to the catalog as public/catalog/level_graph.json:
//   { graph_version, nodes: [{ id, layer, col }], edges: [[from, to], ...] }
// Node id = castle number: 0 = the training castle, 1 = site 1, ... Ids grow with the layer, so the
// puzzles, cut in difficulty order into castles 1, 2, 3, ... (engine/castles.js assignCastles),
// get harder further up the map. layer = row on the map (0 at the bottom), col = position from
// the left. Every path goes one layer up. A castle opens when ANY castle with a path into it is
// done (engine/castles.js castleStates).
// Without a level_graph.json (an old catalog) the castles form one line of CASTLE_COUNT
// (src/config.js): chainGraph.
// Pure functions (no React, no fetch) so the tests can use them.

/** A checked graph: { version, count, layer[], col[], parents[][], children[][], rows, columns }.
 *  Throws on anything the app cannot use. */
export function parseLevelGraph(data) {
  const nodes = [...(data?.nodes ?? [])].sort((a, b) => a.id - b.id)
  const count = nodes.length
  if (count < 2 || nodes.some((n, i) => n.id !== i)) throw new Error('level graph: node ids must be 0..n-1')
  const layer = nodes.map((n) => n.layer)
  const col = nodes.map((n) => n.col)
  if (layer[0] !== 0 || layer.slice(1).some((l) => !(l >= 1))) throw new Error('level graph: node 0 must be the only one in layer 0')
  if (layer.some((l, i) => i > 0 && l < layer[i - 1])) throw new Error('level graph: ids must be ordered by layer')
  if (col.some((c) => !(Number.isInteger(c) && c >= 0))) throw new Error('level graph: every node needs a column')
  const parents = nodes.map(() => [])
  const children = nodes.map(() => [])
  for (const [a, b] of data.edges ?? []) {
    if (!(a >= 0 && a < count && b >= 0 && b < count) || layer[b] !== layer[a] + 1) {
      throw new Error(`level graph: path ${a} -> ${b} must go one layer up`)
    }
    if (!children[a].includes(b)) { children[a].push(b); parents[b].push(a) }
  }
  if (parents.some((p, i) => i > 0 && p.length === 0)) throw new Error('level graph: every site but 0 needs a path into it')
  for (const list of [...parents, ...children]) list.sort((x, y) => col[x] - col[y])
  return {
    version: data.graph_version ?? null,
    count, layer, col, parents, children,
    rows: layer[count - 1] + 1,
    columns: Math.max(...col) + 1,
  }
}

/** Castles 0 .. count-1 in one line, one per row (the map before the level graph). */
export function chainGraph(count) {
  const nodes = Array.from({ length: count }, (_, id) => ({ id, layer: id, col: 0 }))
  const edges = Array.from({ length: count - 1 }, (_, i) => [i, i + 1])
  return parseLevelGraph({ graph_version: null, nodes, edges })
}
