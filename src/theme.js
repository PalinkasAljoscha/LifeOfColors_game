// Central color palette (carried over from Maze Inc., trimmed to what Life of Colors uses).
// CSS hex strings are the source of truth; Phaser hex integers are derived.
// Rule (as in Maze Inc.): never hardcode colors elsewhere -- add them here.

const toHex = (str) => parseInt(str.slice(1), 16)

export const palette = {
  // ── Backgrounds ──
  gameBg:       '#1a1a2e',
  gameHeader:   '#16213e',
  panel:        '#22284a',
  divider:      '#2c3e50',

  // ── Text / UI ──
  scoreYellow:  '#f1c40f',
  hintGray:     '#7f8c8d',
  silverGray:   '#bdc3c7',
  white:        '#ffffff',

  // ── Feedback ──
  correctGreen: '#2ecc71',
  starGold:     '#f1c40f',   // won star (win dialog)
  starEmpty:    '#3d4766',   // star not won

  // ── Buttons ──
  btnBlue:      '#3498db',
  btnBlueHover: '#2980b9',

  // ── Misc ──
  overlayBlack: '#000000',
  goalGold:      '#f1c40f',
  goalGoldDark:  '#b7950b',
  goalShine:     '#ffffff',

  // ── Training castle scroll of observed transformations (components/TrainingNotes.jsx) ──
  notePaper:     '#fbf3d5',
  noteLine:      '#e3d6a6',
  noteInk:       '#4a3b2a',
  noteHighlight: '#f1c40f',
  noteFrame:     '#a8946a',    // thin frame around each noted transformation
  notePaperShade: '#d9c78f',   // shading of the rolled-up paper
  noteRod:       '#9a6a3a',    // wooden rods and knobs of the scroll
  noteRodDark:   '#5e3a17',
  noteSeal:      '#b03a2e',    // ribbon and wax seal on the rolled-up scroll
  noteSealDark:  '#7a2219',

  // ── Life of Colors cells ──
  cellUncolored:       '#2e2e3a',
  cellUncoloredBorder: '#44445a',
  cellOrangeFill:      '#e67e22',
  cellOrangeBorder:    '#b5601a',
  cellGreenFill:       '#27ae60',
  cellGreenBorder:     '#1a7a44',
  cellBlueFill:        '#3498db',
  cellBlueBorder:      '#217dbb',

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
}

// Phaser uses 0xRRGGBB integers -- derived from the palette strings above.
export const phaser = Object.fromEntries(
  Object.entries(palette).map(([k, v]) => [k, toHex(v)]),
)

// Cell colours by engine letter (U/O/B/G) are defined per theme in src/themes.js.
