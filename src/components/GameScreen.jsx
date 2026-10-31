import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Board from './Board.jsx'
import WinDialog from './WinDialog.jsx'
import RulesDialog from './RulesDialog.jsx'
import NotesScroll, { CellToken, RolledNotes } from './TrainingNotes.jsx'
import { markSolved } from '../engine/catalog.js'
import { progressTotals } from '../engine/progress.js'
import { minMovesOf, starsForWin } from '../engine/stars.js'
import { drawLook } from '../themes.js'
import { NOTES_AUTO_CLOSE_MS, addObservation, observation } from '../engine/training.js'
import * as telemetry from '../telemetry/telemetry.js'

// The goal colour as the board draws it in this game's look: its emoji, or a small colour square.
const GoalLook = ({ color, look }) => <CellToken state={color} look={look} className="text-lg leading-none" />

// One instance. Retry remounts the board (fresh start of the same instance); Back goes to the
// level's grid. `pick` (how the puzzle was chosen) is passed on to telemetry.
// `place`: the label in front of the puzzle name (the castle it belongs to).
// `training`: null, or in the training castle { day (the puzzle's place in the plan, 1-based),
// ids (every training puzzle), next (name of the castle it opens) } -- board helps, the scroll of
// observed transformations (src/engine/training.js; the notes survive Retry, the rules stay the
// same) and the training win dialog ("Passed training day X"; "Training complete" for the win
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
  const [lastNote, setLastNote] = useState(null) // training: { key, n } of the latest move (n re-triggers the highlight)
  const [notesOpen, setNotesOpen] = useState(null) // training: null (rolled up) | 'move' (after a move) | 'tap'
  const [rollHidden, setRollHidden] = useState(false) // training: the rolled scroll is up over the board
  const notesTimer = useRef(null)
  const boardBoxRef = useRef(null)
  const rollRef = useRef(null)

  function openNotes(how) {
    clearTimeout(notesTimer.current)
    setNotesOpen(how)
    setRollHidden(true)
    if (how === 'move') notesTimer.current = setTimeout(() => setNotesOpen(null), NOTES_AUTO_CLOSE_MS)
  }
  function closeNotes() {
    clearTimeout(notesTimer.current)
    setNotesOpen(null)
  }
  useEffect(() => () => clearTimeout(notesTimer.current), [])

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

  function onClick({ r, c, changed, rule, color }) {
    telemetry.recordClick(r, c, changed, rule, color)
    if (changed) {
      movesRef.current += 1
      setMoves(movesRef.current)
      if (training) {
        // Only a NEW transformation is added and unrolls the scroll; a known one changes nothing
        // (the scroll stays as it is -- if open, its entry is highlighted).
        const obs = observation(rule, color)
        if (addObservation(notes, obs).isNew) {
          setNotes((prev) => addObservation(prev, obs).notes)
          setLastNote((prev) => ({ key: obs.key, n: (prev?.n ?? 0) + 1 }))
          openNotes('move')
        } else if (notesOpen !== null) {
          setLastNote((prev) => ({ key: obs.key, n: (prev?.n ?? 0) + 1 }))
        }
      }
    }
  }

  function onWon() {
    telemetry.recordWin()
    closeNotes()   // the winning move is noted, but the win dialog follows: no scroll over the board
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
          className="w-28 h-16 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform
                     text-lg font-black flex items-center justify-center gap-1.5"
        >
          <span aria-hidden="true">←</span> {t('game.back')}
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
        {/* Moves counter, with the puzzle's best-known move count under it ("Best: X"). */}
        <span className="shrink-0 flex flex-col items-end leading-tight">
          <span className="text-game-score">{t('game.moves', { count: moves })}</span>
          {minMoves !== null && (
            <span className="text-xs text-game-silver">{t('game.best', { count: minMoves })}</span>
          )}
        </span>
      </div>

      <div ref={boardBoxRef} className="flex-1 min-h-0 mt-2 relative">
        <Board key={round} instance={instance} look={look} training={training !== null} onClick={onClick} onWon={onWon} />
        {training && (
          <NotesScroll open={notesOpen !== null} notes={notes} last={lastNote} highlight={notesOpen === 'move'}
                       look={look} onClose={closeNotes} onClosed={() => setRollHidden(false)}
                       boardRef={boardBoxRef} rollRef={rollRef} />
        )}
      </div>

      {training && <RolledNotes ref={rollRef} hidden={rollHidden} onOpen={() => openNotes('tap')} />}

      {/* Goal reminder (players opening a shared link never saw the homepage) + the rules pop-up. */}
      <div className="mx-auto w-full max-w-md flex justify-between items-center gap-3 mt-2 px-1 text-sm font-sans font-bold">
        <span className="min-w-0 flex items-center gap-1.5 text-game-silver">
          <span className="shrink-0">{t('game.goal')}</span>
          <GoalLook color={instance.goal.color} look={look} />
          <span className="truncate">{t('game.goalWhere')}</span>
        </span>
        <button
          onClick={() => setShowRules(true)}
          className="shrink-0 font-black text-game-score underline underline-offset-2 decoration-2 px-1 py-1"
          aria-haspopup="dialog"
        >
          {t('rules.title')} ›
        </button>
      </div>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      {won && <WinDialog look={look} training={training && { day: training.day, next: training.next, complete: result?.trainingComplete === true }} moves={moves} best={minMoves} stars={result?.stars ?? null} newBest={result?.newBest ?? false} previousBest={result?.previousBest ?? null} onRetry={retry} onPickNew={() => leave(onPickNew, 'pick_new')} onHome={() => leave(onHome, 'home')} />}
    </div>
  )
}
