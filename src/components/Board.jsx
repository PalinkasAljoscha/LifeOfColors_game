import { useRef } from 'react'
import GameScene, { boardCanvasSize } from '../game/GameScene.js'
import { usePhaserGame } from '../hooks/usePhaserGame.js'

export default function Board({ instance, onClick, onWon }) {
  const containerRef = useRef(null)
  const { width, height } = boardCanvasSize(instance)
  usePhaserGame(containerRef, GameScene, {
    width,
    height,
    registry: { instance },
    on: { boardClick: onClick, won: onWon },
  })
  return <div ref={containerRef} className="absolute inset-0" />
}
