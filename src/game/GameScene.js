import Phaser from 'phaser'
import { phaser as C, CELL_FILL, CELL_BORDER } from '../theme.js'
import { initialBoard, applyClick, isWon } from '../engine/engine.js'
import { startFoodRain } from './phaserUI.js'

// Board-only scene. All rules live in src/engine/engine.js (shared with the tests and
// equivalent to the factory's engine); this scene draws the board, turns taps into
// engine calls and reports what happened through game events:
//   'boardClick'  { r, c, changed, board, clicks }   every tap on a cell (also no-op taps)
//   'won'         { clicks }                          the goal cell reached its goal colour (emitted at once;
//                                                     the React side delays the dialog so the celebration shows)
//
// The canvas size follows the board's shape (see boardCanvasSize), so any board up to
// 9 rows x 6 cols fills the available screen area with Phaser.Scale.FIT.

export const CELL = 96
export const GAP = 6
export const PAD = 14
const RADIUS = 10

export function boardCanvasSize(inst) {
  const { rows, cols } = inst.board
  return { width: cols * CELL + 2 * PAD, height: rows * CELL + 2 * PAD }
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LifeOfColorsScene' })
  }

  create() {
    this.inst = this.registry.get('instance')
    const { rows, cols } = this.inst.board
    this.rows = rows
    this.cols = cols
    this.board = initialBoard(this.inst)
    this.clicks = 0
    this.won = false

    const { width, height } = boardCanvasSize(this.inst)
    this.add.rectangle(width / 2, height / 2, width, height, C.gameBg)

    this.cells = []
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < cols; c++) {
        const { x, y } = this._center(r, c)
        const g = this.add.graphics({ x, y })
        row.push(g)
        this._drawCell(g, r, c)
      }
      this.cells.push(row)
    }
    this._drawFlags()

    this.input.on('pointerdown', this._onPointerDown, this)
    this.game.events.emit('sceneReady', this)
  }

  _center(r, c) {
    return { x: PAD + c * CELL + CELL / 2, y: PAD + r * CELL + CELL / 2 }
  }

  _isGoal(r, c) {
    const [gr, gc] = this.inst.goal.at
    return r === gr && c === gc
  }

  _drawCell(g, r, c) {
    const s = CELL - GAP
    const h = s / 2
    const v = this.board[r][c]
    g.clear()
    g.fillStyle(CELL_BORDER[v])
    g.fillRoundedRect(-h, -h, s, s, RADIUS)
    g.fillStyle(CELL_FILL[v])
    g.fillRoundedRect(-h + 3, -h + 3, s - 6, s - 6, RADIUS - 2)
    if (this._isGoal(r, c)) {
      const t = 5
      g.lineStyle(t, CELL_BORDER[this.inst.goal.color] ?? C.cellGreenBorder, 1)
      g.strokeRoundedRect(-h + t / 2, -h + t / 2, s - t, s - t, RADIUS)
    }
  }

  // Start flag (green, on every start cell) and goal flag (checkered) -- same look as in Maze Inc.,
  // but drawn fully inside the cell so they are never clipped at the board edge.
  _drawFlags() {
    const cs = CELL
    const sq = 0.095 * cs
    const fCols = 4, fRows = 3
    const flagW = fCols * sq, flagH = fRows * sq
    const poleLen = 0.8 * cs

    const drawFlag = (baseX, baseY, angle, flagLeft, checkered) => {
      const gfx = this.add.graphics().setDepth(3)
      gfx.setPosition(baseX, baseY)
      gfx.lineStyle(Math.max(2, cs * 0.05), C.flagPoleColor, 1)
      gfx.strokeLineShape(new Phaser.Geom.Line(0, 0, 0, -poleLen))
      const fx = flagLeft ? -flagW : 0
      if (checkered) {
        gfx.fillStyle(C.flagWhite, 0.92)
        gfx.fillRect(fx, -poleLen, flagW, flagH)
        gfx.fillStyle(C.flagDark, 0.9)
        for (let r = 0; r < fRows; r++) {
          for (let c = 0; c < fCols; c++) {
            if ((r + c) % 2 === 0) gfx.fillRect(fx + c * sq, -poleLen + r * sq, sq, sq)
          }
        }
      } else {
        gfx.fillStyle(C.correctGreen, 0.92)
        gfx.fillRect(fx, -poleLen, flagW, flagH)
      }
      gfx.setAngle(angle)
      gfx.setAlpha(0.9)
    }

    for (const s of this.inst.board.start) {
      const [r, c] = s.at
      drawFlag(PAD + c * cs + 0.3 * cs, PAD + r * cs + 0.88 * cs, -8, false, false)
    }
    const [gr, gc] = this.inst.goal.at
    drawFlag(PAD + gc * cs + 0.3 * cs, PAD + gr * cs + 0.88 * cs, 8, false, true)
  }

  _onPointerDown(pointer) {
    if (this.won) return
    const c = Math.floor((pointer.x - PAD) / CELL)
    const r = Math.floor((pointer.y - PAD) / CELL)
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return

    const next = applyClick(this.board, r, c, this.inst.rule.table)
    const g = this.cells[r][c]
    this.clicks += 1
    if (next) {
      this.board = next
      this._drawCell(g, r, c)
      this.tweens.add({ targets: g, scale: { from: 0.82, to: 1 }, duration: 160, ease: 'Back.easeOut' })
    } else {
      // No-op tap: tiny wiggle so the player sees the tap registered.
      this.tweens.add({ targets: g, angle: { from: -5, to: 0 }, duration: 160, ease: 'Sine.easeOut' })
    }
    this.game.events.emit('boardClick', { r, c, changed: Boolean(next), board: this.board, clicks: this.clicks })

    if (next && isWon(this.inst, this.board)) {
      this.won = true
      const { width, height } = boardCanvasSize(this.inst)
      startFoodRain(this, width, height)
      this.game.events.emit('won', { clicks: this.clicks })
    }
  }
}
