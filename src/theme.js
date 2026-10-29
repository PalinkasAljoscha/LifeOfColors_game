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

  // ── Life of Colors cells ──
  cellUncolored:       '#2e2e3a',
  cellUncoloredBorder: '#44445a',
  cellOrangeFill:      '#e67e22',
  cellOrangeBorder:    '#b5601a',
  cellGreenFill:       '#27ae60',
  cellGreenBorder:     '#1a7a44',
  cellBlueFill:        '#3498db',
  cellBlueBorder:      '#217dbb',

  // ── Halloween theme (src/themes.js) ──
  hwCellFill:       '#2a2333',   // one background for every cell; the emoji tells the state
  hwCellBorder:     '#40344d',
  hwEmojiGlow:      '#cbb8f0',   // soft halo behind the cell objects (spider etc. on the dark cell)
  hwWitchSkin:      '#7cb342',   // witch-hand cursor
  hwWitchShade:     '#4f7a26',
  hwWitchNail:      '#6b2d8f',
  hwWitchOutline:   '#14111a',
}

// Phaser uses 0xRRGGBB integers -- derived from the palette strings above.
export const phaser = Object.fromEntries(
  Object.entries(palette).map(([k, v]) => [k, toHex(v)]),
)

// Cell colours by engine letter (U/O/B/G) are defined per theme in src/themes.js.
