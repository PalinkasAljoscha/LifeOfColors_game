import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n.js'
import { palette } from '../theme.js'

const DOTS = [palette.cellOrangeFill, palette.cellBlueFill, palette.cellGreenFill]

// Small decorative board: three colours and an empty cell, like the game itself.
function Logo() {
  const cells = ['G', 'O', 'U', 'B', 'U', 'O', 'U', 'B', 'G']
  const fill = { G: palette.cellGreenFill, O: palette.cellOrangeFill, B: palette.cellBlueFill, U: palette.cellUncolored }
  return (
    <div className="grid grid-cols-3 gap-1 w-16 h-16" aria-hidden="true">
      {cells.map((c, i) => (
        <div key={i} className="rounded-md" style={{ background: fill[c] }} />
      ))}
    </div>
  )
}

function LevelButton({ level, count, loading, disabled, onPress }) {
  const { t, i18n } = useTranslation()
  const noteKey = `levels.note${level}`
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 bg-game-panel border-2 border-white/10
                 active:scale-[0.98] hover:border-white/30 transition-all disabled:opacity-40 text-left"
    >
      <span className="flex gap-1 shrink-0" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="w-2.5 h-6 rounded-sm"
            style={{ background: i < level ? DOTS[i % 3] : 'rgba(255,255,255,0.12)' }}
          />
        ))}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xl font-black text-white leading-tight">{t(`levels.${level}`)}</span>
        <span className="block text-xs text-game-silver font-sans font-semibold">
          {t('home.puzzleCount', { count })}
        </span>
        {i18n.exists(noteKey) && (
          <span className="block text-xs text-game-hint font-sans font-semibold leading-snug">{t(noteKey)}</span>
        )}
      </span>
      <span className="text-2xl text-white/70 shrink-0">{loading ? '…' : '▶'}</span>
    </button>
  )
}

export default function HomeScreen({ levels, error, loadingLevel, onSelectLevel }) {
  const { t, i18n } = useTranslation()

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-game-bg">
      <div className="safe-pad mx-auto max-w-md min-h-full flex flex-col">
        <div className="flex justify-end gap-3">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => i18n.changeLanguage(code)}
              className="text-sm font-black px-1 py-1"
              style={{ opacity: i18n.language === code ? 1 : 0.4 }}
              aria-label={label}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        <header className="flex items-center gap-4 mt-4 mb-5">
          <Logo />
          <h1 className="text-4xl font-black leading-none">{t('app.title')}</h1>
        </header>

        <section className="rounded-2xl bg-game-header p-4 mb-6 font-sans">
          <p className="text-base font-semibold leading-snug text-white/90">{t('home.description')}</p>
        </section>

        <h2 className="text-sm uppercase tracking-widest text-game-silver mb-3">{t('home.chooseLevel')}</h2>

        {error && (
          <p className="rounded-xl bg-red-900/60 p-3 text-sm font-sans mb-3">{t('home.loadError')}</p>
        )}
        {!levels && !error && <p className="text-game-silver font-sans">{t('home.loading')}</p>}

        <div className="flex flex-col gap-3 pb-6">
          {levels?.map((l) => (
            <LevelButton
              key={l.level}
              level={l.level}
              count={l.count}
              loading={loadingLevel === l.level}
              disabled={loadingLevel !== null || l.count === 0}
              onPress={() => onSelectLevel(l.level)}
            />
          ))}
        </div>

        <footer className="mt-auto pt-2 text-[11px] leading-snug text-game-hint font-sans">
          {t('home.privacy')}
        </footer>
      </div>
    </div>
  )
}
