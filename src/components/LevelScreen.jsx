import { useTranslation } from 'react-i18next'
import { playState } from '../engine/catalog.js'
import { useProgress } from '../hooks/useProgress.js'
import { ConsentBannerSpacer } from './ConsentBanner.jsx'
import { inkOn, mixHex, palette } from '../theme.js'
import { HANDWRITING } from './TrainingNotes.jsx'
import { playableUpTo } from '../engine/castles.js'
import { emptySlots, placePuzzles, workshopFor } from '../workshops.js'
import Workshop from './Workshop.jsx'
import { SIGN_FONT } from './TrainingGround.jsx'

// One castle. Every castle except the training castle shows its puzzles as potions in a
// sorcerer's workshop (components/Workshop.jsx, one of the scenes in src/workshops.js per castle):
// a test tube per puzzle in the puzzle's colour, a round flask for a special puzzle, a copper
// medal with the best stars on a solved one. Tapping a potion starts that puzzle.
// A castle never holds more puzzles than its scene has places: the app leaves the surplus out
// (workshops.js fitToScenes, called in App). The former fallback, a plain tile grid, is gone; its
// tile drawing (SpecialTile, TileMark) is still used by the history dialog and the game screen.
// Used for one castle (engine/castles.js): `state` = { stars, required, done }, shown as a bar
// towards opening `next` (App opensNext: { one: name } or { count }, the castles
// its paths lead to; null where none lead on). Empty test tubes fill the places the castle's
// puzzles leave free (workshops.js placePuzzles); they cannot be tapped.
// Training castle (state.training): the puzzles are a path to follow in order (TrainingPath):
// one bar per puzzle in the puzzle's colour (text dark or white, theme.js inkOn), one below the
// other, joined by down arrows -- a big title ("Introduction", then "Day One" .. "Day Five") over
// the puzzle's name.
// Won ones carry a small medal, the next one is framed in white, glows gently and has a "Start"
// button, the ones after it are faded (not playable yet). No progress
// bar: every puzzle has to be won, the path shows how far the player is.

// Down arrow between two training bars.
function DownArrow({ color }) {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
      <path d="M14 3 V22 M6 14 L14 22 L22 14" fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Puzzles with a special cell get a tile with a wavy white border, so players can find them.
// Only the drawing changes: the button around it keeps the full tile as its tap area.
export const isSpecial = (inst) => (inst.board?.special_cells?.length ?? 0) > 0

// Outline of the tile (viewBox 40 x 30): each edge cut into equal steps that bulge out / in
// alternately (quadratic curves), 6 along the long edges, 4 along the short ones.
function wavyPath() {
  const M = 2, AMP = 2.6, W = 40, H = 30
  const corners = [[M, M], [W - M, M], [W - M, H - M], [M, H - M]]
  const steps = [6, 4, 6, 4]
  let d = `M${corners[0][0]},${corners[0][1]}`
  let sign = 1
  for (let e = 0; e < 4; e++) {
    const [x0, y0] = corners[e], [x1, y1] = corners[(e + 1) % 4]
    const n = steps[e], dx = (x1 - x0) / n, dy = (y1 - y0) / n
    const len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len   // outward normal
    for (let k = 0; k < n; k++) {
      const cx = x0 + dx * (k + 0.5) + nx * AMP * sign, cy = y0 + dy * (k + 0.5) + ny * AMP * sign
      d += ` Q${cx.toFixed(2)},${cy.toFixed(2)} ${(x0 + dx * (k + 1)).toFixed(2)},${(y0 + dy * (k + 1)).toFixed(2)}`
      sign = -sign
    }
  }
  return d + ' Z'
}
const WAVY = wavyPath()

export function SpecialTile({ color }) {
  return (
    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 40 30" preserveAspectRatio="none" aria-hidden="true">
      <path d={WAVY} fill={color} stroke={palette.specialTileEdge} strokeOpacity="0.9" strokeWidth="1.5"
            strokeLinejoin="round" style={{ vectorEffect: 'non-scaling-stroke' }} />
    </svg>
  )
}

// Star badge / check mark / dot on a tile (solved with rating / solved / only opened).
export function TileMark({ state, best }) {
  if (state === 'solved' && best > 0) {
    return (
      <span className="min-w-4 h-4 px-0.5 rounded-full bg-black/80 ring-1 ring-white/70 text-game-star text-[9px]
                       font-black leading-none flex items-center justify-center gap-px" aria-hidden="true">
        {best}<span className="text-[8px]">★</span>
      </span>
    )
  }
  if (state === 'solved') {
    return (
      <span className="w-4 h-4 rounded-full bg-black/60 ring-1 ring-white/70 text-white text-[10px] leading-none
                       flex items-center justify-center" aria-hidden="true">✓</span>
    )
  }
  if (state === 'played') return <span className="w-2 h-2 rounded-full bg-black/55 ring-1 ring-white/70" aria-hidden="true" />
  return null
}

// The training castle's "Completed" stamp: a rubber stamp in green ink, lettered in the training
// sign's playful Mystery Quest, tilted, centred on the title's lower edge; a double frame, worn
// edges and a few gaps in the ink (SVG filter);
// it lands with a little thump when the screen opens (CSS `stamp-in`; none with "reduce motion").
function CompletedStamp({ text }) {
  return (
    <span className="absolute left-1/2 top-full pointer-events-none" aria-hidden="false">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="stamp-worn" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="2" seed="3" result="spots" />
          <feColorMatrix in="spots" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -9 7.4" result="holes" />
          <feComposite in="rough" in2="holes" operator="in" />
        </filter>
      </svg>
      <span className="stamp-in block whitespace-nowrap rounded-xl px-3 leading-snug"
            style={{ color: palette.stampInk, border: `2.5px solid ${palette.stampInk}`,
                     outline: `1px solid ${palette.stampInk}`, outlineOffset: '2px',
                     fontFamily: SIGN_FONT, fontSize: '1.4rem', letterSpacing: '0.02em',
                     filter: 'url(#stamp-worn)', opacity: 0.92, '--tilt': '-7deg' }}>
        {text}
      </span>
    </span>
  )
}

// Training castle: the puzzles in their fixed order, one card each, with arrows in between.
function TrainingPath({ pool, states, onPick }) {
  const { t } = useTranslation()
  const upTo = playableUpTo(pool, (_, i) => states[i] === 'solved')
  return (
    <ol className="mx-auto w-full max-w-xs px-2 pt-1 pb-4 flex flex-col items-stretch">
      {pool.map((inst, k) => {
        const solved = states[k] === 'solved'
        const locked = k > upTo
        const next = k === upTo && !solved
        const ink = inkOn(inst.name_color)
        // the step's title: "Introduction", then "Day One", "Day Two", ... (words; past five "Day 6")
        const heading = k === 0 ? t('levelScreen.intro')
          : t(`levelScreen.days.${k}`, { defaultValue: t('levelScreen.dayN', { n: k }) })
        return (
          <li key={inst.id} className="flex flex-col items-center">
            {k > 0 && (
              <span className={`my-1 ${locked ? 'opacity-30' : ''}`}>
                <DownArrow color={palette.silverGray} />
              </span>
            )}
            <button
              onClick={() => !locked && onPick(inst)}
              disabled={locked}
              className={`w-full min-h-[4.25rem] py-2 flex items-center gap-3 rounded-2xl pl-5 pr-3
                          text-left transition-transform ring-1 ring-inset ring-white/20
                          ${locked ? 'opacity-30 saturate-50 cursor-default' : 'active:scale-95'} ${next ? 'training-next' : ''}`}
              style={{
                background: inst.name_color, color: ink, '--pulse': palette.white,
                outline: next ? `3px solid ${palette.white}` : 'none', outlineOffset: '2px',
              }}
              aria-label={`${heading}: ${inst.name}${solved ? ' ✓' : ''}${locked ? ` (${t('castles.locked')})` : ''}`}
            >
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-2xl font-black">{heading}</span>
                <span className="block truncate text-sm font-bold opacity-80">
                  {inst.name}
                </span>
              </span>
              {/* won: a small medal */}
              {solved && <span className="shrink-0 text-2xl leading-none" aria-hidden="true">🏅</span>}
              {next && (
                <span className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-black bg-game-btn text-white" aria-hidden="true">
                  {t('levelScreen.start')}
                </span>
              )}
            </button>
          </li>
        )
      })}
      {/* the end of the path: the journey -- grey at first, a little brighter and more golden with
          every step won, fully golden when all are won; handwriting, as the notebook's title */}
      {pool.length > 0 && (() => {
        const f = pool.filter((_, k) => states[k] === 'solved').length / pool.length
        const colour = mixHex(palette.journeyDim, palette.journeyGold, f)
        return (
          <li className="flex flex-col items-center" aria-label={t('levelScreen.journey')}>
            <span className="my-1" style={{ opacity: 0.35 + 0.65 * f }}>
              <DownArrow color={colour} />
            </span>
            <p className="mt-1 whitespace-nowrap font-black text-center leading-tight"
               style={{ color: colour, opacity: 0.45 + 0.55 * f, fontSize: 'min(1.45rem, 5.6vw)',
                        fontFamily: HANDWRITING }}>
              {t('levelScreen.journey')}
            </p>
          </li>
        )
      })()}
    </ol>
  )
}

/** What the workshop plate's bar says about itself: "20 stars needed to open next sites", or,
 *  once the castle is done, what is open ("House of the Lily is open!" / "3 new places are open!").
 *  `next` = App opensNext; null when the castle leads nowhere. */
export function barHint(t, next, state) {
  if (!next) return null
  if (state.done) return next.one ? t('castles.nextOpen', { name: next.one }) : t('castles.nextOpenMany', { count: next.count })
  return t(next.one ? 'castles.starsNeeded' : 'castles.starsNeededMany', { count: state.required })
}

export default function LevelScreen({ title, next, state, pool, onPick, onBack, nudging = false }) {
  const { t } = useTranslation()
  useProgress()
  const states = pool.map(playState)

  // Every castle but the training castle: its workshop scene. A castle never holds more puzzles
  // than its scene has places (workshops.js fitToScenes, App); the slice only guards that.
  if (!state.training) {
    const scene = workshopFor(state.castle)
    const placed = placePuzzles(scene, pool.slice(0, scene.slots.length), isSpecial, state.castle)
    const stateOf = new Map(pool.map((inst, i) => [inst.id, states[i]]))
    return (
      <Workshop scene={scene} placed={placed} playStates={placed.map(({ inst }) => stateOf.get(inst.id))} isSpecial={isSpecial}
                empty={emptySlots(scene, placed)}
                title={title} barHint={barHint(t, next, state)} state={state} onPick={onPick} onBack={onBack} nudging={nudging} />
    )
  }

  // The training castle: the map button alone on top (the workshop's rounded 🗺️ button), the title
  // centred below it, then the path. Once every training day is solved, a "Completed" stamp sits
  // tilted across the title's lower edge (half on it, half below).
  const complete = pool.length > 0 && states.every((s) => s === 'solved')
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-game-bg safe-pad">
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-col">
          <div className={`order-2 mt-3 text-center ${complete ? 'mb-8' : 'mb-6'}`}>
            <h1 className="relative inline-block text-3xl font-black leading-tight">
              {title}
              {complete && <CompletedStamp text={t('levelScreen.completed')} />}
            </h1>
          </div>
          <button
            onClick={onBack}
            className="ml-auto mr-1 w-20 h-11 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform
                       flex items-center justify-center text-2xl shrink-0"
            aria-label={t('levelScreen.back')}
            title={t('levelScreen.back')}
          >
            <span aria-hidden="true">🗺️</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <TrainingPath pool={pool} states={states} onPick={onPick} />
        <ConsentBannerSpacer nudge={nudging} />
      </div>
    </div>
  )
}
