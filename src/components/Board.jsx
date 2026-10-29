import { useRef } from 'react'
import GameScene, { boardCanvasSize } from '../game/GameScene.js'
import { usePhaserGame } from '../hooks/usePhaserGame.js'

// look: the game's drawn theme look (src/themes.js drawLook) -- fixed for the game screen's life,
// so Retry (a remount of Board) keeps it.
export default function Board({ instance, look, onClick, onWon }) {
  const containerRef = useRef(null)
  const { width, height } = boardCanvasSize(instance)
  usePhaserGame(containerRef, GameScene, {
    width,
    height,
    registry: { instance, look },
    on: { boardClick: onClick, won: onWon },
  })
  return <div ref={containerRef} className="absolute inset-0" />
}
