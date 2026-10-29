// THEMES -- the app's visual themes, all in one place.
//
// A theme changes ONLY how things look: what a cell shows for each engine state, the mouse
// cursor, homepage decorations and some texts. It never touches the rules (src/engine/engine.js),
// the catalog or telemetry, and a puzzle is the same puzzle (same id) in every theme.
//
// Which theme is shown:
//   ACTIVE_THEME below (build time: change it, then rebuild / redeploy), or
//   ?theme=<name> in the URL to preview any theme (e.g. .../?theme=halloween). Unknown names
//   fall back to ACTIVE_THEME.
//
// A theme entry:
//   cells       for each engine state U (uncolored), O (orange), B (blue), G (green):
//                 fill / border   palette keys from src/theme.js (colours live there)
//                 emoji           drawn on the cell (optional; omitted = plain colour). Either one
//                                 emoji, or an ARRAY of choices: one is drawn at random for every
//                                 game (see drawLook). Cells that share choices never get the same
//                                 emoji in one game. The first choice is the "default look" used
//                                 outside a game (homepage logo and texts).
//                 emojiAlpha      opacity of that emoji, 0-1 (optional, default 1)
//                 emojiColor      recolours the emoji (optional): { hue, sat, light } -- coloured
//                                 pixels get that hue (degrees), saturation x sat, lightness + light;
//                                 whites / greys / outlines stay (src/game/emojiTexture.js). Or an
//                                 ARRAY of such colours ({ name, hue, ... }), one drawn per game.
//                                 Applied everywhere the emoji appears (board, goal reminder, texts).
//                 emojiGlow       palette key: soft halo of that colour behind the emoji (optional;
//                                 lifts dark emojis such as a spider off a dark cell)
//
// The per-game draw ("look") happens when a game screen opens: Retry keeps it, going back and
// opening any game (also the same one again) draws a new one. New themes get this for free by
// listing choices.
//   cursor      null (browser default) or a function (palette) -> SVG string; used as the mouse
//               cursor on the whole app (touch screens have no cursor)
//               with cursorHotspot [x, y] = the pixel that clicks (in a 32 x 32 image)
//   text        { standard i18n key: themed i18n key } -- texts this theme replaces (the themed
//               keys must exist in all three locale files)
//   tagline     i18n key of a short line under the title on the homepage, or null
//   decorations homepage decorations ('halloween' -> components/ThemeDecorations.jsx), or null

export const ACTIVE_THEME = 'halloween'

// Halloween objects for the orange / blue cells (first two = the default look: pumpkin, ghost).
// All light enough to read on the dark cell, helped by the glow (bat / black cat were too dark).
const HALLOWEEN_OBJECTS = ['🎃', '👻', '🕷️', '🧙‍♀️', '💀', '🧛']
// Candy colours (first = the default look, green); tuned on the candy emoji's pink-red stripes.
const CANDY_COLOURS = [
  { name: 'green', hue: 125, sat: 1, light: -0.03 },
  { name: 'blue', hue: 220, sat: 1, light: -0.08 },
  { name: 'red', hue: 355, sat: 1.1, light: -0.05 },
  { name: 'yellow', hue: 50, sat: 1, light: 0 },
]

export const THEMES = {
  classic: {
    label: 'Classic',
    cells: {
      U: { fill: 'cellUncolored', border: 'cellUncoloredBorder' },
      O: { fill: 'cellOrangeFill', border: 'cellOrangeBorder' },
      B: { fill: 'cellBlueFill', border: 'cellBlueBorder' },
      G: { fill: 'cellGreenFill', border: 'cellGreenBorder' },
    },
    cursor: null,
    cursorHotspot: null,
    text: {},
    tagline: null,
    decorations: null,
  },

  halloween: {
    label: 'Halloween',
    cells: {
      U: { fill: 'hwCellFill', border: 'hwCellBorder', emoji: '🕸️', emojiAlpha: 0.45 },   // spider web, dimmed
      // Orange and blue: two different spooky objects, drawn per game.
      O: { fill: 'hwCellFill', border: 'hwCellBorder', emoji: HALLOWEEN_OBJECTS, emojiGlow: 'hwEmojiGlow' },
      B: { fill: 'hwCellFill', border: 'hwCellBorder', emoji: HALLOWEEN_OBJECTS, emojiGlow: 'hwEmojiGlow' },
      // Green, the goal: always the candy, in a colour drawn per game.
      G: { fill: 'hwCellFill', border: 'hwCellBorder', emoji: '🍬', emojiColor: CANDY_COLOURS },
    },
    cursor: witchHandSvg,
    cursorHotspot: [9, 1],
    text: {
      'home.description': 'themes.halloween.description',
      'home.chooseLevel': 'themes.halloween.chooseLevel',
      'win.title': 'themes.halloween.winTitle',
    },
    tagline: 'themes.halloween.tagline',
    decorations: 'halloween',
  },
}

export const CELL_STATES = ['U', 'O', 'B', 'G']

// ---------------------------------------------------------------------------------------------

/** Name of the theme to show: ?theme=<name> if it names a theme, else ACTIVE_THEME. */
export function activeThemeName(search = typeof window !== 'undefined' ? window.location.search : '') {
  const asked = new URLSearchParams(search).get('theme')
  return asked && Object.hasOwn(THEMES, asked) ? asked : ACTIVE_THEME
}

/** The theme entry to show (see activeThemeName). Constant for the page's lifetime. */
export function activeTheme() {
  return THEMES[activeThemeName()]
}

/** themedKey('win.title') -> the key the active theme uses for that text (the same key if none). */
export function themedKey(key, theme = activeTheme()) {
  return theme.text[key] ?? key
}

const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v])
const pickOne = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))]

/** A concrete look of the theme: { U|O|B|G: { fill, border, emoji, emojiAlpha, emojiColor,
 *  emojiGlow } } with every choice resolved. random = a () -> [0, 1) function, or null for the
 *  default look (first choice everywhere). Cells sharing choices get distinct emojis. */
export function drawLook(theme = activeTheme(), random = Math.random) {
  const used = new Set()
  const look = {}
  for (const v of CELL_STATES) {
    const cell = theme.cells[v]
    const options = asList(cell.emoji)
    const free = options.filter((e) => !used.has(e))
    const pool = free.length ? free : options
    const emoji = pool.length ? (random ? pickOne(pool, random) : pool[0]) : null
    if (emoji) used.add(emoji)
    const colours = asList(cell.emojiColor)
    const colour = colours.length ? (random ? pickOne(colours, random) : colours[0]) : null
    look[v] = { fill: cell.fill, border: cell.border, emoji, emojiAlpha: cell.emojiAlpha ?? 1,
      emojiColor: colour, emojiGlow: cell.emojiGlow ?? null }
  }
  return look
}

/** The look outside a game (homepage, rules): the first choice of everything. */
export function defaultLook(theme = activeTheme()) {
  return drawLook(theme, null)
}

/** How a look draws `emoji` ({ color, glow } for emojiTexture / Emoji), or null if it neither
 *  recolours nor glows it. glow is resolved to a CSS colour with `palette`. */
export function emojiStyleIn(look, emoji, palette) {
  const cell = Object.values(look).find((c) => c.emoji === emoji)
  if (!cell || (!cell.emojiColor && !cell.emojiGlow)) return null
  return { color: cell.emojiColor, glow: cell.emojiGlow ? palette[cell.emojiGlow] : null }
}

/** CSS `cursor` value for a theme, or null. */
export function cursorCss(theme, palette) {
  if (!theme.cursor) return null
  const svg = theme.cursor(palette)
  const [x, y] = theme.cursorHotspot ?? [0, 0]
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, pointer`
}

// Witch's pointing hand, 32 x 32, pointing up; the hotspot is the tip of the long nail.
function witchHandSvg(p) {
  const o = p.hwWitchOutline
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<g stroke="${o}" stroke-width="1.2" stroke-linejoin="round">
<rect x="6" y="14" width="17" height="13" rx="5" fill="${p.hwWitchSkin}"/>
<rect x="11.5" y="11.5" width="4.2" height="7" rx="2.1" fill="${p.hwWitchSkin}"/>
<rect x="15.3" y="12.3" width="4.2" height="7" rx="2.1" fill="${p.hwWitchSkin}"/>
<rect x="19" y="13.6" width="4" height="6.6" rx="2" fill="${p.hwWitchSkin}"/>
<rect x="6.6" y="4.2" width="4.8" height="15" rx="2.4" fill="${p.hwWitchSkin}"/>
<path d="M6.8 7.4 Q6.6 3.6 9 0.6 Q11.4 3.6 11.2 7.4 Q9 6 6.8 7.4 Z" fill="${p.hwWitchNail}"/>
<ellipse cx="5.8" cy="20.5" rx="2.6" ry="4.4" transform="rotate(-18 5.8 20.5)" fill="${p.hwWitchSkin}"/>
<path d="M5 27 L7 25 L9 27 L11.5 24.8 L14 27 L16.5 24.8 L19 27 L21.5 25 L24 27 L24 32 L5 32 Z" fill="${p.hwWitchNail}"/>
</g>
<g fill="none" stroke="${p.hwWitchShade}" stroke-width="0.9" stroke-linecap="round">
<path d="M7.8 10.5 Q9 11.3 10.2 10.5"/><path d="M7.8 13.5 Q9 14.3 10.2 13.5"/>
<path d="M13 15.8 h1.4"/><path d="M16.8 16.6 h1.4"/><path d="M20.3 17.6 h1.3"/>
</g>
<circle cx="18" cy="22.5" r="0.9" fill="${p.hwWitchShade}"/>
</svg>`
}
