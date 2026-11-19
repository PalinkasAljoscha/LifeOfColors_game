// The training ground around the training castle (castle 0) on the home map (CastleMap.jsx):
//   - a wooden arrow sign, "Training" (castles.trainingSign), on a post beside the castle and
//     pointing at it;
//   - a spider hanging on its thread from the plank;
//   - a big dark-grey cauldron with a copper handle behind and above the sign, over a small fire,
//     pot and fire in a ring of stones,
//     the end of a big wooden spoon sticking out of it, with fumes rising out of it in the win animation's style (soft white puffs that grow
//     and fade as they rise; still, like every map picture: no animation);
//   - in front of the castle two mirrors, as the game draws its mirror cells (cyan frame and tint,
//     white diagonal glints), standing face to face with an electric flash between them; between
//     them and the castle one flask (the workshop's round-bottomed flask) lying on the grass, its
//     potion running out, and before them a bow with arrows lying around;
//   - on the castle's other side a few practice targets: sticks in the ground, spread out
//     irregularly, of different heights, some upright, some tilted, each topped with a round wooden disc like a road sign,
//     and on each disc one of the puzzles' emojis (the crown, the goal, among them) -- and a bomb
//     (the game's 💣) lying on the ground among them.
// Everything is in the landscape's units (size / 100) around the middle of the castle's ground
// line, like a <site>-land.svg; `side` = 1 puts the sign and the cauldron on the left and the
// sticks on the right, -1 mirrors that. Boxes are [x0, y0, x1, y1] (for the map's "what lies flat
// stays clear" rule, components/mapClear.js).
import { palette } from '../theme.js'

const FONT = "'Arial Black', Arial, sans-serif"

// The sign: its plank ends at `near` on the castle's side (the pointed tip reaches TIP further),
// its middle at height y, the post's foot at `foot`. Its width follows its text, so a longer word
// (French) grows away from the castle, never into it.
const SIGN = { near: -74, y: -6, h: 31, foot: 54, font: 18 }   // 1.3 x the first size
const TIP = 15.6
const signWidth = (text) => [...text].length * SIGN.font * 0.72 + 34
/** How far the sign reaches out from the castle's middle, in the landscape's units. */
export const signReach = (text) => -SIGN.near + signWidth(text)
/** How far the sticks reach out on the other side. */
export const STICKS_REACH = 166

// The cauldron: behind the sign and above it (not hidden by it), dx out from the post, body
// radius r.
const POT = { dx: -24, foot: -44, r: 24 }
// The stones ringing it: [angle around the ring in degrees (90 = front), size].
const STONES = [[0, 5.2], [28, 4.4], [55, 5.6], [82, 4.8], [108, 5.4], [134, 4.2], [160, 5], [186, 4.6],
  [214, 4], [244, 4.4], [276, 3.8], [306, 4.2], [334, 4.6]]
// Its fumes: [dx, height above the rim, radius] -- growing and fading as they rise.
const PUFFS = [[-4, 6, 6], [5, 14, 8], [-3, 24, 10], [6, 35, 11.5], [-4, 47, 13], [4, 58, 14]]

// The practice targets: [x, foot, height of the stick up to the disc's middle, tilt in degrees
// (positive leans away from the castle), emoji]. Disc radius DISC.
const STICKS = [
  [60, 30, 42, -5, '🍄'],
  [77, 2, 58, 4, '👑'],
  [106, 20, 40, 13, '🐸'],
  [93, 54, 34, -8, '💎'],
  [145, 4, 50, -11, '🐉'],
  [152, 46, 38, 18, '🪨'],
]
const DISC = 12.5
// The bomb among the sticks: [x, foot, size].
const BOMB = [122, 44, 22]
// One flask lying on the grass in front of the castle, its potion running out: the workshop's
// round-bottomed flask (Workshop.jsx FLASK, its units), in one of the puzzles' potion colours
// (mapFlaskPotion). Bulb middle at (x, y), turned by `turn` degrees (90 = neck towards the castle's
// other side, a little more = neck a little down), drawn at `scale`.
const FLASK = 'M-5,-70 V-37.6 A19.4,19.4 0 1 0 5,-37.6 V-70'
const FLASK_IN = 'M-4,-70 V-37 A18.4,18.4 0 1 0 4,-37 V-70 Z'
const LYING_FLASK = { x: -16, y: 27, turn: 98, scale: 0.51 }   // between the castle and the mirrors
// The archery lying around: the bow at (x, y), turned by `turn` degrees; arrows [x, y, angle].
const BOW = { x: 66, y: 118, turn: -24 }
const ARROWS = [[36, 138, -8], [80, 136, 14], [104, 112, -32]]
// The two mirrors in front of the castle: their middles at ±MIRROR.x, standing at `foot`.
const MIRROR = { x: 36, foot: 94, w: 26, h: 36 }

/** The training ground's parts for castle 0 standing at (x, ground) with picture size `size`:
 *  standing things [{ el, foot }] (foot = map y) and the boxes nothing flat may touch (map px). */
export function trainingGround({ x, ground, size, side, text }) {
  const k = size / 100
  const toMap = ([x0, y0, x1, y1]) => {
    const a = x + side * x0 * k, b = x + side * x1 * k
    return { x0: Math.min(a, b), y0: ground + y0 * k, x1: Math.max(a, b), y1: ground + y1 * k }
  }
  const frame = (key, body) => (
    <g key={key} transform={`translate(${x} ${ground}) scale(${k})`}>{body}</g>
  )

  // ── the sign ──
  const w = signWidth(text), tip = TIP, sx = side * (SIGN.near - w / 2)
  // the plank: a board whose end towards the castle is pointed
  const near = sx + (side * w) / 2, far = sx - (side * w) / 2, top = SIGN.y - SIGN.h / 2, bot = SIGN.y + SIGN.h / 2
  const plank = `M ${far} ${top} L ${near} ${top} L ${near + side * tip} ${SIGN.y} L ${near} ${bot} L ${far} ${bot} Z`
  // the spider, hanging on its thread from the plank's lower edge, near its far end
  const spX = far + side * 16, spY = bot + 26
  const spider = (
    <g>
      <line x1={spX} y1={bot} x2={spX} y2={spY - 7} stroke={palette.mapSpiderThread} strokeWidth="0.8" />
      <text x={spX} y={spY} textAnchor="middle" dominantBaseline="central" fontSize="18">🕷️</text>
    </g>
  )

  const sign = frame('train-sign', (
    <g>
      <rect x={sx - 4.5} y={SIGN.y} width="9" height={SIGN.foot - SIGN.y} fill={palette.mapSignWoodDark} />
      <path d={plank} fill={palette.mapSignWood} stroke={palette.mapSignWoodDark} strokeWidth="3.2" strokeLinejoin="round" />
      <line x1={far + side * 5} x2={near} y1={SIGN.y + 8.5} y2={SIGN.y + 8.5} stroke={palette.mapSignWoodDark} strokeWidth="1.3" opacity="0.5" />
      <text x={sx + (side * tip) / 2} y={SIGN.y + 1} textAnchor="middle" dominantBaseline="central"
            fontFamily={FONT} fontWeight="900" fontSize={SIGN.font} fill={palette.mapSignInk}>{text}</text>
      {spider}
    </g>
  ))

  // ── the cauldron with its fumes ──
  const POT_X = SIGN.near - w / 2 + POT.dx
  const px = side * POT_X, r = POT.r, rim = POT.foot - r * 1.55
  // the ring of stones around the pot and its fire, on the ground: [angle around the ring, size]
  const stones = (back) => STONES.filter(([a]) => (Math.sin((a * Math.PI) / 180) < 0) === back).map(([a, sz], n) => {
    const t = (a * Math.PI) / 180, cx = px + Math.cos(t) * (r + 7), cy = POT.foot + Math.sin(t) * 8
    return (
      <ellipse key={`${back}${n}`} cx={cx} cy={cy} rx={sz} ry={sz * 0.68} fill={palette.mapStone}
               stroke={palette.mapStoneDark} strokeWidth="1.1" />
    )
  })
  const pot = frame('train-pot', (
    <g>
      {/* the fumes' soft edge, as the win animation's puffs (blurred white) */}
      <defs>
        <filter id="train-fume" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3.2" /></filter>
      </defs>
      {stones(true)}
      {/* the fire under it */}
      <path d={`M ${px - 17} ${POT.foot} q 5 -17 8.5 -5 q 4 -19 8.5 -2 q 5 -18 8.5 -1 q 4 -13 8.5 8 z`} fill={palette.mapFireOuter} />
      <path d={`M ${px - 10} ${POT.foot} q 4 -11 6 -2 q 4 -12 7 0 q 3 -9 7 2 z`} fill={palette.mapFireInner} />
      {/* legs */}
      <rect x={px - r * 0.8} y={POT.foot - 9} width="4.5" height="9" fill={palette.mapCauldron} />
      <rect x={px + r * 0.8 - 4.5} y={POT.foot - 9} width="4.5" height="9" fill={palette.mapCauldron} />
      {/* the pot: a round body under a thick rim, a glint, the brew at the top */}
      <ellipse cx={px} cy={POT.foot - r * 0.95} rx={r} ry={r * 0.85} fill={palette.mapCauldron} />
      <path d={`M ${px - r * 0.62} ${POT.foot - r * 1.35} a ${r * 0.7} ${r * 0.6} 0 0 0 -${r * 0.15} ${r * 0.75}`}
            fill="none" stroke={palette.mapCauldronGlint} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx={px} cy={rim} rx={r * 1.02} ry={r * 0.28} fill={palette.mapCauldronRim} />
      <ellipse cx={px} cy={rim} rx={r * 0.8} ry={r * 0.17} fill={palette.mapBrew} />
      <circle cx={px - 5} cy={rim - 1} r="2.2" fill={palette.mapBrewBubble} />
      <circle cx={px + 6} cy={rim} r="1.6" fill={palette.mapBrewBubble} />
      {/* the big wooden spoon, its end sticking out over the rim */}
      <line x1={px + side * 3} y1={rim + 1} x2={px - side * 20} y2={rim - 30} stroke={palette.mapSignWoodDark}
            strokeWidth="5.5" strokeLinecap="round" />
      <line x1={px + side * 3} y1={rim + 1} x2={px - side * 20} y2={rim - 30} stroke={palette.mapSignWood}
            strokeWidth="3.5" strokeLinecap="round" />
      {/* the copper handle: a bail from rim to rim */}
      <path d={`M ${px - r * 0.98} ${rim + 1} C ${px - r * 0.98} ${rim - r * 1.15} ${px + r * 0.98} ${rim - r * 1.15} ${px + r * 0.98} ${rim + 1}`}
            fill="none" stroke={palette.wsMedalEdge} strokeWidth="4" strokeLinecap="round" />
      <path d={`M ${px - r * 0.98} ${rim + 1} C ${px - r * 0.98} ${rim - r * 1.15} ${px + r * 0.98} ${rim - r * 1.15} ${px + r * 0.98} ${rim + 1}`}
            fill="none" stroke={palette.wsMedalMid} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={px - r * 0.98} cy={rim + 1} r="2.6" fill={palette.wsMedalMid} stroke={palette.wsMedalEdge} strokeWidth="1" />
      <circle cx={px + r * 0.98} cy={rim + 1} r="2.6" fill={palette.wsMedalMid} stroke={palette.wsMedalEdge} strokeWidth="1" />
      {stones(false)}
      {/* the fumes: white puffs, growing and fading as they rise */}
      <g filter="url(#train-fume)">
        {PUFFS.map(([dx, dy, pr], n) => (
          <circle key={n} cx={px + side * dx} cy={rim - dy} r={pr} fill={palette.winVapour} opacity={0.8 - n * 0.11} />
        ))}
      </g>
    </g>
  ))

  // ── the two mirrors, face to face, an electric flash between them ──
  const glass = (cx, turn, n) => {
    const { w: mw, h: mh, foot } = MIRROR, y0 = foot - 8 - mh
    return (
      <g key={n} transform={`translate(${cx} 0) skewY(${turn * 14}) scale(0.72 1) translate(${-cx} 0)`}>
        <rect x={cx - 1.5} y={foot - 10} width="3" height="10" fill={palette.mapSignWoodDark} />
        <rect x={cx - 7} y={foot - 2} width="14" height="2.5" rx="1" fill={palette.mapSignWoodDark} />
        <rect x={cx - mw / 2} y={y0} width={mw} height={mh} rx="3" fill={palette.scCellFill} />
        <rect x={cx - mw / 2} y={y0} width={mw} height={mh} rx="3" fill={palette.mirrorLink} opacity="0.3" />
        {[[0.15, 7], [0.5, 4]].map(([at, gw], g) => (
          <path key={g} d={`M ${cx - mw / 2 + mw * at} ${y0 + mh} l ${gw} 0 l ${mw * 0.5} ${-mh} l ${-gw} 0 Z`}
                fill={palette.mirrorGlint} opacity="0.35" clipPath={`url(#train-glass-${n})`} />
        ))}
        <clipPath id={`train-glass-${n}`}><rect x={cx - mw / 2} y={y0} width={mw} height={mh} rx="3" /></clipPath>
        <rect x={cx - mw / 2} y={y0} width={mw} height={mh} rx="3" fill="none" stroke={palette.mirrorLink} strokeWidth="2.2" />
      </g>
    )
  }
  const fy = MIRROR.foot - 8 - MIRROR.h / 2, fx = MIRROR.x - MIRROR.w * 0.36
  const bolt = `M ${-fx} ${fy - 3} L ${-fx * 0.55} ${fy + 3} L ${-fx * 0.2} ${fy - 4} L ${fx * 0.15} ${fy + 4} L ${fx * 0.5} ${fy - 3} L ${fx} ${fy + 2}`
  const mirrors = frame('train-mirrors', (
    <g>
      <defs>
        <filter id="train-flash" x="-0.5" y="-2" width="2" height="5"><feGaussianBlur stdDeviation="2.2" /></filter>
      </defs>
      {glass(-MIRROR.x, 1, 0)}
      {glass(MIRROR.x, -1, 1)}
      <path d={bolt} fill="none" stroke={palette.mirrorLink} strokeWidth="5" strokeLinejoin="round" filter="url(#train-flash)" />
      <path d={bolt} fill="none" stroke={palette.mirrorLink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={bolt} fill="none" stroke={palette.mirrorGlint} strokeWidth="1" strokeLinejoin="round" />
    </g>
  ))

  // ── flasks with potion running out, and the archery, on the grass in front of the castle ──
  // the flask: glass, the potion inside lying level, the workshop's highlights, no stopper; and
  // the potion that ran out of its neck, a puddle of a few blobs
  const F = LYING_FLASK, fa = side * F.turn, c = palette.mapFlaskPotion
  const flx = side * F.x, rad = (fa * Math.PI) / 180
  const mouth = { x: flx + 52 * F.scale * Math.sin(rad), y: F.y - 52 * F.scale * Math.cos(rad) }
  const flask = (
    <g>
      {[[5, 0, 5.4, 3], [12.6, 1.8, 9, 4.5], [21, 0.6, 7.2, 3.9], [27, 3, 4.8, 2.8], [11.4, 6, 4.8, 2.5]].map(([d, dy, rx, ry], b) => (
        <ellipse key={b} cx={mouth.x + side * d} cy={mouth.y + dy + 2} rx={rx} ry={ry} fill={c} opacity="0.85" />
      ))}
      <g transform={`translate(${flx} ${F.y}) rotate(${fa}) scale(${F.scale}) translate(0 19)`}>
        <clipPath id="train-flask-in"><path d={FLASK_IN} /></clipPath>
        <path d={`${FLASK} Z`} fill={palette.wsGlassDark} fillOpacity="0.45" />
        <g clipPath="url(#train-flask-in)">
          <g transform={`rotate(${-fa} 0 -19)`}>
            <rect x="-70" y="-17" width="140" height="140" fill={c} />
            <path d="M-70,-17 h140" stroke={palette.mapFlaskPotionLight} strokeWidth="2.4" opacity="0.8" />
          </g>
        </g>
        <path d={FLASK} fill="none" stroke={palette.wsGlass} strokeOpacity="0.75" strokeWidth="2.2" />
        <path d="M-13,-28 A15,15 0 0 0 -11,-8" fill="none" stroke={palette.white} strokeOpacity="0.55" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M-2.6,-66 V-42" stroke={palette.white} strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="0" cy="-70" rx="6.6" ry="2" fill={palette.wsGlassDark} fillOpacity="0.5" stroke={palette.wsGlass} strokeOpacity="0.75" strokeWidth="2" />
        <path d="M-5,-47 h10" stroke={palette.wsGlass} strokeOpacity="0.6" strokeWidth="2.4" />
      </g>
    </g>
  )
  const arrow = ([ax0, ay, angle], n) => (
    <g key={n} transform={`translate(${side * ax0} ${ay}) rotate(${side > 0 ? angle : 180 - angle})`}>
      <line x1="-16" y1="0" x2="15" y2="0" stroke={palette.mapSignWoodDark} strokeWidth="1.6" />
      <path d="M 15 -2.6 L 20 0 L 15 2.6 Z" fill={palette.mapArrowTip} />
    </g>
  )
  const archery = frame('train-front', (
    <g>
      <g transform={`translate(${side * BOW.x} ${BOW.y}) rotate(${side * BOW.turn})`}>
        <path d="M -20 0 Q 0 -15 20 0" fill="none" stroke={palette.mapSignWoodDark} strokeWidth="4.2" strokeLinecap="round" />
        <path d="M -20 0 Q 0 -15 20 0" fill="none" stroke={palette.mapSignWood} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="-20" y1="0" x2="20" y2="0" stroke={palette.mapBowString} strokeWidth="0.8" />
      </g>
      {ARROWS.map(arrow)}
    </g>
  ))

  // ── the bomb among the sticks ──
  const bomb = frame('train-bomb', (
    <text x={side * BOMB[0]} y={BOMB[1] - BOMB[2] * 0.42} textAnchor="middle" dominantBaseline="central" fontSize={BOMB[2]}>💣</text>
  ))

  // ── the practice targets: one standing thing per stick, so they cover each other by their feet ──
  const sticks = STICKS.map(([sx0, foot, h, tilt, e], n) => {
    const bx = side * sx0
    return {
      foot: ground + foot * k,
      el: frame(`train-stick-${n}`, (
        <g transform={`rotate(${side * tilt} ${bx} ${foot})`}>
          <rect x={bx - 2} y={foot - h} width="4" height={h} fill={palette.mapSignWoodDark} />
          <circle cx={bx} cy={foot - h} r={DISC} fill={palette.mapSignWood} stroke={palette.mapSignWoodDark} strokeWidth="2.2" />
          <circle cx={bx} cy={foot - h} r={DISC - 3.2} fill="none" stroke={palette.mapSignWoodDark} strokeWidth="0.8" opacity="0.45" />
          <text x={bx} y={foot - h + 0.8} textAnchor="middle" dominantBaseline="central" fontSize={DISC * 1.25}
                transform={`rotate(${-side * tilt * 0.5} ${bx} ${foot - h})`}>{e}</text>
        </g>
      )),
    }
  })

  return {
    standing: [
      { el: sign, foot: ground + SIGN.foot * k },
      { el: pot, foot: ground + POT.foot * k },
      { el: mirrors, foot: ground + MIRROR.foot * k },
      { el: archery, foot: ground + 110 * k },
      { el: frame('train-flask', flask), foot: ground + (LYING_FLASK.y + 8) * k },
      { el: bomb, foot: ground + BOMB[1] * k },
      ...sticks,
    ],
    taken: [
      toMap([SIGN.near - w, top, SIGN.near + tip, SIGN.foot]),
      toMap([POT_X - r - 4, rim - 8, POT_X + r + 4, POT.foot]),   // the fumes may float over fields
      toMap([STICKS[0][0] - DISC - 4, -50, STICKS_REACH, 62]),
      toMap([-MIRROR.x - MIRROR.w, MIRROR.foot - MIRROR.h - 14, MIRROR.x + MIRROR.w, MIRROR.foot + 3]),
      toMap([-32, 100, 124, 148]),   // the archery
      toMap([-34, 20, 26, 40]),     // the flask and its puddle
    ],
  }
}
