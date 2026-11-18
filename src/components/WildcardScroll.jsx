import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../theme.js'
import { siteFor, siteName } from '../sites.js'
import WildcardCard from './WildcardCard.jsx'

// The wildcard scroll (src/wildcards.js): opened by any wildcard card on the map. A parchment
// scroll, rolled at top and bottom, titled "Wildcard" (the same word in every language), with the
// rule (win with the minimum number of moves -- the same as a 5-star win; the place and every place
// on the rows below it open; unlimited tries) and one entry per wildcard whose place is still
// locked: the place's picture, name and level (the number of moves shows on the game screen). Picking
// one starts its challenge (onPick(level)). Closes on the button, a tap outside, or Escape.
const PICTURES = import.meta.glob(['../assets/sites/*.svg', '!../assets/sites/*-land.svg', '!../assets/sites/*-locked.svg'],
  { eager: true, import: 'default' })

function Roll() {
  return (
    <div className="relative h-5 -mx-3 rounded-full shadow-md" aria-hidden="true"
         style={{ background: `linear-gradient(${palette.scrollRollLight}, ${palette.scrollRoll} 55%, ${palette.scrollRollDark})` }}>
      <span className="absolute -left-1.5 top-0.5 h-4 w-3 rounded-full" style={{ background: palette.scrollRollDark }} />
      <span className="absolute -right-1.5 top-0.5 h-4 w-3 rounded-full" style={{ background: palette.scrollRollDark }} />
    </div>
  )
}

export default function WildcardScroll({ wildcards, onPick, onClose }) {
  const { t } = useTranslation()
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" role="dialog" aria-modal="true"
         aria-labelledby="wildcard-title" onClick={onClose}>
      <div className="pop-in w-full max-w-sm max-h-[88dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <Roll />
        <div className="min-h-0 flex flex-col px-5 pt-4 pb-5 shadow-2xl"
             style={{ background: palette.scrollPaper, color: palette.scrollInk }}>
          <div className="flex items-center justify-center gap-3">
            <WildcardCard width={30} style={{ transform: 'rotate(-10deg)' }} />
            <h2 id="wildcard-title" className="text-3xl font-black">{t('wildcard.title')}</h2>
            <WildcardCard width={30} style={{ transform: 'rotate(10deg)' }} />
          </div>
          <p className="mt-3 text-sm font-sans font-semibold leading-snug text-center">{t('wildcard.rule')}</p>
          <ul className="mt-4 flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
            {wildcards.map(({ level }) => (
              <li key={level}>
                <button onClick={() => onPick(level)}
                        className="w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left active:scale-[0.98] transition-transform"
                        style={{ background: palette.scrollEntry, border: `1.5px solid ${palette.scrollEdge}` }}>
                  <img src={PICTURES[`../assets/sites/${siteFor(level)}.svg`]} alt="" draggable="false" className="h-11 w-auto shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-black leading-tight truncate">{siteName(t, level)}</span>
                    <span className="block text-xs font-sans font-bold opacity-70">{t('levelScreen.level', { n: level })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button onClick={onClose} autoFocus
                  className="mt-4 h-11 shrink-0 rounded-2xl font-black active:scale-95 transition-transform"
                  style={{ background: palette.scrollEdge, color: palette.scrollPaper }}>
            {t('wildcard.close')}
          </button>
        </div>
        <Roll />
      </div>
    </div>
  )
}
