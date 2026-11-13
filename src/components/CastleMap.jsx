import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { palette } from '../theme.js'
import { TUTORIAL_CASTLE, highestUnlocked } from '../engine/castles.js'
import { SITE_BOX, SITE_SOLID, parseLand, siteFor } from '../sites.js'
import { giveWay, onAnyPath, placeFlat } from './mapClear.js'
import { PATH_HALF, PATH_REACH, STONE_ROUND, pathStones } from './mapPath.js'
import { relax } from './mapLayout.js'

// The home-screen map: the levels ("castles" in the code) as different places -- a castle, a forest
// hut, a tavern, ... (src/sites.js: which level is which place) -- each with its own bit of
// landscape, joined by paths as the level graph says (engine/levelGraph.js): the training castle at
// the bottom, every row of the graph (its layer) a band further up, the graph's columns from left
// to right. Inside a band the places are staggered (STAGGER): no two places stand at the same
// height, and places in neighbouring columns are always well apart in height, so the pictures and
// their labels do not run into each other although up to five stand side by side.
// The whole map is shown: open places in colour, locked ones grey with a padlock. A path is paved
// with rows of near-rectangular stones of different sizes (mapPath.js), no border line. It is drawn open (sand-coloured stones, two
// close tones) once the place it leads to is open through it (the place it starts from is done,
// or it is the path to castle 1, which is open from the start), otherwise grey, faint and with
// stones missing.
// The map scrolls vertically (no visible scroll bar); it opens with the player's current castle
// (the highest open one) in the middle of the screen -- for castle 0 extra landscape below it makes
// that possible.
// Each castle where stars were collected shows "stars / required" in a small badge under it (the
// training castle: puzzles won / all of them), framed gold, green once done. The places' names are
// not written on the map (the button's aria-label still says "Forest hut (1): ...").
// Drawing is SVG (decoration only, nothing moves); the places themselves are HTML buttons laid over
// it.
// Where a place stands: its row and column (see above), then nudged a little sideways, up or down
// where that keeps the paths out of other buildings and off each other (mapLayout.js relax).
// What covers what -- two rules, nothing else:
//   1. Layers, bottom to top: grass, what lies flat (fields, ponds: the `data-flat` parts of the
//      landscapes), the paths, everything that stands up, the badges.
//   2. Everything that stands up (the places' pictures, the trees, hedges, statues, ... of their
//      landscapes, the trees below the training castle) is ONE list, drawn from the top of the map
//      down by where each thing touches the ground (its foot): what stands lower on the map is
//      nearer the viewer and covers what stands behind it.
// And one more for what lies flat: a field or pond is only drawn where it is clear of everything
// else -- paths, the places' pictures, standing things, other flat things (mapClear.js) -- and
// inside the map; only in its drawn spot and its mirror image may it touch its own place (a pond
// half behind its tower). If its own spot is not free it tries its mirror image on the other side of its
// place, then both a little higher, lower or further out (SHIFTS), else it is left out.
// Places are served in level order (lower levels first), the fields below castle 0 last.
// Standing things are not moved, and stay even on a path (a tree may stand on one) -- except a
// group that may go (sites.js data-group: the manor's left or right garden): it is left out, all
// of it, where any of it touches a path.
// Paths that overlap give way (mapClear.js giveWay): open ones before locked ones, then in graph
// order; a later path drops its stones whose middle lies on an earlier one and is drawn under it,
// so where paths run together the paving is one, not two on top of each other, and no gap.

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

// The pictures of the places: <site>.svg (open), <site>-locked.svg (grey, padlock).
const PICTURES = import.meta.glob(['../assets/sites/*.svg', '!../assets/sites/*-land.svg'], { eager: true, import: 'default' })
const picture = (name) => PICTURES[`../assets/sites/${name}.svg`]
// The landscapes, <site>-land.svg, as their parts (sites.js parseLand): drawn inline, because the
// flat things and every standing thing go into the map at different depths.
const LANDS = Object.fromEntries(Object.entries(
  import.meta.glob('../assets/sites/*-land.svg', { eager: true, query: '?raw', import: 'default' }),
).map(([path, text]) => [path.match(/([^/]+)-land\.svg$/)[1], parseLand(text)]))

// A box of a picture (sites.js SITE_BOX, in units of size / 100) on the map: x, y is the
// place's centre as the map lays it out; its ground line lies 0.4 size below.
const placed = (box, x, y, size) => {
  const k = size / 100
  return { x: x + box.x * k, y: y + size * 0.4 + box.y * k, width: box.w * k, height: box.h * k }
}

// Where else a flat thing may go when its own spot is taken, in the landscape's units: [out, down]
// (out = away from the place's middle; each is tried as it is and mirrored, in this order).
const SHIFTS = [[0, 0], [0, -30], [0, 30], [20, 0], [0, -60], [0, 60], [20, -30], [20, 30]]

// A piece of a place's landscape (a flat thing, or one standing thing): the landscape's markup,
// moved to the place and scaled (its units are size / 100 around the middle of the ground line),
// mirrored left to right and shifted (dx, dy, in its own units) if asked.
function LandPart({ x, y, size, svg, mirror = false, dx = 0, dy = 0 }) {
  const k = size / 100
  return <g transform={`translate(${x} ${y + size * 0.4}) scale(${mirror ? -k : k} ${k}) translate(${dx} ${dy})`}
            dangerouslySetInnerHTML={{ __html: svg }} />
}

// A box of the landscape's units ([x0, y0, x1, y1] around a place's ground line) on the map,
// shifted by dx, dy (its units) and then mirrored left to right if asked.
function onMap([bx0, by0, bx1, by1], x, ground, size, mirror = false, dx = 0, dy = 0) {
  const k = size / 100, x0 = bx0 + dx, x1 = bx1 + dx, y0 = by0 + dy, y1 = by1 + dy
  return mirror
    ? { x0: x - x1 * k, y0: ground + y0 * k, x1: x - x0 * k, y1: ground + y1 * k }
    : { x0: x + x0 * k, y0: ground + y0 * k, x1: x + x1 * k, y1: ground + y1 * k }
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
  // where a place would stand by its row and column ...
  const grid = (i) => {
    const row = graph.layer[i], col = graph.col[i]
    const x = cols > 1 ? margin + (col * (W - 2 * margin)) / (cols - 1) : W * (0.5 + 0.2 * Math.sin(i * 2.1 + 0.4))
    return { x, y: H - bottomPad - (row + offsets[col]) * seg }
  }
  // ... and where it stands: nudged from there so the paths keep out of other buildings and off
  // each other (mapLayout.js relax; worked out again only when the map's size changes)
  const placed = useMemo(() => {
    const n = Math.min(states.length, graph.count)
    const start = Array.from({ length: n }, (_, i) => { const p = grid(i); return { x: p.x, y: p.y + size * 0.4 } })
    const links = start.flatMap((f, a) => graph.children[a].filter((b) => b < n).map((b) => [a, b]))
    const dx = cols > 1 ? (W - 2 * margin) / (cols - 1) : size
    return relax(start, links, { size, half: PATH_HALF, dx, dy: seg, x0: size * 0.75, x1: W - size * 0.75 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, states.length, W, H, seg, size])
  const pos = (i) => ({ x: placed[i].x, y: placed[i].y - size * 0.4 })

  // where a place stands: the middle of its ground line -- the paths start and end there, so they
  // are already spread out where they come out from behind a building
  const foot = (i) => { const p = pos(i); return { x: p.x, y: p.y + size * 0.4 } }

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

  // Landscape: every place brings its own (LANDS). Only the stretch below the training castle, where
  // no place stands, gets a couple of fields and trees per band, kept off the path.
  // flatWish = what would like to lie on the ground: [{ spots: [box, ...], els: [el per spot] }],
  // placed below (placeFlat); standing = [{ foot, el }], see rule 2 above; taken = boxes that
  // nothing flat may touch.
  const flatWish = [], standing = [], taken = []
  const sceneryFields = []
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
      const angle = -12 + r() * 24
      const field = <Field key={`f${b}-${k}`} x={fx} y={fy} w={fw} h={fh}
                           angle={angle} color={FIELD_COLORS[Math.floor(r() * 3)]} />
      // its box: the turned rectangle's
      const c = Math.abs(Math.cos((angle * Math.PI) / 180)), s = Math.abs(Math.sin((angle * Math.PI) / 180))
      const hx = (fw * c + fh * s) / 2, hy = (fw * s + fh * c) / 2, cx = fx + fw / 2, cy = fy + fh / 2
      if (fy > below) sceneryFields.push({ spots: [{ x0: cx - hx, y0: cy - hy, x1: cx + hx, y1: cy + hy }], els: [field] })
    }
    const trees = 2 + Math.floor(r() * 2)
    for (let k = 0; k < trees; k++) {
      const leftSide = r() < 0.5
      const tx = leftSide ? 14 + r() * W * 0.2 : W * 0.8 + r() * W * 0.15
      const ty = yBase - bandH * r()
      const tr = 7 + r() * 5
      const tree = <Tree key={`t${b}-${k}`} x={tx} y={ty} r={tr} light={r() < 0.5} />
      if (ty > below) {
        standing.push({ foot: ty + tr * 0.8, el: tree })
        taken.push({ x0: tx - tr, y0: ty - tr * 1.1, x1: tx + tr * 1.1, y1: ty + tr * 0.8 })
      }
    }
  }

  const ids = Array.from({ length: count }, (_, i) => i)
  const edges = ids.flatMap((a) => graph.children[a].filter((b) => b < count).map((b) => [a, b]))
  const lines = edges.map(([a, b]) => [foot(a), foot(b)])
  for (const i of ids) {
    const { x, y } = pos(i), site = siteFor(i), ground = y + size * 0.4
    // a group of standing things that touches a path is left out, all of it
    const gone = new Set(LANDS[site].props
      .filter((p) => p.group && onAnyPath(onMap(p.box, x, ground, size), lines, PATH_REACH + 1)).map((p) => p.group))
    const land = { ...LANDS[site], props: LANDS[site].props.filter((p) => !gone.has(p.group)) }
    const own = [...land.props.map((p) => onMap(p.box, x, ground, size)), ...SITE_SOLID[site].map((b) => onMap(b, x, ground, size))]
    land.flats.forEach((f, n) => {
      // its spots: as drawn and mirrored, then shifted (away from the middle: dx with its side's sign)
      const out = f.box[0] + f.box[2] < 0 ? -1 : 1
      const tries = SHIFTS.flatMap(([o, dy]) => [[false, o * out, dy], [true, o * out, dy]])
      flatWish.push({
        own,
        ownSpots: 2,
        spots: tries.map(([mirror, dx, dy]) => onMap(f.box, x, ground, size, mirror, dx, dy)),
        els: tries.map(([mirror, dx, dy]) => (
          <LandPart key={`g${i}-${n}`} x={x} y={y} size={size} svg={f.svg} mirror={mirror} dx={dx} dy={dy} />)),
      })
    })
    land.props.forEach((p, n) => {
      standing.push({ foot: ground + (p.foot * size) / 100, el: <LandPart key={`p${i}-${n}`} x={x} y={y} size={size} svg={p.svg} /> })
    })
    taken.push(...own)
    standing.push({
      foot: ground,
      el: <Site key={`s${i}`} x={x} y={y} size={size} site={site} locked={!states[i].unlocked} flag={FLAG_COLORS[i % 3]} />,
    })
  }
  standing.sort((a, b) => a.foot - b.foot)       // stable: equal feet keep the order above
  const isOpen = (a, b) => states[b].unlocked && states[a].unlocked
    && (states[a].done || states[b].fromStart || review)
  // the paths' stones: the same on every visit, laid again only when the map's layout changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paving = useMemo(() => edges.map(([a, b]) => pathStones(foot(a), foot(b), a * 131 + b)),
    [graph, count, W, H, seg, size])
  // overlapping paths give way: open ones first, then in graph order
  const openKey = edges.map(([a, b]) => (isOpen(a, b) ? 1 : 0)).join('')
  const paved = useMemo(() => {
    const order = edges.map((e, n) => n).sort((m, n) => openKey[n] - openKey[m] || m - n)
    const kept = giveWay(order.map((e) => ({ a: lines[e][0], b: lines[e][1], stones: paving[e] })), PATH_HALF)
    return order.map((e, k) => ({ key: edges[e].join('-'), open: openKey[e] === '1', stones: kept[k] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paving, openKey])
  // what lies flat, where it is clear of everything (see above): a few px of grass around it
  flatWish.push(...sceneryFields)
  const spot = placeFlat(flatWish, taken, lines,
    { gap: 3, reach: PATH_REACH + 3, bounds: { x0: 0, y0: 0, x1: W, y1: H } })
  const flat = flatWish.flatMap((w, n) => (spot[n] >= 0 ? [w.els[spot[n]]] : []))

  return (
    <div ref={scrollRef} className="no-scrollbar relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-2xl"
         onScroll={(e) => { savedScroll = e.currentTarget.scrollTop }}
         style={{ background: palette.mapGrass }}>
      {box && (
        <div className="relative" style={{ height: H }}>
          <svg width={W} height={H} className="absolute inset-0" aria-hidden="true">
            {flat}
            {/* locked paths first (grey, faint, three stones in ten missing), open ones over them, each
                in reverse order of precedence (a path that gave way lies under the other);
                a stone is stroked in its own colour, which rounds its corners */}
            <g strokeWidth={STONE_ROUND} strokeLinejoin="round">
              {[...paved].reverse().filter((p) => !p.open).map((p) => (
                <g key={p.key} fill={palette.mapPathLocked} stroke={palette.mapPathLocked} opacity="0.6">
                  {p.stones.map((st) => ((st.n * 7) % 10 >= 3 ? <path key={st.n} d={st.d} /> : null))}
                </g>
              ))}
              {[...paved].reverse().filter((p) => p.open).map((p) => (
                <g key={p.key}>
                  {p.stones.map((st, n) => {
                    const tone = st.k >= 1 / 3 && st.k < 2 / 3 ? palette.mapPathAlt : palette.mapPath
                    return <path key={n} d={st.d} fill={tone} stroke={tone} />
                  })}
                </g>
              ))}
            </g>
            {standing.map((s) => s.el)}
          </svg>

          {ids.map((i) => {
            const s = states[i]
            const { x, y } = pos(i)
            const name = i === TUTORIAL_CASTLE ? t('castles.tutorial') : t('castles.name', { site: t(`sites.${siteFor(i)}`), n: i })
            const label = s.unlocked
              ? `${name}: ${t(s.training ? 'castles.progressTraining' : 'castles.progress',
                  { stars: s.stars, solved: s.solved, required: s.required })}`
              : `${name}: ${t('castles.locked')}`
            const counted = s.unlocked && (s.training ? s.solved > 0 : s.stars > 0)
            const loading = loadingCastle === i
            // keep the badge inside the map: its width is estimated from its text (11px bold),
            // and a badge that would stick out at an edge is moved in
            const chars = loading ? 1 : 2 + `${s.training ? s.solved : s.stars}/${s.required}`.length + (s.done ? 2 : 0)
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
                {/* the badge: "★ 12/20" once stars were collected there (✓ when done); "…" while loading */}
                {(counted || loading) && (
                  <span className={`absolute -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[11px] font-black
                                    pointer-events-none ${counted ? 'bg-game-badge ring-2' : 'bg-game-badge/80'}`}
                        style={{
                          left: lx, top: y + size * 0.45,
                          '--tw-ring-color': s.done ? palette.correctGreen : palette.starGold,
                        }} aria-hidden="true">
                    {loading ? '…' : (
                      <>
                        {s.training
                          ? <span style={{ color: palette.correctGreen }}>✓ {s.solved}</span>
                          : <span className="text-game-star">★ {s.stars}</span>}
                        <span className="text-game-silver">/{s.required}</span>
                        {s.done && <span style={{ color: palette.correctGreen }}> ✓</span>}
                      </>
                    )}
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
