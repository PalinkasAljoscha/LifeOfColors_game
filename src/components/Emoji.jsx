// Emojis on the HTML screens, drawn like the board draws them: when the look recolours an emoji
// or gives it a glow (src/themes.js emojiColor / emojiGlow, e.g. the Halloween candy in this
// game's colour), it is shown as an image made by the same canvas code as the board's texture
// (src/game/emojiTexture.js); otherwise as plain text.
import { defaultLook, emojiStyleIn } from '../themes.js'
import { palette } from '../theme.js'
import { emojiDataUrl } from '../game/emojiTexture.js'

const PX = 96   // drawing size of the image (sharp up to ~2.5x the text size it replaces)

/** One emoji as `look` draws it (default: the theme's default look, used outside a game). */
export function Emoji({ e, look = undefined, className }) {
  const style = emojiStyleIn(look ?? defaultLook(), e, palette)
  if (!style) return <span className={className}>{e}</span>
  // The canvas is 1.3 x the emoji size with the emoji centred: scale and pull in by 0.15em.
  return (
    <span className={className}>
      <img src={emojiDataUrl(e, PX, style)} alt={e} draggable="false"
           style={{ display: 'inline-block', height: '1.3em', width: '1.3em', margin: '-0.15em', verticalAlign: '-0.3em' }} />
    </span>
  )
}

/** A text with every emoji that `look` recolours wrapped in <Emoji> (other text unchanged). */
export function ThemedText({ text, look = undefined }) {
  const l = look ?? defaultLook()
  const special = Object.values(l).map((c) => c.emoji).filter((e) => e && emojiStyleIn(l, e, palette))
  if (!special.length) return text
  const esc = special.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = String(text).split(new RegExp(`(${esc.join('|')})`, 'u'))
  return parts.map((p, i) => (special.includes(p) ? <Emoji key={i} e={p} look={l} /> : p))
}
