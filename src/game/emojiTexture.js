// Emoji (or a drawn object, src/game/drawnObjects.js) drawn on a 2D canvas, optionally recoloured and/or with a soft glow (a theme's
// `emojiColor` / `emojiGlow`, src/themes.js). The same drawing is used on the board (as a Phaser
// texture) and on the HTML screens (as an image, components/Emoji.jsx), so a recoloured emoji looks
// identical everywhere. Pixel maths instead of ctx.filter, which older Safari versions ignore.
//
// Recolouring (emojiColor { hue, sat, light }): every clearly coloured pixel (HSL saturation >=
// 0.25) gets the hue `hue` (degrees), its saturation times `sat` and its lightness plus `light`;
// whites, greys and black outlines stay as they are. So the candy's stripes change colour while
// its white wrapper and its shading stay.

import { drawObject, isDrawn } from './drawnObjects.js'

const FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif'
const SCALE = 2   // texture resolution relative to the display size (sharp on high-DPI screens)
const MIN_SAT = 0.25

/** Cache key part for a recolour / glow (stable, '' for none). */
function styleKey(color, glow) {
  return `${color ? `${color.hue},${color.sat ?? 1},${color.light ?? 0}` : ''}|${glow ?? ''}`
}

/** A canvas of `emoji` drawn at `px` pixels, `color` / `glow` applied (see above). */
export function drawEmojiCanvas(emoji, px, { color = null, glow = null } = {}) {
  const dim = Math.ceil(px * 1.3)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = dim
  const ctx = canvas.getContext('2d', { willReadFrequently: Boolean(color) })
  ctx.font = `${px}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (isDrawn(emoji)) drawObject(ctx, emoji, dim / 2, dim / 2, px)   // no emoji for it: paths
  else ctx.fillText(emoji, dim / 2, dim / 2 + px * 0.06)
  if (color) recolour(ctx, dim, color)
  if (glow) {
    // Soft halo behind the emoji (lifts dark emojis off dark cells): draw it again with a
    // shadow, behind the existing pixels.
    const copy = document.createElement('canvas')
    copy.width = copy.height = dim
    copy.getContext('2d').drawImage(canvas, 0, 0)
    ctx.save()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.shadowColor = glow
    ctx.shadowBlur = px * 0.18
    ctx.drawImage(copy, 0, 0)
    ctx.restore()
  }
  return canvas
}

/** Texture key of `emoji` drawn at `size` px (display), with optional color / glow. */
export function emojiTexture(scene, emoji, size, style = {}) {
  const key = `emoji:${emoji}:${size}:${styleKey(style.color, style.glow)}`
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, drawEmojiCanvas(emoji, size * SCALE, style))
  return key
}

/** Display size of an emoji texture made with emojiTexture(…, size). */
export const emojiDisplaySize = (size) => Math.ceil(size * SCALE * 1.3) / SCALE

const urlCache = new Map()
/** PNG data URL of the emoji (for <img> on the HTML screens), drawn at `px` pixels. Cached. */
export function emojiDataUrl(emoji, px, style = {}) {
  const key = `${emoji}:${px}:${styleKey(style.color, style.glow)}`
  if (!urlCache.has(key)) urlCache.set(key, drawEmojiCanvas(emoji, px, style).toDataURL())
  return urlCache.get(key)
}

// ---- colour maths (exported for the tests) ---------------------------------------------------

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}

export function hslToRgb(h, s, l) {
  if (!s) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}

/** One pixel recoloured as described at the top (null = left unchanged). */
export function recolourPixel(r, g, b, { hue, sat = 1, light = 0 }) {
  const [, s, l] = rgbToHsl(r, g, b)
  if (s < MIN_SAT) return null
  const clamp = (v) => Math.min(1, Math.max(0, v))
  return hslToRgb((((hue % 360) + 360) % 360) / 360, clamp(s * sat), clamp(l + light))
}

function recolour(ctx, dim, color) {
  const img = ctx.getImageData(0, 0, dim, dim)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const out = recolourPixel(d[i], d[i + 1], d[i + 2], color)
    if (out) [d[i], d[i + 1], d[i + 2]] = out      // Uint8ClampedArray clamps and rounds
  }
  ctx.putImageData(img, 0, 0)
}
