import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Board from './Board.jsx'
import WinDialog from './WinDialog.jsx'
import RulesDialog from './RulesDialog.jsx'
import NotebookOpen, { NotebookPeek } from './TrainingNotes.jsx'
import NoteFlight, { PHASED_LESSONS } from './NoteFlight.jsx'
import { markSolved } from '../engine/catalog.js'
import { progressTotals } from '../engine/progress.js'
import { minMovesOf, starsForWin } from '../engine/stars.js'
import { drawLook } from '../themes.js'
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
// the notebook at the bottom of the screen, which opens only when tapped) and the training win dialog ("Passed training day X"; "Training complete" for the win
// that completes the plan).
export default function GameScreen({ instance, place, training = null, pick, onPickNew, onHome }) {
  const { t } = useTranslation()
  const [round, setRound] = useState(0)        // bumped by Retry -> remounts <Board>
  const [moves, setMoves] = useState(0)        // clicks that changed a cell
  const [won, setWon] = useState(false)
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
  const [flights, setFlights] = useState([])          // training: note animations to play, in order
  const [rollBump, setRollBump] = useState(0)         // training: bumped when a note lands in the notebook
  const pendingRef = useRef([])                       // observations noted or on their way (no repeats)
  const flightId = useRef(0)
  const boardBoxRef = useRef(null)
  const rollRef = useRef(null)

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
  }, [round])

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

  // reason: 'back' (the <- button), 'pick_new' or 'home' (win dialog). onPickNew goes back to the
  // level's puzzle grid, onHome all the way to the level list.
  function leave(to, reason) {
    clearTimeout(winTimer.current)
    telemetry.endPlay(reason)
    to()
  }

  function onClick({ r, c, changed, board, rule, color }) {
    telemetry.recordClick(r, c, changed, rule, color)
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
    closeNotes()     // the win dialog follows: no notebook or note animation over the board
    flushFlights()
    const stars = starsForWin(movesRef.current, minMoves)
    const allWon = () => training !== null && progressTotals(training.ids).solved === training.ids.length
    const wasComplete = allWon()
    const saved = markSolved(instance, stars)              // best rating per puzzle (engine/progress.js)
    setResult({ stars, ...saved, trainingComplete: !wasComplete && allWon() })
    // Short pause so the player sees the goal cell change before the dialog covers it.
    winTimer.current = setTimeout(() => setWon(true), 400)
  }
  useEffect(() => () => clearTimeout(winTimer.current), [])

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-game-bg safe-pad">
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

      <div ref={boardBoxRef} className="flex-1 min-h-0 mt-2 relative">
        <Board key={round} instance={instance} look={look} training={training !== null} onClick={onClick} onWon={onWon} />
        {training && flights.length > 0 && (
          <NoteFlight key={flights[0].id} job={flights[0]} instance={instance} look={look}
                      phased={Number.isInteger(training.day) && training.day <= PHASED_LESSONS}
                      boardRef={boardBoxRef} rollRef={rollRef} onLanded={landed} />
        )}
      </div>

      {/* training: the notebook peeking in right below the board (no goal / rules line any more), and opened */}
      {training && <NotebookPeek ref={rollRef} bump={rollBump} onOpen={openNotes} />}
      {training && <NotebookOpen open={notesOpen} notes={notes} look={look} onClose={closeNotes} />}

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      {won && <WinDialog look={look} training={training && { day: training.day, next: training.next, complete: result?.trainingComplete === true }} moves={moves} best={minMoves} stars={result?.stars ?? null} newBest={result?.newBest ?? false} previousBest={result?.previousBest ?? null} onRetry={retry} onPickNew={() => leave(onPickNew, 'pick_new')} onHome={() => leave(onHome, 'home')} />}
    </div>
  )
}
