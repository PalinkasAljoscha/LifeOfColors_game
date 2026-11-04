import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { MAX_STARS, winMode } from '../engine/stars.js'
import { palette } from '../theme.js'

// The win animation (instead of a win dialog). Over the board, nothing to tap:
//   1. stars    yellow stars of different sizes pop up over the board          0 ..
//   2. vapour   they get brighter and brighter, turn white and evaporate (white puffs rise);
//               meanwhile the result box shows: the won stars (1-5), "New best!", the
//               training-complete message, moves and best (no title)   TEXT_AT .. TEXT_AT + TEXT_MS
// How much of it plays depends on the win (`mode`, engine/stars.js winMode):
//   'full'   a 5-star win outside the training castle: as 'stars', plus a few bigger coloured
//            stars that sparkle (twinkle, with rotating glints) before they fade
//   'stars'  any other win outside the training castle
//   'text'   only the result box -- training puzzles (and reduced motion)
// Then onDone(): the board stays as it is (the scene takes no more taps after a win); the player
// goes on with Retry or Back. Everything is random within limits, drawn once per win.
const STAR_MS = 2700        // one star's life: pop, brighten, turn white, evaporate
const STARS = 14
const SPARKLE_MS = 3000     // 'full': one coloured sparkling star's life
const SPARKLES = 5
const TEXT_AT = 600
const TEXT_MS = 2900
const DONE_AT = Math.max(TEXT_AT + TEXT_MS, 900 + SPARKLE_MS) + 100
const TEXT_ONLY_MS = 2600   // 'text': how long the result box stays

const rnd = (a, b) => a + Math.random() * (b - a)
const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
const SPARKLE_COLOURS = ['winSparkle1', 'winSparkle2', 'winSparkle3', 'winSparkle4', 'winSparkle5']

// One five-pointed star (fill = currentColor, so its colour can be animated).
function StarShape({ size }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 50 : 21
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={pts} fill="currentColor" strokeLinejoin="round" />
    </svg>
  )
}

// A four-pointed glint (the sparkle over a coloured star).
function Glint({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 0 C53 40 60 47 100 50 C60 53 53 60 50 100 C47 60 40 53 0 50 C40 47 47 40 50 0 Z" fill="currentColor" />
    </svg>
  )
}

/** training: null or { day, complete, next }; moves, best (null = unknown), stars (1-5 or null),
 *  newBest. */
export default function WinCelebration({ boardRef, training = null, moves, best = null, stars = null,
                                         newBest = false, onDone }) {
  const { t } = useTranslation()
  const [mode] = useState(() => winMode({ training, stars, reduced: reducedMotion() }))
  const still = mode === 'text'
  const doneAt = still ? TEXT_ONLY_MS : DONE_AT
  const [board, setBoard] = useState(null)   // the board's rect in page px
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // the random parts, once per win
  const [starSpecs] = useState(() => Array.from({ length: STARS }, (_, i) => ({
    x: rnd(0.05, 0.95), y: rnd(0.05, 0.95),       // share of the board's width / height
    size: Math.round(rnd(18, 58)),
    delay: i * rnd(25, 55),
    spin: rnd(-25, 25),
  })))
  const [sparkles] = useState(() => Array.from({ length: SPARKLES }, (_, i) => ({
    x: rnd(0.12, 0.88), y: rnd(0.1, 0.9),
    size: Math.round(rnd(64, 90)),
    delay: 150 + i * rnd(120, 180),
    colour: palette[SPARKLE_COLOURS[i % SPARKLE_COLOURS.length]],
  })))

  useLayoutEffect(() => {
    // the board itself (its canvas), not the box around it
    const el = boardRef.current
    const r = (el?.querySelector('canvas') ?? el)?.getBoundingClientRect()
    if (r) setBoard({ left: r.left, top: r.top, width: r.width, height: r.height })
  }, [boardRef])

  // the end: back to the plain board
  useEffect(() => {
    const id = setTimeout(() => doneRef.current(), doneAt)
    return () => clearTimeout(id)
  }, [doneAt])

  const complete = training?.complete === true

  return createPortal(
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden" role="status" aria-live="polite">
      {/* 1.-2. stars over the board: pop, brighten, turn white, evaporate (with rising puffs) */}
      {!still && board && starSpecs.map((s, i) => {
        const x = board.left + s.x * board.width
        const y = board.top + s.y * board.height
        return (
          <span key={`s${i}`}>
            <span className="absolute win-star" style={{
              left: x - s.size / 2, top: y - s.size / 2, '--spin': `${s.spin}deg`,
              '--star': palette.winStar, '--hot': palette.winVapour,
              animationDelay: `${s.delay}ms`, animationDuration: `${STAR_MS}ms`,
            }}>
              <StarShape size={s.size} />
            </span>
            {[0, 1, 2].map((k) => (
              <span key={k} className="absolute rounded-full win-vapour" style={{
                left: x - s.size * 0.4 + (k - 1) * s.size * 0.3, top: y - s.size * 0.4,
                width: s.size * 0.8, height: s.size * 0.8, background: palette.winVapour,
                animationDelay: `${s.delay + STAR_MS * 0.62 + k * 90}ms`,
              }} />
            ))}
          </span>
        )
      })}

      {/* 'full' (5 stars): a few bigger coloured stars that sparkle, then fade */}
      {mode === 'full' && board && sparkles.map((s, i) => {
        const x = board.left + s.x * board.width
        const y = board.top + s.y * board.height
        return (
          <span key={`p${i}`} className="absolute win-sparkle"
                style={{ left: x - s.size / 2, top: y - s.size / 2, width: s.size, height: s.size,
                         color: s.colour, '--glow': s.colour,
                         animationDelay: `${s.delay}ms`, animationDuration: `${SPARKLE_MS}ms` }}>
            <StarShape size={s.size} />
            {/* two glints on the star's tips, twinkling out of step */}
            {[[0.18, 0.12, 0], [0.78, 0.3, 1]].map(([gx, gy, k]) => (
              <span key={k} className="absolute win-glint"
                    style={{ left: s.size * gx - s.size * 0.22, top: s.size * gy - s.size * 0.22,
                             color: palette.winVapour, animationDelay: `${s.delay + 250 + k * 330}ms` }}>
                <Glint size={s.size * 0.44} />
              </span>
            ))}
          </span>
        )
      })}

      {/* 4. the result, centred on the board */}
      {board && (
        <div className="absolute flex items-center justify-center px-3"
             style={{ left: board.left, top: board.top, width: board.width, height: board.height }}>
          <div className="win-text rounded-3xl px-5 py-4 text-center"
               style={{ animationDelay: `${still ? 0 : TEXT_AT}ms`, animationDuration: `${still ? TEXT_ONLY_MS - 100 : TEXT_MS}ms`,
                        background: palette.winTextBack }}>
            {complete && (
              <p className="mt-1.5 first:mt-0 font-sans font-bold text-white">
                {t('win.trainingReady')}{training.next && <> {t('win.trainingNext', { castle: training.next })}</>}
              </p>
            )}
            {stars !== null && (
              <p className="mt-2 first:mt-0 flex justify-center gap-1 text-3xl leading-none" role="img"
                 aria-label={t('win.stars', { count: stars })}>
                {Array.from({ length: MAX_STARS }, (_, i) => (
                  <span key={i} aria-hidden="true" className={i < stars ? 'text-game-star' : 'text-game-star-empty'}>★</span>
                ))}
              </p>
            )}
            {stars !== null && newBest && (
              <p className="mt-1.5 text-sm font-black uppercase tracking-widest text-game-score">{t('win.newBest')}</p>
            )}
            <p className="mt-2 first:mt-0 font-sans font-bold text-xl text-white">{t('win.moves', { count: moves })}</p>
            {best !== null && <p className="font-sans font-semibold text-game-silver">{t('game.best', { count: best })}</p>}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
