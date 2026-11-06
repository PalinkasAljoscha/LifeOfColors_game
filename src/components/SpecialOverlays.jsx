import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../theme.js'
import { cellOnScreen } from '../game/GameScene.js'
import { Emoji } from './Emoji.jsx'

// Overlays of the special cells on the board box (components/GameScreen.jsx; rules in
// src/engine/engine.js tap):
//   SpecialCallout  a speech bubble pointing at a cell: the intro of a bomb / mirror puzzle, the
//                   first tap on a blocked / clock cell, the bomb's "Oh, careful!" (with a scared
//                   face popping up and away, 2 s). Never takes taps (pointer-events: none).
//   BoomOverlay     phase 'exploding': a cartoon starburst with a hand-lettered BOOM over most of the
//                   board, flash (the whole screen shakes meanwhile: GameScreen's boom-shake class),
//                   deliberately jerky (steps() in index.css), EXPLOSION_MS; phase 'rubble': the real
//                   board with its cells knocked out of line (GameScene _wreck) under a grey dust cloud,
//                   a transparent grey Retry button in the middle (same as the Retry button on top).
// Colours from src/theme.js, texts from the locales (special.*), keyframes in src/index.css.

export const EXPLOSION_MS = 1000
// hand-drawn cartoon lettering from the system's handwriting / comic fonts (no web font: loading one
// from a font service would send the player's address to a third party)
const BOOM_FONT = '"Marker Felt", "Chalkboard SE", "Comic Sans MS", "Segoe Print", "Bradley Hand", cursive'

/** Speech bubble at cell `at` of the board in `boardRef` (above the cell, below it when there is
 *  no room above). `emoji`: a face that pops up next to the bubble. */
export function SpecialCallout({ boardRef, instance, at, text, emoji = null, look }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  useLayoutEffect(() => {
    // The board's canvas may not be there yet (a callout shown as the screen opens): try again on the
    // next frames until it is laid out.
    let frame = 0
    let raf = 0
    const place = () => {
      const cell = cellOnScreen(boardRef.current, instance, at[0], at[1])
      const el = ref.current
      if (!cell || !el || cell.board.width === 0) {
        if (frame++ < 120) raf = requestAnimationFrame(place)
        return
      }
      const h = el.offsetHeight
      const above = cell.y - cell.size / 2 - 10 - h >= cell.board.top
      const half = Math.min(el.offsetWidth, cell.board.width) / 2
      const x = Math.min(Math.max(cell.x, cell.board.left + half), cell.board.left + cell.board.width - half)
      setPos({ x, y: above ? cell.y - cell.size / 2 - 10 - h : cell.y + cell.size / 2 + 10, above, tail: cell.x - x })
    }
    place()
    return () => cancelAnimationFrame(raf)
  }, [boardRef, instance, at, text])
  return (
    <div ref={ref} className="callout-in absolute z-20 pointer-events-none rounded-2xl px-3 py-2 shadow-xl
                               font-sans font-bold text-sm leading-snug max-w-[78%] w-max"
         style={{ left: pos?.x ?? -9999, top: pos?.y ?? 0, background: palette.calloutBack, color: palette.calloutInk,
                  border: `2px solid ${palette.calloutInk}` }}
         role="status">
      <span>{text}</span>
      {emoji && (
        <span className="scared-pop absolute -right-5 -top-7 text-4xl" aria-hidden="true">
          <Emoji e={emoji} look={look} />
        </span>
      )}
      {/* the bubble's tail, pointing at the cell */}
      <span aria-hidden="true" className="absolute w-3 h-3 rotate-45"
            style={{ left: `calc(50% + ${pos?.tail ?? 0}px - 6px)`, background: palette.calloutBack,
                     ...(pos?.above === false
                       ? { top: -7, borderLeft: `2px solid ${palette.calloutInk}`, borderTop: `2px solid ${palette.calloutInk}` }
                       : { bottom: -7, borderRight: `2px solid ${palette.calloutInk}`, borderBottom: `2px solid ${palette.calloutInk}` }) }} />
    </div>
  )
}

// A jagged starburst polygon (cartoon explosion), points around (50, 50) in a 100 x 100 box.
function burst(spikes, outer, inner, seed) {
  let x = seed
  const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280 }
  const pts = []
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2
    const rad = (i % 2 ? inner : outer) * (0.85 + 0.3 * rnd())
    pts.push(`${(50 + rad * Math.cos(a)).toFixed(1)},${(50 + rad * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

/** The explosion (phase 'exploding') and the dust cloud after it (phase 'rubble') over the board itself
 *  (the canvas inside the board box `boardRef`, measured once). The board underneath stays visible:
 *  the scene has knocked its cells out of line (GameScene _wreck); the dust and a transparent grey
 *  Retry button lie on top. */
export function BoomOverlay({ phase, onRetry, boardRef, instance }) {
  const { t } = useTranslation()
  const [rect, setRect] = useState(null)
  useLayoutEffect(() => {
    const cell = cellOnScreen(boardRef?.current, instance, 0, 0)
    if (cell) setRect(cell.board)
  }, [boardRef, instance])
  const place = rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : { inset: 0 }
  const shapes = useMemo(() => {
    const r = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1
    return {
      outer: burst(14, 49, 30, 7), mid: burst(12, 40, 24, 19), core: burst(10, 30, 17, 31),
      // dust puffs: position % of the board, size % of its width
      puffs: Array.from({ length: 16 }, (_, i) => ({ x: 6 + r(i, 1) * 88, y: 6 + r(i, 2) * 88, s: 28 + r(i, 3) * 34, o: 0.3 + r(i, 4) * 0.3 })),
    }
  }, [])
  if (phase === 'exploding') {
    // BOOM as hand-drawn cartoon lettering: a handwriting font, each letter with its own tilt, size and lift
    const word = [...t('special.boom')]
    return (
      <div className="absolute z-30 flex items-center justify-center overflow-visible" style={place} aria-hidden="true">
        <div className="boom-flash absolute inset-0 rounded-xl" style={{ background: palette.boomFlash }} />
        <svg viewBox="0 0 100 100" className="boom-pop relative w-[95%] max-h-[95%]" style={{ overflow: 'visible', aspectRatio: '1' }}>
          <polygon points={shapes.outer} fill={palette.boomRed} stroke={palette.boomInk} strokeWidth="1.6" strokeLinejoin="round" />
          <polygon className="boom-flicker" points={shapes.mid} fill={palette.boomOrange} stroke={palette.boomInk} strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points={shapes.core} fill={palette.boomYellow} stroke={palette.boomInk} strokeWidth="1" strokeLinejoin="round" />
          <g transform="rotate(-9 50 50)">
            {word.map((ch, i) => {
              const n = word.length
              const x = 50 + (i - (n - 1) / 2) * (60 / Math.max(4, n))
              const tilt = [-14, 9, -6, 12, -10, 7, -4][i % 7]
              const lift = [2, -3, 1, -2, 3, -1, 2][i % 7]
              const size = [21, 19, 23, 20, 22, 18, 21][i % 7]
              return (
                <text key={i} x={x} y={58 + lift} textAnchor="middle" fontFamily={BOOM_FONT} fontWeight="900"
                      fontSize={size} fill={palette.boomYellow} stroke={palette.boomInk} strokeWidth="1.6"
                      strokeLinejoin="round" paintOrder="stroke" transform={`rotate(${tilt} ${x} ${58 + lift})`}>{ch}</text>
              )
            })}
          </g>
        </svg>
      </div>
    )
  }
  return (
    <div className="rubble-in absolute z-30 overflow-visible flex items-center justify-center" style={place}>
      {/* the grey dust cloud: soft translucent puffs over the wrecked board */}
      {shapes.puffs.map((k, i) => (
        <span key={i} aria-hidden="true" className="absolute rounded-full pointer-events-none"
              style={{ left: `${k.x}%`, top: `${k.y}%`, width: `${k.s}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)',
                       background: palette.dustCloud, opacity: k.o, filter: 'blur(14px)' }} />
      ))}
      <button onClick={onRetry}
              className="pop-in relative h-16 px-7 rounded-2xl active:scale-95 transition-transform text-2xl font-black
                         flex items-center justify-center gap-2 backdrop-blur-[2px]"
              style={{ background: `${palette.dustRetryBack}73`, color: palette.dustRetryInk, border: `2px solid ${palette.dustRetryInk}99` }}>
        <span aria-hidden="true">↻</span> {t('game.retry')}
      </button>
    </div>
  )
}
