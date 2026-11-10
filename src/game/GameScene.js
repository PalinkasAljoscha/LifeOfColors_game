import Phaser from 'phaser'
import { phaser as C, palette } from '../theme.js'
import { CELL_STATES, defaultLook } from '../themes.js'
import { tap, specials } from '../engine/engine.js'
import { startState } from './startBoard.js'
import { INTRO_MS, neighbourCells } from '../engine/training.js'
import { emojiTexture, emojiDisplaySize } from './emojiTexture.js'

// Board-only scene. All rules live in src/engine/engine.js (shared with the tests and
// equivalent to the factory's engine); this scene draws the board, turns taps into
// engine calls and reports what happened through game events:
//   'boardClick'  { r, c, changed, board, clicks, rule, color }   every tap on a cell (also no-op
//                 taps); rule = rule-table index looked up, color = new colour (null if unchanged)
//   'won'         { clicks }                          the goal cell reached its goal colour (emitted at once;
//                                                     the React side delays the dialog briefly)
//   'specialTap'  { kind, r, c, taps }                a tap on a blocked / clock cell (ignored) or on the
//                                                     bomb below its taps_to_explode (kind 'bomb', taps =
//                                                     taps so far); 'boardClick' (changed false) comes too
//   'boom'        { r, c, byTap }                     the bomb went off -- emitted 300 ms after the tap when
//                                                     a colour set it off (the triggering colour is shown
//                                                     meanwhile), at once for the last tap on the bomb. The
//                                                     scene takes no more taps; React shows the explosion
//                                                     and the rubble, and its Retry remounts the board.
//
// Special cells (src/engine/engine.js tap, schema board.special_cells): blocked cells are dark,
// hatched holes; the bomb cell shows a bomb (NOT which object sets it off -- that is for the player
// to find out); both mirror cells get a frame, a translucent mirror sheen over the whole cell (the
// state stays visible) and a dashed straight line between them; the clock cell bulges out (rounded square + a circle big enough to hide the
// square's corners, drawn above its neighbours, may reach over them or off the board) and shows its
// colour cycle as states placed on a circle (no ring line drawn) -- the current state big at the top, the others small and faded -- that turns counter-
// clockwise by one step (CLOCK_TURN_MS) after every move. When the bomb goes off the cells are
// knocked out of line (_wreck: shifted, tilted, squeezed, overlapping).
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
const CLOCK_BULGE = 1.34   // the clock cell's circle: this x the cell's half side as radius (covers the square's corners)
const CLOCK_R = 31         // radius of the clock's ring of states (cells are 90 px)
const CLOCK_BIG = 38       // size of the current state on the ring
const CLOCK_SMALL = 23     // size of the other states
const CLOCK_TURN_MS = 450  // one step of the ring
export const BOOM_SHOW_MS = 300   // the triggering colour is shown this long before the explosion

/** Screen geometry of cell (r, c) of the board canvas inside `boardEl` (its Board container):
 *  { x, y } = centre and size = side in CSS pixels, relative to boardEl; null if not mounted. */
export function cellOnScreen(boardEl, inst, r, c) {
  const canvas = boardEl?.querySelector('canvas')
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const box = boardEl.getBoundingClientRect()
  const k = rect.width / boardCanvasSize(inst).width
  return {
    x: rect.left - box.left + (PAD + c * CELL + CELL / 2) * k,
    y: rect.top - box.top + (PAD + r * CELL + CELL / 2) * k,
    size: (CELL - GAP) * k,
    board: { left: rect.left - box.left, top: rect.top - box.top, width: rect.width, height: rect.height },
  }
}

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
    this.state = startState(this.inst)   // { board, bombTaps, hideStart } (src/engine/engine.js)
    this.special = specials(this.inst)
    this.locked = false                   // the bomb went off: no more taps
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
    this._addSpecials()

    this.training = Boolean(this.registry.get('training'))
    if (this.training) {
      this._addHover()
      if (this.registry.get('goalIntro') !== false) this._showGoalIntro()
    }

    this.input.on('pointerdown', this._onPointerDown, this)
    this.game.events.emit('sceneReady', this)
  }

  get board() {
    return this.state.board
  }

  _center(r, c) {
    return { x: PAD + c * CELL + CELL / 2, y: PAD + r * CELL + CELL / 2 }
  }

  _isGoal(r, c) {
    const [gr, gc] = this.inst.goal.at
    return r === gr && c === gc
  }

  // 'blocked' | 'bomb' | 'clock' | null: the special cell drawn at (r, c) (mirror cells look normal).
  _specialAt(r, c) {
    const sp = this.special
    if (sp.blocked.some(([x, y]) => x === r && y === c)) return 'blocked'
    if (sp.bomb && sp.bomb.at[0] === r && sp.bomb.at[1] === c) return 'bomb'
    if (sp.clock && sp.clock.at[0] === r && sp.clock.at[1] === c) return 'clock'
    return null
  }

  _drawCell(cell, r, c) {
    const s = CELL - GAP
    const h = s / 2
    const kind = this._specialAt(r, c)
    if (kind) {
      this._drawSpecialCell(cell, kind)
      return
    }
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

  // Blocked / bomb / clock cell background (their content: _addSpecials).
  _drawSpecialCell(cell, kind) {
    const s = CELL - GAP
    const h = s / 2
    const g = cell.g
    g.clear()
    const [fill, border] = kind === 'blocked' ? [C.blockedFill, C.blockedBorder]
      : kind === 'bomb' ? [C.bombFill, C.bombBorder] : [C.clockFace, C.clockRing]
    g.fillStyle(border)
    g.fillRoundedRect(-h, -h, s, s, RADIUS)
    if (kind === 'clock') g.fillCircle(0, 0, h * CLOCK_BULGE)       // the bulge: square + circle
    g.fillStyle(fill)
    g.fillRoundedRect(-h + 3, -h + 3, s - 6, s - 6, RADIUS - 2)
    if (kind === 'clock') g.fillCircle(0, 0, h * CLOCK_BULGE - 3)
    if (kind === 'blocked') {
      // diagonal hatching inside the cell: lines x - y = d, clipped to the inner square
      const lo = -h + 7, hi = h - 7
      g.lineStyle(3, C.blockedHatch, 1)
      for (let d = -(hi - lo) + 8; d < hi - lo; d += 14) {
        const x1 = Math.max(lo, lo + d), x2 = Math.min(hi, hi + d)
        g.lineBetween(x1, x1 - d, x2, x2 - d)
      }
    }
    if (kind !== 'bomb') cell.label.setVisible(false)
  }

  // Special-cell decorations, once: bomb + trigger badge, mirror frames + link, the clock's ring.
  _addSpecials() {
    const sp = this.special
    const s = CELL - GAP
    const h = s / 2
    const item = (v, size) => {
      // one state as the board draws it: its emoji (or drawn object), else a small colour square
      const look = this.cellLook[v]
      if (look.emoji) {
        const img = this.add.image(0, 0, look.emoji).setAlpha(look.alpha)
        img.sizeTo = (px) => img.setDisplaySize(emojiDisplaySize(px), emojiDisplaySize(px))
        img.sizeTo(size)
        return img
      }
      const g = this.add.graphics()
      g.fillStyle(look.border)
      g.fillRoundedRect(-10, -10, 20, 20, 5)
      g.fillStyle(look.fill)
      g.fillRoundedRect(-8, -8, 16, 16, 4)
      g.sizeTo = (px) => g.setScale(px / 20)
      g.sizeTo(size)
      return g
    }
    if (sp.bomb) {
      const [r, c] = sp.bomb.at
      const cell = this.cells[r][c]
      const size = emojiDisplaySize(EMOJI_SIZE * 0.85)
      cell.label.setTexture(emojiTexture(this, '💣', EMOJI_SIZE)).setDisplaySize(size, size).setAlpha(1).setVisible(true)
      this.bombCell = cell
    }
    if (sp.mirror) {
      const link = this.add.graphics().setDepth(5)
      // the link: a dashed straight line between the two cells, from frame edge to frame edge
      const [a, b] = sp.mirror.map(([r, c]) => this._center(r, c))
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy)
      const ux = dx / len, uy = dy / len
      const t0 = Math.min(h / Math.max(Math.abs(ux), 1e-6), h / Math.max(Math.abs(uy), 1e-6)) + 4
      link.lineStyle(3, C.mirrorLink, 0.55)
      for (let t = t0; t < len - t0; t += 16) {
        const t1 = Math.min(t + 8, len - t0)
        link.lineBetween(a.x + ux * t, a.y + uy * t, a.x + ux * t1, a.y + uy * t1)
      }
      link.lineStyle(4, C.mirrorLink, 0.95)
      for (const [r, c] of sp.mirror) {
        const p = this._center(r, c)
        // mirror sheen over the whole cell: a light tint and two diagonal glints, clipped to the cell
        const mask = this.make.graphics({ x: p.x, y: p.y }, false)
        mask.fillStyle(C.white)
        mask.fillRoundedRect(-h, -h, s, s, RADIUS)
        const sheen = this.add.graphics({ x: p.x, y: p.y }).setDepth(4)
        sheen.fillStyle(C.mirrorLink, 0.13)
        sheen.fillRect(-h, -h, s, s)
        sheen.fillStyle(C.mirrorGlint, 0.24)
        sheen.fillPoints([{ x: -h - 10, y: h - 22 }, { x: h - 22, y: -h - 10 }, { x: h + 4, y: -h - 10 }, { x: -h - 10, y: h + 4 }], true)
        sheen.fillStyle(C.mirrorGlint, 0.14)
        sheen.fillPoints([{ x: -h + 14, y: h + 10 }, { x: h + 10, y: -h + 14 }, { x: h + 10, y: -h + 24 }, { x: -h + 24, y: h + 10 }], true)
        sheen.setMask(mask.createGeometryMask())
        link.strokeRoundedRect(p.x - h - 2, p.y - h - 2, s + 4, s + 4, RADIUS + 2)
      }
    }
    if (sp.clock) {
      const [r, c] = sp.clock.at
      const cell = this.cells[r][c]
      cell.setDepth(3)            // the bulge reaches over the neighbouring cells
      this.clockCell = cell
      this.clockItems = sp.clock.cycle.map((v) => {
        const it = item(v, CLOCK_SMALL)
        cell.add(it)
        return it
      })
      this.clockIndex = sp.clock.cycle.indexOf(this.board[r][c])
      this._layoutClock(0)
    }
  }

  // The clock's ring with the turn `t` (0..1) of the step to the next state done: the current
  // state at the top, big and opaque; the others along the ring clockwise in cycle order, small
  // and faded. Turning moves every state counter-clockwise by one place.
  _layoutClock(t) {
    const n = this.clockItems.length
    let top = null
    this.clockItems.forEach((it, k) => {
      const slot = (((k - this.clockIndex - t) % n) + n) % n
      const far = Math.min(1, Math.min(slot, n - slot))   // 0 at the top, 1 one place away or more
      const a = -Math.PI / 2 + (slot * 2 * Math.PI) / n
      it.setPosition(CLOCK_R * Math.cos(a), CLOCK_R * Math.sin(a))
      it.sizeTo(CLOCK_BIG - (CLOCK_BIG - CLOCK_SMALL) * far)
      it.setAlpha(1 - 0.45 * far)
      if (far < 0.5) top = it
    })
    if (top) this.clockCell.bringToTop(top)
  }

  _turnClock() {
    const [r, c] = this.special.clock.at
    const target = this.special.clock.cycle.indexOf(this.board[r][c])
    this.clockTurn?.stop()
    this._layoutClock(0)
    const turn = { t: 0 }
    this.clockTurn = this.tweens.add({
      targets: turn, t: 1, duration: CLOCK_TURN_MS, ease: 'Sine.easeInOut',
      onUpdate: () => this._layoutClock(turn.t),
      onComplete: () => { this.clockIndex = target; this.clockTurn = null; this._layoutClock(0) },
      onStop: () => { this.clockIndex = target; this._layoutClock(0) },
    })
  }

  // The bomb went off: every cell is knocked out of line -- shifted, tilted and squeezed, the more the
  // nearer the blast at (br, bc), overlapping in a random order. Jerky on purpose
  // (a few steps, no smooth tween); happens under the BOOM, so the player sees the result after it.
  _wreck(br, bc) {
    const rnd = (a, b) => a + Math.random() * (b - a)
    const order = []
    this.cells.forEach((row, r) => row.forEach((cell, c) => order.push({ cell, r, c })))
    for (const { cell, r, c } of order) {
      const near = Math.max(0, 1 - 0.28 * Math.max(Math.abs(r - br), Math.abs(c - bc)))
      const push = 10 + 26 * near
      const awayX = Math.sign(c - bc) || (Math.random() < 0.5 ? -1 : 1)
      const awayY = Math.sign(r - br) || (Math.random() < 0.5 ? -1 : 1)
      const to = {
        x: cell.x + awayX * rnd(0.3, 1) * push + rnd(-6, 6),
        y: cell.y + awayY * rnd(0.3, 1) * push + rnd(-6, 6),
        angle: rnd(-1, 1) * (8 + 28 * near),
        scaleX: rnd(0.78, 1.08), scaleY: rnd(0.72, 1.05),
      }
      this.tweens.add({ targets: cell, ...to, duration: 240, ease: 'Stepped', easeParams: [3] })
      cell.setDepth(Math.random() * 2)
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
    if (this.won || this.locked) return
    const at = this._cellAt(pointer)
    if (!at) return
    const [r, c] = at

    const res = tap(this.inst, this.state, r, c)   // the full rule, incl. special cells
    const cell = this.cells[r][c]
    this.clicks += 1
    const click = (changed) => this.game.events.emit('boardClick', {
      r, c, changed, board: this.board, clicks: this.clicks, rule: res.rule, color: changed ? res.changed[0][2] : null,
    })
    const pop = (x, y) => this.tweens.add({ targets: this.cells[x][y], scale: { from: 0.82, to: 1 }, duration: 160, ease: 'Back.easeOut' })
    const wiggle = (target, deg = 5) => this.tweens.add({ targets: target, angle: { from: -deg, to: 0 }, duration: 160, ease: 'Sine.easeOut' })

    if (res.event === 'move') {
      this.state = res.state
      for (const [x, y] of res.changed) {
        if (this.special.clock && this.special.clock.at[0] === x && this.special.clock.at[1] === y) {
          this._turnClock()
        } else {
          this._drawCell(this.cells[x][y], x, y)
          pop(x, y)
        }
      }
      click(true)
      if (res.won) {
        this.won = true
        this.hover?.clear()
        this.game.events.emit('won', { clicks: this.clicks })
      }
    } else if (res.event === 'noop') {
      wiggle(cell)   // tiny wiggle so the player sees the tap registered
      click(false)
    } else if (res.event === 'ignored') {
      click(false)   // blocked / clock cell: nothing happens (React explains it on the first tap)
      this.game.events.emit('specialTap', { kind: this.special.type, r, c, taps: 0 })
    } else if (res.event === 'bomb_warn') {
      this.state = res.state
      this.tweens.add({ targets: cell, angle: { from: -12, to: 0 }, duration: 260, ease: 'Elastic.easeOut' })
      click(false)
      this.game.events.emit('specialTap', { kind: 'bomb', r, c, taps: res.state.bombTaps })
    } else if (res.event === 'boom') {
      this.locked = true
      this.hover?.clear()
      click(false)   // the triggering tap is no move
      const byTap = res.shown === this.board
      if (!byTap) {
        // show the triggering colour for a moment (the state itself is already back at the start)
        const shownState = { ...this.state, board: res.shown }
        const keep = this.state
        this.state = shownState
        for (const [x, y] of res.changed) {
          this._drawCell(this.cells[x][y], x, y)
          pop(x, y)
        }
        this.state = keep
      }
      this.time.delayedCall(byTap ? 0 : BOOM_SHOW_MS, () => {
        this.game.events.emit('boom', { r, c, byTap })
        this._wreck(r, c)
      })
    }
  }
}
