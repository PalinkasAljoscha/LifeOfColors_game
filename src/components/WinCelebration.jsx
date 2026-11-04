import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { themedKey } from '../themes.js'
import { ThemedText } from './Emoji.jsx'
import { MAX_STARS } from '../engine/stars.js'
import { palette } from '../theme.js'

// The win animation (instead of a win dialog). Over the board, nothing to tap:
//   1. shake    the board shakes irregularly, the whole time             0 .. DONE_AT
//   2. bolts    bright purple lightning bolts flash across the whole screen: a burst at the
//               start (0 .. BURST_MS), then only a few sporadic ones until the end
//   3. stars    yellow stars of different sizes pop up over the board      STARS_AT ..
//   4. vapour   the stars get brighter and brighter, turn white and evaporate (white puffs rise);
//               meanwhile the result text shows: title, moves, best, the won stars (1-5),
//               "New best!", and the training messages                    TEXT_AT .. TEXT_AT + TEXT_MS
// Then onDone(): the board stays as it is (the scene takes no more taps after a win); the player
// goes on with Retry or Back. Everything is random within limits, drawn once per win.
// Reduced motion: no shake, bolts or flying stars -- the text alone, then onDone().
const BURST = 3            // lightning bolts in the opening burst ...
const BURST_MS = 600       // ... spread over this time
const LATE = 2             // sporadic bolts later on (after the stars have come)
const BOLT_MS = 460        // one bolt: flash, flicker, fade
const STARS_AT = 650       // the stars come right after the burst
const STAR_MS = 2700        // one star's life: pop, brighten, turn white, evaporate
const STARS = 14
const TEXT_AT = 1250
const TEXT_MS = 2900
const DONE_AT = TEXT_AT + TEXT_MS + 100

const rnd = (a, b) => a + Math.random() * (b - a)
const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// A jagged line from a to b (midpoint displacement): points [[x, y], ...].
function jagged(a, b, rough, depth = 5) {
  if (depth === 0) return [a, b]
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const len = Math.hypot(dx, dy) || 1
  const off = rnd(-1, 1) * rough
  const m = [(a[0] + b[0]) / 2 - (dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off]
  return [...jagged(a, m, rough / 2, depth - 1).slice(0, -1), ...jagged(m, b, rough / 2, depth - 1)]
}

// One lightning bolt across a w x h screen: from just outside one edge to the opposite one, with
// one or two shorter branches. Returns { main, branches } as SVG point lists.
function boltShape(w, h) {
  const sideways = Math.random() < 0.5
  let a = sideways ? [-20, rnd(0.05, 0.95) * h] : [rnd(0.05, 0.95) * w, -20]
  let b = sideways ? [w + 20, rnd(0.05, 0.95) * h] : [rnd(0.05, 0.95) * w, h + 20]
  if (Math.random() < 0.5) [a, b] = [b, a]
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  const main = jagged(a, b, length * 0.16)
  const dir = Math.atan2(b[1] - a[1], b[0] - a[0])
  const branches = Array.from({ length: Math.random() < 0.5 ? 1 : 2 }, () => {
    const from = main[Math.floor(rnd(0.2, 0.7) * main.length)]
    const ang = dir + (Math.random() < 0.5 ? -1 : 1) * rnd(0.4, 0.9)
    const l = length * rnd(0.18, 0.35)
    return jagged(from, [from[0] + Math.cos(ang) * l, from[1] + Math.sin(ang) * l], l * 0.2, 4)
  })
  const pts = (p) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return { main: pts(main), branches: branches.map(pts) }
}

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
  const [screen] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const [bolts] = useState(() => {
    // the burst: the first at once, the rest spread over BURST_MS; then LATE sporadic ones, each
    // in its own slice of the time after the stars have come
    const burst = Array.from({ length: BURST }, (_, i) => (i === 0 ? 0 : (i / BURST) * BURST_MS + rnd(-60, 60)))
    const lateFrom = STARS_AT + 400
    const slice = (DONE_AT - 500 - lateFrom) / LATE
    const late = Array.from({ length: LATE }, (_, i) => lateFrom + slice * (i + rnd(0.15, 0.85)))
    return [...burst, ...late].map((delay) => ({ delay: Math.max(0, delay), ...boltShape(screen.w, screen.h) }))
  })
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

  // 1. the board shakes irregularly for the whole animation: strongest during the lightning
  //    burst, then a little calmer, still at the very end
  useEffect(() => {
    const el = boardRef.current
    if (still || !el) return undefined
    const n = Math.round(DONE_AT / 70)
    const frames = Array.from({ length: n + 1 }, (_, i) => {
      const at = (i / n) * DONE_AT
      const k = i === 0 || i === n ? 0 : at < BURST_MS ? 1 : 0.55
      return {
        transform: `translate(${rnd(-7, 7) * k}px, ${rnd(-5, 5) * k}px) rotate(${rnd(-1.6, 1.6) * k}deg)`,
        offset: i === 0 ? 0 : i === n ? 1 : Math.min(1 - 0.5 / n, (i + rnd(-0.3, 0.3)) / n),
      }
    })
    const anim = el.animate(frames, { duration: DONE_AT, easing: 'linear' })
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
      {/* 2. lightning bolts across the whole screen (each with a faint flash of the screen) */}
      {!still && bolts.map((bolt, i) => (
        <span key={`b${i}`}>
          <span className="absolute inset-0 win-flash" style={{ background: palette.winBoltGlow, animationDelay: `${bolt.delay}ms` }} />
          <svg className="absolute inset-0 win-bolt" width={screen.w} height={screen.h} aria-hidden="true"
               style={{ animationDelay: `${bolt.delay}ms`, animationDuration: `${BOLT_MS}ms` }}>
            {[bolt.main, ...bolt.branches].map((pts, j) => {
              const k = j === 0 ? 1 : 0.55     // branches are thinner
              return (
                <g key={j} fill="none" strokeLinejoin="round" strokeLinecap="round">
                  <polyline points={pts} stroke={palette.winBoltGlow} strokeWidth={16 * k} opacity="0.45"
                            style={{ filter: 'blur(6px)' }} />
                  <polyline points={pts} stroke={palette.winBolt} strokeWidth={6 * k} />
                  <polyline points={pts} stroke={palette.winBoltCore} strokeWidth={2.2 * k} />
                </g>
              )
            })}
          </svg>
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
