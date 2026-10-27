import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { palette } from '../theme.js'

/**
 * Mounts a Phaser game inside `containerRef` (pattern carried over from Maze Inc.).
 *
 * The game is created once on mount and destroyed on unmount. Retry / a new instance is
 * handled by React remounting the component via a `key` prop change -- not by re-running
 * this effect.
 *
 * @param {React.RefObject<HTMLElement>} containerRef
 * @param {typeof Phaser.Scene}          SceneClass
 * @param {object}  opts
 * @param {number}  opts.width, opts.height   internal canvas resolution
 * @param {object}  opts.registry             values put into game.registry before the scene starts
 * @param {object}  opts.on                   { eventName: handler } for game.events
 */
export function usePhaserGame(containerRef, SceneClass, { width, height, registry = {}, on = {} }) {
  const handlersRef = useRef(on)
  handlersRef.current = on

  useEffect(() => {
    // React 18 StrictMode double-invokes effects in dev; clear any leftover canvas first.
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild)
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: palette.gameBg,
      scene: [],
      banner: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: containerRef.current,
        width,
        height,
      },
    })
    for (const [k, v] of Object.entries(registry)) game.registry.set(k, v)
    for (const name of Object.keys(handlersRef.current)) {
      game.events.on(name, (payload) => handlersRef.current[name]?.(payload))
    }
    game.scene.add('main', SceneClass, true)

    // Refit whenever the container changes size (phone rotation, address bar, layout changes).
    // Phaser alone can get stuck here: when it applies a resize it computes the board from the
    // container size it measured earlier, then re-measures and stores the new size WITHOUT
    // applying it. If the container was still changing (it is, mid-rotation on a phone), the final
    // size counts as already handled and the board keeps the landscape size until the next
    // rotation. So: measure first, then apply -- every time the container settles on a new size.
    const resizeObserver = new ResizeObserver(() => {
      if (!game.isBooted) return
      game.scale.getParentBounds()
      game.scale.refresh()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      game.destroy(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
