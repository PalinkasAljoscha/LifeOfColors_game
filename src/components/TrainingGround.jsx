// The training ground around the training castle (castle 0) on the home map (CastleMap.jsx):
//   - a wooden arrow sign, "Training" (castles.trainingSign), on a post beside the castle and
//     pointing at it;
//   - a big cauldron on its other side, over a small fire, with fumes in the puzzles' colours rising
//     out of it (still, like every map picture: no animation);
//   - a small practice board lying on the grass: 3 x 3 cells of the sorcerer theme's night-blue
//     page with the puzzles' own emojis (stones, mushroom, frog, gem) and the crown on its
//     gold-framed goal cell.
// Everything is in the landscape's units (size / 100) around the middle of the castle's ground
// line, like a <site>-land.svg; `side` = 1 puts the sign on the left (pointing right) and the
// cauldron on the right, -1 mirrors that; the board lies in front of the castle. Boxes are [x0, y0, x1, y1] in those units
// (for the map's "what lies flat stays clear" rule, components/mapClear.js).
import { palette } from '../theme.js'

const FONT = "'Arial Black', Arial, sans-serif"

// The sign: its plank ends at `near` on the castle's side (the pointed tip reaches TIP further),
// its middle at height y, the post's foot at `foot`. Its width follows its text, so a longer word
// (French) grows away from the castle, never into it.
const SIGN = { near: -74, y: -34, h: 24, foot: 26, font: 14 }
const TIP = 12
const signWidth = (text) => [...text].length * SIGN.font * 0.72 + 26
/** How far the sign reaches out from the castle's middle, in the landscape's units. */
export const signReach = (text) => -SIGN.near + signWidth(text)

// The cauldron: standing at (x, foot), body radius r.
const POT = { x: 104, foot: 46, r: 25 }

// The practice board: top left corner, cell size, tilt (degrees).
const BOARD = { x: -40, y: 34, cell: 22, tilt: -6 }
const BOARD_DROPS = [0, 16, 32, 48]   // where else it may lie: further down, in these units
const CELLS = [
  ['🪨', '🍄', '👑'],
  ['🐸', '🪨', '🪨'],
  ['🪨', '💎', '🪨'],
]

/** The training ground's parts for castle 0 standing at (x, ground) with picture size `size`:
 *  { sign, pot } each { el, box, foot } (box in map pixels, foot = map y), and board = its
 *  spots [{ el, box }], the first one where it is free. */
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
  const sign = frame('train-sign', (
    <g>
      <rect x={sx - 3.5} y={SIGN.y} width="7" height={SIGN.foot - SIGN.y} fill={palette.mapSignWoodDark} />
      <path d={plank} fill={palette.mapSignWood} stroke={palette.mapSignWoodDark} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={far + side * 4} x2={near} y1={SIGN.y + 6.5} y2={SIGN.y + 6.5} stroke={palette.mapSignWoodDark} strokeWidth="1" opacity="0.5" />
      <text x={sx + (side * tip) / 2} y={SIGN.y + 1} textAnchor="middle" dominantBaseline="central"
            fontFamily={FONT} fontWeight="900" fontSize={SIGN.font} fill={palette.mapSignInk}>{text}</text>
    </g>
  ))

  // ── the cauldron with its fumes ──
  const px = side * POT.x, r = POT.r, rim = POT.foot - r * 1.55
  const puffs = [
    // [dx, dy above the rim, radius, colour]
    [-7, 9, 8, palette.cellGreenFill],
    [6, 18, 10, palette.cellBlueFill],
    [-5, 31, 11.5, palette.mapFumePurple],
    [9, 44, 10, palette.cellOrangeFill],
    [-3, 57, 12, palette.cellGreenFill],
    [12, 70, 9, palette.mapFumePurple],
    [2, 81, 8, palette.cellBlueFill],
    [-9, 90, 6, palette.cellOrangeFill],
  ]
  const pot = frame('train-pot', (
    <g>
      {/* the fire under it */}
      <path d={`M ${px - 17} ${POT.foot} q 5 -17 8.5 -5 q 4 -19 8.5 -2 q 5 -18 8.5 -1 q 4 -13 8.5 8 z`} fill={palette.mapFireOuter} />
      <path d={`M ${px - 10} ${POT.foot} q 4 -11 6 -2 q 4 -12 7 0 q 3 -9 7 2 z`} fill={palette.mapFireInner} />
      {/* legs */}
      <rect x={px - r * 0.8} y={POT.foot - 9} width="4" height="9" fill={palette.mapCauldron} />
      <rect x={px + r * 0.8 - 4} y={POT.foot - 9} width="4" height="9" fill={palette.mapCauldron} />
      {/* the pot: a round body under a thick rim, a glint, the brew at the top */}
      <ellipse cx={px} cy={POT.foot - r * 0.95} rx={r} ry={r * 0.85} fill={palette.mapCauldron} />
      <path d={`M ${px - r * 0.62} ${POT.foot - r * 1.35} a ${r * 0.7} ${r * 0.6} 0 0 0 -${r * 0.15} ${r * 0.75}`}
            fill="none" stroke={palette.mapCauldronGlint} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx={px} cy={rim} rx={r * 1.02} ry={r * 0.28} fill={palette.mapCauldronRim} />
      <ellipse cx={px} cy={rim} rx={r * 0.8} ry={r * 0.17} fill={palette.mapFumePurple} />
      <circle cx={px - 5} cy={rim - 1} r="2.2" fill={palette.mapBrewBubble} />
      <circle cx={px + 6} cy={rim} r="1.6" fill={palette.mapBrewBubble} />
      {/* the fumes: puffs in the puzzles' colours, growing and fading as they rise */}
      {puffs.map(([dx, dy, pr, c], n) => (
        <circle key={n} cx={px + side * dx} cy={rim - dy} r={pr} fill={c} opacity={0.85 - n * 0.08} />
      ))}
    </g>
  ))

  // ── the practice board ──
  const n = CELLS.length, c = BOARD.cell, bw = n * c
  const bx = side > 0 ? BOARD.x : -BOARD.x - bw
  const boardAt = (drop) => frame('train-board', (
    <g transform={`translate(0 ${drop}) rotate(${side * BOARD.tilt} ${bx + bw / 2} ${BOARD.y + bw / 2})`}>
      <rect x={bx - 4} y={BOARD.y - 4} width={bw + 8} height={bw + 8} rx="5" fill={palette.mapSignWoodDark} />
      {CELLS.flatMap((row, r) => row.map((e, col) => {
        const goal = e === '👑', cx = bx + col * c, cy = BOARD.y + r * c
        return (
          <g key={`${r}-${col}`}>
            <rect x={cx + 1} y={cy + 1} width={c - 2} height={c - 2} rx="3" fill={palette.scCellFill}
                  stroke={goal ? palette.starGold : palette.scCellBorder} strokeWidth={goal ? 2 : 1} />
            <text x={cx + c / 2} y={cy + c / 2 + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={c * 0.62} opacity={e === '🪨' ? 0.6 : 1}>{e}</text>
          </g>
        )
      }))}
    </g>
  ))

  return {
    sign: { el: sign, foot: ground + SIGN.foot * k, box: toMap([SIGN.near - w, top, SIGN.near + tip, SIGN.foot]) },
    pot: { el: pot, foot: ground + POT.foot * k, box: toMap([POT.x - r - 4, rim - 8, POT.x + r + 4, POT.foot]) },   // the fumes may float over fields
    // the board's spots (placed like a landscape's flat thing): as planned, then further down
    board: BOARD_DROPS.map((d) => ({
      el: boardAt(d), box: toMap([BOARD.x - 6, BOARD.y + d - 6, BOARD.x + bw + 6, BOARD.y + d + bw + 6]),
    })),
  }
}
