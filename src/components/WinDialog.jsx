import { useTranslation } from 'react-i18next'

export default function WinDialog({ moves, onRetry, onHome }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" role="dialog" aria-modal="true">
      <div className="pop-in w-full max-w-xs rounded-3xl bg-game-header border-2 border-white/15 p-6 text-center shadow-2xl">
        <h2 className="text-3xl font-black text-game-score">{t('win.title')}</h2>
        <p className="mt-2 mb-6 font-sans font-semibold text-game-silver">{t('win.moves', { count: moves })}</p>
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 h-14 rounded-2xl bg-game-btn hover:bg-game-btn-hover active:scale-95 transition-transform text-xl font-black"
          >
            ↻ {t('game.retry')}
          </button>
          <button
            onClick={onHome}
            className="flex-1 h-14 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform text-xl font-black"
          >
            ⌂ {t('game.home')}
          </button>
        </div>
      </div>
    </div>
  )
}
