import { useRef } from 'react'
import GameScene, { boardCanvasSize } from '../game/GameScene.js'
import { usePhaserGame } from '../hooks/usePhaserGame.js'

// look: the game's drawn theme look (src/themes.js drawLook) -- fixed for the game screen's life,
// so Retry (a remount of Board) keeps it. training: the training castle's board helps
// (src/engine/training.js). goalIntro false: no blinking goal at the start (the first training
// puzzle explains the goal in components/TrainingIntro.jsx instead).
export default function Board({ instance, look, training = false, goalIntro = true, onClick, onWon }) {
  const containerRef = useRef(null)
  const { width, height } = boardCanvasSize(instance)
  usePhaserGame(containerRef, GameScene, {
    width,
    height,
    registry: { instance, look, training, goalIntro },
    on: { boardClick: onClick, won: onWon },
  })
  return <div ref={containerRef} className="absolute inset-0" />
}
