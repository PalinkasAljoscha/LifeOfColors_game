import { useTranslation } from 'react-i18next'
import { playState } from '../engine/catalog.js'
import { bestStars } from '../engine/progress.js'
import { useProgress } from '../hooks/useProgress.js'
import { ConsentBannerSpacer } from './ConsentBanner.jsx'
import { inkOn, mixHex, palette } from '../theme.js'
import { HANDWRITING } from './TrainingNotes.jsx'
import { playableUpTo } from '../engine/castles.js'

// One level: every puzzle of the level as a tile in its name's
// colour (10 columns, publication order, so new puzzles appear at the end). Tapping a tile
// starts that puzzle. Tiles carry no label; the name is shown on the game screen.
// Solved puzzles show their best star rating (a check mark if the puzzle has no rating),
// puzzles only opened a small dot (engine/progress.js: this visit, or saved if the player
// opted in).
// Used for one castle (engine/castles.js): `state` = { stars, required, done }, shown as a bar
// towards opening `nextTitle` (the castle above; null for the last one).
// Training castle (state.training): the puzzles are a path to follow in order (TrainingPath):
// one bar per puzzle in the puzzle's colour (text dark or white, theme.js inkOn), one below the
// other, joined by down arrows -- a big title ("Introduction", then "Day One" .. "Day Five") over
// the puzzle's name.
// Won ones carry a small medal, the next one is framed in white, glows gently and has a "Start"
// button, the ones after it are faded (not playable yet). No progress
// bar: every puzzle has to be won, the path shows how far the player is.

// Down arrow between two training bars.
function DownArrow({ color }) {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
      <path d="M14 3 V22 M6 14 L14 22 L22 14" fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Puzzles with a special cell get a tile with a wavy white border, so players can find them.
// Only the drawing changes: the button around it keeps the full tile as its tap area.
export const isSpecial = (inst) => (inst.board?.special_cells?.length ?? 0) > 0

// Outline of the tile (viewBox 40 x 30): each edge cut into equal steps that bulge out / in
// alternately (quadratic curves), 6 along the long edges, 4 along the short ones.
function wavyPath() {
  const M = 2, AMP = 2.6, W = 40, H = 30
  const corners = [[M, M], [W - M, M], [W - M, H - M], [M, H - M]]
  const steps = [6, 4, 6, 4]
  let d = `M${corners[0][0]},${corners[0][1]}`
  let sign = 1
  for (let e = 0; e < 4; e++) {
    const [x0, y0] = corners[e], [x1, y1] = corners[(e + 1) % 4]
    const n = steps[e], dx = (x1 - x0) / n, dy = (y1 - y0) / n
    const len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len   // outward normal
    for (let k = 0; k < n; k++) {
      const cx = x0 + dx * (k + 0.5) + nx * AMP * sign, cy = y0 + dy * (k + 0.5) + ny * AMP * sign
      d += ` Q${cx.toFixed(2)},${cy.toFixed(2)} ${(x0 + dx * (k + 1)).toFixed(2)},${(y0 + dy * (k + 1)).toFixed(2)}`
      sign = -sign
    }
  }
  return d + ' Z'
}
const WAVY = wavyPath()

export function SpecialTile({ color }) {
  return (
    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 40 30" preserveAspectRatio="none" aria-hidden="true">
      <path d={WAVY} fill={color} stroke={palette.specialTileEdge} strokeOpacity="0.9" strokeWidth="1.5"
            strokeLinejoin="round" style={{ vectorEffect: 'non-scaling-stroke' }} />
    </svg>
  )
}

// Star badge / check mark / dot on a tile (solved with rating / solved / only opened).
export function TileMark({ state, best }) {
  if (state === 'solved' && best > 0) {
    return (
      <span className="min-w-4 h-4 px-0.5 rounded-full bg-black/80 ring-1 ring-white/70 text-game-star text-[9px]
                       font-black leading-none flex items-center justify-center gap-px" aria-hidden="true">
        {best}<span className="text-[8px]">★</span>
      </span>
    )
  }
  if (state === 'solved') {
    return (
      <span className="w-4 h-4 rounded-full bg-black/60 ring-1 ring-white/70 text-white text-[10px] leading-none
                       flex items-center justify-center" aria-hidden="true">✓</span>
    )
  }
  if (state === 'played') return <span className="w-2 h-2 rounded-full bg-black/55 ring-1 ring-white/70" aria-hidden="true" />
  return null
}

// Training castle: the puzzles in their fixed order, one card each, with arrows in between.
function TrainingPath({ pool, states, onPick }) {
  const { t } = useTranslation()
  const upTo = playableUpTo(pool, (_, i) => states[i] === 'solved')
  return (
    <ol className="mx-auto w-full max-w-xs px-2 pt-1 pb-4 flex flex-col items-stretch">
      {pool.map((inst, k) => {
        const solved = states[k] === 'solved'
        const locked = k > upTo
        const next = k === upTo && !solved
        const ink = inkOn(inst.name_color)
        // the step's title: "Introduction", then "Day One", "Day Two", ... (words; past five "Day 6")
        const heading = k === 0 ? t('levelScreen.intro')
          : t(`levelScreen.days.${k}`, { defaultValue: t('levelScreen.dayN', { n: k }) })
        return (
          <li key={inst.id} className="flex flex-col items-center">
            {k > 0 && (
              <span className={`my-1 ${locked ? 'opacity-30' : ''}`}>
                <DownArrow color={palette.silverGray} />
              </span>
            )}
            <button
              onClick={() => !locked && onPick(inst)}
              disabled={locked}
              className={`w-full min-h-[4.25rem] py-2 flex items-center gap-3 rounded-2xl pl-5 pr-3
                          text-left transition-transform ring-1 ring-inset ring-white/20
                          ${locked ? 'opacity-30 saturate-50 cursor-default' : 'active:scale-95'} ${next ? 'training-next' : ''}`}
              style={{
                background: inst.name_color, color: ink, '--pulse': palette.white,
                outline: next ? `3px solid ${palette.white}` : 'none', outlineOffset: '2px',
              }}
              aria-label={`${heading}: ${inst.name}${solved ? ' ✓' : ''}${locked ? ` (${t('castles.locked')})` : ''}`}
            >
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-2xl font-black">{heading}</span>
                <span className="block truncate text-sm font-bold opacity-80">
                  {inst.name}
                </span>
              </span>
              {/* won: a small medal */}
              {solved && <span className="shrink-0 text-2xl leading-none" aria-hidden="true">🏅</span>}
              {next && (
                <span className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-black bg-game-btn text-white" aria-hidden="true">
                  {t('levelScreen.start')}
                </span>
              )}
            </button>
          </li>
        )
      })}
      {/* the end of the path: the journey -- grey at first, a little brighter and more golden with
          every step won, fully golden when all are won; handwriting, as the notebook's title */}
      {pool.length > 0 && (() => {
        const f = pool.filter((_, k) => states[k] === 'solved').length / pool.length
        const colour = mixHex(palette.journeyDim, palette.journeyGold, f)
        return (
          <li className="flex flex-col items-center" aria-label={t('levelScreen.journey')}>
            <span className="my-1" style={{ opacity: 0.35 + 0.65 * f }}>
              <DownArrow color={colour} />
            </span>
            <p className="mt-1 whitespace-nowrap font-black text-center leading-tight"
               style={{ color: colour, opacity: 0.45 + 0.55 * f, fontSize: 'min(1.45rem, 5.6vw)',
                        fontFamily: HANDWRITING }}>
              {t('levelScreen.journey')}
            </p>
          </li>
        )
      })()}
    </ol>
  )
}

export default function LevelScreen({ title, nextTitle, state, pool, onPick, onBack, nudging = false }) {
  const { t } = useTranslation()
  useProgress()
  const states = pool.map(playState)
  const { stars, solved, required, done, training } = state
  const have = training ? solved : stars          // training: won puzzles; else stars
  const share = Math.min(1, have / required)

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-game-bg safe-pad">
      <div className="mx-auto w-full max-w-md">
        {/* training: the Home button alone on top, the title centred below it */}
        <div className={training ? 'flex flex-col' : 'flex items-center gap-3'}>
          <div className={training ? 'order-2 mt-3 mb-6 text-center' : 'min-w-0'}>
            <h1 className={`${training ? 'text-3xl' : 'text-2xl'} font-black leading-tight`}>{title}</h1>
            {!training && (
              <p className="text-xs text-game-silver font-sans font-semibold">{t('home.puzzleCount', { count: pool.length })}</p>
            )}
          </div>
          <button
            onClick={onBack}
            className="ml-auto h-12 px-4 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform
                       text-base font-black shrink-0"
          >
            {t('levelScreen.back')}
          </button>
        </div>

        {nextTitle && !training && (
          <div className="mt-3">
            <p className="text-sm font-sans font-bold">
              {training
                ? <span style={{ color: palette.correctGreen }}>✓ {solved}</span>
                : <span className="text-game-star">★ {stars}</span>}
              <span className="text-game-silver"> / {required} · </span>
              <span className={done ? 'text-white' : 'text-game-silver'}>
                {t(done ? 'castles.nextOpen' : 'castles.toOpen', { name: nextTitle })}
              </span>
            </p>
            <div className="mt-1.5 h-2.5 rounded-full bg-game-track overflow-hidden"
                 role="progressbar" aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(have, required)}>
              <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: done ? palette.correctGreen : palette.starGold }} />
            </div>
          </div>
        )}

        {!training && (
          <p className="mt-4 mb-2 text-sm text-game-silver font-sans font-semibold text-center">{t('levelScreen.choose')}</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {training ? <TrainingPath pool={pool} states={states} onPick={onPick} /> : (
        <div className="mx-auto w-full max-w-md grid grid-cols-10 gap-1.5 pt-1 pb-4">
          {pool.map((inst, i) => {
            const best = states[i] === 'solved' ? bestStars(inst.id) : null
            const special = isSpecial(inst)
            return (
            <button
              key={inst.id}
              onClick={() => onPick(inst)}
              className={`relative aspect-[4/3] active:scale-90 transition-transform flex items-center justify-center
                          ${special ? '' : 'rounded-md ring-1 ring-inset ring-white/20'}`}
              style={special ? undefined : { background: inst.name_color }}
              aria-label={states[i] === 'solved' ? `${inst.name} ✓${best ? ` ${'★'.repeat(best)}` : ''}` : inst.name}
              title={inst.name}
            >
              {special && <SpecialTile color={inst.name_color} />}
              <span className="relative"><TileMark state={states[i]} best={best} /></span>
            </button>
            )
          })}
        </div>
        )}
        <ConsentBannerSpacer nudge={nudging} />
      </div>
    </div>
  )
}
