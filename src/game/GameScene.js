import Phaser from 'phaser'
import { phaser as C, palette } from '../theme.js'
import { CELL_STATES, defaultLook } from '../themes.js'
import { applyClick, clickRule, isWon } from '../engine/engine.js'
import { startBoard } from './startBoard.js'
import { INTRO_MS, neighbourCells } from '../engine/training.js'
import { emojiTexture, emojiDisplaySize } from './emojiTexture.js'

// Board-only scene. All rules live in src/engine/engine.js (shared with the tests and
// equivalent to the factory's engine); this scene draws the board, turns taps into
// engine calls and reports what happened through game events:
//   'boardClick'  { r, c, changed, board, clicks, rule, color }   every tap on a cell (also no-op
//                 taps); rule = rule-table index looked up, color = new colour (null if unchanged)
//   'won'         { clicks }                          the goal cell reached its goal colour (emitted at once;
//                                                     the React side delays the dialog briefly)
//
// What a cell shows (colour, or an emoji on a background) comes from the game's look: the
// active theme with its per-game choices drawn (src/themes.js drawLook, registry 'look'); the
// theme never changes what a tap does.
//
// Training castle (registry 'training' true, src/engine/training.js): the goal object blinks in the
// goal cell with a pointing hand for INTRO_MS at the start, and hovering a cell brightens its
// neighbours.
//
// The canvas size follows the board's shape (see boardCanvasSize), so any board up to
// 9 rows x 6 cols fills the available screen area with Phaser.Scale.FIT.

export const CELL = 96
export const GAP = 6
export const PAD = 14
const RADIUS = 10
const FRAME = 8            // width (and outer corner radius) of the golden frame on the goal cell
const EMOJI_SIZE = 54      // size of a theme's cell emoji in px (cells are CELL - GAP = 90 px)
const HOVER_ALPHA = 0.18   // training: white wash over the hovered cell's neighbours
const BLINK_MS = 250       // training intro: one fade of the blinking goal object

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
    this.board = startBoard(this.inst)
    const looks = this.registry.get('look') ?? defaultLook()
    this.cellLook = Object.fromEntries(CELL_STATES.map((v) => {
      const look = looks[v]
      const style = { color: look.emojiColor, glow: look.emojiGlow ? palette[look.emojiGlow] : null }
      return [v, {
        fill: C[look.fill], border: C[look.border], alpha: look.emojiAlpha ?? 1,
        emoji: look.emoji ? emojiTexture(this, look.emoji, EMOJI_SIZE, style) : null,
      }]
    }))
    this.clicks = 0
    this.won = false

    const { width, height } = boardCanvasSize(this.inst)
    this.add.rectangle(width / 2, height / 2, width, height, C.gameBg)

    this.cells = []
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < cols; c++) {
        const { x, y } = this._center(r, c)
        // One container per cell (tap animations move it): background + optional emoji.
        const g = this.add.graphics()
        const label = this.add.image(0, 0, '__DEFAULT').setVisible(false)
        const cell = this.add.container(x, y, [g, label])
        cell.g = g
        cell.label = label
        row.push(cell)
        this._drawCell(cell, r, c)
      }
      this.cells.push(row)
    }
    this._addGoalShine()

    this.training = Boolean(this.registry.get('training'))
    if (this.training) {
      this._addHover()
      if (this.registry.get('goalIntro') !== false) this._showGoalIntro()
    }

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

  _drawCell(cell, r, c) {
    const s = CELL - GAP
    const h = s / 2
    const v = this.board[r][c]
    const look = this.cellLook[v]
    const g = cell.g
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
    g.fillStyle(look.border)
    g.fillRoundedRect(-h + o, -h + o, s - 2 * o, s - 2 * o, rad)
    g.fillStyle(look.fill)
    g.fillRoundedRect(-h + o + 3, -h + o + 3, s - 2 * o - 6, s - 2 * o - 6, rad - 2)
    cell.label.setVisible(Boolean(look.emoji))
    if (look.emoji) {
      // the goal cell's emoji is a little smaller so it stays inside the golden frame
      const size = emojiDisplaySize(EMOJI_SIZE) * (o ? (s - 2 * o) / s : 1)
      cell.label.setTexture(look.emoji).setDisplaySize(size, size).setAlpha(look.alpha)
    }
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

  // Cell [r, c] under a pointer, or null off the board.
  _cellAt(pointer) {
    const c = Math.floor((pointer.x - PAD) / CELL)
    const r = Math.floor((pointer.y - PAD) / CELL)
    return r < 0 || r >= this.rows || c < 0 || c >= this.cols ? null : [r, c]
  }

  // Training: the neighbours of the hovered cell get a light wash (drawn above the cells).
  _addHover() {
    this.hover = this.add.graphics().setDepth(10)
    this.hoverAt = null
    const s = CELL - GAP
    const h = s / 2
    const draw = (at) => {
      const key = at ? at.join(',') : null
      if (key === this.hoverAt) return
      this.hoverAt = key
      this.hover.clear()
      if (!at || this.won) return
      this.hover.fillStyle(C.white, HOVER_ALPHA)
      for (const [nr, nc] of neighbourCells(at[0], at[1], this.rows, this.cols)) {
        const { x, y } = this._center(nr, nc)
        this.hover.fillRoundedRect(x - h, y - h, s, s, RADIUS)
      }
    }
    this.input.on('pointermove', (pointer) => draw(this._cellAt(pointer)))
    this.input.on('gameout', () => draw(null))
  }

  // Training: the goal object blinks in the goal cell for INTRO_MS, a hand points at it.
  _showGoalIntro() {
    const [gr, gc] = this.inst.goal.at
    const { x, y } = this._center(gr, gc)
    const look = this.cellLook[this.inst.goal.color]
    const inner = CELL - GAP - 2 * FRAME
    const parts = []
    if (look.emoji) {
      const size = emojiDisplaySize(EMOJI_SIZE) * inner / (CELL - GAP)
      parts.push(this.add.image(0, 0, look.emoji).setDisplaySize(size, size))
    } else {
      const g = this.add.graphics()
      g.fillStyle(look.border)
      g.fillRoundedRect(-inner / 2, -inner / 2, inner, inner, RADIUS - 4)
      g.fillStyle(look.fill)
      g.fillRoundedRect(-inner / 2 + 3, -inner / 2 + 3, inner - 6, inner - 6, RADIUS - 6)
      parts.push(g)
    }
    const goal = this.add.container(x, y, parts).setDepth(11).setAlpha(0)
    this.tweens.add({
      targets: goal, alpha: { from: 0, to: 1 }, duration: BLINK_MS, yoyo: true,
      repeat: Math.max(0, Math.round(INTRO_MS / (2 * BLINK_MS)) - 1),
      onComplete: () => goal.destroy(),
    })
    // The hand sits in the neighbouring column, pointing at the goal (left of it if possible).
    const fromLeft = gc > 0 || this.cols === 1
    const hx = fromLeft ? x - CELL * 0.78 : x + CELL * 0.78
    const hand = this.add.image(hx, y, emojiTexture(this, fromLeft ? '👉' : '👈', EMOJI_SIZE))
      .setDisplaySize(emojiDisplaySize(EMOJI_SIZE), emojiDisplaySize(EMOJI_SIZE)).setDepth(12)
    const bob = this.tweens.add({ targets: hand, x: hx + (fromLeft ? 10 : -10), duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.time.delayedCall(INTRO_MS, () => {
      bob.stop()
      this.tweens.add({ targets: hand, alpha: 0, duration: 200, onComplete: () => hand.destroy() })
    })
  }

  _onPointerDown(pointer) {
    if (this.won) return
    const at = this._cellAt(pointer)
    if (!at) return
    const [r, c] = at

    const rule = clickRule(this.board, r, c)
    const next = applyClick(this.board, r, c, this.inst.rule.table)
    const cell = this.cells[r][c]
    this.clicks += 1
    if (next) {
      this.board = next
      this._drawCell(cell, r, c)
      this.tweens.add({ targets: cell, scale: { from: 0.82, to: 1 }, duration: 160, ease: 'Back.easeOut' })
    } else {
      // No-op tap: tiny wiggle so the player sees the tap registered.
      this.tweens.add({ targets: cell, angle: { from: -5, to: 0 }, duration: 160, ease: 'Sine.easeOut' })
    }
    this.game.events.emit('boardClick', {
      r, c, changed: Boolean(next), board: this.board, clicks: this.clicks, rule, color: next ? next[r][c] : null,
    })

    if (next && isWon(this.inst, this.board)) {
      this.won = true
      this.hover?.clear()
      this.game.events.emit('won', { clicks: this.clicks })
    }
  }
}
