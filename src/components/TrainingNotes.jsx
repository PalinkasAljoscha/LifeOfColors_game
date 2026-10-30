import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Emoji } from './Emoji.jsx'
import { palette } from '../theme.js'

// Training castle: a paper note of every transformation the player has observed in this puzzle
// (src/engine/training.js observation): the coloured neighbours of the changed cell -> its new
// state, e.g. 👻 👻 + 🕷️ -> 🍬. New transformations are added at the end; one already on the note
// is highlighted. `last` = { key, n } of the latest move (n changes on every move, so a repeat
// highlights again).

const MAX_REPEAT = 3   // up to 3 neighbours of one kind are drawn one by one, more as "4 ×"

/** One cell state as this game's look draws it: its emoji, or a small colour square. */
export function CellToken({ state, look: looks, className = '' }) {
  const look = looks[state]
  if (!look) return null
  if (look.emoji) return <Emoji e={look.emoji} look={looks} className={className} />
  return (
    <span
      className={`inline-block w-4 h-4 rounded ring-1 ring-inset ring-white/25 align-[-2px] ${className}`}
      style={{ background: palette[look.fill] }}
      aria-hidden="true"
    />
  )
}

function Group({ state, count, look }) {
  if (count > MAX_REPEAT) {
    return <span className="whitespace-nowrap">{count}&thinsp;×&thinsp;<CellToken state={state} look={look} /></span>
  }
  return (
    <span className="whitespace-nowrap">
      {Array.from({ length: count }, (_, i) => <CellToken key={i} state={state} look={look} />)}
    </span>
  )
}

function Transformation({ obs, look }) {
  const { t } = useTranslation()
  const groups = ['O', 'B', 'G'].filter((s) => obs.counts[s] > 0)
  return (
    <>
      {groups.length === 0
        ? <span className="text-xs italic opacity-70">{t('training.nothing')}</span>
        : groups.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <span className="opacity-70">+</span>}
            <Group state={s} count={obs.counts[s]} look={look} />
          </span>
        ))}
      <span className="opacity-70 px-0.5">→</span>
      <CellToken state={obs.result} look={look} />
    </>
  )
}

export default function TrainingNotes({ notes, last, look }) {
  const { t } = useTranslation()
  const listRef = useRef(null)

  // Keep the latest entry in view (the note scrolls once it is full).
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-last="true"]')
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [last])

  return (
    <div className="mx-auto w-full max-w-md mt-2 px-1">
      <div
        className="note-in rounded-sm shadow-lg font-sans font-bold text-base"
        style={{
          background: palette.notePaper,
          color: palette.noteInk,
          backgroundImage: `linear-gradient(to right, transparent 22px, ${palette.noteMargin} 22px, ${palette.noteMargin} 23px, transparent 23px),
                            repeating-linear-gradient(to bottom, transparent 0, transparent 27px, ${palette.noteLine} 27px, ${palette.noteLine} 28px)`,
        }}
      >
        <div className="pl-8 pr-3 pt-1.5 text-xs uppercase tracking-wide opacity-70">{t('training.notes')}</div>
        <ul ref={listRef} className="pl-7 pr-2 pb-2 pt-0.5 flex flex-wrap gap-x-3 gap-y-1 max-h-28 overflow-y-auto">
          {notes.map((obs) => {
            const isLast = last?.key === obs.key
            return (
              <li key={obs.key} data-last={isLast ? 'true' : 'false'}>
                {/* key = the move counter: a repeated transformation re-mounts and flashes again */}
                <span
                  key={isLast ? last.n : 0}
                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${isLast ? 'note-flash' : ''}`}
                  style={isLast ? { background: palette.noteHighlight } : null}
                >
                  <Transformation obs={obs} look={look} />
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
