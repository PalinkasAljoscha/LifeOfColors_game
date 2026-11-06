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
//   BoomOverlay     phase 'exploding': a cartoon starburst with BOOM over most of the board, flash
//                   (the whole screen shakes meanwhile: GameScreen's boom-shake class), deliberately
//                   jerky (steps() in index.css), EXPLOSION_MS; phase 'rubble': the board covered in
//                   dust and rocks, a Retry button in the middle (same as the Retry button on top).
// Colours from src/theme.js, texts from the locales (special.*), keyframes in src/index.css.

export const EXPLOSION_MS = 1000

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

/** The explosion (phase 'exploding') and the destroyed board (phase 'rubble') over the board itself
 *  (the canvas inside the board box `boardRef`, measured once). */
export function BoomOverlay({ phase, onRetry, boardRef, instance }) {
  const { t } = useTranslation()
  const [rect, setRect] = useState(null)
  useLayoutEffect(() => {
    const cell = cellOnScreen(boardRef?.current, instance, 0, 0)
    if (cell) setRect(cell.board)
  }, [boardRef, instance])
  const place = rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : { inset: 0 }
  const aspect = rect ? rect.height / rect.width : 1
  const shapes = useMemo(() => ({
    outer: burst(14, 49, 30, 7), mid: burst(12, 40, 24, 19), core: burst(10, 30, 17, 31),
    // rocks of the rubble: position %, size %, angle, light or dark
    rocks: Array.from({ length: 26 }, (_, i) => {
      const r = (k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1
      return { x: 4 + r(1) * 92, y: 6 + r(2) * 88, s: 5 + r(3) * 9, a: r(4) * 360, light: r(5) > 0.55 }
    }),
  }), [])
  if (phase === 'exploding') {
    return (
      <div className="absolute z-30 flex items-center justify-center overflow-visible" style={place} aria-hidden="true">
        <div className="boom-flash absolute inset-0 rounded-xl" style={{ background: palette.boomFlash }} />
        <svg viewBox="0 0 100 100" className="boom-pop relative w-[95%] max-h-[95%]" style={{ overflow: 'visible', aspectRatio: '1' }}>
          <polygon points={shapes.outer} fill={palette.boomRed} stroke={palette.boomInk} strokeWidth="1.6" strokeLinejoin="round" />
          <polygon className="boom-flicker" points={shapes.mid} fill={palette.boomOrange} stroke={palette.boomInk} strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points={shapes.core} fill={palette.boomYellow} stroke={palette.boomInk} strokeWidth="1" strokeLinejoin="round" />
          <text x="50" y="57" textAnchor="middle" fontFamily='"Arial Black", Arial, sans-serif' fontWeight="900"
                fontSize="19" fill={palette.boomYellow} stroke={palette.boomInk} strokeWidth="1.4" paintOrder="stroke"
                transform="rotate(-8 50 50)">{t('special.boom')}</text>
        </svg>
      </div>
    )
  }
  return (
    <div className="rubble-in absolute z-30 rounded-xl overflow-hidden flex items-center justify-center"
         style={{ ...place, background: `radial-gradient(circle at 50% 45%, ${palette.rubbleDust}, ${palette.rubbleDark})` }}>
      {/* viewBox in the board's aspect ratio, so the rocks keep their shape */}
      <svg viewBox={`0 0 100 ${(100 * aspect).toFixed(1)}`} className="absolute inset-0 w-full h-full" aria-hidden="true">
        {shapes.rocks.map((k, i) => (
          <polygon key={i} transform={`translate(${k.x} ${(k.y * aspect).toFixed(1)}) rotate(${k.a})`}
                   points={`${-k.s / 2},0 ${-k.s / 4},${-k.s / 2.6} ${k.s / 3},${-k.s / 2.2} ${k.s / 2},${k.s / 6} 0,${k.s / 2.4}`}
                   fill={k.light ? palette.rubbleRockLight : palette.rubbleRock} stroke={palette.rubbleDark} strokeWidth="0.5" />
        ))}
        {[18, 50, 80].map((x, i) => (
          <circle key={x} cx={x} cy={(30 + 20 * i) * aspect} r={9 + i * 2} fill={palette.rubbleSmoke} opacity="0.18" />
        ))}
      </svg>
      <button onClick={onRetry}
              className="pop-in relative h-16 px-7 rounded-2xl bg-game-btn hover:bg-game-btn-hover active:scale-95 transition-transform
                         text-2xl font-black shadow-2xl flex items-center justify-center gap-2">
        <span aria-hidden="true">↻</span> {t('game.retry')}
      </button>
    </div>
  )
}
