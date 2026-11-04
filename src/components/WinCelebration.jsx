import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { themedKey } from '../themes.js'
import { ThemedText } from './Emoji.jsx'
import { MAX_STARS } from '../engine/stars.js'
import { palette } from '../theme.js'

// The win animation (instead of a win dialog). Over the board, nothing to tap:
//   1. shake    the board shakes irregularly                               0 .. SHAKE_MS
//   2. arrows   bright purple arrows shoot across the whole screen         ARROWS_AT ..
//   3. stars    yellow stars of different sizes pop up over the board      STARS_AT ..
//   4. vapour   the stars get brighter and brighter, turn white and evaporate (white puffs rise);
//               meanwhile the result text shows: title, moves, best, the won stars (1-5),
//               "New best!", and the training messages                    TEXT_AT .. TEXT_AT + TEXT_MS
// Then onDone(): the board stays as it is (the scene takes no more taps after a win); the player
// goes on with Retry or Back. Everything is random within limits, drawn once per win.
// Reduced motion: no shake, arrows or flying stars -- the text alone, then onDone().
const SHAKE_MS = 750
const ARROWS_AT = 450
const ARROW_MS = 850
const ARROWS = 9
const STARS_AT = 1300
const STAR_MS = 2700        // one star's life: pop, brighten, turn white, evaporate
const STARS = 14
const TEXT_AT = 1900
const TEXT_MS = 2900
const DONE_AT = TEXT_AT + TEXT_MS + 100

const rnd = (a, b) => a + Math.random() * (b - a)
const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

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

/** look: the game's look (themed title); training: null or { day, complete, next };
 *  moves, best (null = unknown), stars (1-5 or null), newBest. */
export default function WinCelebration({ boardRef, look, training = null, moves, best = null, stars = null,
                                         newBest = false, onDone }) {
  const { t } = useTranslation()
  const [still] = useState(reducedMotion)
  const [board, setBoard] = useState(null)   // the board's rect in page px
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  // the random parts, once per win
  const [arrows] = useState(() => Array.from({ length: ARROWS }, (_, i) => ({
    angle: rnd(-35, 35) + (i % 2 ? 180 : 0) + (i % 3 === 2 ? 90 : 0),   // mostly sideways, some up/down
    offset: rnd(-30, 30),                                                // vmin, across its path
    delay: ARROWS_AT + i * rnd(40, 75),
    length: rnd(28, 46),                                                 // vmin
  })))
  const [starSpecs] = useState(() => Array.from({ length: STARS }, (_, i) => ({
    x: rnd(0.05, 0.95), y: rnd(0.05, 0.95),       // share of the board's width / height
    size: Math.round(rnd(18, 58)),
    delay: STARS_AT + i * rnd(25, 55),
    spin: rnd(-25, 25),
  })))

  useLayoutEffect(() => {
    // the board itself (its canvas), not the box around it
    const el = boardRef.current
    const r = (el?.querySelector('canvas') ?? el)?.getBoundingClientRect()
    if (r) setBoard({ left: r.left, top: r.top, width: r.width, height: r.height })
  }, [boardRef])

  // 1. the board shakes, irregularly (random offsets that fade out)
  useEffect(() => {
    const el = boardRef.current
    if (still || !el) return undefined
    const n = 12
    const frames = Array.from({ length: n + 1 }, (_, i) => {
      const k = i === 0 || i === n ? 0 : 1 - i / (n + 2)
      return {
        transform: `translate(${rnd(-7, 7) * k}px, ${rnd(-5, 5) * k}px) rotate(${rnd(-1.6, 1.6) * k}deg)`,
        offset: i === 0 ? 0 : i === n ? 1 : Math.min(0.97, i / n + rnd(-0.03, 0.03)),
      }
    })
    const anim = el.animate(frames, { duration: SHAKE_MS, easing: 'linear' })
    return () => anim.cancel()
  }, [boardRef, still])

  // the end: back to the plain board
  useEffect(() => {
    const id = setTimeout(() => doneRef.current(), still ? 2600 : DONE_AT)
    return () => clearTimeout(id)
  }, [still])

  const complete = training?.complete === true
  const title = complete ? t('win.trainingComplete')
    : training?.day ? t('win.trainingDay', { n: training.day })
      : <ThemedText text={t(themedKey('win.title'))} look={look} />

  return createPortal(
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden" role="status" aria-live="polite">
      {/* 2. arrows across the whole screen */}
      {!still && arrows.map((a, i) => (
        <span key={`a${i}`} className="absolute left-1/2 top-1/2 win-arrow"
              style={{ '--a': `${a.angle}deg`, '--o': `${a.offset}vmin`, '--len': `${a.length}vmin`,
                       animationDelay: `${a.delay}ms`, animationDuration: `${ARROW_MS}ms` }}>
          <span className="block h-[1.5vmin] min-h-[6px] rounded-full"
                style={{ width: 'var(--len)', background: palette.winArrow,
                         boxShadow: `0 0 10px 3px ${palette.winArrowGlow}, 0 0 28px 8px ${palette.winArrowGlow}` }} />
          <span className="absolute right-[-4vmin] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{ borderTop: '4vmin solid transparent', borderBottom: '4vmin solid transparent',
                         borderLeft: `6vmin solid ${palette.winArrow}`,
                         filter: `drop-shadow(0 0 8px ${palette.winArrowGlow})` }} />
        </span>
      ))}

      {/* 3.-4. stars over the board: pop, brighten, turn white, evaporate (with rising puffs) */}
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

      {/* 4. the result, centred on the board */}
      {board && (
        <div className="absolute flex items-center justify-center px-3"
             style={{ left: board.left, top: board.top, width: board.width, height: board.height }}>
          <div className="win-text rounded-3xl px-5 py-4 text-center"
               style={{ animationDelay: `${still ? 0 : TEXT_AT}ms`, animationDuration: `${still ? 2500 : TEXT_MS}ms`,
                        background: palette.winTextBack }}>
            <p className="text-2xl font-black text-game-score leading-tight">{title}</p>
            {complete && (
              <p className="mt-1.5 font-sans font-bold text-white">
                {t('win.trainingReady')}{training.next && <> {t('win.trainingNext', { castle: training.next })}</>}
              </p>
            )}
            {stars !== null && (
              <p className="mt-2 flex justify-center gap-1 text-3xl leading-none" role="img"
                 aria-label={t('win.stars', { count: stars })}>
                {Array.from({ length: MAX_STARS }, (_, i) => (
                  <span key={i} aria-hidden="true" className={i < stars ? 'text-game-star' : 'text-game-star-empty'}>★</span>
                ))}
              </p>
            )}
            {stars !== null && newBest && (
              <p className="mt-1.5 text-sm font-black uppercase tracking-widest text-game-score">{t('win.newBest')}</p>
            )}
            <p className="mt-2 font-sans font-bold text-xl text-white">{t('win.moves', { count: moves })}</p>
            {best !== null && <p className="font-sans font-semibold text-game-silver">{t('game.best', { count: best })}</p>}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
