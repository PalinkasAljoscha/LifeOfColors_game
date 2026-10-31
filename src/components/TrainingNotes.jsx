import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Emoji } from './Emoji.jsx'
import { palette } from '../theme.js'

// Training castle: a scroll with every transformation the player has observed in this puzzle
// (src/engine/training.js observation): the coloured neighbours of the changed cell -> its new
// state, e.g. 👻 👻 + 🕷️ -> 🍬.
//   RolledNotes  the rolled-up scroll below the board. Always looks the same (nothing of the notes
//                shows); a tap opens it.
//   NotesScroll  opens and closes the scroll over the middle of the board: after every move that
//                changes a cell (the new transformation is added, or highlighted if already noted)
//                and on a tap on the rolled scroll. Opening: the rolled scroll flies from below the
//                board to the board's middle, growing to display size; there it becomes the two
//                rods touching each other, which then move apart and unroll the written paper.
//                Closing: the exact reverse. A tap anywhere on the open scroll closes it.

const MAX_REPEAT = 3   // up to 3 neighbours of one kind are drawn one by one, more as "4 ×"
// Handwriting for the scroll's title: fonts already on the device (no font download -- the app
// makes no third-party requests). Segoe Print (Windows), Bradley Hand (macOS / iOS), else cursive.
const HANDWRITING = '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive'
const ROLL_W = 176     // size of the rolled scroll's picture in px (it is scaled up when flying)
const ROLL_H = 32
const FLY_MS = 380     // flight from below the board to its middle (and back)
const UNROLL_MS = 280  // the rods moving apart (unrolling) and together again (rolling up)
const OPEN_MAX_W = 448 // width of the open scroll: the board's width minus 32 px, at most this

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
        // no coloured neighbour at all: the "empty set" sign (its meaning as tooltip / for screen readers)
        ? <span className="px-0.5 opacity-80" title={t('training.nothing')} aria-label={t('training.nothing')} role="img">∅</span>
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

// Wooden rod with round knobs at both ends (top and bottom of the unrolled scroll).
function Rod() {
  const knob = { background: `radial-gradient(circle at 35% 35%, ${palette.noteRod}, ${palette.noteRodDark})` }
  return (
    <div className="relative mx-3 h-3.5 rounded-full shadow"
         style={{ background: `linear-gradient(to bottom, ${palette.noteRod}, ${palette.noteRodDark})` }}>
      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full" style={knob} />
      <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full" style={knob} />
    </div>
  )
}

/** The picture of the rolled-up scroll (ROLL_W x ROLL_H px), used below the board and in flight. */
function RollPicture() {
  const knob = { background: `radial-gradient(circle at 35% 35%, ${palette.noteRod}, ${palette.noteRodDark})` }
  return (
    <span className="relative block" style={{ width: ROLL_W, height: ROLL_H }}>
      {/* the rolled paper: a cylinder */}
      <span className="absolute inset-y-0 left-3 right-3 rounded-full shadow-lg"
            style={{ background: `linear-gradient(to bottom, ${palette.notePaperShade} 0%, ${palette.notePaper} 30%, ${palette.notePaper} 55%, ${palette.notePaperShade} 100%)` }} />
      {/* the edge of the outer paper layer */}
      <span className="absolute top-1 bottom-1 left-[45%] w-px" style={{ background: palette.noteLine }} />
      {/* ribbon with a wax seal */}
      <span className="absolute inset-y-0 left-[60%] w-2" style={{ background: palette.noteSeal }} />
      <span className="absolute top-1/2 left-[60%] -translate-y-1/2 -translate-x-1 w-4 h-4 rounded-full shadow"
            style={{ background: `radial-gradient(circle at 35% 35%, ${palette.noteSeal}, ${palette.noteSealDark})` }} />
      {/* rod ends */}
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-5 rounded-full" style={knob} />
      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-5 rounded-full" style={knob} />
    </span>
  )
}

/** The rolled-up scroll below the board (always the same picture). `hidden` keeps its space.
 *  The ref is the button (NotesScroll flies from / back to it). */
export const RolledNotes = forwardRef(function RolledNotes({ hidden, onOpen }, ref) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-md mt-2 flex justify-center" style={{ visibility: hidden ? 'hidden' : 'visible' }}>
      <button ref={ref} onClick={onOpen} aria-label={t('training.notes')} title={t('training.notes')}
              className="active:scale-95 transition-transform">
        <RollPicture />
      </button>
    </div>
  )
})

const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** The scroll over the middle of the board (place it inside the board's relative box).
 *  open: wanted open; highlight: flash the entry of the latest move (`last` = { key, n });
 *  boardRef / rollRef: the board's box and the rolled scroll's button (start and end of the
 *  flight); onClosed: called once the scroll is back below the board. */
export default function NotesScroll({ open, notes, last, highlight, look, onClose, onClosed, boardRef, rollRef }) {
  const { t } = useTranslation()
  // 'closed' -> 'flyIn' -> 'opening' (unrolling) -> 'open' -> 'closing' (rolling up) -> 'flyOut' -> 'closed'
  const [phase, setPhase] = useState('closed')
  const [fly, setFly] = useState(null)           // { dir: 'in' | 'out', ex, ey, dx, dy, k } during a flight
  const openRef = useRef(open)
  openRef.current = open
  const flyRef = useRef(null)
  const listRef = useRef(null)

  // Flight geometry: centre of the rolled scroll below the board -> centre of the board, where it
  // is k times as large (as wide as the open scroll).
  function startFly(dir) {
    const b = boardRef?.current?.getBoundingClientRect()
    const r = rollRef?.current?.getBoundingClientRect()
    if (!b || !r) {                       // nothing to fly between: switch directly
      setPhase(dir === 'in' ? 'open' : 'closed')
      if (dir === 'out') onClosed?.()
      return
    }
    const ex = b.left + b.width / 2
    const ey = b.top + b.height / 2
    const k = Math.max(1, Math.min(b.width - 32, OPEN_MAX_W) / ROLL_W)
    setFly({ dir, ex, ey, dx: r.left + r.width / 2 - ex, dy: r.top + r.height / 2 - ey, k })
    setPhase(dir === 'in' ? 'flyIn' : 'flyOut')
  }

  useEffect(() => {
    if (open && phase === 'closed') startFly('in')
    else if (!open && phase === 'open') setPhase('closing')
  }, [open, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Unrolling / rolling up: the paper between the rods grows from 0 to its full height (or back).
  useLayoutEffect(() => {
    if ((phase !== 'opening' && phase !== 'closing') || !listRef.current) return undefined
    const el = listRef.current
    const full = `${el.getBoundingClientRect().height}px`
    const frames = phase === 'opening' ? [{ height: '0px' }, { height: full }] : [{ height: full }, { height: '0px' }]
    const anim = el.animate(frames, {
      duration: reducedMotion() ? 1 : UNROLL_MS,
      easing: phase === 'opening' ? 'ease-out' : 'ease-in',
      fill: phase === 'closing' ? 'forwards' : 'none',
    })
    anim.onfinish = () => {
      if (phase === 'opening') setPhase(openRef.current ? 'open' : 'closing')
      else if (openRef.current) setPhase('opening')   // opened again while rolling up
      else startFly('out')
    }
    return () => anim.cancel()
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!fly || !flyRef.current) return undefined
    const frames = [
      { transform: `translate(${fly.dx}px, ${fly.dy}px) scale(1)` },
      { transform: `translate(0px, 0px) scale(${fly.k})` },
    ]
    const anim = flyRef.current.animate(fly.dir === 'in' ? frames : frames.reverse(),
      { duration: reducedMotion() ? 1 : FLY_MS, easing: 'ease-in-out', fill: 'forwards' })
    anim.onfinish = () => {
      setFly(null)
      if (fly.dir === 'in') {
        if (openRef.current) setPhase('opening')
        else startFly('out')              // closed again while flying in
      } else if (openRef.current) {
        startFly('in')                    // opened again while flying back
      } else {
        setPhase('closed')
        onClosed?.()
      }
    }
    return () => anim.cancel()
  }, [fly]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the latest entry in view (the paper scrolls once it is full).
  useEffect(() => {
    if (phase !== 'open') return
    const el = listRef.current?.querySelector('[data-last="true"]')
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [phase, last])

  const flying = fly && createPortal(
    <div
      ref={flyRef}
      aria-hidden="true"
      style={{
        position: 'fixed', left: fly.ex - ROLL_W / 2, top: fly.ey - ROLL_H / 2, width: ROLL_W, height: ROLL_H,
        zIndex: 40, pointerEvents: 'none',
        transform: fly.dir === 'in' ? `translate(${fly.dx}px, ${fly.dy}px) scale(1)` : `scale(${fly.k})`,
      }}
    >
      <RollPicture />
    </div>,
    document.body,
  )

  if (phase !== 'opening' && phase !== 'open' && phase !== 'closing') return flying || null
  const moving = phase !== 'open'
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center px-4" onClick={onClose} role="dialog"
         aria-label={t('training.notes')}>
      <div className="flex flex-col w-full max-w-md max-h-full py-2">
        <Rod />
        <div
          ref={listRef}
          className={`min-h-0 mx-4 ${moving ? 'overflow-hidden' : 'overflow-y-auto'} shadow-xl font-sans font-bold`}
          style={{ background: palette.notePaper, color: palette.noteInk, maxHeight: '26rem' }}
        >
          <div className="px-3 pt-2 text-2xl" style={{ fontFamily: HANDWRITING }}>{t('training.notes')}</div>
          {notes.length === 0
            ? <p className="px-3 pb-3 pt-1 text-lg italic opacity-70" style={{ fontFamily: HANDWRITING }}>{t('training.empty')}</p>
            : (
              // Notes 1.6x the normal text size, several per line, each in a thin frame.
              <ul className="px-2 pb-3 pt-1 flex flex-wrap items-start gap-1.5 text-[1.6rem] leading-none">
                {notes.map((obs) => {
                  const isLast = highlight && last?.key === obs.key
                  return (
                    <li key={obs.key} data-last={isLast ? 'true' : 'false'}>
                      {/* key = the move counter: a repeated transformation re-mounts and flashes again */}
                      <span
                        key={isLast ? last.n : 0}
                        className={`flex items-center gap-1 rounded-md border px-1.5 py-1 ${isLast ? 'note-flash' : ''}`}
                        style={{ borderColor: palette.noteFrame, background: isLast ? palette.noteHighlight : 'transparent' }}
                      >
                        <Transformation obs={obs} look={look} />
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
        </div>
        <Rod />
      </div>
    </div>
  )
}
