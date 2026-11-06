import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Board from './Board.jsx'
import { boardCanvasSize } from '../game/GameScene.js'
import WinCelebration from './WinCelebration.jsx'
import RulesDialog from './RulesDialog.jsx'
import NotebookOpen, { NotebookPeek } from './TrainingNotes.jsx'
import NoteFlight from './NoteFlight.jsx'
import TrainingIntro, { INTRO_STEPS } from './TrainingIntro.jsx'
import { markSolved } from '../engine/catalog.js'
import { progressTotals } from '../engine/progress.js'
import { minMovesOf, starsForWin } from '../engine/stars.js'
import { drawLook, themedKey } from '../themes.js'
import { specials } from '../engine/engine.js'
import { SpecialCallout, BoomOverlay, EXPLOSION_MS } from './SpecialOverlays.jsx'
import { addObservation, observation } from '../engine/training.js'
import * as telemetry from '../telemetry/telemetry.js'

// The goal colour as the board draws it in this game's look: its emoji, or a small colour square.

// One instance. Retry remounts the board (fresh start of the same instance); Back goes to the
// level's grid. `pick` (how the puzzle was chosen) is passed on to telemetry.
// `place`: the label in front of the puzzle name (the castle it belongs to).
// `training`: null, or in the training castle { day (the puzzle's place in the plan, 1-based),
// ids (every training puzzle), next (name of the castle it opens) } -- board helps, the notebook of
// observed transformations (src/engine/training.js; the notes survive Retry, the rules stay the
// same; a new one is taken down by the note animation, components/NoteFlight.jsx, and lands in
// the notebook at the bottom of the screen, which opens only when tapped) and the training texts of
// the win animation ("Passed training day X"; "Training complete" for the win that completes the plan).
// A win plays the win animation (components/WinCelebration.jsx) over the board; afterwards the board
// stays as it is and only Retry / Back go on. onHome is no longer used here (no win dialog).
// Special cells (src/engine/engine.js, components/SpecialOverlays.jsx): a bomb / mirror puzzle opens
// with a short callout at the special cell (each time it is opened, not on Retry; gone after
// INTRO_CALLOUT_MS or the first tap); the first tap on a blocked / clock cell (per screen) explains
// it; a tap on the bomb shows "Oh, careful!" with a scared face (BOMB_WARN_MS). When the bomb goes
// off: the explosion (the whole screen shakes, EXPLOSION_MS), then the rubble with a Retry button --
// the same as the Retry button on top (moves reset; telemetry: the triggering tap was a click that
// changed nothing, the Retry a restart).
const INTRO_CALLOUT_MS = 4500
const TAP_CALLOUT_MS = 3500
const BOMB_WARN_MS = 2000

export default function GameScreen({ instance, place, training = null, pick, onPickNew, onHome }) {
  const { t } = useTranslation()
  const special = specials(instance)
  // special cells: the callout on the board ({ key, at, text, emoji, intro, ms }), the bomb's
  // explosion (null | 'exploding' | 'rubble'), and which tap explanations were shown on this screen
  const [callout, setCallout] = useState(() => {
    if (special.type === 'bomb') return { key: 0, at: special.bomb.at, text: t(themedKey('special.bombIntro')), intro: true, ms: INTRO_CALLOUT_MS }
    if (special.type === 'mirror') return { key: 0, at: special.mirror[0], text: t('special.mirrorIntro'), intro: true, ms: INTRO_CALLOUT_MS }
    return null
  })
  const calloutKey = useRef(0)
  const [boom, setBoom] = useState(null)
  const explained = useRef(new Set())
  const boomTimer = useRef(null)
  const [round, setRound] = useState(0)        // bumped by Retry -> remounts <Board>
  const [moves, setMoves] = useState(0)        // clicks that changed a cell
  const [won, setWon] = useState(false)        // the win animation is playing (components/WinCelebration.jsx)
  const [result, setResult] = useState(null)   // { stars, newBest, previousBest } of the win
  const movesRef = useRef(0)                   // moves at the time of the win (state may lag)
  const [showRules, setShowRules] = useState(false)
  const winTimer = useRef(null)
  const minMoves = minMovesOf(instance)          // null if the catalog has no value for it
  // The theme's per-game choices (objects, candy colour), drawn when this screen opens: Retry
  // keeps them; leaving and opening a game again (even the same one) draws anew.
  const [look] = useState(() => drawLook())
  const [notes, setNotes] = useState([])         // training: observed transformations, in order
  const [notesOpen, setNotesOpen] = useState(false)   // training: the notebook is open (tapped)
  const [notesShown, setNotesShown] = useState(false) // ... and its page is on screen (incl. sliding down)
  const [flights, setFlights] = useState([])          // training: note animations to play, in order
  const [rollBump, setRollBump] = useState(0)         // training: bumped when a note lands in the notebook
  const pendingRef = useRef([])                       // observations noted or on their way (no repeats)
  const flightId = useRef(0)
  const boardBoxRef = useRef(null)
  const boardSize = boardCanvasSize(instance)
  const rollRef = useRef(null)
  // training puzzle 1: three explanations before the first move (components/TrainingIntro.jsx),
  // each time the puzzle is opened (not again on Retry); null when done / not shown
  const [introStep, setIntroStep] = useState(() => (training?.day === 1 ? 0 : null))
  const nextIntro = () => setIntroStep((s) => (s === null || s + 1 >= INTRO_STEPS ? null : s + 1))

  function openNotes() {
    flushFlights()   // notes still on their way are written at once, so the notebook shows them
    setNotesOpen(true)
  }
  function closeNotes() {
    setNotesOpen(false)
  }
  // A note animation finished: its observation goes into the notebook.
  function landed(job) {
    setFlights((q) => q.filter((j) => j.id !== job.id))
    setNotes((prev) => addObservation(prev, job.obs).notes)
    setRollBump((n) => n + 1)
  }
  // Stop all note animations (win, Retry, notebook opened): their observations are noted at once.
  function flushFlights() {
    setFlights((q) => {
      if (q.length) setNotes((prev) => q.reduce((n, j) => addObservation(n, j.obs).notes, prev))
      return []
    })
  }

  // Telemetry: one play per puzzle opened (Retry stays in the same play).
  useEffect(() => {
    telemetry.startPlay(instance, pick)
  }, [instance, pick])

  // Fresh board on mount and on every Retry.
  useEffect(() => {
    setMoves(0)
    movesRef.current = 0
    setWon(false)
    setResult(null)
    setBoom(null)
    clearTimeout(boomTimer.current)
  }, [round])

  // Special cells: the callout disappears after its time.
  useEffect(() => {
    if (!callout) return undefined
    const id = setTimeout(() => setCallout((c) => (c?.key === callout.key ? null : c)), callout.ms)
    return () => clearTimeout(id)
  }, [callout])
  useEffect(() => () => clearTimeout(boomTimer.current), [])

  function showCallout(c) {
    calloutKey.current += 1
    setCallout({ ...c, key: calloutKey.current })
  }

  function onSpecialTap({ kind, r, c }) {
    if (kind === 'bomb') {
      showCallout({ at: [r, c], text: t('special.bombCareful'), emoji: '😱', ms: BOMB_WARN_MS })
    } else if ((kind === 'blocked' || kind === 'clock') && !explained.current.has(kind)) {
      explained.current.add(kind)
      showCallout({ at: [r, c], text: t(kind === 'blocked' ? 'special.blockedTap' : 'special.clockTap'), ms: TAP_CALLOUT_MS })
    }
  }

  function onBoom() {
    setCallout(null)
    setBoom('exploding')
    clearTimeout(boomTimer.current)
    boomTimer.current = setTimeout(() => setBoom('rubble'), EXPLOSION_MS)
  }

  // Page hidden -> snapshot and pause the play clock; visible again -> clock runs again.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') telemetry.onHidden()
      else telemetry.onVisible()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', telemetry.onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', telemetry.onHidden)
    }
  }, [])

  function retry() {
    clearTimeout(winTimer.current)
    closeNotes()
    flushFlights()
    telemetry.restartPlay()
    setRound((n) => n + 1)
  }

  // reason: 'back' (the <- button; 'pick_new' / 'home' came from the former win dialog). onPickNew
  // goes back to the level's puzzle grid.
  function leave(to, reason) {
    clearTimeout(winTimer.current)
    telemetry.endPlay(reason)
    to()
  }

  function onClick({ r, c, changed, board, rule, color }) {
    telemetry.recordClick(r, c, changed, rule, color)
    if (callout?.intro) setCallout(null)   // the opening callout goes with the first tap
    if (changed) {
      movesRef.current += 1
      setMoves(movesRef.current)
      if (training) {
        // Only a NEW transformation is taken down (note animation, then into the notebook); a known
        // one shows nothing.
        const obs = observation(rule, color)
        const added = addObservation(pendingRef.current, obs)
        if (added.isNew) {
          pendingRef.current = added.notes
          flightId.current += 1
          setFlights((q) => [...q, { id: flightId.current, obs, r, c, board }])
        }
      }
    }
  }

  function onWon() {
    telemetry.recordWin()
    closeNotes()     // the win animation follows: no notebook or note animation over the board
    flushFlights()
    const stars = starsForWin(movesRef.current, minMoves)
    const allWon = () => training !== null && progressTotals(training.ids).solved === training.ids.length
    const wasComplete = allWon()
    const saved = markSolved(instance, stars)              // best rating per puzzle (engine/progress.js)
    setResult({ stars, ...saved, trainingComplete: !wasComplete && allWon() })
    // Short pause so the player sees the goal cell change before the animation starts. After it the
    // board stays as it is (the scene takes no more taps); Retry or Back go on.
    winTimer.current = setTimeout(() => setWon(true), 400)
  }
  useEffect(() => () => clearTimeout(winTimer.current), [])

  return (
    <div className={`h-[100dvh] w-full flex flex-col bg-game-bg safe-pad${boom === 'exploding' ? ' boom-shake' : ''}`}>
      <div className="mx-auto w-full max-w-md flex gap-3">
        <button
          onClick={retry}
          className="flex-1 h-16 rounded-2xl bg-game-btn hover:bg-game-btn-hover active:scale-95 transition-transform
                     text-2xl font-black shadow-lg flex items-center justify-center gap-2"
        >
          <span aria-hidden="true">↻</span> {t('game.retry')}
        </button>
        <button
          onClick={() => leave(onPickNew, 'back')}
          className="w-24 h-16 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform
                     text-lg font-black flex items-center justify-center gap-1.5"
        >
          <span aria-hidden="true">←</span> {t('game.back')}
        </button>
        {/* Info: the rules pop-up ("How it works") */}
        <button
          onClick={() => setShowRules(true)}
          className="w-14 h-16 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform
                     flex items-center justify-center text-game-score shrink-0"
          aria-haspopup="dialog"
          aria-label={t('rules.title')}
          title={t('rules.title')}
        >
          <span className="w-8 h-8 rounded-full border-[3px] border-current flex items-center justify-center
                           text-lg font-black font-serif leading-none" aria-hidden="true">i</span>
        </button>
      </div>

      <div className="mx-auto w-full max-w-md flex justify-between items-baseline gap-3 mt-3 px-1 text-sm font-sans font-bold">
        <span className="min-w-0 flex items-center gap-1.5">
          {place && <span className="text-game-silver shrink-0">{place}:</span>}
          {/* Puzzle name (the factory finds the puzzle by it), with its tile colour from the level grid. */}
          {instance.name_color && (
            <span
              className="w-3.5 h-3.5 rounded-sm ring-1 ring-inset ring-white/25 shrink-0"
              style={{ background: instance.name_color }}
              aria-hidden="true"
            />
          )}
          <span className="truncate select-all text-white/90">{instance.name ?? instance.id}</span>
        </span>
        {/* Moves counter (the best-known move count is shown in the win dialog only). */}
        <span className="shrink-0 text-game-score">{t('game.moves', { count: moves })}</span>
      </div>

      {/* training: the free space goes above the board and into the notebook below it (up to its
          maximum height), so the notebook starts right at the board's lower edge and reaches the
          screen bottom (the board box has the board's aspect ratio) */}
      {training && <div className="flex-1 min-h-0" aria-hidden="true" />}
      <div ref={boardBoxRef} className={training ? 'min-h-0 mt-2 relative w-full shrink' : 'flex-1 min-h-0 mt-2 relative'}
           style={training ? { aspectRatio: `${boardSize.width} / ${boardSize.height}`, maxWidth: '100%' } : undefined}>
        <Board key={round} instance={instance} look={look} training={training !== null}
               goalIntro={!(training?.day === 1 && round === 0)} onClick={onClick} onWon={onWon}
               onSpecialTap={onSpecialTap} onBoom={onBoom} />
        {/* special cells: callouts at a cell, and the bomb's explosion / rubble (with its Retry) */}
        {callout && !boom && (
          <SpecialCallout key={`callout-${callout.key}`} boardRef={boardBoxRef} instance={instance} at={callout.at}
                          text={callout.text} emoji={callout.emoji ?? null} look={look} />
        )}
        {boom && <BoomOverlay phase={boom} onRetry={retry} boardRef={boardBoxRef} instance={instance} />}
        {/* training puzzle 1: the explanations come first; a tap on the board goes to the next one */}
        {introStep !== null && (
          <>
            <div className="absolute inset-0 z-10" onClick={nextIntro} aria-hidden="true" />
            <TrainingIntro instance={instance} look={look} boardRef={boardBoxRef} notesRef={rollRef} step={introStep} onNext={nextIntro} />
          </>
        )}
        {/* training: while a note animation runs the board takes no taps -- this layer over it
            catches them, so the next move waits until the note has landed in the notebook */}
        {training && flights.length > 0 && <div className="absolute inset-0 z-10" aria-hidden="true" />}
        {training && flights.length > 0 && (
          <NoteFlight key={flights[0].id} job={flights[0]} instance={instance} look={look}
                      boardRef={boardBoxRef} rollRef={rollRef} onLanded={landed} />
        )}
      </div>

      {/* training: the notebook peeking in right below the board (no goal / rules line any more), and opened */}
      {training && <NotebookPeek ref={rollRef} bump={rollBump} hidden={notesShown} onOpen={openNotes} />}
      {training && <NotebookOpen open={notesOpen} notes={notes} look={look} onClose={closeNotes} onShown={setNotesShown} />}

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      {won && (
        <WinCelebration key={round} boardRef={boardBoxRef}
                        training={training && { day: training.day, next: training.next, complete: result?.trainingComplete === true }}
                        moves={moves} best={minMoves} stars={result?.stars ?? null} newBest={result?.newBest ?? false}
                        onDone={() => setWon(false)} />
      )}
    </div>
  )
}
