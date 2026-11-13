// Free space on the home map (components/CastleMap.jsx): what lies flat (fields, a pond) is only
// put where nothing else is -- no path, no place's picture, no standing thing, no other flat
// thing. Boxes are { x0, y0, x1, y1 } in map pixels.
// Pure (no React) so the tests can use it.

import { curvePoint } from './mapPath.js'

/** Whether two boxes overlap or come closer than `gap`. */
export const overlaps = (a, b, gap = 0) =>
  a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap

/** Whether the path's curve from place a to place b comes closer to the box than `reach`. */
export function nearPath(box, a, b, reach) {
  // the curve stays inside the box of its two ends: a quick no first
  if (!overlaps(box, { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) }, reach)) return false
  const steps = Math.max(8, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3))
  for (let i = 0; i <= steps; i++) {
    const p = curvePoint(a, b, i / steps)
    const dx = Math.max(box.x0 - p.x, 0, p.x - box.x1), dy = Math.max(box.y0 - p.y, 0, p.y - box.y1)
    if (dx * dx + dy * dy < reach * reach) return true
  }
  return false
}

/** Places the flat things one after the other. A thing is { spots, own, ownSpots }: spots = boxes,
 *  best first; own = boxes of its own place (picture, standing things) that its first `ownSpots`
 *  spots (default 1) may touch -- those are where the drawing puts it (and its mirror image), next
 *  to its own place on purpose (a pond half behind its tower); every other spot must be clear of
 *  them too. A spot must lie inside `bounds` (if
 *  given) and be clear of everything `taken` by `gap`, of every path ([a, b] ends) by `reach`, and
 *  of the flat things placed before it; the chosen spot is then taken too. Returns the chosen
 *  spot's index per thing, -1 = no free spot (the thing is left out). `taken` grows. */
export function placeFlat(things, taken, paths, { gap, reach, bounds = null }) {
  const inBounds = (b) => !bounds || (b.x0 >= bounds.x0 && b.x1 <= bounds.x1 && b.y0 >= bounds.y0 && b.y1 <= bounds.y1)
  return things.map(({ spots, own = [], ownSpots = 1 }) => {
    const n = spots.findIndex((box, k) => inBounds(box)
      && !taken.some((t) => (k >= ownSpots || !own.includes(t)) && overlaps(box, t, gap))
      && !paths.some(([a, b]) => nearPath(box, a, b, reach)))
    if (n >= 0) taken.push(spots[n])
    return n
  })
}
