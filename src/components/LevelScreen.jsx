import { useTranslation } from 'react-i18next'
import { playState } from '../engine/catalog.js'
import { bestStars } from '../engine/progress.js'
import { useProgress } from '../hooks/useProgress.js'
import { ConsentBannerSpacer } from './ConsentBanner.jsx'
import { palette } from '../theme.js'
import { playableUpTo } from '../engine/castles.js'

// One level: every puzzle of the level as a tile in its name's
// colour (10 columns, publication order, so new puzzles appear at the end). Tapping a tile
// starts that puzzle. Tiles carry no label; the name is shown on the game screen.
// Solved puzzles show their best star rating (a check mark if the puzzle has no rating),
// puzzles only opened a small dot (engine/progress.js: this visit, or saved if the player
// opted in).
// Used for one castle (engine/castles.js): `state` = { stars, required, done }, shown as a bar
// towards opening `nextTitle` (the castle above; null for the last one).
// Training castle (state.training): the puzzles are a path to follow in order (TrainingPath):
// tiles in their name colours joined by silver arrows, the next one to win framed in silver, the
// ones after it faded (not playable yet). No progress bar: every puzzle has to be won, the path shows how far the player is.
const COLS = 4         // training path: tiles per row (the rows snake left-right, right-left, ...)
const TILE = '3.75rem' // training path: tile width
const ARROW = '2rem'   // training path: width of the arrow columns / height of the arrow rows

// Thick arrow pointing right / left / down (training path).
function Arrow({ dir, color }) {
  const rotate = { right: 0, down: 90, left: 180 }[dir]
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <path d="M3 14 H21 M14 6 L22 14 L14 22" fill="none" stroke={color} strokeWidth="4.5"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Star badge / check mark / dot on a tile (solved with rating / solved / only opened).
function TileMark({ state, best }) {
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

// Training castle: the puzzles in their fixed order as a snaking path of tiles and arrows.
// Grid of 2 * COLS - 1 columns: tiles in the odd columns, horizontal arrows between them; a row of
// down arrows between two tile rows, under the tile where the path turns.
function TrainingPath({ pool, states, onPick }) {
  const { t } = useTranslation()
  const upTo = playableUpTo(pool, (_, i) => states[i] === 'solved')
  const place = (k) => {
    const row = Math.floor(k / COLS)
    const pos = k % COLS
    return { row, col: row % 2 === 0 ? pos : COLS - 1 - pos }
  }
  const items = []
  pool.forEach((inst, k) => {
    const { row, col } = place(k)
    const locked = k > upTo
    const next = k === upTo && states[k] !== 'solved'
    const best = states[k] === 'solved' ? bestStars(inst.id) : null
    items.push(
      <button
        key={inst.id}
        onClick={() => !locked && onPick(inst)}
        disabled={locked}
        className={`relative aspect-[4/3] rounded-lg ring-1 ring-inset ring-white/20 transition-transform flex items-center
                    justify-center ${locked ? 'opacity-30 cursor-default' : 'active:scale-90'}`}
        style={{
          gridColumn: 2 * col + 1, gridRow: 2 * row + 1, background: inst.name_color,
          boxShadow: next ? `0 0 0 3px ${palette.silverGray}` : undefined,
        }}
        aria-label={`${k + 1}. ${inst.name}${states[k] === 'solved' ? ' ✓' : ''}${locked ? ` (${t('castles.locked')})` : ''}`}
        title={inst.name}
      >
        {!locked && <TileMark state={states[k]} best={best} />}
      </button>,
    )
    if (k === pool.length - 1) return
    const to = place(k + 1)
    const arrow = to.row === row
      ? { gridColumn: 2 * Math.min(col, to.col) + 2, gridRow: 2 * row + 1, dir: to.col > col ? 'right' : 'left' }
      : { gridColumn: 2 * col + 1, gridRow: 2 * row + 2, dir: 'down' }
    items.push(
      <span key={`a${k}`} aria-hidden="true" className="flex items-center justify-center"
            style={{ gridColumn: arrow.gridColumn, gridRow: arrow.gridRow }}>
        <Arrow dir={arrow.dir} color={palette.silverGray} />
      </span>,
    )
  })
  return (
    <div className="mx-auto w-fit grid gap-1 px-2 pt-2 pb-4 items-center"
         style={{ gridTemplateColumns: Array.from({ length: 2 * COLS - 1 }, (_, i) => (i % 2 ? ARROW : TILE)).join(' ') }}>
      {items}
    </div>
  )
}

export default function LevelScreen({ title, nextTitle, state, pool, onPick, onBack, nudging = false }) {
  const { t } = useTranslation()
  useProgress()
  const states = pool.map(playState)
  const { stars, solved, required, done, training } = state
  const have = training ? solved : stars          // training: won puzzles; else stars
  const share = Math.min(1, have / required)

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-game-bg safe-pad">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight">{title}</h1>
            <p className="text-xs text-game-silver font-sans font-semibold">
              {t('home.puzzleCount', { count: pool.length })}
            </p>
          </div>
          <button
            onClick={onBack}
            className="ml-auto h-12 px-4 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform
                       text-base font-black shrink-0"
          >
            {t('levelScreen.back')}
          </button>
        </div>

        {nextTitle && !training && (
          <div className="mt-3">
            <p className="text-sm font-sans font-bold">
              {training
                ? <span style={{ color: palette.correctGreen }}>✓ {solved}</span>
                : <span className="text-game-star">★ {stars}</span>}
              <span className="text-game-silver"> / {required} · </span>
              <span className={done ? 'text-white' : 'text-game-silver'}>
                {t(done ? 'castles.nextOpen' : 'castles.toOpen', { name: nextTitle })}
              </span>
            </p>
            <div className="mt-1.5 h-2.5 rounded-full bg-game-track overflow-hidden"
                 role="progressbar" aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(have, required)}>
              <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: done ? palette.correctGreen : palette.starGold }} />
            </div>
          </div>
        )}

        <p className="mt-4 mb-2 text-sm text-game-silver font-sans font-semibold text-center">
          {t(training ? 'levelScreen.trainingHint' : 'levelScreen.choose')}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {training ? <TrainingPath pool={pool} states={states} onPick={onPick} /> : (
        <div className="mx-auto w-full max-w-md grid grid-cols-10 gap-1.5 pb-4">
          {pool.map((inst, i) => {
            const best = states[i] === 'solved' ? bestStars(inst.id) : null
            return (
            <button
              key={inst.id}
              onClick={() => onPick(inst)}
              className="aspect-[4/3] rounded-md ring-1 ring-inset ring-white/20 active:scale-90 transition-transform
                         flex items-center justify-center"
              style={{ background: inst.name_color }}
              aria-label={states[i] === 'solved' ? `${inst.name} ✓${best ? ` ${'★'.repeat(best)}` : ''}` : inst.name}
              title={inst.name}
            >
              <TileMark state={states[i]} best={best} />
            </button>
            )
          })}
        </div>
        )}
        <ConsentBannerSpacer nudge={nudging} />
      </div>
    </div>
  )
}
