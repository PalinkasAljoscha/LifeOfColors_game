import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CellToken, NoteCard } from './TrainingNotes.jsx'
import { palette } from '../theme.js'
import { CELL, GAP, PAD, boardCanvasSize } from '../game/GameScene.js'
import { flightSources, neighbourCells, noteCardPlace } from '../engine/training.js'

// Training castle: the animation that takes a NEW rule observation down as a note.
//   1. highlight  the tapped cell's neighbours light up strongly                      HIGHLIGHT_MS
//   2. circle     rings appear around every coloured neighbour and the changed cell   CIRCLE_MS
//   3. fly        copies of those objects fly from the board into a note card that
//                 appears on the board, in the free space above the tapped cell's neighbourhood
//                 (below it when it does not fit above; noteCardPlace), forming the rule
//                 ("👻 👻 + 🕷️ → 🍬")                                                     FLY_MS
//   4. show       the finished card stays for a moment                                SHOW_MS
//   5. drop       the card moves down onto the notebook at the bottom of the screen
//                 and shrinks into it; then onLanded() (the note is added to it)      DROP_MS
// `phased` (the first training lessons, PHASED_LESSONS): steps 2-3 run twice -- first only the
// coloured neighbours are circled and fly into the card (the left side of the rule), then the
// changed cell is circled and flies to the right side. Otherwise everything moves at once.
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
export const PHASED_LESSONS = 3   // training puzzles 1..3 use the phased (slower) animation

const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

export default function NoteFlight({ job, instance, look, boardRef, rollRef, onLanded, phased = false }) {
  // phase = { kind: highlight | circle | fly | show | drop, g: index of the group of objects (see
  // geo.groups) being circled / flying; earlier groups have landed on the card already }
  const [phase, setPhaseState] = useState({ kind: 'highlight', g: 0 })
  const setPhase = (kind, g = 0) => setPhaseState({ kind, g })
  const [geo, setGeo] = useState(null)              // cells in page px, card centre, notebook centre
  const [slots, setSlots] = useState(null)          // { slot name: { x, y, size } } on the card
  const [cardPos, setCardPos] = useState(null)      // the card's centre (page px), from its measured size
  const cardRef = useRef(null)
  const measureRef = useRef(null)
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
    const sources = flightSources(job.board, job.r, job.c).map((f) => ({ ...f, ...cell(f.r, f.c) }))
    // groups of source indices that are circled and fly together: phased = neighbours, then the
    // changed cell (slot 'R'); otherwise all at once. Empty groups (no coloured neighbours) drop out.
    // the tapped cell's neighbourhood (it and its neighbours), which the card must not cover
    const block = [[job.r, job.c], ...neighbourCells(job.r, job.c, rows, cols)].map(([r, c]) => cell(r, c))
    const hood = {
      left: Math.min(...block.map((p) => p.x)) - size / 2, right: Math.max(...block.map((p) => p.x)) + size / 2,
      top: Math.min(...block.map((p) => p.y)) - size / 2, bottom: Math.max(...block.map((p) => p.y)) + size / 2,
    }
    const all = sources.map((_, i) => i)
    const groups = (phased
      ? [all.filter((i) => sources[i].slot !== 'R'), all.filter((i) => sources[i].slot === 'R')]
      : [all]).filter((g) => g.length > 0)
    setGeo({
      size,
      neighbours: neighbourCells(job.r, job.c, rows, cols).map(([r, c]) => cell(r, c)),
      sources,
      groups,
      hood,
      board: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      roll: { x: roll.left + roll.width / 2, y: roll.top + roll.height / 2 },
    })
    // the timeline: highlight, then circle + fly per group, then show and drop
    const steps = [['highlight', 0, HIGHLIGHT_MS]]
    groups.forEach((_, g) => steps.push(['circle', g, CIRCLE_MS], ['fly', g, FLY_MS]))
    steps.push(['show', 0, SHOW_MS], ['drop', 0, 0])
    const timers = []
    let t = 0
    for (let k = 1; k < steps.length; k++) {
      t += steps[k - 1][2]
      const [kind, g] = steps[k]
      timers.push(setTimeout(() => setPhase(kind, g), t))
    }
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Place the card: measure it (rendered hidden first, see below), then put it on the board above /
  // below the neighbourhood. Before the first flight, so the slots are measured at the card's final place.
  useLayoutEffect(() => {
    if (!geo || cardPos || !measureRef.current) return undefined
    const r = measureRef.current.getBoundingClientRect()
    setCardPos(noteCardPlace(geo.hood, { width: r.width, height: r.height }, geo.board))
    return undefined
  }, [geo, cardPos])

  // Fly: measure the card's slots (once, when the card first appears), then move the objects of the
  // current group from their cells to their slots.
  useLayoutEffect(() => {
    if (phase.kind !== 'fly' || slots || !cardRef.current || !geo || !cardPos) return undefined
    const found = {}
    for (const el of cardRef.current.querySelectorAll('[data-slot]')) {
      const r = el.getBoundingClientRect()
      found[el.dataset.slot] = { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.height }
    }
    setSlots(found)
    return undefined
  }, [phase, geo, slots, cardPos])

  useLayoutEffect(() => {
    if (phase.kind !== 'fly' || !slots || !geo) return undefined
    const anims = geo.groups[phase.g].map((i, k) => {
      const src = geo.sources[i]
      const el = flyerRefs.current[i]
      const to = slots[src.slot]
      if (!el || !to) return null
      const from = (geo.size * EMOJI_SHARE) / to.size      // the flyer is drawn at the slot's size
      return el.animate([
        { transform: `translate(${src.x - to.x}px, ${src.y - to.y}px) scale(${from})` },
        { transform: 'translate(0px, 0px) scale(1)' },
      ], { duration: FLY_MS, easing: 'ease-in-out', fill: 'forwards', delay: k * 40 })
    })
    return () => anims.forEach((a) => a?.cancel())
  }, [phase, slots, geo])

  // Drop: the card moves onto the notebook and shrinks into it.
  useLayoutEffect(() => {
    if (phase.kind !== 'drop' || !cardRef.current || !geo || !cardPos) return undefined
    const anim = cardRef.current.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${geo.roll.x - cardPos.x}px), calc(-50% + ${geo.roll.y - cardPos.y}px)) scale(0.18)`, opacity: 0.3 },
    ], { duration: DROP_MS, easing: 'ease-in', fill: 'forwards' })
    anim.onfinish = () => landedRef.current(job)
    return () => anim.cancel()
  }, [phase, geo, cardPos]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!geo) return null
  const { size, groups } = geo
  const { kind, g } = phase
  // the card is up from the first flight on; during circle / fly its own objects stay hidden and
  // the flyers (landed or flying) stand in for them
  const showCard = cardPos && (kind === 'show' || kind === 'drop' || kind === 'fly' || (kind === 'circle' && g > 0))
  const building = kind === 'fly' || (kind === 'circle' && g > 0)
  const ringed = kind === 'circle' || kind === 'fly' ? groups[g] : []
  const landed = new Set(groups.slice(0, g).flat())        // flown in an earlier group: at its slot
  const flyers = building ? groups.slice(0, kind === 'fly' ? g + 1 : g).flat() : []

  return createPortal(
    <div className="fixed inset-0 z-30 pointer-events-none" aria-hidden="true">
      {/* 1. strong highlight of the neighbours (until the first objects fly) */}
      {(kind === 'highlight' || (kind === 'circle' && g === 0)) && geo.neighbours.map((p, i) => (
        <span key={`h${i}`} className="absolute rounded-xl note-glow"
              style={{ left: p.x - size / 2, top: p.y - size / 2, width: size, height: size, background: palette.noteGlow }} />
      ))}
      {/* 2. rings around the objects of the current group */}
      {ringed.map((i) => {
        const p = geo.sources[i]
        return (
          <span key={`c${g}_${i}`} className={`absolute rounded-full ${kind === 'fly' ? 'note-ring-out' : 'note-ring-in'}`}
                style={{
                  left: p.x - size * 0.42, top: p.y - size * 0.42, width: size * 0.84, height: size * 0.84,
                  border: `${Math.max(2, size * 0.05)}px solid ${p.slot === 'R' ? palette.noteHighlight : palette.noteRing}`,
                }} />
        )
      })}
      {/* the card, invisible, only to measure its size (placement, see above) */}
      {!cardPos && (
        <NoteCard ref={measureRef} obs={job.obs} look={look} className="absolute"
                  style={{ left: 0, top: 0, fontSize: CARD_FONT, visibility: 'hidden' }} />
      )}
      {/* 3.-5. the note card right above / below the tapped cell's neighbourhood */}
      {showCard && (
        <NoteCard ref={cardRef} obs={job.obs} look={look}
                  className={`absolute shadow-2xl ${kind === 'fly' && g === 0 ? 'note-card-in' : ''}`}
                  style={{
                    left: cardPos.x, top: cardPos.y, transform: 'translate(-50%, -50%)', fontSize: CARD_FONT,
                    background: palette.notePaper,
                    // while the objects fly in, the card's own objects stay invisible
                    ...(building ? { '--slot-visibility': 'hidden' } : null),
                  }} />
      )}
      {/* 3. the copies of the board's objects: flying now, or already landed at their slot */}
      {slots && flyers.map((i) => {
        const src = geo.sources[i]
        const to = slots[src.slot]
        if (!to) return null
        const atSlot = landed.has(i)
        return (
          <span key={`f${i}`} ref={(el) => { flyerRefs.current[i] = el }}
                className="absolute flex items-center justify-center leading-none font-sans font-bold"
                style={{
                  left: to.x - to.size / 2, top: to.y - to.size / 2, width: to.size, height: to.size,
                  fontSize: CARD_FONT,
                  transform: atSlot ? 'none'
                    : `translate(${src.x - to.x}px, ${src.y - to.y}px) scale(${(size * EMOJI_SHARE) / to.size})`,
                }}>
            <CellToken state={src.state} look={look} />
          </span>
        )
      })}
    </div>,
    document.body,
  )
}
