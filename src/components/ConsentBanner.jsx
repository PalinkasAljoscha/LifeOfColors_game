import { useTranslation } from 'react-i18next'
import { CONSENT_DENIED, CONSENT_GRANTED, setStorageConsent, storageConsent } from '../engine/progress.js'
import { useProgress } from '../hooks/useProgress.js'

// Opt-in for saving progress in this browser (engine/progress.js). Nothing is stored across
// visits before the player says yes; both answers are equally easy, and the choice can be changed
// at any time (ProgressSetting at the bottom of the home page).

function Choice({ onDone }) {
  const { t } = useTranslation()
  const choose = (value) => {
    setStorageConsent(value)
    onDone?.()
  }
  const btn = 'flex-1 h-12 rounded-2xl active:scale-95 transition-transform text-base font-black font-game'
  return (
    <div className="mt-3 flex gap-3">
      <button onClick={() => choose(CONSENT_DENIED)} className={`${btn} bg-game-panel border-2 border-white/15`}>
        {t('consent.decline')}
      </button>
      <button onClick={() => choose(CONSENT_GRANTED)} className={`${btn} bg-game-btn hover:bg-game-btn-hover`}>
        {t('consent.accept')}
      </button>
    </div>
  )
}

/** First-visit banner at the bottom of the screen (not blocking: the game can be played without
 *  answering -- progress then stays for this visit only). Renders nothing once answered. */
export default function ConsentBanner() {
  const { t } = useTranslation()
  useProgress()
  if (storageConsent() !== null) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pointer-events-none" role="region" aria-label={t('consent.title')}>
      <div className="pop-in pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-game-header border-2 border-white/15
                      p-4 shadow-2xl font-sans">
        <h2 className="text-lg font-black font-game text-white">{t('consent.title')}</h2>
        <p className="mt-1 text-sm font-semibold leading-snug text-game-silver">{t('consent.body')}</p>
        <Choice />
      </div>
    </div>
  )
}

/** Empty space at the end of a scrolling screen while the banner is open, so the banner never
 *  hides the last level button or puzzle tiles. */
export function ConsentBannerSpacer() {
  useProgress()
  return storageConsent() === null ? <div className="h-52 shrink-0" aria-hidden="true" /> : null
}

/** Dialog to change the choice later (opened from ProgressSetting). */
export function ConsentDialog({ onClose }) {
  const { t } = useTranslation()
  useProgress()
  const on = storageConsent() === CONSENT_GRANTED
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" role="dialog" aria-modal="true"
         onClick={onClose}>
      <div className="pop-in w-full max-w-xs rounded-3xl bg-game-header border-2 border-white/15 p-5 shadow-2xl font-sans"
           onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-black font-game text-white">{t('consent.title')}</h2>
        <p className="mt-1 text-sm font-semibold leading-snug text-game-silver">{t('consent.body')}</p>
        <p className="mt-3 text-sm font-black text-white">{t(on ? 'consent.statusOn' : 'consent.statusOff')}</p>
        {on && <p className="mt-1 text-xs font-semibold leading-snug text-game-hint">{t('consent.declineDeletes')}</p>}
        <Choice onDone={onClose} />
      </div>
    </div>
  )
}

/** One line for the home page footer: the current choice and a "Change" button. */
export function ProgressSetting({ onOpen }) {
  const { t } = useTranslation()
  useProgress()
  const c = storageConsent()
  return (
    <p className="text-[11px] leading-snug text-game-hint font-sans">
      {t(c === CONSENT_GRANTED ? 'consent.statusOn' : 'consent.statusOff')}{' · '}
      <button onClick={onOpen} className="underline underline-offset-2 font-bold text-game-silver px-0.5" aria-haspopup="dialog">
        {t('consent.change')}
      </button>
    </p>
  )
}
