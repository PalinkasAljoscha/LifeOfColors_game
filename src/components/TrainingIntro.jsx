import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CellToken } from './TrainingNotes.jsx'
import { CELL, GAP, PAD, boardCanvasSize } from '../game/GameScene.js'
import { introExampleCell, neighbourCells, noteCardPlace } from '../engine/training.js'
import { palette } from '../theme.js'

// The first training puzzle starts with four short explanations, one after the other, each a
// speech bubble next to what it talks about (never over it; on the board via engine/training.js
// noteCardPlace, the last one right above the notebook):
//   1. tap      a ring around an example field: "Tap a field to try transforming it."
//   2. hood     the example field's neighbours glow inside a frame around its neighbourhood:
//               "The neighbours of a field decide how it transforms."
//   3. goal     a ring around the gold-framed goal field: "To win, get a <goal object> there."
//   4. notes    a ring around the closed notebook below the board: observed rules are noted
//               there; then a hint (light bulb, lighter text): read them to find a way to the goal.
// "Next" (or a tap on the board) goes on; after the last one onDone() and the puzzle starts.
// GameScreen blocks the board while this runs (taps on the board only go to the next step).
const STEPS = ['tap', 'hood', 'goal', 'notes']

export default function TrainingIntro({ instance, look, boardRef, notesRef, step, onNext }) {
  const { t } = useTranslation()
  const [geo, setGeo] = useState(null)       // cells in page px (from the board's canvas)
  const [bubble, setBubble] = useState(null) // measured size of the bubble { width, height }
  const bubbleRef = useRef(null)
  const kind = STEPS[step]

  // The board's geometry: once the canvas is up, and again on every resize.
  useEffect(() => {
    let frame = 0
    const measure = () => {
      const canvas = boardRef.current?.querySelector('canvas')
      const rect = canvas?.getBoundingClientRect()
      if (!rect || rect.width === 0) { frame = requestAnimationFrame(measure); return }
      const k = rect.width / boardCanvasSize(instance).width
      const size = (CELL - GAP) * k
      const cell = (r, c) => ({ x: rect.left + (PAD + c * CELL + CELL / 2) * k, y: rect.top + (PAD + r * CELL + CELL / 2) * k })
      const box = (cells) => ({
        left: Math.min(...cells.map((p) => p.x)) - size / 2, right: Math.max(...cells.map((p) => p.x)) + size / 2,
        top: Math.min(...cells.map((p) => p.y)) - size / 2, bottom: Math.max(...cells.map((p) => p.y)) + size / 2,
      })
      const { rows, cols } = instance.board
      const [er, ec] = introExampleCell(instance)
      const neighbours = neighbourCells(er, ec, rows, cols).map(([r, c]) => cell(r, c))
      const example = cell(er, ec)
      const goal = cell(...instance.goal.at)
      // the notebook's cover, as far as it is on screen
      const book = notesRef?.current?.getBoundingClientRect()
      const notes = book && { left: book.left, right: book.right, top: book.top, bottom: Math.min(book.bottom, window.innerHeight) }
      setGeo({
        size, example, neighbours, goal, notes,
        hood: box([example, ...neighbours]),
        board: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', measure) }
  }, [boardRef, notesRef, instance])

  // The bubble's size, measured on each step (its text changes), for its placement.
  useLayoutEffect(() => {
    setBubble(null)
  }, [step, geo])
  useLayoutEffect(() => {
    if (bubble || !bubbleRef.current) return
    const r = bubbleRef.current.getBoundingClientRect()
    setBubble({ width: r.width, height: r.height })
  }, [bubble, geo])

  if (!geo || !kind) return null
  const { size } = geo
  // what the bubble must not cover, and where its arrow points
  const target = kind === 'hood' ? geo.hood : kind === 'notes' ? geo.notes
    : (() => { const p = kind === 'goal' ? geo.goal : geo.example
      return { left: p.x - size / 2, right: p.x + size / 2, top: p.y - size / 2, bottom: p.y + size / 2 } })()
  const place = !bubble ? null
    : kind === 'notes' ? notesPlace(geo.notes, bubble, geo.board)
      : noteCardPlace(target, bubble, geo.board, 14)
  const ring = (p, color) => (
    <span className="absolute rounded-xl intro-pulse"
          style={{ left: p.x - size / 2 - 4, top: p.y - size / 2 - 4, width: size + 8, height: size + 8,
                   border: `${Math.max(3, size * 0.06)}px solid ${color}` }} />
  )
  // The text, with the goal object drawn inline in step 3 ({{goal}} in the string).
  const MARK = '\u0000'
  const withGoal = (key) => t(key, { goal: MARK, interpolation: { escapeValue: false } }).split(MARK)
    .map((part, i) => (
      <span key={i}>
        {i > 0 && <CellToken state={instance.goal.color} look={look} className="mx-0.5" />}
        {part}
      </span>
    ))
  const last = step === STEPS.length - 1
  // the arrow: from the bubble's edge towards the target, at the target's centre (kept on the bubble)
  const arrowX = place && Math.min(Math.max((target.left + target.right) / 2, place.x - bubble.width / 2 + 18),
    place.x + bubble.width / 2 - 18)

  return createPortal(
    <div className="fixed inset-0 z-30 pointer-events-none">
      {kind === 'tap' && ring(geo.example, palette.noteGlow)}
      {kind === 'hood' && (
        <>
          {geo.neighbours.map((p, i) => (
            <span key={i} className="absolute rounded-xl note-glow"
                  style={{ left: p.x - size / 2, top: p.y - size / 2, width: size, height: size, background: palette.noteGlow }} />
          ))}
          <span className="absolute rounded-2xl intro-pulse"
                style={{ left: geo.hood.left - 5, top: geo.hood.top - 5, width: geo.hood.right - geo.hood.left + 10,
                         height: geo.hood.bottom - geo.hood.top + 10, border: `3px dashed ${palette.noteGlow}` }} />
          {ring(geo.example, palette.noteGlow)}
        </>
      )}
      {kind === 'goal' && ring(geo.goal, palette.noteGlow)}
      {kind === 'notes' && geo.notes && (
        <span className="absolute rounded-t-2xl intro-pulse"
              style={{ left: geo.notes.left - 6, top: geo.notes.top - 14, width: geo.notes.right - geo.notes.left + 12,
                       height: geo.notes.bottom - geo.notes.top + 20, border: `4px solid ${palette.noteGlow}`, borderBottom: 'none' }} />
      )}

      {/* the speech bubble: invisible until measured and placed */}
      <div key={step} ref={bubbleRef} role="dialog" aria-live="polite"
           className={`absolute pointer-events-auto rounded-2xl shadow-2xl px-4 pt-3 pb-3 font-sans ${place ? 'note-card-in' : ''}`}
           style={{
             left: place ? place.x : 0, top: place ? place.y : 0,
             transform: place ? 'translate(-50%, -50%)' : 'none', visibility: place ? 'visible' : 'hidden',
             width: `min(19rem, ${Math.round(geo.board.right - geo.board.left - 8)}px)`,
             background: palette.notePaper, color: palette.noteInk,
           }}>
        {place && (
          <span className="absolute w-4 h-4 rotate-45"
                style={{ left: arrowX - (place.x - bubble.width / 2) - 8, background: palette.notePaper,
                         ...(place.side === 'above' ? { bottom: -7 } : { top: -7 }) }} />
        )}
        <p className="relative text-xl font-bold leading-snug">{withGoal(`intro.${kind}`)}</p>
        {/* step 4: a hint (light bulb, lighter text) after the explanation */}
        {kind === 'notes' && (
          <p className="relative mt-1.5 text-lg font-medium italic leading-snug">
            <span aria-hidden="true" className="mr-1">💡</span>{withGoal('intro.notesHint')}
          </p>
        )}
        <div className="relative mt-2.5 flex items-center justify-between">
          <span className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s} className="w-2 h-2 rounded-full"
                    style={{ background: palette.noteInk, opacity: i === step ? 0.9 : 0.25 }} />
            ))}
          </span>
          <button onClick={onNext}
                  className="rounded-xl px-4 py-1.5 text-lg font-bold active:scale-95 transition-transform"
                  style={{ background: palette.noteHighlight, color: palette.noteInk }}>
            {t(last ? 'intro.start' : 'intro.next')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export const INTRO_STEPS = STEPS.length

// Step 4's bubble: right above the notebook (its spiral rings included), centred on it but kept
// within the board's width.
function notesPlace(notes, bubble, board) {
  if (!notes) return { x: (board.left + board.right) / 2, y: board.bottom - bubble.height / 2, side: 'above' }
  const halfW = bubble.width / 2
  const x = Math.min(Math.max((notes.left + notes.right) / 2, board.left + halfW), board.right - halfW)
  return { x, y: notes.top - 22 - bubble.height / 2, side: 'above' }
}
