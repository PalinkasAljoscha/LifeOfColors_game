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
// one card per puzzle, one below the other, joined by down arrows -- "Intro", "Lesson 1" ...,
// "Exam" (the last). Won ones show a check and their stars, the next one is highlighted with a
// "Start" button, the ones after it are greyed out with a lock (not playable yet). No progress
// bar: every puzzle has to be won, the path shows how far the player is.

// Down arrow between two training cards (green once the card above is won).
function DownArrow({ color }) {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
      <path d="M14 3 V22 M6 14 L14 22 L22 14" fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" />
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

/** The label of training puzzle k (0-based) of n: Intro, Lesson 1 .. n-2, Exam. */
function trainingLabel(t, k, n) {
  if (k === 0) return t('levelScreen.intro')
  if (k === n - 1) return t('levelScreen.exam')
  return t('levelScreen.lesson', { n: k })
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
        const exam = k === pool.length - 1 && pool.length > 1
        const best = solved ? bestStars(inst.id) : null
        const label = trainingLabel(t, k, pool.length)
        return (
          <li key={inst.id} className="flex flex-col items-center">
            {k > 0 && (
              <span className={`my-1 ${locked ? 'opacity-30' : ''}`}>
                <DownArrow color={states[k - 1] === 'solved' ? palette.correctGreen : palette.silverGray} />
              </span>
            )}
            <button
              onClick={() => !locked && onPick(inst)}
              disabled={locked}
              className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-transform
                          ${locked ? 'opacity-35 grayscale cursor-default' : 'active:scale-95'} ${next ? 'training-next' : ''}`}
              style={{
                background: palette.panel,
                '--pulse': exam ? palette.starGold : palette.silverGray,
                border: `2px solid ${next ? (exam ? palette.starGold : palette.silverGray) : solved ? palette.correctGreen : palette.panelBorder}`,
              }}
              aria-label={`${label}: ${inst.name}${solved ? ' ✓' : ''}${locked ? ` (${t('castles.locked')})` : ''}`}
            >
              {/* the puzzle's colour (as on the other castles' tiles), with its state */}
              <span className="w-11 h-11 shrink-0 rounded-xl ring-1 ring-inset ring-white/25 flex items-center justify-center
                               text-xl font-black"
                    style={{ background: inst.name_color }} aria-hidden="true">
                <span className="w-7 h-7 rounded-full bg-black/45 flex items-center justify-center text-base leading-none"
                      style={{ color: solved ? palette.correctGreen : palette.white }}>
                  {solved ? '✓' : locked ? '🔒' : '▶'}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black leading-tight"
                      style={{ color: exam ? palette.starGold : palette.white }}>
                  {label}{exam && <span aria-hidden="true"> 🏆</span>}
                </span>
                <span className="block truncate text-xs font-sans font-semibold text-game-silver">{inst.name}</span>
              </span>
              {solved && best > 0 && (
                <span className="shrink-0 text-sm text-game-star font-black" aria-hidden="true">
                  {'★'.repeat(best)}
                </span>
              )}
              {next && (
                <span className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-black bg-game-btn" aria-hidden="true">
                  {t('levelScreen.start')}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ol>
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
          {training ? t('levelScreen.trainingHint') : t('levelScreen.choose')}
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
