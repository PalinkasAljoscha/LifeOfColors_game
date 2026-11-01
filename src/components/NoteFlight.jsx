import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CellToken, NoteCard } from './TrainingNotes.jsx'
import { palette } from '../theme.js'
import { CELL, GAP, PAD, boardCanvasSize } from '../game/GameScene.js'
import { flightSources, neighbourCells } from '../engine/training.js'

// Training castle: the animation that takes a NEW rule observation down as a note.
//   1. highlight  the tapped cell's neighbours light up strongly                      HIGHLIGHT_MS
//   2. circle     rings appear around every coloured neighbour and the changed cell   CIRCLE_MS
//   3. fly        copies of those objects fly from the board into a note card that
//                 appears over the middle of the board, forming the rule ("👻 👻 + 🕷️ → 🍬") FLY_MS
//   4. show       the finished card stays for a moment                                SHOW_MS
//   5. drop       the card moves down onto the notebook at the bottom of the screen
//                 and shrinks into it; then onLanded() (the note is added to it)      DROP_MS
// Everything is drawn in a fixed layer above the page (pointer-events: none), so the board stays
// playable. Positions come from the board's canvas (scaled to fit) and the notebook's button.
// job = { id, obs, r, c, board } (board after the move); unmounting cancels the animation.

const HIGHLIGHT_MS = 500
const CIRCLE_MS = 450
const FLY_MS = 650
const SHOW_MS = 700
const DROP_MS = 550
const EMOJI_SHARE = 0.6   // the board's emoji is 54 px on a 90 px cell (GameScene EMOJI_SIZE)
const CARD_FONT = '2.4rem' // the card over the board is drawn larger than in the notebook (1.6rem)

const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

export default function NoteFlight({ job, instance, look, boardRef, rollRef, onLanded }) {
  const [phase, setPhase] = useState('highlight')  // highlight | circle | fly | show | drop
  const [geo, setGeo] = useState(null)              // cells in page px, card centre, notebook centre
  const [slots, setSlots] = useState(null)          // { slot name: { x, y, size } } on the card
  const cardRef = useRef(null)
  const flyerRefs = useRef([])
  const landedRef = useRef(onLanded)
  landedRef.current = onLanded

  // Geometry once, at the start: the board does not move while the animation runs.
  useLayoutEffect(() => {
    const canvas = boardRef.current?.querySelector('canvas')
    const box = boardRef.current?.getBoundingClientRect()
    const roll = rollRef.current?.getBoundingClientRect()
    if (!canvas || !box || !roll || reducedMotion()) {
      landedRef.current(job)
      return undefined
    }
    const rect = canvas.getBoundingClientRect()
    const k = rect.width / boardCanvasSize(instance).width
    const cell = (r, c) => ({
      x: rect.left + (PAD + c * CELL + CELL / 2) * k,
      y: rect.top + (PAD + r * CELL + CELL / 2) * k,
    })
    const size = (CELL - GAP) * k
    const { rows, cols } = instance.board
    setGeo({
      size,
      neighbours: neighbourCells(job.r, job.c, rows, cols).map(([r, c]) => cell(r, c)),
      sources: flightSources(job.board, job.r, job.c).map((f) => ({ ...f, ...cell(f.r, f.c) })),
      card: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      roll: { x: roll.left + roll.width / 2, y: roll.top + roll.height / 2 },
    })
    // the timeline
    const timers = [
      setTimeout(() => setPhase('circle'), HIGHLIGHT_MS),
      setTimeout(() => setPhase('fly'), HIGHLIGHT_MS + CIRCLE_MS),
      setTimeout(() => setPhase('show'), HIGHLIGHT_MS + CIRCLE_MS + FLY_MS),
      setTimeout(() => setPhase('drop'), HIGHLIGHT_MS + CIRCLE_MS + FLY_MS + SHOW_MS),
    ]
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fly: measure the card's slots, then move every object from its cell to its slot.
  useLayoutEffect(() => {
    if (phase !== 'fly' || !cardRef.current || !geo) return undefined
    const found = {}
    for (const el of cardRef.current.querySelectorAll('[data-slot]')) {
      const r = el.getBoundingClientRect()
      found[el.dataset.slot] = { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.height }
    }
    setSlots(found)
    return undefined
  }, [phase, geo])

  useLayoutEffect(() => {
    if (phase !== 'fly' || !slots || !geo) return undefined
    const anims = geo.sources.map((src, i) => {
      const el = flyerRefs.current[i]
      const to = slots[src.slot]
      if (!el || !to) return null
      const from = (geo.size * EMOJI_SHARE) / to.size      // the flyer is drawn at the slot's size
      return el.animate([
        { transform: `translate(${src.x - to.x}px, ${src.y - to.y}px) scale(${from})` },
        { transform: 'translate(0px, 0px) scale(1)' },
      ], { duration: FLY_MS, easing: 'ease-in-out', fill: 'forwards', delay: i * 40 })
    })
    return () => anims.forEach((a) => a?.cancel())
  }, [phase, slots, geo])

  // Drop: the card moves onto the notebook and shrinks into it.
  useLayoutEffect(() => {
    if (phase !== 'drop' || !cardRef.current || !geo) return undefined
    const anim = cardRef.current.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${geo.roll.x - geo.card.x}px), calc(-50% + ${geo.roll.y - geo.card.y}px)) scale(0.18)`, opacity: 0.3 },
    ], { duration: DROP_MS, easing: 'ease-in', fill: 'forwards' })
    anim.onfinish = () => landedRef.current(job)
    return () => anim.cancel()
  }, [phase, geo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!geo) return null
  const { size } = geo
  const showCard = phase === 'fly' || phase === 'show' || phase === 'drop'
  const flying = phase === 'fly'

  return createPortal(
    <div className="fixed inset-0 z-30 pointer-events-none" aria-hidden="true">
      {/* 1. strong highlight of the neighbours */}
      {(phase === 'highlight' || phase === 'circle') && geo.neighbours.map((p, i) => (
        <span key={`h${i}`} className="absolute rounded-xl note-glow"
              style={{ left: p.x - size / 2, top: p.y - size / 2, width: size, height: size, background: palette.noteGlow }} />
      ))}
      {/* 2. rings around the objects that make the rule */}
      {(phase === 'circle' || flying) && geo.sources.map((p, i) => (
        <span key={`c${i}`} className={`absolute rounded-full ${flying ? 'note-ring-out' : 'note-ring-in'}`}
              style={{
                left: p.x - size * 0.42, top: p.y - size * 0.42, width: size * 0.84, height: size * 0.84,
                border: `${Math.max(2, size * 0.05)}px solid ${p.slot === 'R' ? palette.noteHighlight : palette.noteRing}`,
              }} />
      ))}
      {/* 3.-5. the note card over the middle of the board */}
      {showCard && (
        <NoteCard ref={cardRef} obs={job.obs} look={look}
                  className={`absolute shadow-2xl ${phase === 'fly' ? 'note-card-in' : ''}`}
                  style={{
                    left: geo.card.x, top: geo.card.y, transform: 'translate(-50%, -50%)', fontSize: CARD_FONT,
                    background: palette.notePaper,
                    // while the objects fly in, the card's own objects stay invisible
                    ...(flying ? { '--slot-visibility': 'hidden' } : null),
                  }} />
      )}
      {/* 3. the flying copies of the board's objects */}
      {flying && slots && geo.sources.map((src, i) => {
        const to = slots[src.slot]
        if (!to) return null
        return (
          <span key={`f${i}`} ref={(el) => { flyerRefs.current[i] = el }}
                className="absolute flex items-center justify-center leading-none font-sans font-bold"
                style={{
                  left: to.x - to.size / 2, top: to.y - to.size / 2, width: to.size, height: to.size,
                  fontSize: CARD_FONT, transform: `translate(${src.x - to.x}px, ${src.y - to.y}px) scale(${(size * EMOJI_SHARE) / to.size})`,
                }}>
            <CellToken state={src.state} look={look} />
          </span>
        )
      })}
    </div>,
    document.body,
  )
}
