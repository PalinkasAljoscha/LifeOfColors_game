// The stones of one path on the home map (components/CastleMap.jsx): rows of near-rectangular
// flagstones of different sizes laid across the curve from place a to place b, with thin joints of
// grass and no border line.
// Pure and deterministic: the same a, b and seed always give the same stones (tested).
//
// How: the curve is cut into rows of different depth. Every row has its own left and right end
// (so the path's edge is ragged) and is split into one or two stones of unequal width; a stone's
// corners wobble a little, and now and then a stone stops short of its row's end.
// The caller draws each stone filled AND stroked in the same colour, STONE_ROUND wide with round
// joins: that rounds the corners (the joints here already leave room for that stroke).

export const STONE_ROUND = 1.4   // stroke width that rounds a stone's corners (px)
const HALF = 5.5      // half the path's width (px); a row's ends vary around it
const ROW_MIN = 5     // a row's depth along the path: from ... to (px)
const ROW_MAX = 8
const GAP = 1.2       // grass between two stones (px)
const WOBBLE = 0.9    // how far a corner may be off (px, peak to peak)
const ONE_STONE = 0.4 // share of rows that are a single stone (the others: two)
const MIN_WIDTH = 4.2 // a row narrower than twice this stays one stone (px)

/** How far from the curve a path's stones can reach (px). */
export const PATH_REACH = HALF * 1.25 + STONE_ROUND / 2

function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/** The point at t (0..1) of the path's curve from a to b: it leaves and arrives vertically. */
export function curvePoint(a, b, t) {
  const dy = (b.y - a.y) / 2, u = 1 - t
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  const xs = [a.x, a.x, b.x, b.x], ys = [a.y, a.y + dy, b.y - dy, b.y]
  return { x: xs.reduce((s, v, i) => s + v * w[i], 0), y: ys.reduce((s, v, i) => s + v * w[i], 0) }
}

// The curve as many points with the distance walked so far (s) and the direction there (tx, ty).
function frames(a, b) {
  const out = []
  let prev = curvePoint(a, b, 0), walked = 0
  for (let i = 1; i <= 600; i++) {
    const p = curvePoint(a, b, i / 600), d = Math.hypot(p.x - prev.x, p.y - prev.y)
    if (!d) continue
    walked += d
    out.push({ s: walked, x: p.x, y: p.y, tx: (p.x - prev.x) / d, ty: (p.y - prev.y) / d })
    prev = p
  }
  return out
}

// The frame at distance s (first one at or past it).
function frameAt(F, s) {
  let lo = 0, hi = F.length - 1
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (F[m].s < s) lo = m + 1
    else hi = m
  }
  return F[lo]
}

// A point given in a frame: `along` the path's direction and `across` it.
const local = (f, along, across) => [f.x + f.tx * along - f.ty * across, f.y + f.ty * along + f.tx * across]

/** The stones of the path from a to b ({x, y} each): [{ d, k }], d = the stone's SVG path (four
 *  corners), k = its own random number in 0..1 (the caller picks its tone by k). */
export function pathStones(a, b, seed) {
  const F = frames(a, b)
  if (!F.length) return []
  const r = rng(seed), length = F[F.length - 1].s, stones = []
  const g = GAP / 2 + STONE_ROUND / 2          // from a row's line to a stone's own corner
  const f = (v) => v.toFixed(1)
  let s = 1
  while (s < length - 1) {
    let depth = ROW_MIN + r() * (ROW_MAX - ROW_MIN)
    if (length - s - depth < ROW_MIN) depth = length - s        // no sliver of a last row
    const f0 = frameAt(F, s), f1 = frameAt(F, s + depth)
    const left = -HALF * (0.8 + r() * 0.45), width = HALF * (0.8 + r() * 0.45) - left
    const n = r() < ONE_STONE || width / 2 < MIN_WIDTH ? 1 : 2
    const cuts = n === 1 ? [0, 1] : [0, 0.5 + (r() - 0.5) * 0.2, 1]
    for (let k = 0; k < n; k++) {
      const j = () => (r() - 0.5) * WOBBLE
      const x0 = left + width * cuts[k] + g, x1 = left + width * cuts[k + 1] - g
      const short = r() < 0.25 ? depth * 0.25 * r() : 0
      const corners = [local(f0, g + j(), x0 + j()), local(f0, g + j(), x1 + j()),
        local(f1, -g - short + j(), x1 + j()), local(f1, -g - short + j(), x0 + j())]
      stones.push({ d: `M${corners.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`, k: r() })
    }
    s += depth
  }
  return stones
}
