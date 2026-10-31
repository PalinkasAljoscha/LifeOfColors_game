import { useTranslation } from 'react-i18next'
import { themedKey } from '../themes.js'
import { ThemedText } from './Emoji.jsx'
import { MAX_STARS } from '../engine/stars.js'

// Won stars (1-5, src/engine/stars.js) as a row of five, the won ones gold.
function Stars({ count }) {
  const { t } = useTranslation()
  return (
    <div className="mt-3 flex justify-center gap-1 text-4xl leading-none" role="img" aria-label={t('win.stars', { count })}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`${i < count ? 'text-game-star star-pop' : 'text-game-star-empty'}`}
          style={i < count ? { animationDelay: `${150 + i * 120}ms` } : undefined}
        >
          ★
        </span>
      ))}
    </div>
  )
}

// training: null, or { day, complete, next } in the training castle: title "Passed training day
// <day>" and the main button "Training plan" (back to the castle's path); the win that completes
// the plan says "Training complete", "<next> is waiting", and its main button "Start journey" goes
// home (the map then shows the newly opened castle).
// stars / best: null when the puzzle has no moves_to_win_min in the catalog (then not shown).
// newBest: this solve beat the puzzle's earlier best rating; previousBest: that earlier rating
// (from engine/progress.js -- shown when this solve did not reach it).
export default function WinDialog({ look = undefined, training = null, moves, best = null, stars = null, newBest = false,
                                    previousBest = null, onRetry, onPickNew, onHome }) {
  const { t } = useTranslation()
  const complete = training?.complete === true
  const title = complete ? t('win.trainingComplete')
    : training?.day ? t('win.trainingDay', { n: training.day })
      : <ThemedText text={t(themedKey('win.title'))} look={look} />
  const secondary = 'flex-1 h-14 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform text-base font-black'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" role="dialog" aria-modal="true">
      <div className="pop-in w-full max-w-xs rounded-3xl bg-game-header border-2 border-white/15 p-6 text-center shadow-2xl">
        <h2 className="text-3xl font-black text-game-score">{title}</h2>
        {complete && (
          <p className="mt-2 font-sans font-bold text-white">
            {t('win.trainingReady')}{training.next && <> {t('win.trainingNext', { castle: training.next })}</>}
          </p>
        )}
        {stars !== null && <Stars count={stars} />}
        {stars !== null && newBest && (
          <p className="mt-2 text-sm font-black uppercase tracking-widest text-game-score">{t('win.newBest')}</p>
        )}
        {stars !== null && !newBest && previousBest !== null && previousBest > stars && (
          <p className="mt-2 text-sm font-sans font-semibold text-game-hint">{t('win.yourBest', { count: previousBest })}</p>
        )}
        <p className="mt-2 mb-6 font-sans font-semibold text-game-silver">
          {t('win.moves', { count: moves })}
          {best !== null && <span className="block text-sm">{t('game.best', { count: best })}</span>}
        </p>
        <button
          onClick={complete ? onHome : onPickNew}
          className="w-full h-14 rounded-2xl bg-game-btn hover:bg-game-btn-hover active:scale-95 transition-transform text-xl font-black"
        >
          {t(complete ? 'win.startJourney' : training ? 'win.trainingPlan' : 'win.pickNew')}
        </button>
        <div className="mt-3 flex gap-3">
          <button onClick={onRetry} className={secondary}>↻ {t('game.retry')}</button>
          {!complete && <button onClick={onHome} className={secondary}>⌂ {t('game.home')}</button>}
        </div>
      </div>
    </div>
  )
}
