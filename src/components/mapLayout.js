// Where the places stand on the home map (components/CastleMap.jsx): the level graph gives each
// place a row (layer) and a column, CastleMap spreads them over the map; `relax` then nudges them
// from there -- sideways, and a little up or down -- where that keeps the paths out of other
// buildings and off each other. Pure and deterministic: the same graph and map size always give
// the same map (tested).
//
// How: a layout's badness (`badness`) counts path points inside a building that is neither end
// of the path (`through`), points of two paths that lie on top of each other (`close`; paths that
// share an end only away from it), paths that cross (`cross`), buildings too close together
// (`crowd`), and how far each place moved. A place may move up or down by up to a band, but
// always stays ABOVE bands above every place a path into it comes from. `relax` goes over the places again and again and moves each to the best of a few spots
// around where it started (`MOVES_X` sideways, then `MOVES_Y` up or down), until nothing gets
// better.

import { curvePoint } from './mapPath.js'

const STEPS = 24                       // points per path for the checks
// weights: a path through a building is worst, then paths on top of each other
const W_THROUGH = 4, W_CLOSE = 1, W_CROSS = 6, W_CROWD = 50, W_MOVE = 6
// a place stays this many bands above every place a path into it comes from (or as far as at the
// start, if that is less)
const ABOVE = 0.45
// where a place may go: sideways in sixths of the columns' distance, up or down in tenths of a band
const MOVES_X = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => k / 6)
const MOVES_Y = [-10, -8, -6, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6, 8, 10].map((k) => k / 10)

function sample(a, b) {
  const pts = []
  for (let i = 0; i <= STEPS; i++) pts.push(curvePoint(a, b, i / STEPS))
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y)
  return { pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

// The parts of the badness, with what to measure them against.
function measure({ size, half }) {
  const bw = size * 0.55, bh = size * 1.45                 // a building, around its foot
  const near = half * 4, apart = size * 1.6, near2 = near * near, apart2 = apart * apart
  return {
    // points of path P (from a to b) inside building i
    through(P, a, b, feet, i) {
      if (i === a || i === b) return 0
      const f = feet[i], x0 = f.x - bw - half, x1 = f.x + bw + half, y0 = f.y - bh - half, y1 = f.y + half
      if (P.x1 < x0 || P.x0 > x1 || P.y1 < y0 || P.y0 > y1) return 0
      let n = 0
      for (const p of P.pts) if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) n++
      return n
    },
    // points of path P on top of path Q (not near an end they share)
    close(P, ea, Q, eb, feet) {
      if (P.x1 + near < Q.x0 || Q.x1 + near < P.x0 || P.y1 + near < Q.y0 || Q.y1 + near < P.y0) return 0
      const shared = ea[0] === eb[0] || ea[0] === eb[1] ? feet[ea[0]] : ea[1] === eb[0] || ea[1] === eb[1] ? feet[ea[1]] : null
      const qs = Q.pts
      let n = 0
      for (const p of P.pts) {
        if (p.x < Q.x0 - near || p.x > Q.x1 + near || p.y < Q.y0 - near || p.y > Q.y1 + near) continue
        if (shared && (p.x - shared.x) ** 2 + (p.y - shared.y) ** 2 < apart2) continue
        for (let k = 0; k < qs.length; k++) {
          const dx = p.x - qs[k].x, dy = p.y - qs[k].y
          if (dx * dx + dy * dy < near2) { n++; break }
        }
      }
      return n
    },
    // whether paths P and Q cross (paths that share an end do not count)
    cross(P, ea, Q, eb) {
      if (ea[0] === eb[0] || ea[0] === eb[1] || ea[1] === eb[0] || ea[1] === eb[1]) return 0
      if (P.x1 < Q.x0 || Q.x1 < P.x0 || P.y1 < Q.y0 || Q.y1 < P.y0) return 0
      const p = P.pts, q = Q.pts
      const side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
      for (let i = 0; i + 1 < p.length; i++) {
        for (let k = 0; k + 1 < q.length; k++) {
          if (side(p[i], p[i + 1], q[k]) * side(p[i], p[i + 1], q[k + 1]) < 0
            && side(q[k], q[k + 1], p[i]) * side(q[k], q[k + 1], p[i + 1]) < 0) return 1
        }
      }
      return 0
    },
    // two buildings too close (their pictures or badges would run into each other)
    crowd: (f, g) => (Math.abs(f.x - g.x) < size * 1.0 && Math.abs(f.y - g.y) < size * 1.4 ? 1 : 0),
  }
}

/** How bad a layout is: { total, through, close, cross, crowd } (see above; total without moving).
 *  feet[i] = { x, y } where place i stands; edges = [[a, b], ...]; size = a picture's size; half =
 *  half a path's width. */
export function badness(feet, edges, { size, half }) {
  const m = measure({ size, half })
  const paths = edges.map(([a, b]) => sample(feet[a], feet[b]))
  let through = 0, close = 0, cross = 0, crowd = 0
  edges.forEach(([a, b], e) => feet.forEach((f, i) => { through += m.through(paths[e], a, b, feet, i) }))
  for (let e = 0; e < edges.length; e++) {
    for (let g = e + 1; g < edges.length; g++) {
      close += m.close(paths[e], edges[e], paths[g], edges[g], feet)
      cross += m.cross(paths[e], edges[e], paths[g], edges[g])
    }
  }
  for (let i = 0; i < feet.length; i++) for (let j = i + 1; j < feet.length; j++) crowd += m.crowd(feet[i], feet[j])
  return { total: through * W_THROUGH + close * W_CLOSE + cross * W_CROSS + crowd * W_CROWD, through, close, cross, crowd }
}

/** The places' feet nudged from `start` (feet as CastleMap lays them out) so that the badness gets
 *  smaller: a new array of { x, y }. dx = the columns' distance, dy = a band's height; the places
 *  stay between x0 and x1. */
export function relax(start, edges, { size, half, dx, dy, x0, x1 }) {
  const m = measure({ size, half })
  const feet = start.map((f) => ({ ...f }))
  const mine = feet.map(() => [])                          // the paths at each place
  edges.forEach(([a, b], e) => { mine[a].push(e); mine[b].push(e) })
  // a path goes from a (lower) up to b: b stays at least ABOVE bands higher than a (or as high
  // above it as at the start, if that is less)
  const rise = edges.map(([a, b]) => Math.min(ABOVE * dy, start[a].y - start[b].y))
  const fits = (i, f) => edges.every(([a, b], e) => (a !== i || feet[b].y <= f.y - rise[e]) && (b !== i || f.y <= feet[a].y - rise[e]))
  const paths = edges.map(([a, b]) => sample(feet[a], feet[b]))
  // everything in the badness that depends on where place i stands
  const local = (i) => {
    let bad = 0
    for (const e of mine[i]) {
      const [a, b] = edges[e]
      feet.forEach((f, k) => { bad += W_THROUGH * m.through(paths[e], a, b, feet, k) })
      edges.forEach((other, g) => {
        if (g !== e && !(mine[i].includes(g) && g < e)) {
          bad += W_CLOSE * m.close(paths[e], edges[e], paths[g], other, feet) + W_CROSS * m.cross(paths[e], edges[e], paths[g], other)
        }
      })
    }
    edges.forEach(([a, b], e) => { if (a !== i && b !== i) bad += W_THROUGH * m.through(paths[e], a, b, feet, i) })
    feet.forEach((f, k) => { if (k !== i) bad += W_CROWD * m.crowd(feet[i], f) })
    const mx = (feet[i].x - start[i].x) / dx, my = (feet[i].y - start[i].y) / dy
    return bad + W_MOVE * (mx * mx + my * my)
  }
  const place = (i, f) => {
    feet[i] = f
    for (const e of mine[i]) paths[e] = sample(feet[edges[e][0]], feet[edges[e][1]])
  }
  for (let round = 0; round < 8; round++) {
    let better = false
    for (let i = 0; i < feet.length; i++) {
      const was = feet[i]
      let best = was, bestBad = local(i)
      const tryAt = (f) => {
        if (f.x < x0 || f.x > x1 || (f.x === was.x && f.y === was.y) || !fits(i, f)) return
        place(i, f)
        const bad = local(i)
        if (bad < bestBad - 1e-9) { best = f; bestBad = bad }
      }
      // sideways first (at its present height), then up or down from the best of those
      for (const kx of MOVES_X) tryAt({ x: start[i].x + kx * dx, y: was.y })
      const bx = best.x
      for (const ky of MOVES_Y) tryAt({ x: bx, y: start[i].y + ky * dy })
      place(i, best)
      if (best !== was) better = true
    }
    if (!better) break
  }
  return feet
}
