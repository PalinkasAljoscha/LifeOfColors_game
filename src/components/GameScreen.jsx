import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Board from './Board.jsx'
import WinDialog from './WinDialog.jsx'
import * as telemetry from '../telemetry/telemetry.js'
import { startBoard } from '../game/startBoard.js'

// One instance. Retry remounts the board (fresh start of the same instance); Home goes back to
// the level's grid. `pick` (how the puzzle was chosen) is passed on to telemetry.
export default function GameScreen({ instance, pick, onHome }) {
  const { t } = useTranslation()
  const [round, setRound] = useState(0)        // bumped by Retry -> remounts <Board>
  const [moves, setMoves] = useState(0)        // clicks that changed a cell
  const [won, setWon] = useState(false)
  const boardRef = useRef(null)                // latest board, for telemetry resume
  const winTimer = useRef(null)

  // A new attempt starts on mount and on every Retry.
  useEffect(() => {
    telemetry.startAttempt(instance, pick)
    boardRef.current = startBoard(instance)
    setMoves(0)
    setWon(false)
  }, [instance, pick, round])

  // Page hidden -> close the telemetry segment; visible again -> continue in a new segment.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') telemetry.onHidden()
      else if (!won) telemetry.resumeAttempt(boardRef.current)
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', telemetry.onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', telemetry.onHidden)
    }
  }, [won])

  function retry() {
    clearTimeout(winTimer.current)
    if (!won) telemetry.endAttempt('retry')
    setRound((n) => n + 1)
  }

  function home() {
    clearTimeout(winTimer.current)
    if (!won) telemetry.endAttempt('home')
    onHome()
  }

  function onClick({ r, c, changed, board }) {
    // Returning to a hidden-then-visible page without an open segment: reopen it first.
    if (!telemetry.hasOpenAttempt()) telemetry.resumeAttempt(boardRef.current)
    telemetry.recordClick(r, c, changed)
    boardRef.current = board
    if (changed) setMoves((m) => m + 1)
  }

  function onWon() {
    telemetry.endAttempt('won')
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
          onClick={home}
          className="w-28 h-16 rounded-2xl bg-game-panel border-2 border-white/15 active:scale-95 transition-transform
                     text-lg font-black flex items-center justify-center gap-1.5"
        >
          <span aria-hidden="true">⌂</span> {t('game.home')}
        </button>
      </div>

      <div className="mx-auto w-full max-w-md flex justify-between items-baseline mt-3 px-1 text-sm font-sans font-bold">
        <span className="text-game-silver">{t(`levels.${instance.level}`)}</span>
        <span className="text-game-score">{t('game.moves', { count: moves })}</span>
      </div>
      {/* Puzzle name (the factory finds the puzzle by it), with its tile colour from the level grid. */}
      <div className="mx-auto w-full max-w-md px-1 flex items-center gap-2 text-sm font-sans font-bold text-white/90">
        {instance.name_color && (
          <span
            className="w-3.5 h-3.5 rounded-sm ring-1 ring-inset ring-white/25 shrink-0"
            style={{ background: instance.name_color }}
            aria-hidden="true"
          />
        )}
        <span className="truncate select-all">{instance.name ?? instance.id}</span>
      </div>

      <div className="flex-1 min-h-0 mt-2 relative">
        <Board key={round} instance={instance} onClick={onClick} onWon={onWon} />
      </div>

      {won && <WinDialog moves={moves} onRetry={retry} onHome={home} />}
    </div>
  )
}
