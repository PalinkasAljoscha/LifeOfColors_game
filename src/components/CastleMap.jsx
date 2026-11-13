import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../theme.js'
import { TUTORIAL_CASTLE, highestUnlocked } from '../engine/castles.js'
import { LAND_BOX, SITE_BOX, siteFor } from '../sites.js'

// The home-screen map: the levels ("castles" in the code) as different places -- a castle, a forest
// hut, a tavern, ... (src/sites.js: which level is which place) -- each with its own bit of
// landscape, joined by paths as the level graph says (engine/levelGraph.js): the training castle at
// the bottom, every row of the graph (its layer) a band further up, the graph's columns from left
// to right. Inside a band the places are staggered (STAGGER): no two places stand at the same
// height, and places in neighbouring columns are always well apart in height, so the pictures and
// their labels do not run into each other although up to five stand side by side.
// The whole map is shown: open places in colour, locked ones grey with a padlock. A path is drawn
// open (solid) once the place it leads to is open through it (the place it starts from is done,
// or it is the path to castle 1, which is open from the start), otherwise dashed.
// The map scrolls vertically (no visible scroll bar); it opens with the player's current castle
// (the highest open one) in the middle of the screen -- for castle 0 extra landscape below it makes
// that possible.
// Each castle where stars were collected shows "stars / required" in its label (the training
// castle: puzzles won / all of them), framed gold, green once done.
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

/** Height offsets (fractions of a band) of the graph's columns: the order of 0, 1/n, ..., (n-1)/n
 *  over the n columns that keeps neighbouring columns furthest apart in height -- within a band
 *  and across to the next band (a gap d and 1 - d both count). Returns { offsets, gap }. */
export function stagger(n) {
  if (n <= 1) return { offsets: [0], gap: 1 }
  let best = null
  const perm = (left, acc) => {
    if (!left.length) {
      const offsets = acc.map((k) => k / n)
      let gap = 1
      for (let c = 0; c + 1 < n; c++) {
        const d = Math.abs(offsets[c] - offsets[c + 1])
        gap = Math.min(gap, d, 1 - d)
      }
      if (!best || gap > best.gap + 1e-9) best = { offsets, gap }
      return
    }
    left.forEach((k, i) => perm([...left.slice(0, i), ...left.slice(i + 1)], [...acc, k]))
  }
  perm(Array.from({ length: n }, (_, k) => k), [])
  return best
}

export default function CastleMap({ states, graph, review = false, loadingCastle, onSelect }) {
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

  const count = Math.min(states.length, graph.count)
  const top = highestUnlocked(states)
  const W = box?.w ?? 360
  const cols = graph.columns
  const { offsets, gap } = useMemo(() => stagger(cols), [cols])
  const size = Math.max(56, Math.min(72, W / 5.6))                    // a place's picture
  // a band per graph row: tall enough that places in neighbouring columns are a picture and its
  // label apart in height (gap = their smallest height difference, as a fraction of a band)
  const seg = cols > 1 ? Math.max(size * 1.75, (size * 1.5) / gap) : Math.max(150, (box?.h ?? 480) / 3)
  const topPad = size * 1.6
  // room below castle 0, so that even castle 0 can be scrolled to the middle of the screen
  const bottomPad = Math.max(seg * 0.55, (box?.h ?? 480) / 2)
  const H = topPad + (graph.rows - 1 + Math.max(...offsets)) * seg + bottomPad
  const margin = Math.min(W / 2, Math.max(size * 0.85, 58))
  const pos = (i) => {
    const row = graph.layer[i], col = graph.col[i]
    const x = cols > 1 ? margin + (col * (W - 2 * margin)) / (cols - 1) : W * (0.5 + 0.2 * Math.sin(i * 2.1 + 0.4))
    return { x, y: H - bottomPad - (row + offsets[col]) * seg }
  }

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
  const bandH = Math.max(150, (box?.h ?? 480) / 3)
  const bands = Math.ceil(bottomPad / bandH)
  const below = pos(0).y + size * 1.1            // clear of the training castle and its own landscape
  for (let b = 0; b < bands; b++) {
    const r = rng(b + 11)
    const yBase = H - b * bandH
    const px = pos(0).x
    for (let k = 0; k < 2; k++) {
      const leftSide = (k === 0) === (px > W / 2)
      const fw = 60 + r() * 50, fh = 30 + r() * 26
      const fx = leftSide ? 6 + r() * Math.max(0, W * 0.32 - fw) : W * 0.66 + r() * Math.max(0, W * 0.32 - fw)
      const fy = yBase - bandH * (0.25 + 0.45 * r())
      const field = <Field key={`f${b}-${k}`} x={fx} y={fy} w={fw} h={fh}
                           angle={-12 + r() * 24} color={FIELD_COLORS[Math.floor(r() * 3)]} />
      if (fy > below) scenery.push(field)
    }
    const trees = 2 + Math.floor(r() * 2)
    for (let k = 0; k < trees; k++) {
      const leftSide = r() < 0.5
      const tx = leftSide ? 14 + r() * W * 0.2 : W * 0.8 + r() * W * 0.15
      const ty = yBase - bandH * r()
      const tree = <Tree key={`t${b}-${k}`} x={tx} y={ty} r={7 + r() * 5} light={r() < 0.5} />
      if (ty > below) scenery.push(tree)
    }
  }

  // Places from the top of the map down: a lower place (nearer the viewer) is drawn over a higher one.
  const ids = Array.from({ length: count }, (_, i) => i)
  const topDown = [...ids].sort((a, b) => pos(a).y - pos(b).y)
  const edges = ids.flatMap((a) => graph.children[a].filter((b) => b < count).map((b) => [a, b]))
  const isOpen = (a, b) => states[b].unlocked && states[a].unlocked
    && (states[a].done || states[b].fromStart || review)

  return (
    <div ref={scrollRef} className="no-scrollbar relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-2xl"
         onScroll={(e) => { savedScroll = e.currentTarget.scrollTop }}
         style={{ background: palette.mapGrass }}>
      {box && (
        <div className="relative" style={{ height: H }}>
          <svg width={W} height={H} className="absolute inset-0" aria-hidden="true">
            {scenery}
            {topDown.map((i) => <Land key={i} {...pos(i)} size={size} site={siteFor(i)} />)}
            {/* locked paths first, open ones over them */}
            {edges.filter(([a, b]) => !isOpen(a, b)).map(([a, b]) => (
              <path key={`${a}-${b}`} d={path(pos(a), pos(b))} fill="none" stroke={palette.mapPathLocked}
                    strokeWidth="6" strokeLinecap="round" strokeDasharray="2 11" />
            ))}
            {edges.filter(([a, b]) => isOpen(a, b)).map(([a, b]) => {
              const d = path(pos(a), pos(b))
              return (
                <g key={`${a}-${b}`}>
                  <path d={d} fill="none" stroke={palette.mapPathEdge} strokeWidth="10" strokeLinecap="round" />
                  <path d={d} fill="none" stroke={palette.mapPath} strokeWidth="6" strokeLinecap="round" />
                </g>
              )
            })}
            {topDown.map((i) => (
              <Site key={i} {...pos(i)} size={size} site={siteFor(i)} locked={!states[i].unlocked} flag={FLAG_COLORS[i % 3]} />
            ))}
          </svg>

          {topDown.map((i) => {
            const s = states[i]
            const { x, y } = pos(i)
            const name = i === TUTORIAL_CASTLE ? t('castles.tutorial') : t('castles.name', { site: t(`sites.${siteFor(i)}`), n: i })
            const label = s.unlocked
              ? `${name}: ${t(s.training ? 'castles.progressTraining' : 'castles.progress',
                  { stars: s.stars, solved: s.solved, required: s.required })}`
              : `${name}: ${t('castles.locked')}`
            const counted = s.unlocked && (s.training ? s.solved > 0 : s.stars > 0)
            // keep the label inside the map: its width is estimated from its text (11px bold),
            // and a label that would stick out at an edge is moved in
            const chars = name.length + (counted ? 4 + `${s.training ? s.solved : s.stars}/${s.required}`.length + (s.done ? 2 : 0) : 0)
            const half = (chars * 6.6 + 14) / 2
            const lx = Math.min(Math.max(x, half + 2), W - half - 2)
            return (
              <div key={i}>
                <button
                  onClick={() => s.unlocked && onSelect(i)}
                  disabled={!s.unlocked || loadingCastle !== null}
                  aria-label={label}
                  className="absolute rounded-2xl active:scale-95 transition-transform disabled:cursor-default"
                  style={{ left: x - size * 0.6, top: y - size * 1.05, width: size * 1.2, height: size * 1.5 }}
                />
                {/* the label: name (level), and once stars were collected there "★ 12 / 20" (✓ when done) */}
                <span className={`absolute -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[11px] font-black
                                  pointer-events-none ${counted ? 'bg-game-badge ring-2' : 'bg-game-badge/80'}`}
                      style={{
                        left: lx, top: y + size * 0.45, opacity: s.unlocked ? 1 : 0.7,
                        '--tw-ring-color': s.done ? palette.correctGreen : palette.starGold,
                      }} aria-hidden="true">
                  {loadingCastle === i ? '…' : name}
                  {counted && loadingCastle !== i && (
                    <span className="ml-1">
                      {s.training
                        ? <span style={{ color: palette.correctGreen }}>✓ {s.solved}</span>
                        : <span className="text-game-star">★ {s.stars}</span>}
                      <span className="text-game-silver">/{s.required}</span>
                      {s.done && <span style={{ color: palette.correctGreen }}> ✓</span>}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
