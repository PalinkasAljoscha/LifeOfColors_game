import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n.js'
import { palette } from '../theme.js'
import { activeTheme, defaultLook } from '../themes.js'
import ThemeDecorations from './ThemeDecorations.jsx'
import { Emoji } from './Emoji.jsx'
import CastleMap from './CastleMap.jsx'
import RulesDialog from './RulesDialog.jsx'
import HistoryDialog, { HistoryIcon } from './HistoryDialog.jsx'
import { ConsentBannerSpacer, ConsentDialog } from './ConsentBanner.jsx'
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
// or null while the catalog loads; graph: the level graph (engine/levelGraph.js) the map is drawn
// from; review: every castle opened by ?map=all (a small note says so over the map). recent(): the recently played puzzles for the history pop-up
// ([{ inst, castleName }], newest first); onPlayRecent(inst) opens one of them.
export default function HomeScreen({ castleStates, graph, review = false, error, loadingCastle, onSelectCastle, recent, onPlayRecent, nudging = false }) {
  const { t, i18n } = useTranslation()
  const [showRules, setShowRules] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  useProgress()   // re-render when progress or the storage choice changes

  return (
    <div className="h-[100dvh] w-full bg-game-bg">
      <ThemeDecorations name={theme.decorations} />
      <div className="safe-pad relative mx-auto max-w-md h-full flex flex-col">
        <header className="flex items-center gap-3 mb-3">
          <Logo />
          <div className="min-w-0">
            <h1 className="text-3xl font-black leading-none text-game-orange">{t('app.title')}</h1>
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
            <div className="flex gap-2">
            {castleStates && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-9 h-9 rounded-full bg-game-panel border-2 border-white/15 text-game-score flex items-center
                           justify-center active:scale-90 transition-transform"
                aria-haspopup="dialog"
                aria-label={t('history.title')}
                title={t('history.title')}
              >
                <HistoryIcon />
              </button>
            )}
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
          </div>
        </header>

        {error && (
          <p className="rounded-xl bg-red-900/60 p-3 text-sm font-sans mb-3">{t('home.loadError')}</p>
        )}
        {!castleStates && !error && <p className="text-game-silver font-sans">{t('home.loading')}</p>}
        {review && castleStates && (
          <p className="mb-2 self-center rounded-full px-3 py-1 text-xs font-black bg-game-badge text-game-star">{t('castles.review')}</p>
        )}
        {castleStates && graph && (
          <CastleMap states={castleStates} graph={graph} review={review} loadingCastle={loadingCastle} onSelect={onSelectCastle} />
        )}

        {/* Privacy line; "opt in/out" opens the saved-progress choice (ConsentDialog). */}
        <footer className="pt-2 text-[11px] leading-snug text-game-hint font-sans shrink-0">
          {t('home.privacyBefore')}
          <button onClick={() => setShowConsent(true)} aria-haspopup="dialog"
                  className="underline underline-offset-2 font-bold text-game-silver">
            {t('home.privacyLink')}
          </button>
          {t('home.privacyAfter')}
        </footer>
        {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
        {showHistory && (
          <HistoryDialog recent={recent()} onPlay={(inst) => { setShowHistory(false); onPlayRecent(inst) }}
                         onClose={() => setShowHistory(false)} />
        )}
        {showConsent && <ConsentDialog onClose={() => setShowConsent(false)} />}
        <ConsentBannerSpacer nudge={nudging} />
      </div>
    </div>
  )
}
