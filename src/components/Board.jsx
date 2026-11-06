import { useRef } from 'react'
import GameScene, { boardCanvasSize } from '../game/GameScene.js'
import { usePhaserGame } from '../hooks/usePhaserGame.js'

// look: the game's drawn theme look (src/themes.js drawLook) -- fixed for the game screen's life,
// so Retry (a remount of Board) keeps it. training: the training castle's board helps
// (src/engine/training.js). goalIntro false: no blinking goal at the start (the first training
// puzzle explains the goal in components/TrainingIntro.jsx instead). onSpecialTap / onBoom: special
// cells (src/game/GameScene.js events 'specialTap' and 'boom').
export default function Board({ instance, look, training = false, goalIntro = true, onClick, onWon, onSpecialTap, onBoom }) {
  const containerRef = useRef(null)
  const { width, height } = boardCanvasSize(instance)
  usePhaserGame(containerRef, GameScene, {
    width,
    height,
    registry: { instance, look, training, goalIntro },
    on: { boardClick: onClick, won: onWon, specialTap: onSpecialTap, boom: onBoom },
  })
  return <div ref={containerRef} className="absolute inset-0" />
}
