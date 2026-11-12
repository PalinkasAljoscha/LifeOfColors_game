import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../theme.js'
import { CASTLE_COUNT, TUTORIAL_CASTLE, highestUnlocked } from '../engine/castles.js'
import { LAND_BOX, SITE_BOX, siteFor } from '../sites.js'

// The home-screen map: the levels ("castles" in the code) as different places -- a castle, a forest
// hut, a tavern, ... (src/sites.js: which level is which place) -- each with its own bit of
// landscape, joined by a path, stacked from bottom (castle 0, the training castle) to top. Shown: every open castle plus the next locked one (grey, dashed path);
// everything above fades into fog. The map scrolls vertically (no visible scroll bar) and one
// screen holds about three castles; it opens with the player's current castle (the highest open
// one) in the middle of the screen -- for castle 0 extra landscape below it makes that possible.
// Each castle where stars were collected shows "stars / required" (the training castle: puzzles
// won / all of them).
// Drawing is SVG (decoration only, nothing moves); the places themselves are HTML buttons laid over
// it. A place's label is its name with the level number: "Forest hut (1)".

const FLAG_COLORS = [palette.cellOrangeFill, palette.cellGreenFill, palette.cellBlueFill]
const FIELD_COLORS = [palette.mapFieldGreen, palette.mapFieldWheat, palette.mapFieldEarth]

// Small deterministic random numbers (same landscape on every visit).
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Remembered for this page session, so coming back from a castle keeps the map where it was
// (unless a new castle opened meanwhile: then the map centres on that one).
let savedScroll = null
let savedTop = null

// The pictures of the places: <site>.svg (open), <site>-locked.svg (grey, padlock), <site>-land.svg.
const PICTURES = import.meta.glob('../assets/sites/*.svg', { eager: true, import: 'default' })
const picture = (name) => PICTURES[`../assets/sites/${name}.svg`]

// A box of a picture (sites.js SITE_BOX / LAND_BOX, in units of size / 100) on the map: x, y is the
// place's centre as the map lays it out; its ground line lies 0.4 size below.
const placed = (box, x, y, size) => {
  const k = size / 100
  return { x: x + box.x * k, y: y + size * 0.4 + box.y * k, width: box.w * k, height: box.h * k }
}

// The bit of landscape around a place (hedges and statues at the manor, a pond at the tower, ...).
function Land({ x, y, size, site }) {
  return <image href={picture(`${site}-land`)} {...placed(LAND_BOX, x, y, size)} />
}

// One place. The castle's flag is drawn here because its colour changes from castle to castle.
function Site({ x, y, size, site, locked, flag }) {
  const k = size / 100, ground = y + size * 0.4
  const fx = x + 37 * k, fy = ground - 109.6 * k
  return (
    <g>
      <image href={picture(locked ? `${site}-locked` : site)} {...placed(SITE_BOX, x, y, size)} />
      {site === 'castle' && !locked && (
        <g>
          <line x1={fx} y1={fy} x2={fx} y2={fy - 21 * k} stroke={palette.castleGate} strokeWidth="1.5" />
          <path d={`M ${fx} ${fy - 21 * k} l ${20 * k} ${5.6 * k} l ${-20 * k} ${5.6 * k} z`} fill={flag} />
        </g>
      )}
    </g>
  )
}

function Tree({ x, y, r, light }) {
  return (
    <g>
      <rect x={x - r * 0.15} y={y} width={r * 0.3} height={r * 0.8} fill={palette.mapTreeTrunk} />
      <circle cx={x} cy={y - r * 0.1} r={r} fill={light ? palette.mapTreeTopLight : palette.mapTreeTop} />
      <circle cx={x + r * 0.45} cy={y + r * 0.15} r={r * 0.65} fill={palette.mapTreeTop} />
    </g>
  )
}

function Field({ x, y, w, h, angle, color }) {
  return (
    <g transform={`rotate(${angle} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={color} />
      {Array.from({ length: Math.floor(h / 9) }, (_, i) => (
        <line key={i} x1={x + 5} x2={x + w - 5} y1={y + 6 + i * 9} y2={y + 6 + i * 9}
              stroke={palette.mapFurrow} strokeWidth="1" opacity="0.35" />
      ))}
    </g>
  )
}

export default function CastleMap({ states, loadingCastle, onSelect }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)
  const [box, setBox] = useState(null)          // { w, h } of the visible map area

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setBox((b) => (b && b.w === el.clientWidth && b.h === el.clientHeight
      ? b : { w: el.clientWidth, h: el.clientHeight }))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const top = highestUnlocked(states)
  const shown = Math.min(CASTLE_COUNT, top + 2, states.length)        // open castles + the next locked one
  const W = box?.w ?? 360
  const seg = Math.max(150, (box?.h ?? 480) / 3)                       // about three castles per screen
  const fogH = shown < CASTLE_COUNT ? seg * 0.9 : seg * 0.35
  // room below castle 0, so that even castle 0 can be scrolled to the middle of the screen
  const bottomPad = Math.max(seg * 0.55, (box?.h ?? 480) / 2)
  const H = fogH + (shown - 1) * seg + bottomPad + seg * 0.15
  const size = Math.min(84, seg * 0.42)
  const pos = (i) => ({ x: W * (0.5 + 0.2 * Math.sin(i * 2.1 + 0.4)), y: H - bottomPad - i * seg })

  // Start with the current (highest open) castle in the middle of the screen, or where the player
  // left the map if no new castle opened since.
  const ready = box !== null
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !ready) return
    const centred = Math.max(0, pos(top).y - el.clientHeight / 2)
    el.scrollTop = savedScroll !== null && savedTop === top ? savedScroll : centred
    savedScroll = el.scrollTop
    savedTop = top
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const path = (a, b) => {
    const dy = (b.y - a.y) / 2
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`
  }

  // Landscape: every place brings its own (Land). Only the stretch below the training castle, where
  // no place stands, gets a couple of fields and trees per band, kept off the path.
  const scenery = []
  const bands = Math.ceil(bottomPad / seg)
  const below = pos(0).y + size * 1.1            // clear of the training castle and its own landscape
  for (let b = 0; b < bands; b++) {
    const r = rng(b + 11)
    const yBase = H - b * seg
    const px = pos(b).x
    for (let k = 0; k < 2; k++) {
      const leftSide = (k === 0) === (px > W / 2)
      const fw = 60 + r() * 50, fh = 30 + r() * 26
      const fx = leftSide ? 6 + r() * Math.max(0, W * 0.32 - fw) : W * 0.66 + r() * Math.max(0, W * 0.32 - fw)
      const fy = yBase - seg * (0.25 + 0.45 * r())
      const field = <Field key={`f${b}-${k}`} x={fx} y={fy} w={fw} h={fh}
                           angle={-12 + r() * 24} color={FIELD_COLORS[Math.floor(r() * 3)]} />
      if (fy > below) scenery.push(field)
    }
    const trees = 2 + Math.floor(r() * 2)
    for (let k = 0; k < trees; k++) {
      const leftSide = r() < 0.5
      const tx = leftSide ? 14 + r() * W * 0.2 : W * 0.8 + r() * W * 0.15
      const ty = yBase - seg * r()
      const tree = <Tree key={`t${b}-${k}`} x={tx} y={ty} r={7 + r() * 5} light={r() < 0.5} />
      if (ty > below) scenery.push(tree)
    }
  }

  return (
    <div ref={scrollRef} className="no-scrollbar relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-2xl"
         onScroll={(e) => { savedScroll = e.currentTarget.scrollTop }}
         style={{ background: palette.mapGrass }}>
      {box && (
        <div className="relative" style={{ height: H }}>
          <svg width={W} height={H} className="absolute inset-0" aria-hidden="true">
            {scenery}
            {Array.from({ length: shown }, (_, i) => <Land key={i} {...pos(i)} size={size} site={siteFor(i)} />)}
            {/* path on into the fog above the last shown castle */}
            {shown < CASTLE_COUNT && (
              <path d={path(pos(shown - 1), { x: W * 0.5, y: 0 })} fill="none" stroke={palette.mapPathLocked}
                    strokeWidth="6" strokeLinecap="round" strokeDasharray="2 12" opacity="0.5" />
            )}
            {Array.from({ length: shown - 1 }, (_, i) => {
              const d = path(pos(i), pos(i + 1))
              return states[i + 1].unlocked ? (
                <g key={i}>
                  <path d={d} fill="none" stroke={palette.mapPathEdge} strokeWidth="11" strokeLinecap="round" />
                  <path d={d} fill="none" stroke={palette.mapPath} strokeWidth="7" strokeLinecap="round" />
                </g>
              ) : (
                <path key={i} d={d} fill="none" stroke={palette.mapPathLocked}
                      strokeWidth="7" strokeLinecap="round" strokeDasharray="2 12" />
              )
            })}
            {Array.from({ length: shown }, (_, i) => (
              <Site key={i} {...pos(i)} size={size} site={siteFor(i)} locked={!states[i].unlocked} flag={FLAG_COLORS[i % 3]} />
            ))}
          </svg>

          {/* fog over the castles not reached yet */}
          <div className="absolute inset-x-0 top-0 pointer-events-none"
               style={{ height: fogH * 1.2, background: `linear-gradient(${palette.gameBg}, ${palette.gameBg}00)` }} />

          {Array.from({ length: shown }, (_, i) => {
            const s = states[i]
            const { x, y } = pos(i)
            const name = i === TUTORIAL_CASTLE ? t('castles.tutorial') : t('castles.name', { site: t(`sites.${siteFor(i)}`), n: i })
            const label = s.unlocked
              ? `${name}: ${t(s.training ? 'castles.progressTraining' : 'castles.progress',
                  { stars: s.stars, solved: s.solved, required: s.required })}`
              : `${name}: ${t('castles.locked')}`
            const badgeRight = x < W / 2                                // badge on the side with more room
            return (
              <div key={i}>
                <button
                  onClick={() => s.unlocked && onSelect(i)}
                  disabled={!s.unlocked || loadingCastle !== null}
                  aria-label={label}
                  className="absolute rounded-2xl active:scale-95 transition-transform disabled:cursor-default"
                  style={{ left: x - size * 0.7, top: y - size * 1.1, width: size * 1.4, height: size * 1.55 }}
                />
                <span className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-black
                                 bg-game-badge/80 pointer-events-none"
                      style={{ left: x, top: y + size * 0.5, opacity: s.unlocked ? 1 : 0.7 }} aria-hidden="true">
                  {loadingCastle === i ? '…' : name}
                </span>
                {s.unlocked && (s.training ? s.solved > 0 : s.stars > 0) && (
                  <span className="absolute -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-black
                                   bg-game-badge ring-2 pointer-events-none"
                        style={{
                          top: y - size * 0.3,
                          ...(badgeRight ? { left: x + size * 0.62 } : { right: W - x + size * 0.62 }),
                          '--tw-ring-color': s.done ? palette.correctGreen : palette.starGold,
                        }}
                        aria-hidden="true">
                    {s.training
                      ? <span style={{ color: palette.correctGreen }}>✓ {s.solved}</span>
                      : <span className="text-game-star">★ {s.stars}</span>}
                    <span className="text-game-silver"> / {s.required}</span>
                    {s.done && <span style={{ color: palette.correctGreen }}> ✓</span>}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
