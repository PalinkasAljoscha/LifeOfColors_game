import { useId } from 'react'
import { palette } from '../theme.js'

// The wildcard (src/wildcards.js): a playing card with a key on it and a small gold star in each
// corner. Flat like the map; drawn in a 40 x 56 box, scaled to `width`. The gold is shiny: a
// gradient from a bright top to a deep bottom, and a few white glints.
const STAR = 'M0,-1 L0.29,-0.31 L0.95,-0.31 L0.42,0.12 L0.59,0.81 L0,0.42 L-0.59,0.81 L-0.42,0.12 L-0.95,-0.31 L-0.29,-0.31 Z'

// a four-pointed glint
const GLINT = 'M0,-1 L0.18,-0.18 L1,0 L0.18,0.18 L0,1 L-0.18,0.18 L-1,0 L-0.18,-0.18 Z'

export default function WildcardCard({ width = 28, className, style }) {
  const id = useId().replace(/:/g, '')
  const gold = `url(#${id}-gold)`
  return (
    <svg viewBox="0 0 40 56" width={width} height={width * 1.4} className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={palette.wildcardGoldHi} />
          <stop offset="0.45" stopColor={palette.starGold} />
          <stop offset="1" stopColor={palette.wildcardGoldLo} />
        </linearGradient>
      </defs>
      <rect x="1.5" y="2.5" width="37" height="53" rx="5" fill={palette.overlayBlack} opacity="0.35" />
      <rect x="1" y="1" width="37" height="53" rx="5" fill={palette.wildcardFace} stroke={palette.wildcardEdge} strokeWidth="1.6" />
      <rect x="4" y="4" width="31" height="47" rx="3" fill="none" stroke={palette.wildcardEdge} strokeOpacity="0.55" strokeWidth="0.8" />
      {[[8, 8.5], [31, 8.5], [8, 46.5], [31, 46.5]].map(([x, y]) => (
        <path key={`${x},${y}`} d={STAR} transform={`translate(${x},${y}) scale(3.4)`} fill={gold}
              stroke={palette.wildcardEdge} strokeWidth="0.15" />
      ))}
      {/* the key: a ring bow, a shaft and two bits, turned a little */}
      <g transform="rotate(-35 19.5 27.5)" fill={gold} stroke={palette.wildcardKeyEdge} strokeWidth="0.9">
        <path d="M19.5,15.5 a6,6 0 1 1 -0.01,0 Z M19.5,18.6 a2.9,2.9 0 1 0 0.01,0 Z" fillRule="evenodd" />
        <rect x="18.1" y="26.6" width="2.8" height="16" rx="1" />
        <rect x="20.4" y="36.2" width="4.6" height="2.4" rx="0.6" />
        <rect x="20.4" y="40" width="3.4" height="2.4" rx="0.6" />
      </g>
      {/* glints on the gold */}
      <path d={GLINT} transform="translate(15.2,17.2) scale(3.4)" fill={palette.wildcardGlint} opacity="0.95" />
      <path d={GLINT} transform="translate(9.8,7) scale(2.3)" fill={palette.wildcardGlint} opacity="0.9" />
      <path d={GLINT} transform="translate(30.4,44.6) scale(2)" fill={palette.wildcardGlint} opacity="0.8" />
    </svg>
  )
}
