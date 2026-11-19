// The training ground around the training castle (castle 0) on the home map (CastleMap.jsx):
//   - a wooden arrow sign, "Training" (castles.trainingSign), on a post beside the castle and
//     pointing at it;
//   - a spider hanging on its thread from the plank;
//   - a big dark-grey cauldron behind the sign (the plank covers only its bottom), over a small
//     fire, with fumes rising out of it in the win animation's style (soft white puffs that grow
//     and fade as they rise; still, like every map picture: no animation);
//   - in front of the castle two mirrors, as the game draws its mirror cells (cyan frame and tint,
//     white diagonal glints), standing face to face with an electric flash between them;
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
const SIGN = { near: -74, y: -20, h: 24, foot: 40, font: 14 }
const TIP = 12
const signWidth = (text) => [...text].length * SIGN.font * 0.72 + 26
/** How far the sign reaches out from the castle's middle, in the landscape's units. */
export const signReach = (text) => -SIGN.near + signWidth(text)
/** How far the sticks reach out on the other side. */
export const STICKS_REACH = 166

// The cauldron: behind the sign, just above it (the plank covers only its bottom), dx out from the
// post, body radius r.
const POT = { dx: -24, foot: -24, r: 24 }
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
// The two mirrors in front of the castle: their middles at ±MIRROR.x, standing at `foot`.
const MIRROR = { x: 36, foot: 78, w: 26, h: 36 }

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
      <rect x={sx - 3.5} y={SIGN.y} width="7" height={SIGN.foot - SIGN.y} fill={palette.mapSignWoodDark} />
      <path d={plank} fill={palette.mapSignWood} stroke={palette.mapSignWoodDark} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={far + side * 4} x2={near} y1={SIGN.y + 6.5} y2={SIGN.y + 6.5} stroke={palette.mapSignWoodDark} strokeWidth="1" opacity="0.5" />
      <text x={sx + (side * tip) / 2} y={SIGN.y + 1} textAnchor="middle" dominantBaseline="central"
            fontFamily={FONT} fontWeight="900" fontSize={SIGN.font} fill={palette.mapSignInk}>{text}</text>
      {spider}
    </g>
  ))

  // ── the cauldron with its fumes ──
  const POT_X = SIGN.near - w / 2 + POT.dx
  const px = side * POT_X, r = POT.r, rim = POT.foot - r * 1.55
  const pot = frame('train-pot', (
    <g>
      {/* the fumes' soft edge, as the win animation's puffs (blurred white) */}
      <defs>
        <filter id="train-fume" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3.2" /></filter>
      </defs>
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
      { el: bomb, foot: ground + BOMB[1] * k },
      ...sticks,
    ],
    taken: [
      toMap([SIGN.near - w, top, SIGN.near + tip, SIGN.foot]),
      toMap([POT_X - r - 4, rim - 8, POT_X + r + 4, POT.foot]),   // the fumes may float over fields
      toMap([STICKS[0][0] - DISC - 4, -50, STICKS_REACH, 62]),
      toMap([-MIRROR.x - MIRROR.w, MIRROR.foot - MIRROR.h - 14, MIRROR.x + MIRROR.w, MIRROR.foot + 3]),
    ],
  }
}
