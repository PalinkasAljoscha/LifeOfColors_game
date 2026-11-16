import { useRef } from 'react'
import GameScene, { boardCanvasSize } from '../game/GameScene.js'
import { usePhaserGame } from '../hooks/usePhaserGame.js'

// look: the game's drawn theme look (src/themes.js drawLook) -- fixed for the game screen's life,
// so Retry (a remount of Board) keeps it. training: the training castle's board helps
// (src/engine/training.js). goalIntro: for how many ms the goal blinks with a pointing hand at the
// start (0 = not at all; GameScreen decides). onSpecialTap / onBoom: special
// cells (src/game/GameScene.js events 'specialTap' and 'boom').
export default function Board({ instance, look, training = false, goalIntro = 0, onClick, onWon, onSpecialTap, onBoom }) {
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
