import Phaser from 'phaser'
import { phaser as C, CELL_FILL, CELL_BORDER } from '../theme.js'
import { initialBoard, applyClick, isWon } from '../engine/engine.js'

// Board-only scene. All rules live in src/engine/engine.js (shared with the tests and
// equivalent to the factory's engine); this scene draws the board, turns taps into
// engine calls and reports what happened through game events:
//   'boardClick'  { r, c, changed, board, clicks }   every tap on a cell (also no-op taps)
//   'won'         { clicks }                          the goal cell reached its goal colour (emitted at once;
//                                                     the React side delays the dialog briefly)
//
// The canvas size follows the board's shape (see boardCanvasSize), so any board up to
// 9 rows x 6 cols fills the available screen area with Phaser.Scale.FIT.

export const CELL = 96
export const GAP = 6
export const PAD = 14
const RADIUS = 10
const FRAME = 8            // width (and outer corner radius) of the golden frame on the goal cell

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
    this._addGoalShine()

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
    let o = 0  // inset of the coloured cell (FRAME on the goal cell, inside its golden frame)
    let rad = RADIUS
    if (this._isGoal(r, c)) {
      g.fillStyle(C.goalGoldDark)
      g.fillRoundedRect(-h, -h, s, s, FRAME)
      g.fillStyle(C.goalGold)
      g.fillRoundedRect(-h + 2, -h + 2, s - 4, s - 4, FRAME - 2)
      o = FRAME
      rad = RADIUS - 4
    }
    g.fillStyle(CELL_BORDER[v])
    g.fillRoundedRect(-h + o, -h + o, s - 2 * o, s - 2 * o, rad)
    g.fillStyle(CELL_FILL[v])
    g.fillRoundedRect(-h + o + 3, -h + o + 3, s - 2 * o - 6, s - 2 * o - 6, rad - 2)
  }

  // Light reflection sweeping over the goal cell's golden frame, in a random direction,
  // repeated after a random pause of 3-11 s.
  _addGoalShine() {
    const [gr, gc] = this.inst.goal.at
    const { x, y } = this._center(gr, gc)
    const s = CELL - GAP
    const h = s / 2

    // Mask = the frame only (a ring built from four bands; the outer corners stay rounded).
    const mask = this.make.graphics({ x, y }, false)
    mask.fillStyle(C.goalShine)
    mask.fillRoundedRect(-h, -h, s, FRAME, { tl: FRAME, tr: FRAME, bl: 0, br: 0 })
    mask.fillRoundedRect(-h, h - FRAME, s, FRAME, { tl: 0, tr: 0, bl: FRAME, br: FRAME })
    mask.fillRect(-h, -h + FRAME, FRAME, s - 2 * FRAME)
    mask.fillRect(h - FRAME, -h + FRAME, FRAME, s - 2 * FRAME)

    // A band of light, long enough to cover the cell's diagonal; it travels along its local x axis.
    const len = h * 1.5
    const shine = this.add.graphics({ x, y })
    shine.fillStyle(C.goalShine, 0.75)
    shine.fillRect(-8, -len, 16, 2 * len)
    shine.setMask(mask.createGeometryMask())
    shine.setVisible(false)

    const sweep = () => {
      const a = Math.random() * Math.PI * 2
      const dx = Math.cos(a) * len
      const dy = Math.sin(a) * len
      shine.setRotation(a + Phaser.Math.FloatBetween(-0.35, 0.35))  // slight random slant
      shine.setVisible(true)
      this.tweens.add({
        targets: shine,
        x: { from: x - dx, to: x + dx },
        y: { from: y - dy, to: y + dy },
        duration: 650,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          shine.setVisible(false)
          schedule()
        },
      })
    }
    const schedule = () => this.time.delayedCall(Phaser.Math.Between(3000, 11000), sweep)
    schedule()
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
      this.game.events.emit('won', { clicks: this.clicks })
    }
  }
}
