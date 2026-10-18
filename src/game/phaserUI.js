// Carried over from Maze Inc. (src/games/shared/phaserUI.js) -- only the win celebration is used.

// ── Win celebration (food rain + floating overlay text) ─────────────────────
// Same look/timing as Lasercut's original win rain — kept here so every
// Phaser game can trigger an identical celebration on a win.

const WIN_FOODS = ['🍩', '🍬', '🍓', '🧁', '🍪', '🍭']
const WIN_SPAWN_MS = 4000           // how long new food keeps spawning
const WIN_SPAWN_INTERVAL_MS = 180   // ms between each falling food spawn

/**
 * Rains falling food emoji across the whole canvas. New pieces spawn for
 * WIN_SPAWN_MS, then spawning stops; `onDone` (optional) fires once every
 * already-falling piece has reached the bottom and been destroyed.
 *
 * @param {Phaser.Scene} scene
 * @param {number}       W       canvas width
 * @param {number}       H       canvas height
 * @param {Function}     [onDone]
 */
export function startFoodRain(scene, W, H, onDone) {
  let activeCount = 0
  let spawningDone = false

  const maybeAdvance = () => {
    if (spawningDone && activeCount === 0) onDone?.()
  }

  const spawnFood = () => {
    activeCount++
    const emoji = WIN_FOODS[Math.floor(Math.random() * WIN_FOODS.length)]
    const size = 26 + Math.random() * 18
    const x = Math.random() * W
    const item = scene.add.text(x, -40, emoji, { fontSize: `${size}px` }).setOrigin(0.5).setDepth(40)
    const endAngle = (Math.random() - 0.5) * 360
    scene.tweens.add({
      targets: item,
      y: H + 40,
      angle: endAngle,
      duration: 1800 + Math.random() * 1200,
      ease: 'Linear',
      onComplete: () => {
        item.destroy()
        activeCount--
        maybeAdvance()
      },
    })
  }

  spawnFood()
  const spawnTimer = scene.time.addEvent({ delay: WIN_SPAWN_INTERVAL_MS, callback: spawnFood, loop: true })

  scene.time.delayedCall(WIN_SPAWN_MS, () => {
    spawnTimer.remove()
    spawningDone = true
    maybeAdvance()
  })
}
