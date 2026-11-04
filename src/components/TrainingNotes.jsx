import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Emoji } from './Emoji.jsx'
import { palette } from '../theme.js'
import { NOTE_MAX_REPEAT as MAX_REPEAT } from '../engine/training.js'

// Training castle: a notebook with every transformation the player has observed in this puzzle
// (src/engine/training.js observation): the coloured neighbours of the changed cell -> its new
// state, e.g. 👻 👻 + 🕷️ -> 🍬.
//   NotebookPeek  the top of a closed spiral notebook right below the board (down to the screen
//                 bottom), "Rule Observations" on its label. Always looks the same (nothing of the notes shows);
//                 a tap opens the notebook. `bump` (a counter) makes it nod when a note lands on
//                 it (components/NoteFlight.jsx drops each new note onto it).
//   NotebookOpen  the open notebook: a page that slides up from the bottom of the screen with all
//                 notes; a tap anywhere slides it down again.
//   NoteCard      one note (a framed transformation), as in the notebook.

// Handwriting for the notebook's title: fonts already on the device (no font download -- the app
// makes no third-party requests). Segoe Print (Windows), Bradley Hand (macOS / iOS), else cursive.
export const HANDWRITING = '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive'
const SLIDE_MS = 300   // the open page sliding up / down
const RINGS = 11       // spiral rings along the top edge
const LABEL_FONT = '1.95rem'  // the closed notebook's title label (scaled down only if too wide)
const LABEL_SHARE = 0.92      // ... to at most this share of the cover's width

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

/** One note: the transformation in a 2px frame, 1.6x the normal text (as in the notebook). */
export const NoteCard = forwardRef(function NoteCard({ obs, look, className = '', style = null }, ref) {
  return (
    <span ref={ref} className={`flex items-center gap-1 rounded-md border-2 px-1.5 py-1 text-[1.6rem] leading-none
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

/** The top of the closed notebook, right below the board in training. It fills the free space
 *  down to the screen bottom (between a minimum and a maximum height); the rest of the notebook
 *  is "below the screen". The ref is the button (the note animation drops new notes onto it). */
export const NotebookPeek = forwardRef(function NotebookPeek({ onOpen, bump = 0, hidden = false }, ref) {
  const { t } = useTranslation()
  const title = t('training.notes')
  const labelRef = useRef(null)
  const [fit, setFit] = useState(1)   // label font scale (<= 1), so a long title still fits the cover
  const fitRef = useRef(1)
  // The label is drawn at LABEL_FONT; a title wider than LABEL_SHARE of the cover (long
  // translations, narrow phones) is scaled down to fit. Measured again on every resize.
  useLayoutEffect(() => {
    const label = labelRef.current
    if (!label) return undefined
    const measure = () => {
      const cover = label.parentElement.getBoundingClientRect().width
      const next = Math.min(1, (fitRef.current * cover * LABEL_SHARE) / label.getBoundingClientRect().width)
      if (Math.abs(next - fitRef.current) > 0.005) { fitRef.current = next; setFit(next) }
    }
    measure()   // runs again after each change of fit, until the width settles
    document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [title, fit])
  return (
    // grows 4x faster than the space above the board (GameScreen), so it takes most of the free
    // space; -mb-3: the cover runs into the screen's bottom padding (safe-pad), so it touches the edge
    // hidden: the notebook is open (NotebookOpen) -- the closed one is not shown meanwhile, so it
    // looks like this notebook opened (its place in the layout stays)
    <div style={{ visibility: hidden ? 'hidden' : 'visible' }}
         className="mx-auto w-full max-w-md -mb-3 grow-[4] basis-0 min-h-[5.5rem] max-h-[13rem] overflow-hidden flex justify-center pt-3">
      <button ref={ref} onClick={onOpen} aria-label={title} title={title}
              className="w-80 max-w-[85%] h-[14rem] active:translate-y-0.5 transition-transform">
        <span key={bump} className={`relative block w-full h-full rounded-t-xl shadow-2xl ${bump ? 'book-bump' : ''}`}
              style={{ background: palette.bookCover }}>
          <Spiral />
          {/* the label with the title, nearly as wide as the cover */}
          <span ref={labelRef}
                className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded-md px-[0.6em] py-[0.15em] leading-tight"
                style={{ background: palette.notePaper, color: palette.noteInk, fontFamily: HANDWRITING,
                         fontSize: `calc(${LABEL_FONT} * ${fit})` }}>
            {title}
          </span>
        </span>
      </button>
    </div>
  )
})

const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** The open notebook: a page sliding up from the bottom of the screen with every note.
 *  open: wanted open; a tap anywhere calls onClose (it then slides down). onShown(true | false):
 *  the page is on screen (from opening until it has slid down again). */
export default function NotebookOpen({ open, notes, look, onClose, onShown = () => {} }) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(open)
  const pageRef = useRef(null)
  const backRef = useRef(null)

  useEffect(() => {
    if (open) setShown(true)
  }, [open])
  // tell the game screen while the open notebook is on screen (it hides the closed one meanwhile)
  const onShownRef = useRef(onShown)
  onShownRef.current = onShown
  useEffect(() => { onShownRef.current(shown) }, [shown])

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
        {/* bottom padding: about half a note's height stays free below the last row, above the
            phone's home-indicator area (safe-area inset; the app uses viewport-fit=cover) */}
        <div className="pt-5 px-4 max-h-[75dvh] overflow-y-auto"
             style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
          <h2 className="text-3xl mb-3" style={{ fontFamily: HANDWRITING }}>{t('training.notes')}</h2>
          {/* no notes yet: just the empty page */}
          {notes.length > 0 && (
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
