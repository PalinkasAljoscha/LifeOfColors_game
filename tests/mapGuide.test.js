// The first-visit guide's layout (src/components/mapGuide.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrow, guideLayout, wordWidth } from '../src/components/mapGuide.js'

const texts = { learn: 'Learn how', play: 'Start playing' }
const base = { W: 358, size: 64, castle: { x: 195, door: 700 }, first: { x: 195, door: 460 }, side: 1, texts }

test('arrow: ends at its target, arrives along the curve, head is a triangle at the target', () => {
  const a = arrow({ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 50, y: 100 })
  assert.deepEqual(a.head[0], [50, 100])
  assert.equal(a.head.length, 3)
  assert.ok(Math.abs(a.dir.x - 1) < 1e-9 && Math.abs(a.dir.y) < 1e-9)
  assert.match(a.d, /^M0\.0,0\.0 Q0\.0,100\.0 /)
})

test('guideLayout: both words inside the map, on the given sides, arrows pointing at the places', () => {
  const g = guideLayout(base)
  assert.deepEqual(g.map((x) => x.key), ['learn', 'play'])
  for (const w of g) {
    const width = wordWidth(w.text, w.fs)
    const x0 = w.anchor === 'end' ? w.x - width : w.x
    assert.ok(x0 >= 0 && x0 + width <= base.W, `${w.key} inside`)
  }
  const [learn, play] = g
  assert.equal(learn.anchor, 'end')                       // the castle's free side is the right
  assert.ok(learn.y < base.castle.door)                   // above the castle
  assert.ok(learn.arrow.head[0][0] > base.castle.x)       // at its right tower
  assert.ok(play.y > base.first.door)                     // below the first place
  assert.ok(play.arrow.dir.y < 0 || play.arrow.dir.x !== 0)
})

test('guideLayout: mirrored sides, long words shrink, no first place = only "learn"', () => {
  const g = guideLayout({ ...base, side: -1, first: { x: 120, door: 460 } })
  assert.equal(g[0].anchor, 'start')
  assert.equal(g[1].anchor, 'end')                        // first place on the left: word on the right
  const long = guideLayout({ ...base, texts: { learn: 'A very very long word here', play: 'x' } })
  assert.ok(long[0].fs < 32)
  assert.equal(guideLayout({ ...base, first: null }).length, 1)
})
