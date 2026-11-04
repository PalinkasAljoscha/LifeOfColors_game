import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Emoji } from './Emoji.jsx'
import { palette } from '../theme.js'
import { NOTE_MAX_REPEAT as MAX_REPEAT } from '../engine/training.js'

// Training castle: a notebook with every transformation the player has observed in this puzzle
// (src/engine/training.js observation): the coloured neighbours of the changed cell -> its new
// state, e.g. 👻 👻 + 🕷️ -> 🍬.
//   NotebookPeek  the top of a closed spiral notebook at the bottom of the screen, "Rule
//                 Observations" on its label. Always looks the same (nothing of the notes shows);
//                 a tap opens the notebook. `bump` (a counter) makes it nod when a note lands on
//                 it (components/NoteFlight.jsx drops each new note onto it).
//   NotebookOpen  the open notebook: a page that slides up from the bottom of the screen with all
//                 notes; a tap anywhere slides it down again.
//   NoteCard      one note (a framed transformation), as in the notebook.

// Handwriting for the notebook's title: fonts already on the device (no font download -- the app
// makes no third-party requests). Segoe Print (Windows), Bradley Hand (macOS / iOS), else cursive.
const HANDWRITING = '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive'
const SLIDE_MS = 300   // the open page sliding up / down
const RINGS = 11       // spiral rings along the top edge

/** One cell state as this game's look draws it: its emoji, or a small colour square. */
export function CellToken({ state, look: looks, className = '' }) {
  const look = looks[state]
  if (!look) return null
  if (look.emoji) return <Emoji e={look.emoji} look={looks} className={className} />
  return (
    <span
      className={`inline-block w-[1em] h-[1em] rounded ring-1 ring-inset ring-white/25 align-[-0.15em] ${className}`}
      style={{ background: palette[look.fill] }}
      aria-hidden="true"
    />
  )
}

// Every object of a note sits in a slot (data-slot, see training.js flightSources), so the note
// animation can fly the board's objects to their places on the card.
// --slot-visibility (set on a card) hides them while the board's objects fly in.
const Slot = ({ name, children }) => (
  <span data-slot={name} className="inline-flex" style={{ visibility: 'var(--slot-visibility, visible)' }}>{children}</span>
)

function Group({ state, count, look }) {
  if (count > MAX_REPEAT) {
    return (
      <span className="whitespace-nowrap inline-flex items-center">
        {count}&thinsp;×&thinsp;<Slot name={`${state}0`}><CellToken state={state} look={look} /></Slot>
      </span>
    )
  }
  // gap: the object images overhang their slot a little (Emoji: 1.3em with -0.15em margins)
  return (
    <span className="whitespace-nowrap inline-flex items-center gap-[0.2em]">
      {Array.from({ length: count }, (_, i) => <Slot key={i} name={`${state}${i}`}><CellToken state={state} look={look} /></Slot>)}
    </span>
  )
}

export function Transformation({ obs, look }) {
  const { t } = useTranslation()
  const groups = ['O', 'B', 'G'].filter((s) => obs.counts[s] > 0)
  return (
    <>
      {groups.length === 0
        // no coloured neighbour at all: the "empty set" sign (its meaning as tooltip / for screen readers)
        ? <span className="px-0.5 opacity-80" title={t('training.nothing')} aria-label={t('training.nothing')} role="img">∅</span>
        : groups.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <span className="opacity-70">+</span>}
            <Group state={s} count={obs.counts[s]} look={look} />
          </span>
        ))}
      <span className="opacity-70 px-0.5">→</span>
      <Slot name="R"><CellToken state={obs.result} look={look} /></Slot>
    </>
  )
}

/** One note: the transformation in a thin frame, 1.6x the normal text (as in the notebook). */
export const NoteCard = forwardRef(function NoteCard({ obs, look, className = '', style = null }, ref) {
  return (
    <span ref={ref} className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-[1.6rem] leading-none
                                font-sans font-bold ${className}`}
          style={{ borderColor: palette.noteFrame, color: palette.noteInk, ...style }}>
      <Transformation obs={obs} look={look} />
    </span>
  )
})

// Spiral binding: a row of metal rings over the top edge (of the cover or the open page).
function Spiral() {
  return (
    <span className="absolute inset-x-4 -top-2 flex justify-between pointer-events-none" aria-hidden="true">
      {Array.from({ length: RINGS }, (_, i) => (
        <span key={i} className="relative w-2.5 h-5">
          {/* the punched hole, then the ring over it */}
          <span className="absolute left-0.5 bottom-0.5 w-1.5 h-1.5 rounded-full" style={{ background: palette.bookHole }} />
          <span className="absolute inset-x-0 top-0 h-4 rounded-full border-[3px]"
                style={{ borderColor: palette.bookRing, borderBottomColor: 'transparent' }} />
        </span>
      ))}
    </span>
  )
}

/** The top of the closed notebook at the bottom of the screen. The ref is the button (the note
 *  animation drops new notes onto it). */
export const NotebookPeek = forwardRef(function NotebookPeek({ onOpen, bump = 0 }, ref) {
  const { t } = useTranslation()
  return (
    // Only the top 3.25rem show; the rest of the notebook is "below the screen".
    <div className="mx-auto w-full max-w-md -mb-3 h-14 overflow-hidden flex justify-center pt-2.5 shrink-0">
      <button ref={ref} onClick={onOpen} aria-label={t('training.notes')} title={t('training.notes')}
              className="w-64 h-20 active:translate-y-0.5 transition-transform">
        <span key={bump} className={`relative block w-full h-full rounded-t-lg shadow-2xl ${bump ? 'book-bump' : ''}`}
              style={{ background: palette.bookCover }}>
          <Spiral />
          {/* the label with the title */}
          <span className="absolute left-1/2 top-3.5 -translate-x-1/2 whitespace-nowrap rounded px-3 py-0.5 text-sm"
                style={{ background: palette.notePaper, color: palette.noteInk, fontFamily: HANDWRITING }}>
            {t('training.notes')}
          </span>
        </span>
      </button>
    </div>
  )
})

const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** The open notebook: a page sliding up from the bottom of the screen with every note.
 *  open: wanted open; a tap anywhere calls onClose (it then slides down). */
export default function NotebookOpen({ open, notes, look, onClose }) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(open)
  const pageRef = useRef(null)
  const backRef = useRef(null)

  useEffect(() => {
    if (open) setShown(true)
  }, [open])

  // Slide up when shown, slide down (then unmount) when closed.
  useLayoutEffect(() => {
    if (!shown || !pageRef.current) return undefined
    const duration = reducedMotion() ? 1 : SLIDE_MS
    const frames = [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }]
    const fade = [{ opacity: 0 }, { opacity: 1 }]
    const opts = { duration, fill: 'forwards', easing: open ? 'ease-out' : 'ease-in' }
    const page = pageRef.current.animate(open ? frames : [...frames].reverse(), opts)
    const back = backRef.current?.animate(open ? fade : [...fade].reverse(), opts)
    if (!open) page.onfinish = () => setShown(false)
    return () => { page.cancel(); back?.cancel() }
  }, [shown, open])

  if (!shown) return null
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose} role="dialog"
         aria-label={t('training.notes')}>
      <div ref={backRef} className="absolute inset-0 bg-black/50" />
      <div ref={pageRef} className="relative w-full max-w-md mx-3 rounded-t-xl shadow-2xl"
           style={{ background: palette.notePaper, color: palette.noteInk, borderTop: `10px solid ${palette.bookCover}` }}>
        <Spiral />
        {/* the page scrolls inside, so the spiral rings above it stay visible */}
        <div className="pt-5 pb-6 px-4 max-h-[75dvh] overflow-y-auto">
          <h2 className="text-3xl mb-3" style={{ fontFamily: HANDWRITING }}>{t('training.notes')}</h2>
          {notes.length === 0
            ? <p className="text-lg italic opacity-70" style={{ fontFamily: HANDWRITING }}>{t('training.empty')}</p>
            : (
              <ul className="flex flex-wrap items-start gap-1.5">
                {notes.map((obs) => <li key={obs.key}><NoteCard obs={obs} look={look} /></li>)}
              </ul>
            )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
