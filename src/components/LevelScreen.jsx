import { useTranslation } from 'react-i18next'
import { playState } from '../engine/catalog.js'
import { bestStars } from '../engine/progress.js'
import { useProgress } from '../hooks/useProgress.js'
import { ConsentBannerSpacer } from './ConsentBanner.jsx'
import { palette } from '../theme.js'

// One level: every puzzle of the level as a tile in its name's
// colour (10 columns, publication order, so new puzzles appear at the end). Tapping a tile
// starts that puzzle. Tiles carry no label; the name is shown on the game screen.
// Solved puzzles show their best star rating (a check mark if the puzzle has no rating),
// puzzles only opened a small dot (engine/progress.js: this visit, or saved if the player
// opted in).
// Used for one castle (engine/castles.js): `state` = { stars, required, done }, shown as a bar
// towards opening `nextTitle` (the castle above; null for the last one).
export default function LevelScreen({ title, nextTitle, state, pool, onPick, onBack, nudging = false }) {
  const { t } = useTranslation()
  useProgress()
  const states = pool.map(playState)
  const { stars, required, done } = state
  const share = Math.min(1, stars / required)

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

        {nextTitle && (
          <div className="mt-3">
            <p className="text-sm font-sans font-bold">
              <span className="text-game-star">★ {stars}</span>
              <span className="text-game-silver"> / {required} · </span>
              <span className={done ? 'text-white' : 'text-game-silver'}>
                {t(done ? 'castles.nextOpen' : 'castles.toOpen', { name: nextTitle })}
              </span>
            </p>
            <div className="mt-1.5 h-2.5 rounded-full bg-game-track overflow-hidden"
                 role="progressbar" aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(stars, required)}>
              <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: done ? palette.correctGreen : palette.starGold }} />
            </div>
          </div>
        )}

        <p className="mt-4 mb-2 text-sm text-game-silver font-sans font-semibold text-center">
          {t('levelScreen.choose')}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
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
              {states[i] === 'solved' && best > 0 && (
                <span className="min-w-4 h-4 px-0.5 rounded-full bg-black/80 ring-1 ring-white/70 text-game-star text-[9px]
                                 font-black leading-none flex items-center justify-center gap-px" aria-hidden="true">
                  {best}<span className="text-[8px]">★</span>
                </span>
              )}
              {states[i] === 'solved' && !best && (
                <span className="w-4 h-4 rounded-full bg-black/60 ring-1 ring-white/70 text-white text-[10px] leading-none
                                 flex items-center justify-center" aria-hidden="true">✓</span>
              )}
              {states[i] === 'played' && (
                <span className="w-2 h-2 rounded-full bg-black/55 ring-1 ring-white/70" aria-hidden="true" />
              )}
            </button>
            )
          })}
        </div>
        <ConsentBannerSpacer nudge={nudging} />
      </div>
    </div>
  )
}
