// Screen height for the full-height screens (.app-h in index.css).
//
// The screens used 100dvh, but some mobile browsers (notably iOS Safari) sometimes keep the old
// value after a rotation until the next viewport change: the game screen then kept its landscape
// height after turning back to portrait and the board was fitted into that small area until the
// next rotation. Here the height comes from window.innerHeight, set on every resize / rotation and
// re-checked a few times afterwards, because the browser reports the final size only once its
// rotation animation and address bar have settled. CSS falls back to 100dvh until this runs.

const RECHECK_MS = [100, 300, 700, 1200]

function apply() {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`)
}

export function trackViewportHeight() {
  let timers = []
  const update = () => {
    apply()
    timers.forEach(clearTimeout)
    timers = RECHECK_MS.map((ms) => setTimeout(apply, ms))
  }
  apply()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
  window.visualViewport?.addEventListener('resize', update)
  screen.orientation?.addEventListener?.('change', update)
}
