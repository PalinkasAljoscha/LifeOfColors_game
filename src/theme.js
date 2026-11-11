// Central color palette (carried over from Maze Inc., trimmed to what Life of Colors uses).
// CSS hex strings are the source of truth; Phaser hex integers are derived.
// Rule (as in Maze Inc.): never hardcode colors elsewhere -- add them here.

const toHex = (str) => parseInt(str.slice(1), 16)

export const palette = {
  // ── Backgrounds ──
  gameBg:       '#1a1a2e',
  gameHeader:   '#16213e',
  panel:        '#22284a',
  journeyDim:   '#4b5070',   // training path's last line ("The young sorcerer sets out!"): nothing won yet ...
  journeyGold:  '#f5c518',   // ... all training puzzles won
  divider:      '#2c3e50',

  // ── Text / UI ──
  scoreYellow:  '#f1c40f',
  hintGray:     '#7f8c8d',
  silverGray:   '#bdc3c7',
  white:        '#ffffff',

  // ── Feedback ──
  correctGreen: '#2ecc71',
  starGold:     '#f1c40f',   // won star (win animation's result)
  starEmpty:    '#3d4766',   // star not won

  // ── Win animation (components/WinCelebration.jsx) ──
  winSparkle1:  '#ff5fd2',   // 5-star wins: the bigger coloured sparkling stars (pink,
  winSparkle2:  '#4fe3ff',   //   cyan,
  winSparkle3:  '#b57bff',   //   violet,
  winSparkle4:  '#62f08a',   //   green,
  winSparkle5:  '#ff9d3c',   //   orange)
  winStar:      '#ffd83d',   // the popping stars, before they turn white
  winVapour:    '#ffffff',   // the stars at their brightest, and the rising puffs
  winTextBack:  '#0f1028c4', // behind the result text (translucent)

  // ── Buttons ──
  btnBlue:      '#3498db',
  btnBlueHover: '#2980b9',

  // ── Misc ──
  overlayBlack: '#000000',
  goalGold:      '#f1c40f',
  goalGoldDark:  '#b7950b',
  goalShine:     '#ffffff',

  // ── Training castle notebook of observed transformations (components/TrainingNotes.jsx) ──
  notePaper:     '#fbf3d5',
  noteLine:      '#e3d6a6',
  noteInk:       '#4a3b2a',
  noteHighlight: '#f1c40f',
  noteFrame:     '#a8946a',    // thin frame around each noted transformation
  noteGlow:      '#ffffff',    // note animation: strong highlight of the neighbours (drawn at 42 %)
  noteRing:      '#ffffff',    // note animation: ring around each neighbour object
  bookCover:     '#7a2e2a',    // notebook cover (and the top edge of its open page)
  bookRing:      '#c9ccd3',    // spiral binding rings
  bookHole:      '#1a1a2e',    // holes punched for the rings

  // ── Life of Colors cells ──
  cellUncolored:       '#2e2e3a',
  cellUncoloredBorder: '#44445a',
  cellOrangeFill:      '#e67e22',
  cellOrangeBorder:    '#b5601a',
  cellGreenFill:       '#27ae60',
  cellGreenBorder:     '#1a7a44',
  cellBlueFill:        '#3498db',
  cellBlueBorder:      '#217dbb',

  // ── Special cells (src/game/GameScene.js, components/SpecialOverlays.jsx) ──
  blockedFill:     '#0e0e18',   // blocked cell: an out-of-bounds hole ...
  blockedBorder:   '#2a2a3c',
  blockedHatch:    '#34344a',   // ... with diagonal hatching
  bombFill:        '#24161a',   // bomb cell
  bombBorder:      '#6b2f2f',
  mirrorLink:      '#8fe3ff',   // frame around both mirror cells, their tint and the line between them
  mirrorGlint:     '#ffffff',   // the diagonal glints of the mirror sheen (drawn translucent)
  specialTileEdge: '#ffffff',   // castle grid: wavy border of a special-cell puzzle's tile
  boomRed:         '#e8341c',   // explosion (cartoon starburst, three layers)
  boomOrange:      '#ff8a1f',
  boomYellow:      '#ffe23d',
  boomInk:         '#2a0d05',   // outline of the starburst and the BOOM letters
  boomFlash:       '#fff6d6',   // flash over the board at the bang
  dustCloud:       '#3f3d3b',   // the dark grey dust cloud over the wrecked board (drawn translucent)
  dustRetryBack:   '#1b1b1d',   // the Retry button on the dust (drawn translucent)
  dustRetryInk:    '#d6d4d1',   // its text and frame, grey
  calloutBack:     '#fffbea',   // speech bubbles / callouts on the board
  calloutInk:      '#1a1a2e',

  // ── Castle map (home screen, components/CastleMap.jsx) ──
  mapGrass:          '#3f6b3a',
  mapFieldGreen:     '#5b8a3c',
  mapFieldWheat:     '#b59a4a',
  mapFieldEarth:     '#7a5a3a',
  mapFurrow:         '#2f4f2b',
  mapTreeTop:        '#24502b',
  mapTreeTopLight:   '#2f6334',
  mapTreeTrunk:      '#5a3d22',
  mapPath:           '#d8bf8a',
  mapPathEdge:       '#a88d5c',
  mapPathLocked:     '#8a8f9c',
  castleWall:        '#e3dccb',
  castleShade:       '#b9b09c',
  castleRoof:        '#b0413e',
  castleGate:        '#4a3628',
  castleLockedWall:  '#8d919c',
  castleLockedShade: '#6c707a',
  castleLockedRoof:  '#5c606a',
  castleBadge:       '#16213e',
  progressTrack:     '#3d4766',

  // ── Halloween theme (src/themes.js) ──
  hwCellFill:       '#2a2333',   // one background for every cell; the emoji tells the state
  hwCellBorder:     '#40344d',
  hwEmojiGlow:      '#cbb8f0',   // soft halo behind the cell objects (spider etc. on the dark cell)
  hwWitchSkin:      '#7cb342',   // witch-hand cursor
  hwWitchShade:     '#4f7a26',
  hwWitchNail:      '#6b2d8f',
  hwWitchOutline:   '#14111a',

  // ── Sorcerer's apprentice theme (src/themes.js) ──
  scCellFill:       '#1f2347',   // one background for every cell (night-blue spell book page)
  scCellBorder:     '#3a4178',
  scEmojiGlow:      '#bcd2ff',   // soft moonlight halo behind the objects (sword, frog on dark cells)
  scCrownGlow:      '#ffe08a',   // warm golden halo behind the crown (the goal)
  scWandWood:       '#5d3a1a',   // magic-wand cursor
  scWandTip:        '#f5f0e6',
  scWandStar:       '#ffd23f',
  scWandOutline:    '#14111a',
  scPotionGlass:    '#9cc0d6',   // drawn potion flask (src/game/drawnObjects.js)
  scPotionLiquid:   '#8e44ad',
  scPotionSurface:  '#c89be0',
  scPotionVapour:   '#e2dcf5',
  scPotionShine:    '#ffffff',
  scPotionOutline:  '#141428',

  // ── Workshops: the puzzle-selection scenes (src/workshops.js, components/Workshop.jsx) ──
  // Potion glass, stoppers, the copper plate and the medals (the same in every scene). The
  // pictures themselves (src/assets/workshops/*.svg) use the map's and the game's colours.
  wsGlass:          '#e9eef2',   // glass outline of test tubes and flasks
  wsGlassDark:      '#0b0b0d',   // the dark inside of an empty part
  wsCork1:          '#9c8a70',   // light cork: left edge, middle, right edge
  wsCork2:          '#cdbb9c',
  wsCork3:          '#5d5041',
  wsCorkSpeck:      '#4a4138',
  wsCorkEdge:       '#1d1a17',
  wsCorkShine:      '#f1e9da',
  wsDarkCork1:      '#4b3f33',   // dark (burnt) cork
  wsDarkCork2:      '#75634f',
  wsDarkCork3:      '#251e18',
  wsDarkCorkSpeck:  '#b9a88f',
  wsWood1:          '#5e4a3a',   // turned wooden plug
  wsWood2:          '#9a7c5e',
  wsWood3:          '#33271e',
  wsWoodGrain:      '#1c1612',
  wsWax1:           '#7d2f2a',   // sealing wax, muted so the potions stay the colourful part
  wsWax2:           '#8a6a2c',
  wsWax3:           '#3f4f63',
  wsWax4:           '#5b3d5e',
  wsWax5:           '#2f5a4a',
  wsCloth1:         '#a39a8a',   // tied linen cap
  wsCloth2:         '#8f8a80',
  wsCloth3:         '#7c6f66',
  wsCloth4:         '#6f7a80',
  wsCloth5:         '#8a7a62',
  wsTwine:          '#3b2f22',
  wsTwineLight:     '#cdbb97',
  wsMedalHi:        '#f3bd86',   // copper medal on a solved potion
  wsMedalMid:       '#b87333',
  wsMedalLo:        '#6a3513',
  wsMedalEdge:      '#4a230c',
  wsMedalRing:      '#f6c996',
  wsMedalInk:       '#2f1405',
  wsMedalString:    '#d9c7a4',
  wsPlate:          '#b87333',   // the hanging copper plate with the star count (flat, like the map's castles)
  wsPlateShade:     '#8f5626',   // its lower edge and the empty progress groove
  wsPlateRivet:     '#d99a5b',
  wsBat:            '#14111a',   // the bat passing the tower window
}

// Phaser uses 0xRRGGBB integers -- derived from the palette strings above.
export const phaser = Object.fromEntries(
  Object.entries(palette).map(([k, v]) => [k, toHex(v)]),
)

// Cell colours by engine letter (U/O/B/G) are defined per theme in src/themes.js.

/** Readable text colour on a background of hex colour `bg` (e.g. a puzzle's name_color): the dark
 *  game background on light colours, white on dark ones. */
export function inkOn(bg) {
  const n = toHex(bg)
  const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return lum > 0.3 ? palette.gameBg : palette.white
}

/** The colour t of the way from hex colour a (t = 0) to hex colour b (t = 1), as '#rrggbb'. */
export function mixHex(a, b, t) {
  const [x, y] = [toHex(a), toHex(b)]
  const ch = (shift) => Math.round(((x >> shift) & 255) + (((y >> shift) & 255) - ((x >> shift) & 255)) * t)
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`
}
