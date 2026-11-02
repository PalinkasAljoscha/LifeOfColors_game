import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { playState } from '../engine/catalog.js'
import { bestStars } from '../engine/progress.js'
import { TileMark } from './LevelScreen.jsx'

// History pop-up of the homepage: the recently played puzzles (engine/progress.js recentlyPlayed,
// newest first, at most HISTORY_MAX), each a link that opens the puzzle again. `recent` =
// [{ inst, castleName }] (puzzles no longer in the catalog are left out by App). Closes on the
// button, a tap outside, or Escape.
export default function HistoryDialog({ recent, onPlay, onClose }) {
  const { t } = useTranslation()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
      onClick={onClose}
    >
      <div
        className="pop-in w-full max-w-sm max-h-[85dvh] flex flex-col rounded-3xl bg-game-header border-2 border-white/15 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="history-title" className="text-2xl font-black text-game-score mb-4">{t('history.title')}</h2>
        {recent.length === 0 ? (
          <p className="font-sans font-semibold text-sm text-game-silver">{t('history.empty')}</p>
        ) : (
          <ul className="flex-1 min-h-0 overflow-y-auto -mx-2 flex flex-col gap-1">
            {recent.map(({ inst, castleName }) => {
              const state = playState(inst)
              const best = state === 'solved' ? bestStars(inst.id) : null
              return (
                <li key={inst.id}>
                  <button
                    onClick={() => onPlay(inst)}
                    className="w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/5
                               active:scale-[0.98] transition-transform"
                  >
                    <span className="w-10 aspect-[4/3] shrink-0 rounded-md ring-1 ring-inset ring-white/20 flex items-center justify-center"
                          style={{ background: inst.name_color }} aria-hidden="true">
                      <TileMark state={state} best={best} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-black leading-tight truncate">{inst.name}</span>
                      <span className="block text-xs font-sans font-semibold text-game-silver truncate">{castleName}</span>
                    </span>
                    {best > 0 && (
                      <span className="ml-auto shrink-0 text-sm font-black text-game-star"
                            aria-label={'★'.repeat(best)}>{best}★</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <button
          onClick={onClose}
          autoFocus
          className="mt-5 w-full h-12 shrink-0 rounded-2xl bg-game-btn hover:bg-game-btn-hover active:scale-95 transition-transform text-lg font-black"
        >
          {t('history.close')}
        </button>
      </div>
    </div>
  )
}

// Circled arrow (history): an open circle with an arrow head, around clock hands. Drawn in the
// current text colour.
export function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M6.7 2.8v3.9h3.9" />
      <path d="M12 8.2V12l2.6 1.8" />
    </svg>
  )
}
