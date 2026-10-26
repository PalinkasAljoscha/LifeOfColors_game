import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// "More" pop-up of the homepage: how a tap works (the neighbour concept). It deliberately never
// names the colours or symbols that can appear -- discovering them is part of the game -- so it
// is the same text in every theme. Closes on the button, a tap outside, or Escape.
const POINTS = ['rules.p1', 'rules.p2', 'rules.p3', 'rules.p4', 'rules.p5']

export default function RulesDialog({ onClose }) {
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
      aria-labelledby="rules-title"
      onClick={onClose}
    >
      <div
        className="pop-in w-full max-w-sm max-h-[85dvh] overflow-y-auto rounded-3xl bg-game-header border-2 border-white/15 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rules-title" className="text-2xl font-black text-game-score mb-4">{t('rules.title')}</h2>
        <ul className="flex flex-col gap-3 font-sans font-semibold text-sm leading-snug text-white/90">
          {POINTS.map((k) => (
            <li key={k} className="flex gap-2">
              <span className="text-game-score shrink-0" aria-hidden="true">•</span>
              <span>{t(k, { retry: t('game.retry') })}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          autoFocus
          className="mt-6 w-full h-12 rounded-2xl bg-game-btn hover:bg-game-btn-hover active:scale-95 transition-transform text-lg font-black"
        >
          {t('rules.close')}
        </button>
      </div>
    </div>
  )
}
