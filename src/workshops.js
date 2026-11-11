// WORKSHOPS -- the painted puzzle-selection scenes of the castles (components/Workshop.jsx).
//
// Every castle except the training castle shows its puzzles as potions in a sorcerer's workshop:
// a painted, nearly monochrome picture (src/assets/workshops/<key>.jpg, 390 x 844 units, drawn at
// twice that size) with one potion per puzzle drawn over it in the puzzle's own colour. This file
// is the part of each picture the code needs: where a potion can stand. It has no React and no
// image imports, so the tests can load it.
//
// A scene:
//   key       the picture's file name
//   colours   prefix of its colours in src/theme.js (<prefix>Bg, Rail, RailLight, Title, Sub, Sign,
//             Banner, BannerShade)
//   slots     [x, y, rot] per potion, in filling order. Standing (rot 0): x, y = the bottom centre.
//             Lying (|rot| > 30, the tower's table): x, y = the middle, rot = the tilt in degrees.
//   rails     the rack rail drawn in front of the standing potions: a bar { x, y, w, h } (optionally
//             turned by `a` degrees around cx, cy) or an arc { arc, x0, x1, y, rise }
//   banner    where the "Pick your poison" line (levelScreen.choose) sits in the picture: centre x,
//             baseline y, font size, the widest it may get; glow = letters of light (no sign behind)
//   flames    [x, y] of candle / lantern flames (drawn live so they can flicker)
//   twinkles  [x, y] of rare star twinkles in the picture
//   tilt      the most a standing potion leans, in degrees; jitter = its random sideways shift
//   floating  the potions hover (the levitation study)
//
// The pictures and these numbers come from one drawing script; change them together.

export const WORKSHOP_WIDTH = 390
export const WORKSHOP_HEIGHT = 844

export const WORKSHOPS = [
  {
    key: 'hut', colours: 'wsHut',
    tilt: 8, jitter: 4, floating: false,
    banner: {x:195,y:184,size:31,maxW:226,glow:false},
    rails: [{x:16,y:286,w:358,h:7,a:-1.3,cx:195,cy:300},{x:16,y:390,w:358,h:7,a:1.1,cx:195,cy:404},{x:16,y:494,w:358,h:7,a:-0.8,cx:195,cy:508},{x:16,y:598,w:358,h:7,a:1.4,cx:195,cy:612},{x:126,y:707,w:262,h:7}],
    flames: [[356,178]], twinkles: [],
    slots: [
      [46.7,298.4,0], [96.1,297.2,0], [145.6,296.1,0], [195.0,295.0,0], [244.4,293.9,0], [293.9,292.8,0], [343.3,291.6,0],
      [46.7,396.2,0], [96.1,397.1,0], [145.6,398.1,0], [195.0,399.0,0], [244.4,399.9,0], [293.9,400.9,0], [343.3,401.8,0],
      [46.7,505.1,0], [96.1,504.4,0], [145.6,503.7,0], [195.0,503.0,0], [244.4,502.3,0], [293.9,501.6,0], [343.3,500.9,0],
      [46.7,603.4,0], [96.1,604.6,0], [145.6,605.8,0], [195.0,607.0,0], [244.4,608.2,0], [293.9,609.4,0], [343.3,610.6,0],
      [148.0,716,0], [191.5,716,0], [235.0,716,0], [278.5,716,0], [322.0,716,0], [365.5,716,0],
    ],
  },
  {
    key: 'cupboard', colours: 'wsCupboard',
    tilt: 7, jitter: 4, floating: false,
    banner: {x:195,y:176,size:31,maxW:290,glow:false},
    rails: [{x:24,y:278,w:342,h:7},{x:24,y:394,w:342,h:7},{x:24,y:510,w:342,h:7},{x:24,y:626,w:342,h:7},{x:24,y:742,w:342,h:7}],
    flames: [[350,803]], twinkles: [],
    slots: [
      [50.1,287,0], [98.4,287,0], [146.7,287,0], [195.0,287,0], [243.3,287,0], [291.6,287,0], [339.9,287,0],
      [50.1,403,0], [98.4,403,0], [146.7,403,0], [195.0,403,0], [243.3,403,0], [291.6,403,0], [339.9,403,0],
      [50.1,519,0], [98.4,519,0], [146.7,519,0], [195.0,519,0], [243.3,519,0], [291.6,519,0], [339.9,519,0],
      [50.1,635,0], [98.4,635,0], [146.7,635,0], [195.0,635,0], [243.3,635,0], [291.6,635,0], [339.9,635,0],
      [50.1,751,0], [98.4,751,0], [146.7,751,0], [195.0,751,0], [243.3,751,0], [291.6,751,0], [339.9,751,0],
    ],
  },
  {
    key: 'lab', colours: 'wsLab',
    tilt: 7, jitter: 4, floating: false,
    banner: {x:195,y:170,size:31,maxW:280,glow:false},
    rails: [{arc:true,x0:18,x1:372,y:289,rise:30},{arc:true,x0:18,x1:372,y:391,rise:30},{arc:true,x0:18,x1:372,y:493,rise:30},{arc:true,x0:18,x1:372,y:595,rise:30},{arc:true,x0:18,x1:372,y:697,rise:30}],
    flames: [], twinkles: [[195,330],[329,499],[135,592],[88,381],[195,468]],
    slots: [
      [48.4,291.6,0], [97.3,286.3,0], [146.1,283.1,0], [195.0,282.0,0], [243.9,283.1,0], [292.7,286.3,0], [341.6,291.6,0],
      [48.4,393.6,0], [97.3,388.3,0], [146.1,385.1,0], [195.0,384.0,0], [243.9,385.1,0], [292.7,388.3,0], [341.6,393.6,0],
      [48.4,495.6,0], [97.3,490.3,0], [146.1,487.1,0], [195.0,486.0,0], [243.9,487.1,0], [292.7,490.3,0], [341.6,495.6,0],
      [48.4,597.6,0], [97.3,592.3,0], [146.1,589.1,0], [195.0,588.0,0], [243.9,589.1,0], [292.7,592.3,0], [341.6,597.6,0],
      [48.4,699.6,0], [97.3,694.3,0], [146.1,691.1,0], [195.0,690.0,0], [243.9,691.1,0], [292.7,694.3,0], [341.6,699.6,0],
    ],
  },
  {
    key: 'tower', colours: 'wsTower',
    tilt: 7, jitter: 4, floating: false,
    banner: {x:195,y:396,size:31,maxW:290,glow:false},
    rails: [{x:20,y:492,w:350,h:7},{x:20,y:576,w:350,h:7},{x:20,y:660,w:350,h:7}],
    flames: [], twinkles: [],
    slots: [
      [48.4,501,0], [97.3,501,0], [146.1,501,0], [195.0,501,0], [243.9,501,0], [292.7,501,0], [341.6,501,0],
      [48.4,585,0], [97.3,585,0], [146.1,585,0], [195.0,585,0], [243.9,585,0], [292.7,585,0], [341.6,585,0],
      [48.4,669,0], [97.3,669,0], [146.1,669,0], [195.0,669,0], [243.9,669,0], [292.7,669,0], [341.6,669,0],
      [60,714,84], [150,710,-80], [242,715,97], [332,710,-86], [40,768,-46], [118,770,50], [196,768,-52],
      [274,770,44], [350,768,-50], [84,825,92], [176,822,-82], [264,826,86], [346,822,-95],
    ],
  },
  {
    key: 'study', colours: 'wsStudy',
    tilt: 13, jitter: 0, floating: true,
    banner: {x:195,y:186,size:32,maxW:270,glow:true},
    rails: [],
    flames: [], twinkles: [[120,300],[262,420],[150,560],[240,680]],
    slots: [
      [60,302.9,0], [106.7,282.7,0], [160.9,290.2,0], [209.8,294.3,0], [264.1,288.7,0], [321.9,288.8,0], [70.4,386.5,0],
      [128.6,370.1,0], [181.7,374.1,0], [232.3,387.0,0], [282.0,382.1,0], [330,372.8,0], [60,471.9,0], [110.8,459.5,0],
      [160.5,465.2,0], [215.7,473.8,0], [264.7,455.3,0], [320.8,464.2,0], [62.5,540.3,0], [125.3,553.9,0], [176.3,551.1,0],
      [230.1,545.4,0], [282.3,541.1,0], [330,546.4,0], [61.2,631.3,0], [104.6,639.3,0], [156.0,638.7,0], [209.0,632.7,0],
      [272.7,646.2,0], [320.7,633.9,0], [68.5,712.8,0], [127.1,714.2,0], [277.8,708.3,0], [330,715.5,0],
    ],
  },
  {
    key: 'crypt', colours: 'wsCrypt',
    tilt: 4, jitter: 4, floating: false,
    banner: {x:195,y:172,size:32,maxW:310,glow:false},
    rails: [],
    flames: [[43.6,735]], twinkles: [],
    slots: [
      [45.1,292,0], [104.9,292,0], [163.4,292,0], [224.5,292,0], [286.6,292,0], [344.6,292,0], [44.0,386,0],
      [105.3,386,0], [164.1,386,0], [224.7,386,0], [286.0,386,0], [346.5,386,0], [43.0,480,0], [105.3,480,0],
      [163.5,480,0], [224.2,480,0], [285.0,480,0], [43.9,574,0], [104.0,574,0], [165.5,574,0], [226.1,574,0],
      [286.4,574,0], [347.1,574,0], [43.3,668,0], [104.9,668,0], [165.7,668,0], [226.2,668,0], [285.4,668,0],
      [347.2,668,0], [105.6,762,0], [165.3,762,0], [223.9,762,0], [286.9,762,0], [346.8,762,0],
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
