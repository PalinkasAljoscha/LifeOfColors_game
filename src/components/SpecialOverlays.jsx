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
//   BoomOverlay     phase 'exploding': a cartoon starburst with BAM drawn into it (letter shapes, no
//                   font) over most of the board, flash (the screen trembles slightly meanwhile:
//                   GameScreen's boom-shake class), deliberately jerky (steps() in index.css),
//                   EXPLOSION_MS; phase 'rubble': the real board with its cells knocked out of line
//                   (GameScene _wreck) under a grey dust cloud that drifts slowly off the board in one
//                   direction, a transparent grey Retry button in the middle (same as the top Retry).
// Colours from src/theme.js, texts from the locales (special.*), keyframes in src/index.css.

export const EXPLOSION_MS = 1000
// BAM as drawn cartoon block letters (part of the picture, no font; the same in every language).
// Each letter in a 16 x 22 box; evenodd fill cuts the holes of B and A.
const BAM_LETTERS = [
  'M0 0H9C14 0 15.5 3 15.5 5.5C15.5 8 14.2 9.8 12.6 10.5C15 11.2 16.5 13.5 16.5 16C16.5 19.5 14 22 9.5 22H0Z' +
    'M4.5 4H8.5C10.4 4 11 5 11 6.2C11 7.5 10.4 8.6 8.5 8.6H4.5Z' +
    'M4.5 12.6H9C11.2 12.6 11.8 14 11.8 15.3C11.8 16.8 11 18 9 18H4.5Z',
  'M0 22L5.5 0H10.5L16 22H11.2L10.2 17.6H5.8L4.8 22Z M6.7 13.6H9.3L8 7.6Z',
  'M0 22V0H5L8 8L11 0H16V22H11.6V10.5L8 17.5L4.4 10.5V22Z',
]
const DUST_DRIFT_S = 40   // seconds for the dust to cross the board once (slowest puffs a bit more)

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
      puffs: Array.from({ length: 16 }, (_, i) => ({ x: 6 + r(i, 1) * 88, y: 6 + r(i, 2) * 88, s: 28 + r(i, 3) * 34, o: 0.3 + r(i, 4) * 0.3, v: r(i, 5) * 0.35 })),
    }
  }, [])
  if (phase === 'exploding') {
    return (
      <div className="absolute z-30 flex items-center justify-center overflow-visible" style={place} aria-hidden="true">
        <div className="boom-flash absolute inset-0 rounded-xl" style={{ background: palette.boomFlash }} />
        <svg viewBox="0 0 100 100" className="boom-pop relative w-[95%] max-h-[95%]" style={{ overflow: 'visible', aspectRatio: '1' }}>
          <polygon points={shapes.outer} fill={palette.boomRed} stroke={palette.boomInk} strokeWidth="1.6" strokeLinejoin="round" />
          <polygon className="boom-flicker" points={shapes.mid} fill={palette.boomOrange} stroke={palette.boomInk} strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points={shapes.core} fill={palette.boomYellow} stroke={palette.boomInk} strokeWidth="1" strokeLinejoin="round" />
          <g transform="rotate(-9 50 50)">
            {BAM_LETTERS.map((d, i) => {
              // each letter with its own tilt, size and lift; a dark offset copy below gives it depth
              const x = 50 + (i - 1) * 21
              const y = 52 + [1, -2, 2][i]
              const tilt = [-10, 7, -5][i]
              const scale = [1.12, 1.24, 1.16][i]
              const at = `translate(${x} ${y}) rotate(${tilt}) scale(${scale}) translate(-8 -11)`
              return (
                <g key={i} transform={at}>
                  <path d={d} transform="translate(1.1 1.3)" fill={palette.boomInk} fillRule="evenodd" />
                  <path d={d} fill={palette.boomYellow} fillRule="evenodd" stroke={palette.boomInk}
                        strokeWidth="1.3" strokeLinejoin="round" />
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    )
  }
  return (
    <div className="rubble-in absolute z-30 overflow-visible flex items-center justify-center" style={place}>
      {/* the grey dust cloud: soft translucent puffs over the wrecked board, drifting slowly to the
          right (and a little up) until they have left the board; clipped at the board's edge */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        {shapes.puffs.map((k, i) => (
          <span key={i} className="dust-drift absolute rounded-full"
                style={{ left: `${k.x}%`, top: `${k.y}%`, width: `${k.s}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)',
                         background: palette.dustCloud, opacity: k.o, filter: 'blur(14px)',
                         '--drift': `${(rect?.width ?? 400) * 1.5}px`, '--drift-time': `${(DUST_DRIFT_S * (1 + k.v)).toFixed(1)}s` }} />
        ))}
      </div>
      <button onClick={onRetry}
              className="pop-in relative h-16 px-7 rounded-2xl active:scale-95 transition-transform text-2xl font-black
                         flex items-center justify-center gap-2 backdrop-blur-[2px]"
              style={{ background: `${palette.dustRetryBack}73`, color: palette.dustRetryInk, border: `2px solid ${palette.dustRetryInk}99` }}>
        <span aria-hidden="true">↻</span> {t('game.retry')}
      </button>
    </div>
  )
}
