// Theme objects that no emoji covers, drawn with canvas paths. A theme lists them like emojis,
// by their key (e.g. 'drawn:potion' in src/themes.js); src/game/emojiTexture.js draws them in
// place of the emoji glyph, so recolour / glow / board texture / <Emoji> image all work the same.
// Drawing is synchronous (plain paths, no image loading) and in unit coordinates: the object
// fills the square 0..1 x 0..1. Colours come from src/theme.js.

import { palette as p } from '../theme.js'

/** The medieval potion: a round-bottomed flask of bubbling magic with vapour curling out. */
function potion(ctx) {
  const outline = p.scPotionOutline
  const lw = 0.035
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // vapour: two curling wisps rising from the neck, ending in soft puffs
  ctx.strokeStyle = p.scPotionVapour
  ctx.fillStyle = p.scPotionVapour
  ctx.globalAlpha = 0.85
  ctx.lineWidth = 0.05
  ctx.beginPath()
  ctx.moveTo(0.48, 0.24); ctx.bezierCurveTo(0.36, 0.18, 0.5, 0.1, 0.38, 0.03)
  ctx.stroke()
  ctx.lineWidth = 0.04
  ctx.beginPath()
  ctx.moveTo(0.53, 0.24); ctx.bezierCurveTo(0.64, 0.18, 0.54, 0.11, 0.65, 0.07)
  ctx.stroke()
  for (const [x, y, r] of [[0.38, 0.04, 0.05], [0.65, 0.07, 0.04], [0.5, 0.2, 0.045]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1

  // glass: round body + neck as one shape (plain path calls: no Path2D / roundRect, which some
  // older browsers lack)
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(0.42, 0.3)
    ctx.lineTo(0.42, 0.42)
    ctx.arc(0.5, 0.67, 0.29, -Math.PI / 2 - 0.28, -Math.PI / 2 + 0.28, true)
    ctx.lineTo(0.58, 0.3)
    ctx.closePath()
  }
  ctx.fillStyle = p.scPotionGlass
  body(); ctx.fill()

  // liquid: the lower part of the round body, with a lighter surface ellipse
  ctx.save()
  body(); ctx.clip()
  ctx.fillStyle = p.scPotionLiquid
  ctx.fillRect(0, 0.6, 1, 0.5)
  ctx.fillStyle = p.scPotionSurface
  ctx.beginPath(); ctx.ellipse(0.5, 0.6, 0.27, 0.045, 0, 0, Math.PI * 2); ctx.fill()
  // bubbles
  ctx.fillStyle = p.scPotionSurface
  for (const [x, y, r] of [[0.4, 0.74, 0.03], [0.58, 0.82, 0.022], [0.5, 0.69, 0.018], [0.63, 0.7, 0.015]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()

  // highlight on the glass
  ctx.strokeStyle = p.scPotionShine
  ctx.lineWidth = 0.04
  ctx.globalAlpha = 0.8
  ctx.beginPath(); ctx.arc(0.5, 0.67, 0.21, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke()
  ctx.globalAlpha = 1

  ctx.strokeStyle = outline
  ctx.lineWidth = lw
  body(); ctx.stroke()

  // rim of the neck
  ctx.fillStyle = p.scPotionGlass
  ctx.beginPath()
  ctx.moveTo(0.41, 0.255); ctx.lineTo(0.59, 0.255); ctx.arcTo(0.615, 0.255, 0.615, 0.285, 0.025)
  ctx.arcTo(0.615, 0.315, 0.59, 0.315, 0.025); ctx.lineTo(0.41, 0.315); ctx.arcTo(0.385, 0.315, 0.385, 0.285, 0.025)
  ctx.arcTo(0.385, 0.255, 0.41, 0.255, 0.025); ctx.closePath()
  ctx.fill(); ctx.stroke()
}

export const DRAWN = {
  'drawn:potion': potion,
}

/** Whether `e` is a drawn object (rather than an emoji). */
export const isDrawn = (e) => Object.hasOwn(DRAWN, e)

/** Draw object `e` at about the size of a `px` emoji, centred at (cx, cy). */
export function drawObject(ctx, e, cx, cy, emojiPx) {
  const px = emojiPx * 1.1   // the paths leave a little air; this matches the emojis' visual size
  ctx.save()
  ctx.translate(cx - px / 2, cy - px / 2)
  ctx.scale(px, px)
  DRAWN[e](ctx)
  ctx.restore()
}
