import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n.js'
import { palette } from '../theme.js'
import { activeTheme, defaultLook } from '../themes.js'
import ThemeDecorations from './ThemeDecorations.jsx'
import { Emoji } from './Emoji.jsx'
import CastleMap from './CastleMap.jsx'
import RulesDialog from './RulesDialog.jsx'
import { ConsentBannerSpacer, ConsentDialog, ProgressSetting } from './ConsentBanner.jsx'
import { useProgress } from '../hooks/useProgress.js'

const theme = activeTheme()
// The theme's default look (first choice of every per-game choice: pumpkin, ghost, green candy).
const LOOK = defaultLook(theme)
const look = (v) => ({ background: palette[LOOK[v].fill], emoji: LOOK[v].emoji ?? null })

// Small decorative board: three colours and an empty cell, like the game itself (drawn in the
// active theme: colours, or emojis).
function Logo() {
  const cells = ['G', 'O', 'U', 'B', 'U', 'O', 'U', 'B', 'G']
  return (
    <div className="grid grid-cols-3 gap-0.5 w-12 h-12 shrink-0" aria-hidden="true">
      {cells.map((c, i) => {
        const { background, emoji } = look(c)
        return (
          <div key={i} className="rounded flex items-center justify-center text-[10px] leading-none" style={{ background }}>
            {emoji && <Emoji e={emoji} />}
          </div>
        )
      })}
    </div>
  )
}

// castleStates: per castle { castle, count, stars, required, done, unlocked } (engine/castles.js),
// or null while the catalog loads.
export default function HomeScreen({ castleStates, error, loadingCastle, onSelectCastle, nudging = false }) {
  const { t, i18n } = useTranslation()
  const [showRules, setShowRules] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  useProgress()   // re-render when progress or the storage choice changes

  return (
    <div className="h-[100dvh] w-full bg-game-bg">
      <ThemeDecorations name={theme.decorations} />
      <div className="safe-pad relative mx-auto max-w-md h-full flex flex-col">
        <header className="flex items-center gap-3 mb-3">
          <Logo />
          <div className="min-w-0">
            <h1 className="text-3xl font-black leading-none">{t('app.title')}</h1>
            {theme.tagline && (
              <p className="mt-1 text-xs font-black uppercase tracking-widest text-game-orange">{t(theme.tagline)}</p>
            )}
          </div>
          <div className="ml-auto flex flex-col items-end gap-1 shrink-0">
            <div className="flex gap-2">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => i18n.changeLanguage(code)}
                  className="text-sm font-black px-1"
                  style={{ opacity: i18n.language === code ? 1 : 0.4 }}
                  aria-label={label}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRules(true)}
              className="w-9 h-9 rounded-full bg-game-panel border-2 border-white/15 text-lg font-black text-game-score
                         active:scale-90 transition-transform"
              aria-haspopup="dialog"
              aria-label={t('rules.title')}
              title={t('rules.title')}
            >
              ?
            </button>
          </div>
        </header>

        {error && (
          <p className="rounded-xl bg-red-900/60 p-3 text-sm font-sans mb-3">{t('home.loadError')}</p>
        )}
        {!castleStates && !error && <p className="text-game-silver font-sans">{t('home.loading')}</p>}
        {castleStates && (
          <CastleMap states={castleStates} loadingCastle={loadingCastle} onSelect={onSelectCastle} />
        )}

        <footer className="pt-2 text-[10px] leading-snug text-game-hint font-sans shrink-0">
          {t('home.privacy')}
          <ProgressSetting onOpen={() => setShowConsent(true)} />
        </footer>
        {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
        {showConsent && <ConsentDialog onClose={() => setShowConsent(false)} />}
        <ConsentBannerSpacer nudge={nudging} />
      </div>
    </div>
  )
}
