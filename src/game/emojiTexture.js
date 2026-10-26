// Emoji as Phaser textures, optionally recoloured (a theme's `emojiHue`, src/themes.js).
// Drawn once per emoji / size / hue on a 2D canvas; the hue shift uses the same matrix as CSS
// hue-rotate(), so a recoloured emoji looks the same on the board and on the HTML screens.
// Pixel maths instead of ctx.filter, which older Safari versions ignore.

const FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif'
const SCALE = 2   // texture resolution relative to the display size (sharp on high-DPI screens)

/** Texture key of `emoji` drawn at `size` px (display), hue-shifted by `hue` degrees. */
export function emojiTexture(scene, emoji, size, hue = 0) {
  const key = `emoji:${emoji}:${size}:${hue}`
  if (scene.textures.exists(key)) return key
  const px = size * SCALE
  const dim = Math.ceil(px * 1.3)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = dim
  const ctx = canvas.getContext('2d', { willReadFrequently: Boolean(hue) })
  ctx.font = `${px}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, dim / 2, dim / 2 + px * 0.06)
  if (hue) hueRotate(ctx, dim, hue)
  scene.textures.addCanvas(key, canvas)
  return key
}

/** Display size of an emoji texture made with emojiTexture(…, size). */
export const emojiDisplaySize = (size) => Math.ceil(size * SCALE * 1.3) / SCALE

// CSS filter hue-rotate(deg) matrix (Filter Effects spec, feColorMatrix type="hueRotate").
function hueRotate(ctx, dim, deg) {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ]
  const img = ctx.getImageData(0, 0, dim, dim)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const r = d[i], g = d[i + 1], b = d[i + 2]
    d[i] = m[0] * r + m[1] * g + m[2] * b       // Uint8ClampedArray clamps and rounds
    d[i + 1] = m[3] * r + m[4] * g + m[5] * b
    d[i + 2] = m[6] * r + m[7] * g + m[8] * b
  }
  ctx.putImageData(img, 0, 0)
}
