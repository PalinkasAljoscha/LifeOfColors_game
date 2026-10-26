// Emojis on the HTML screens, recoloured like the board when the active theme shifts their hue
// (src/themes.js `emojiHue`, e.g. the Halloween candy turned green).
import { activeTheme, emojiStyle } from '../themes.js'

/** One emoji, recoloured if the theme says so. */
export function Emoji({ e, className }) {
  return <span className={className} style={emojiStyle(e)}>{e}</span>
}

/** A text with every recoloured emoji of the theme wrapped in <Emoji> (other text unchanged). */
export function ThemedText({ text }) {
  const shifted = Object.values(activeTheme().cells).filter((c) => c.emoji && c.emojiHue).map((c) => c.emoji)
  if (!shifted.length) return text
  const parts = String(text).split(new RegExp(`(${shifted.join('|')})`, 'u'))
  return parts.map((p, i) => (shifted.includes(p) ? <Emoji key={i} e={p} /> : p))
}
