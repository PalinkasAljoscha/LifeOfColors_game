// WORKSHOPS -- the puzzle-selection scenes of the castles (components/Workshop.jsx).
//
// Every castle except the training castle shows its puzzles as potions in a sorcerer's workshop:
// a flat picture in the app's own colours (src/assets/workshops/<key>.svg, 390 x 844 units, drawn
// like the home map: plain shapes, no textures) with one potion per puzzle drawn over it in the
// puzzle's own colour. This file is the part of each picture the code needs: where a potion can
// stand. It has no React and no image imports, so the tests can load it.
//
// A scene:
//   key       the picture's file name
//   rail      colour (a key of src/theme.js) of the rack rail in front of the standing potions
//   slots     [x, y, rot] per potion, in filling order. Standing (rot 0): x, y = the bottom centre.
//             Lying (|rot| > 30, the tower's table): x, y = the middle, rot = the tilt in degrees.
//   rails     the rack rails: a bar { x, y, w, h } (optionally turned by `a` degrees around cx, cy)
//             or an arc { arc, x0, x1, y, rise }
//   banner    where the "Pick your poison" line (levelScreen.choose) sits, or null: only the crypt
//             has it (on its stone lintel): centre x, baseline y, font size, the widest it may get
//   flames    [x, y] of candle / lantern flames (drawn live so they can flicker)
//   window    only the tower: its window, for the bat that passes outside (see there)
//   tilt      the most a standing potion leans, in degrees; jitter = its random sideways shift
//   floating  the potions hover (the levitation study)
//
// The pictures and these numbers come from one drawing script; change them together.

export const WORKSHOP_WIDTH = 390
export const WORKSHOP_HEIGHT = 844

export const WORKSHOPS = [
  {
    key: 'hut', rail: 'castleGate',
    tilt: 8, jitter: 4, floating: false,
    banner: null,
    rails: [{x:16,y:250,w:358,h:7,a:-1.3,cx:195,cy:264},{x:16,y:358,w:358,h:7,a:1.1,cx:195,cy:372},{x:16,y:466,w:358,h:7,a:-0.8,cx:195,cy:480},{x:16,y:574,w:358,h:7,a:1.4,cx:195,cy:588},{x:126,y:707,w:262,h:7}],
    flames: [[356,181]],
    slots: [
      [46.7,262.4,0], [96.1,261.2,0], [145.6,260.1,0], [195.0,259.0,0], [244.4,257.9,0], [293.9,256.8,0], [343.3,255.6,0],
      [46.7,364.2,0], [96.1,365.1,0], [145.6,366.1,0], [195.0,367.0,0], [244.4,367.9,0], [293.9,368.9,0], [343.3,369.8,0],
      [46.7,477.1,0], [96.1,476.4,0], [145.6,475.7,0], [195.0,475.0,0], [244.4,474.3,0], [293.9,473.6,0], [343.3,472.9,0],
      [46.7,579.4,0], [96.1,580.6,0], [145.6,581.8,0], [195.0,583.0,0], [244.4,584.2,0], [293.9,585.4,0], [343.3,586.6,0],
      [148.0,716,0], [191.5,716,0], [235.0,716,0], [278.5,716,0], [322.0,716,0], [365.5,716,0],
    ],
  },
  {
    key: 'cupboard', rail: 'castleGate',
    tilt: 7, jitter: 4, floating: false,
    banner: null,
    rails: [{x:24,y:278,w:342,h:7},{x:24,y:394,w:342,h:7},{x:24,y:510,w:342,h:7},{x:24,y:626,w:342,h:7},{x:24,y:742,w:342,h:7}],
    flames: [[346,803]],
    slots: [
      [50.1,287,0], [98.4,287,0], [146.7,287,0], [195.0,287,0], [243.3,287,0], [291.6,287,0], [339.9,287,0],
      [50.1,403,0], [98.4,403,0], [146.7,403,0], [195.0,403,0], [243.3,403,0], [291.6,403,0], [339.9,403,0],
      [50.1,519,0], [98.4,519,0], [146.7,519,0], [195.0,519,0], [243.3,519,0], [291.6,519,0], [339.9,519,0],
      [50.1,635,0], [98.4,635,0], [146.7,635,0], [195.0,635,0], [243.3,635,0], [291.6,635,0], [339.9,635,0],
      [50.1,751,0], [98.4,751,0], [146.7,751,0], [195.0,751,0], [243.3,751,0], [291.6,751,0], [339.9,751,0],
    ],
  },
  {
    key: 'lab', rail: 'castleLockedRoof',
    tilt: 7, jitter: 4, floating: false,
    banner: null,
    rails: [{arc:true,x0:18,x1:372,y:261,rise:30},{arc:true,x0:18,x1:372,y:371,rise:30},{arc:true,x0:18,x1:372,y:481,rise:30},{arc:true,x0:18,x1:372,y:591,rise:30},{arc:true,x0:18,x1:372,y:701,rise:30}],
    flames: [],
    slots: [
      [48.4,263.6,0], [97.3,258.3,0], [146.1,255.1,0], [195.0,254.0,0], [243.9,255.1,0], [292.7,258.3,0], [341.6,263.6,0],
      [48.4,373.6,0], [97.3,368.3,0], [146.1,365.1,0], [195.0,364.0,0], [243.9,365.1,0], [292.7,368.3,0], [341.6,373.6,0],
      [48.4,483.6,0], [97.3,478.3,0], [146.1,475.1,0], [195.0,474.0,0], [243.9,475.1,0], [292.7,478.3,0], [341.6,483.6,0],
      [48.4,593.6,0], [97.3,588.3,0], [146.1,585.1,0], [195.0,584.0,0], [243.9,585.1,0], [292.7,588.3,0], [341.6,593.6,0],
      [48.4,703.6,0], [97.3,698.3,0], [146.1,695.1,0], [195.0,694.0,0], [243.9,695.1,0], [292.7,698.3,0], [341.6,703.6,0],
    ],
  },
  {
    key: 'tower', rail: 'castleGate',
    tilt: 7, jitter: 4, floating: false,
    banner: null,
    rails: [{x:20,y:426,w:350,h:7},{x:20,y:522,w:350,h:7},{x:20,y:618,w:350,h:7}],
    flames: [],
    // The window: a bat flies past behind its bars now and then (opening = the sky's outline,
    // bars = what is drawn again in front of the bat).
    window: {
      opening: 'M118,318 V186 Q118,124 195,118 Q272,124 272,186 V318 Z',
      bars: 'M195,118 V318 M118,196 H272 M118,260 H272',
      sky: [118, 124, 272, 262],
    },
    slots: [
      [48.4,435,0], [97.3,435,0], [146.1,435,0], [195.0,435,0], [243.9,435,0], [292.7,435,0], [341.6,435,0],
      [48.4,531,0], [97.3,531,0], [146.1,531,0], [195.0,531,0], [243.9,531,0], [292.7,531,0], [341.6,531,0],
      [48.4,627,0], [97.3,627,0], [146.1,627,0], [195.0,627,0], [243.9,627,0], [292.7,627,0], [341.6,627,0],
      [60,678,84], [150,674,-80], [242,679,97], [332,674,-86], [40,742,-46], [118,744,50], [196,742,-52],
      [274,744,44], [350,742,-50], [84,812,92], [176,809,-82], [264,813,86], [346,809,-95],
    ],
  },
  {
    key: 'study', rail: 'castleGate',
    tilt: 13, jitter: 0, floating: true,
    banner: null,
    rails: [],
    flames: [],
    slots: [
      [62,262.2,0], [104.1,273.1,0], [155.8,265.5,0], [214.3,268.4,0], [262.5,268.9,0], [324.0,273.7,0], [62,374.1,0],
      [119.3,370.9,0], [176.5,371.4,0], [225.8,360.1,0], [277.8,370.1,0], [328,357.5,0], [62,452.8,0], [103.6,463.3,0],
      [159.7,466.5,0], [208.5,469.5,0], [272.6,467.3,0], [326.9,469.7,0], [62,559.1,0], [118.2,566.2,0], [176.9,551.3,0],
      [228.9,566.1,0], [283.4,551.7,0], [328,550.2,0], [62.1,668.4,0], [110.2,667.8,0], [160.8,651.8,0], [213.3,663.2,0],
      [270.0,655.5,0], [328,647.8,0], [65.9,735.9,0], [121.5,756.8,0], [278.2,756.7,0], [328,750.1,0],
    ],
  },
  {
    key: 'crypt', rail: 'castleGate',
    tilt: 4, jitter: 4, floating: false,
    banner: {x:195,y:167,size:21,maxW:320},
    rails: [],
    flames: [[44.0,735]],
    slots: [
      [44.0,292,0], [104.4,292,0], [164.8,292,0], [225.2,292,0], [285.6,292,0], [346.0,292,0], [44.0,386,0],
      [104.4,386,0], [164.8,386,0], [225.2,386,0], [285.6,386,0], [346.0,386,0], [44.0,480,0], [104.4,480,0],
      [164.8,480,0], [225.2,480,0], [285.6,480,0], [44.0,574,0], [104.4,574,0], [164.8,574,0], [225.2,574,0],
      [285.6,574,0], [346.0,574,0], [44.0,668,0], [104.4,668,0], [164.8,668,0], [225.2,668,0], [285.6,668,0],
      [346.0,668,0], [104.4,762,0], [164.8,762,0], [225.2,762,0], [285.6,762,0], [346.0,762,0],
    ],
  },
]

/** The scene of a castle: castles 1, 2, 3, ... walk through the scenes in order and start again. */
export function workshopFor(castle) {
  const n = WORKSHOPS.length
  return WORKSHOPS[(((Math.trunc(castle) - 1) % n) + n) % n]
}

export const isLying = (slot) => Math.abs(slot[2]) > 30

/** Which puzzle goes into which slot: [{ inst, slot }] in pool order, or null when the scene has
 *  too few slots (the caller then falls back to the plain tile grid). Puzzles fill the slots in
 *  order; only where a scene has lying slots, special puzzles (round flasks) get standing ones
 *  first, so a flask lies down only when there are more specials than standing slots. */
export function placePuzzles(scene, pool, isSpecial) {
  if (pool.length > scene.slots.length) return null
  const used = scene.slots.slice(0, pool.length)
  if (!used.some(isLying)) return pool.map((inst, k) => ({ inst, slot: used[k] }))
  const standing = used.filter((s) => !isLying(s))
  const lying = used.filter(isLying)
  const specials = pool.filter(isSpecial).length
  let baseStanding = Math.max(0, standing.length - specials)   // standing slots left for test tubes
  let s = 0, l = 0
  return pool.map((inst) => {
    const special = isSpecial(inst)
    const stand = s < standing.length && (special || baseStanding > 0 || l >= lying.length)
    if (stand && !special) baseStanding--
    return { inst, slot: stand ? standing[s++] : lying[l++] }
  })
}

/** Random numbers in [0, 1) that depend only on `text` (a puzzle id): the same potion looks the
 *  same every time the screen opens. */
export function seededRandom(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const STOPPERS = ['cork', 'cork', 'darkCork', 'darkCork', 'wood', 'wax', 'wax', 'cloth', 'glass']
export const STOPPER_SHADES = 5      // wax and cloth each come in this many colours (theme.js wsWax1.., wsCloth1..)

/** How one puzzle's potion looks and moves, drawn from its id: lean, sideways shift, fill level,
 *  stopper, and its rare life (bubbles, an electric flash, or nothing). `special` = round flask. */
export function potionLook(id, scene, lying, special) {
  const rnd = seededRandom(id)
  const between = (a, b) => a + (b - a) * rnd()
  const pick = (list) => list[Math.floor(rnd() * list.length)]
  const strong = rnd() < 0.12 ? (rnd() < 0.5 ? -1 : 1) * between(4, 7) : 0
  const look = {
    tilt: lying ? between(-6, 6) : between(-scene.tilt, scene.tilt) * pick([0.3, 0.6, 1, 1]) + strong,
    dx: lying ? 0 : between(-scene.jitter, scene.jitter),
    level: special ? -between(20, 29) : -between(38, 52),
    stopper: pick(STOPPERS),
    shade: 1 + Math.floor(rnd() * STOPPER_SHADES),
    specks: Array.from({ length: 5 }, () => [between(-1, 1), between(0.5, 7.5), between(0.4, 0.8)]),
    drips: [between(3, 7), between(3, 6), between(2, 5)],
    bob: { rise: between(2.5, 5), seconds: between(5, 9), start: between(0, 8) },
    vapour: { start: between(0, 9), drift: [pick([-5, 5, -3, 4]), pick([-5, 5, -3, 4])] },
    life: null,
  }
  const chance = rnd()
  const reach = special ? 9 : 4.6
  if (!lying && chance < 0.3) {
    look.life = {
      kind: 'bubbles', seconds: between(9, 16), start: between(0, 12),
      bubbles: Array.from({ length: pick([2, 3]) }, (_, q) => ({ x: between(-1, 1) * reach, r: between(1, 2), from: 0.62 + q * 0.07 })),
    }
  } else if (chance > (lying ? 0.82 : 0.9)) {
    // a small forked bolt inside the liquid
    const [ya, yb] = lying ? [-62, -8] : [look.level + 3, -5]
    const bolt = (x, y0, y1, steps) => {
      const pts = [[x, y0]]
      for (let q = 1; q <= steps; q++) {
        pts.push([Math.max(-reach - 2, Math.min(reach + 2, x + between(-reach, reach))), y0 + ((y1 - y0) * q) / steps + between(-1.5, 1.5)])
      }
      return pts
    }
    const main = bolt(between(-2, 2), ya, yb, 6)
    const fork = bolt(main[2][0], main[2][1], main[2][1] + (yb - ya) * 0.45, 3)
    const path = (pts) => pts.map(([x, y], q) => `${q ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    look.life = { kind: 'bolt', seconds: between(11, 19), start: between(0, 14), d: `${path(main)} ${path(fork)}` }
  }
  return look
}
