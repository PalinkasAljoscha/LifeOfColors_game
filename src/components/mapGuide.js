// The first-visit guide on the map (CastleMap.jsx): where its words and arrows go. Pure, tested
// (tests/mapGuide.test.js). Everything in map pixels.
//
//   learn  "Learn how" above the training castle's free side (the side of its practice targets),
//          an arrow curving down to the castle's tower on that side.
//   play   "Start playing" below the first place, on the side with more room, an arrow curving up
//          and in to that place's side.
// (The third one, "Skip levels", stays at the top of the visible map: CastleMap.jsx.)

const EDGE = 10            // words keep this far from the map's sides
const CHAR = 0.5           // a letter's width (Mystery Quest), as a part of the font size

// A word's width at font size fs (estimated).
export const wordWidth = (text, fs) => text.length * fs * CHAR

// Font size for `text` on a side: at most `max`, smaller when it would not fit in `room` px.
const fit = (text, max, room) => Math.max(14, Math.min(max, room / (text.length * CHAR)))

// An arrow from a to b, bent through c (a quadratic curve): its path and an arrowhead at b, and the
// unit direction it arrives in (for the nudge).
export function arrow(a, c, b, head = 9) {
  let dx = b.x - c.x, dy = b.y - c.y
  const l = Math.hypot(dx, dy) || 1
  dx /= l; dy /= l
  const back = { x: b.x - dx * head, y: b.y - dy * head }
  const nx = -dy * head * 0.62, ny = dx * head * 0.62
  return {
    d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${back.x.toFixed(1)},${back.y.toFixed(1)}`,
    head: [[b.x, b.y], [back.x + nx, back.y + ny], [back.x - nx, back.y - ny]],
    dir: { x: dx, y: dy },
  }
}

/** W: the map's width; size: a place's picture size; castle / first: { x, door } of the training
 *  castle and the first place (door = the middle of its door, map y); side: the training castle's
 *  free side (1 right, -1 left; TrainingGround's sticks). texts: { learn, play }.
 *  Returns [{ key, text, x, y, fs, anchor, arrow }] (x, y: the word's anchor point on its baseline). */
export function guideLayout({ W, size, castle, first, side, texts }) {
  const out = []
  // "Learn how": over the castle's free side, clear above its towers
  {
    const text = texts.learn
    const fs = fit(text, Math.min(36, size * 0.5), W / 2 + size * 0.2 - EDGE)
    const w = wordWidth(text, fs)
    const y = castle.door - size * 1.3
    const x = side > 0 ? W - EDGE : EDGE
    const inner = side > 0 ? x - w * 0.6 : x + w * 0.6            // under the word, towards the middle
    const a = { x: inner, y: y + fs * 0.35 }
    const b = { x: castle.x + side * size * 0.42, y: castle.door - size * 0.5 }
    out.push({ key: 'learn', text, x, y, fs, anchor: side > 0 ? 'end' : 'start', arrow: arrow(a, { x: a.x, y: b.y }, b) })
  }
  // "Start playing": below the first place, on its roomier side
  if (first) {
    const text = texts.play
    const s = first.x > W / 2 ? -1 : 1
    const room = s < 0 ? first.x - size * 0.25 - EDGE : W - EDGE - first.x - size * 0.25
    const fs = fit(text, Math.min(30, size * 0.42), room)
    const w = wordWidth(text, fs)
    const y = first.door + size * 0.85
    const x = s > 0 ? W - EDGE : EDGE
    const inner = s > 0 ? x - w * 0.7 : x + w * 0.7                  // over the word, towards the place
    const a = { x: inner, y: y - fs * 1.05 }
    const b = { x: first.x + s * size * 0.6, y: first.door - size * 0.2 }
    out.push({ key: 'play', text, x, y, fs, anchor: s > 0 ? 'end' : 'start', arrow: arrow(a, { x: a.x, y: b.y }, b) })
  }
  return out
}
