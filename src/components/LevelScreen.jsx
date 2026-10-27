import { useTranslation } from 'react-i18next'
import { playState } from '../engine/catalog.js'

// One level: "Random pick" on top, then every puzzle of the level as a tile in its name's
// colour (10 columns, publication order, so new puzzles appear at the end). Tapping a tile
// starts that puzzle. Tiles carry no label; the name is shown on the game screen.
// Puzzles solved in this page session get a check mark, puzzles only opened a small dot
// (in memory only, see catalog.js playState).
export default function LevelScreen({ level, pool, onRandom, onPick, onBack }) {
  const { t } = useTranslation()
  const states = pool.map(playState)
  const solved = states.filter((s) => s === 'solved').length

  return (
    <div className="app-h w-full flex flex-col bg-game-bg safe-pad">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight">{t(`levels.${level}`)}</h1>
            <p className="text-xs text-game-silver font-sans font-semibold">
              {t('home.puzzleCount', { count: pool.length })}
              {solved > 0 && <span className="text-game-green"> · ✓ {t('levelScreen.solved', { count: solved })}</span>}
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

        <button
          onClick={onRandom}
          className="mt-4 w-full h-16 rounded-2xl bg-game-btn hover:bg-game-btn-hover active:scale-95 transition-transform
                     text-2xl font-black shadow-lg flex items-center justify-center gap-2"
        >
          <span aria-hidden="true">🎲</span> {t('levelScreen.random')}
        </button>
        <p className="mt-3 mb-2 text-sm text-game-silver font-sans font-semibold text-center">
          {t('levelScreen.orTap')}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-md grid grid-cols-10 gap-1.5 pb-4">
          {pool.map((inst, i) => (
            <button
              key={inst.id}
              onClick={() => onPick(inst)}
              className="aspect-[4/3] rounded-md ring-1 ring-inset ring-white/20 active:scale-90 transition-transform
                         flex items-center justify-center"
              style={{ background: inst.name_color }}
              aria-label={states[i] === 'solved' ? `${inst.name} ✓` : inst.name}
              title={inst.name}
            >
              {states[i] === 'solved' && (
                <span className="w-4 h-4 rounded-full bg-black/60 ring-1 ring-white/70 text-white text-[10px] leading-none
                                 flex items-center justify-center" aria-hidden="true">✓</span>
              )}
              {states[i] === 'played' && (
                <span className="w-2 h-2 rounded-full bg-black/55 ring-1 ring-white/70" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
