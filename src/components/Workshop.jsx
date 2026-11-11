import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { bestStars } from '../engine/progress.js'
import { mixHex, palette } from '../theme.js'
import { WORKSHOP_WIDTH as W, WORKSHOP_HEIGHT as H, isLying, potionLook } from '../workshops.js'
import { ConsentBannerSpacer } from './ConsentBanner.jsx'

// One castle's puzzles as potions in a painted sorcerer's workshop (scenes: src/workshops.js).
//
// The picture (src/assets/workshops/<key>.jpg) is nearly monochrome; everything that changes is
// drawn over it as SVG in the picture's own 390 x 844 units, so it scales with the picture:
//   * one potion per puzzle, filled with the puzzle's colour (instance.name_color): a test tube,
//     or a round-bottomed flask for a special puzzle (LevelScreen isSpecial);
//   * solved: a small copper medal at the neck with the best stars (a check mark if the puzzle
//     has no rating); only opened: the stopper is off and a little vapour rises now and then;
//   * the copper plate top left: the castle's stars / required and the way to the next castle;
//   * the castle title, the puzzle count, the "Home" sign and the "Pick your poison" line.
// A potion's lean, stopper, fill level and rare life (bubbles, an electric flash) come from its
// puzzle id (workshops.js potionLook), so it looks the same each time. Nothing moves with
// "reduce motion" switched on.
// The picture keeps its proportions and is shown whole (never cropped: every potion must stay
// reachable); what is left of the screen shows a blurred, darkened copy of it.

const PICTURES = import.meta.glob('../assets/workshops/*.jpg', { eager: true, import: 'default' })
const pictureOf = (key) => PICTURES[`../assets/workshops/${key}.jpg`]

// Fonts: bundled files (src/assets/fonts, @font-face in index.css) -- nothing is loaded from elsewhere.
const TITLE_FONT = '"Cinzel Decorative", Cinzel, Georgia, serif'
const TEXT_FONT = 'Cinzel, Georgia, serif'
const BANNER_FONT = '"Pirata One", "Cinzel Decorative", Georgia, serif'

const STAR = 'M0,-1 L0.29,-0.31 L0.95,-0.31 L0.42,0.12 L0.59,0.81 L0,0.42 L-0.59,0.81 L-0.42,0.12 L-0.95,-0.31 L-0.29,-0.31 Z'
const TUBE = 'M-9.6,-72 V-9.6 A9.6,9.6 0 0 0 9.6,-9.6 V-72'
const FLASK = 'M-5,-70 V-37.6 A19.4,19.4 0 1 0 5,-37.6 V-70'

const reducedMotion = () => typeof window !== 'undefined' &&
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** How bright a '#rrggbb' colour looks, 0 (black) .. 1 (white). */
function brightness(hex) {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** Font size at which `text` is at most `maxW` wide (`em` = average letter width in em). */
const fitSize = (text, size, maxW, em) => Math.min(size, maxW / (Math.max(1, text.length) * em))

const activate = (fn) => ({
  onClick: fn,
  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } },
})

// ---- stoppers: cork, dark cork, wooden plug, sealing wax, linen cap, glass ball ------------------
function Stopper({ look, cw, top }) {
  const base = `M${-cw - 1.2},${top - 9} h${2 * cw + 2.4} l-1.6,10.5 h${-(2 * cw - 0.8)} z`
  const shine = (alpha) => (
    <path d={`M${-cw - 0.6},${top - 8.3} h${2 * cw + 1.2}`} stroke={palette.wsCorkShine} strokeOpacity={alpha} strokeWidth="0.8" />
  )
  const specks = (colour) => look.specks.map(([sx, sy, r], k) => (
    <circle key={k} cx={sx * (cw - 0.5)} cy={top - sy} r={r} fill={colour} opacity="0.7" />
  ))
  switch (look.stopper) {
    case 'darkCork':
      return <>
        <path d={base} fill="url(#ws-dark-cork)" stroke={palette.overlayBlack} strokeWidth="0.8" />
        {specks(palette.wsDarkCorkSpeck)}{shine(0.4)}
      </>
    case 'wood':
      return <>
        <path d={base} fill="url(#ws-wood)" stroke={palette.overlayBlack} strokeWidth="0.8" />
        {[-cw * 0.5, 0, cw * 0.55].map((gx) => (
          <path key={gx} d={`M${gx},${top - 8.5} v9.5`} stroke={palette.wsWoodGrain} strokeOpacity="0.6" strokeWidth="0.6" />
        ))}
        <ellipse cx="0" cy={top - 11.6} rx={cw * 0.62 + 1} ry="3.3" fill="url(#ws-wood)" stroke={palette.overlayBlack} strokeWidth="0.8" />
        <path d={`M${-cw * 0.4},${top - 13.2} h${cw * 0.7}`} stroke={palette.wsCorkShine} strokeOpacity="0.6" strokeWidth="0.8" />
      </>
    case 'wax': {
      const w = cw + 2.4
      const [d1, d2, d3] = look.drips
      const d = `M${-w},${top - 4} q0,-8.5 ${w},-8.5 q${w},0 ${w},8.5 v2.2 q-1.4,2.6 -2.6,0 q-.6,-1.8 -2,0 v${d1} q-1.3,2.4 -2.6,0 v${-d2} `
        + `q-1,-1.6 -2,0 H${-w + 3.4} v${d3} q-1.6,2.6 -3.4,0 z`
      return <>
        <path d={d} fill={palette[`wsWax${look.shade}`]} stroke={palette.overlayBlack} strokeWidth="0.7" />
        <path d={`M${-w + 2},${top - 6.5} q${w * 0.3},-4.6 ${w * 0.9},-5`} stroke={palette.white} strokeOpacity="0.45"
              strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </>
    }
    case 'cloth': {
      const w = cw + 2.2
      const d = `M${-w},${top - 2} q0,-10.5 ${w},-10.5 q${w},0 ${w},10.5 l3,7 q${-w - 3},3 ${-2 * w - 6},0 z`
      const threads = Array.from({ length: Math.floor((2 * w) / 2.6) }, (_, k) => -w + 2 + k * 2.6)
      return <>
        <path d={d} fill={palette[`wsCloth${look.shade}`]} stroke={palette.overlayBlack} strokeWidth="0.7" />
        {threads.map((hx) => <path key={hx} d={`M${hx},${top - 11} v15`} stroke={palette.overlayBlack} strokeOpacity="0.22" strokeWidth="0.5" />)}
        {[0, 1, 2, 3].map((k) => <path key={k} d={`M${-w},${top - 9 + k * 3} h${2 * w}`} stroke={palette.white} strokeOpacity="0.16" strokeWidth="0.5" />)}
        <path d={`M${-w - 0.4},${top - 1.6} q${w + 0.4},2.6 ${2 * w + 0.8},0`} stroke={palette.wsTwine} strokeWidth="1.6" fill="none" />
        <path d={`M${-w - 0.4},${top - 2.2} q${w + 0.4},2.6 ${2 * w + 0.8},0`} stroke={palette.wsTwineLight} strokeWidth="0.7" fill="none" />
      </>
    }
    case 'glass': {
      const r = cw * 0.7 + 2
      return <>
        <path d={`M${-cw + 1.4},${top + 1} l.8,-5 h${2 * cw - 4.4} l.8,5 z`} fill={palette.wsGlass} fillOpacity="0.3"
              stroke={palette.wsGlass} strokeOpacity="0.7" strokeWidth="0.8" />
        <circle cx="0" cy={top - 4 - r} r={r} fill={palette.wsGlass} fillOpacity="0.28" stroke={palette.wsGlass} strokeOpacity="0.8" strokeWidth="1" />
        <path d={`M${-r * 0.55},${top - 4 - r * 1.3} q${r * 0.2},${-r * 0.4} ${r * 0.6},${-r * 0.45}`} stroke={palette.white} strokeOpacity="0.8"
              strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </>
    }
    default:
      return <>
        <path d={base} fill="url(#ws-cork)" stroke={palette.wsCorkEdge} strokeWidth="0.8" />
        {specks(palette.wsCorkSpeck)}{shine(0.7)}
      </>
  }
}

// ---- the copper medal of a solved potion: "3★", or a check mark without a rating ------------------
function Medal({ y, best, turn }) {
  return (
    <g transform={`translate(0,${y}) rotate(${-turn})`}>
      <circle r="9.6" cy="1" fill={palette.overlayBlack} opacity="0.5" />
      <circle r="9.2" fill="url(#ws-medal)" stroke={palette.wsMedalEdge} strokeWidth="1" />
      <circle r="7.1" fill="none" stroke={palette.wsMedalRing} strokeOpacity="0.7" strokeWidth="0.6" />
      {best > 0 ? <>
        <text x="-2.9" y="3.9" textAnchor="middle" fontFamily={TEXT_FONT} fontWeight="900" fontSize="11" fill={palette.wsMedalInk}>{best}</text>
        <path d={STAR} transform="translate(4.2,.4) scale(3.6)" fill={palette.wsMedalInk} />
      </> : (
        <path d="M-4,0 l3,3.4 l5.4,-6.6" fill="none" stroke={palette.wsMedalInk} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </g>
  )
}

// ---- rare life inside a potion ------------------------------------------------------------------
function Life({ life, level }) {
  if (!life) return null
  const timing = { dur: `${life.seconds.toFixed(1)}s`, begin: `${life.start.toFixed(1)}s`, repeatCount: 'indefinite' }
  if (life.kind === 'bubbles') {
    return life.bubbles.map((b, k) => (
      <circle key={k} cx={b.x} cy="-6" r={b.r} fill="none" stroke={palette.white} strokeWidth="0.8" opacity="0">
        <animate attributeName="cy" values={`-5;-5;${(level + 1).toFixed(1)}`} keyTimes={`0;${b.from.toFixed(2)};1`} {...timing} />
        <animate attributeName="opacity" values="0;0;.95;.9;0" keyTimes={`0;${b.from.toFixed(2)};${(b.from + 0.03).toFixed(2)};.97;1`} {...timing} />
      </circle>
    ))
  }
  return (   // an electric flash: a small forked bolt that flickers three times
    <g opacity="0" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="-22" y="-74" width="44" height="78" fill={palette.white} stroke="none" opacity="0.22" />
      <path d={life.d} stroke={palette.white} strokeOpacity="0.45" strokeWidth="4.2" />
      <path d={life.d} stroke={palette.white} strokeWidth="1.25" />
      <animate attributeName="opacity" values="0;0;1;.1;.95;0;.7;0;0" keyTimes="0;.80;.812;.826;.84;.856;.87;.886;1" {...timing} />
    </g>
  )
}

// ---- one potion ---------------------------------------------------------------------------------
function Potion({ slot, look, colour, special, state, best, glowId, moving, floating, label, onPick }) {
  const [x, y, rot] = slot
  const lying = isLying(slot)
  const angle = lying ? rot + look.tilt : look.tilt
  const light = mixHex(colour, palette.white, 0.55)
  const dark = brightness(colour) < 0.25
  const top = special ? -70 : -72
  const neck = special ? -56 : -59
  const cw = special ? 4.6 : 7.6
  const body = special ? FLASK : TUBE
  const level = look.level
  const pivot = lying ? (special ? -19 : -36) : level        // the liquid's surface passes through here
  const halfWidth = special ? Math.sqrt(Math.max(1, 18.4 ** 2 - (level + 19) ** 2)) + 0.6 : 9.4
  const place = lying ? `translate(${x},${y}) rotate(${angle}) translate(0,36)` : `translate(${x + look.dx},${y}) rotate(${angle})`
  const corked = state !== 'played'
  const puff = (k) => {
    const timing = { dur: `${9 + k * 4}s`, begin: `${(look.vapour.start + k * 2.3).toFixed(1)}s`, repeatCount: 'indefinite' }
    return (
      <ellipse key={k} cx="0" cy={top - 4} rx="4" ry="3" fill="url(#ws-puff)" opacity="0">
        <animate attributeName="cy" values={`${top - 2};${top - 2};${top - 30}`} keyTimes="0;.55;1" {...timing} />
        <animate attributeName="cx" values={`0;0;${look.vapour.drift[k]}`} keyTimes="0;.55;1" {...timing} />
        <animate attributeName="rx" values="4;4;12" keyTimes="0;.55;1" {...timing} />
        <animate attributeName="ry" values="3;3;8" keyTimes="0;.55;1" {...timing} />
        <animate attributeName="opacity" values="0;0;.75;0" keyTimes="0;.55;.7;1" {...timing} />
      </ellipse>
    )
  }
  const potion = (
    <g className="ws-potion" transform={place} role="button" tabIndex={0} aria-label={label} {...activate(onPick)}>
      <title>{label}</title>
      <g className="ws-press">
        <radialGradient id={glowId}>
          <stop offset="0" stopColor={dark ? mixHex(colour, palette.white, 0.25) : colour} stopOpacity={dark ? 0.7 : 0.6} />
          <stop offset="0.55" stopColor={dark ? mixHex(colour, palette.white, 0.25) : colour} stopOpacity="0.22" />
          <stop offset="1" stopColor={colour} stopOpacity="0" />
        </radialGradient>
        {special
          ? <ellipse cx="0" cy="-22" rx="38" ry="38" fill={`url(#${glowId})`} />
          : <ellipse cx="0" cy="-30" rx="27" ry="46" fill={`url(#${glowId})`} />}
        <path d={`${body} Z`} fill={palette.wsGlassDark} fillOpacity="0.45" />
        <g clipPath={special ? 'url(#ws-in-flask)' : 'url(#ws-in-tube)'}>
          {lying && <rect x="-22" y="-74" width="44" height="78" fill={colour} opacity="0.22" />}
          <g transform={`rotate(${-angle} 0 ${pivot})`}>
            <rect x="-70" y={pivot} width="140" height="140" fill={colour} />
            {lying
              ? <path d={`M-70,${pivot} h140`} stroke={light} strokeWidth="1.4" opacity="0.8" />
              : <ellipse cx="0" cy={pivot} rx={halfWidth} ry={special ? 2.6 : 2} fill={light} />}
          </g>
          {special
            ? <rect x="-20" y="-40" width="40" height="42" fill="url(#ws-round)" />
            : <rect x="-9" y="-72" width="18" height="74" fill="url(#ws-round)" />}
          {!lying && (special
            ? <ellipse cx="-5" cy="-10" rx="8" ry="6" fill={light} opacity="0.35" />
            : <ellipse cx="-2" cy="-9" rx="5" ry="6" fill={light} opacity="0.35" />)}
          {moving && <Life life={look.life} level={level} />}
        </g>
        <path d={body} fill="none" stroke={palette.wsGlass} strokeOpacity={special ? 0.7 : 0.62} strokeWidth={special ? 1.25 : 1.15} />
        {special ? <>
          <path d="M-13,-28 A15,15 0 0 0 -11,-8" fill="none" stroke={palette.white} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M-2.6,-66 V-42" stroke={palette.white} strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
          <ellipse cx="0" cy="-70" rx="6.6" ry="2" fill={palette.wsGlassDark} fillOpacity="0.5" stroke={palette.wsGlass} strokeOpacity="0.75" strokeWidth="1.1" />
          <path d="M-5,-47 h10" stroke={palette.wsGlass} strokeOpacity="0.6" strokeWidth="1.6" />
        </> : <>
          <path d="M-6,-66 V-16" stroke={palette.white} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6.4,-60 V-30" stroke={palette.white} strokeOpacity="0.16" strokeWidth="1" strokeLinecap="round" />
          <ellipse cx="0" cy="-72" rx="10.8" ry="2.4" fill={palette.wsGlassDark} fillOpacity="0.5" stroke={palette.wsGlass} strokeOpacity="0.7" strokeWidth="1.1" />
        </>}
        {corked ? <Stopper look={look} cw={cw} top={top} /> : (moving && [0, 1].map(puff))}
        {state === 'solved' && <>
          <path d={`M${special ? -5 : -9.6},${neck - 7} L0,${neck} L${special ? 5 : 9.6},${neck - 7}`} fill="none" stroke={palette.wsMedalString} strokeWidth="0.9" />
          <Medal y={neck + 3} best={best} turn={angle} />
        </>}
        {/* tap area (a little wider than the glass) and the keyboard-focus frame */}
        <rect x="-22" y="-88" width="44" height="96" fill={palette.white} fillOpacity="0" />
        <rect className="ws-focus" x="-20" y="-88" width="40" height="96" rx="8" fill="none" stroke={palette.white} strokeWidth="2" />
      </g>
    </g>
  )
  if (!floating) return potion
  return (
    <g>
      {moving && (
        <animateTransform attributeName="transform" type="translate" values={`0 0;0 ${-look.bob.rise.toFixed(1)};0 0`} keyTimes="0;.5;1"
                          calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur={`${look.bob.seconds.toFixed(1)}s`}
                          begin={`-${look.bob.start.toFixed(1)}s`} repeatCount="indefinite" />
      )}
      {/* the ring of light a hovering potion floats on */}
      <ellipse cx={x + look.dx} cy={y + 8} rx="14" ry="4" fill="url(#ws-puff)" opacity="0.5" />
      <ellipse cx={x + look.dx} cy={y + 8} rx="10" ry="2.2" fill="none" stroke={palette.white} strokeOpacity="0.4" strokeWidth="0.8" />
      {potion}
    </g>
  )
}

function Rail({ rail, colours }) {
  const body = palette[`${colours}Rail`]
  const lit = palette[`${colours}RailLight`]
  if (rail.arc) {
    const d = (dy) => `M${rail.x0},${rail.y + dy} Q${(rail.x0 + rail.x1) / 2},${rail.y + dy - rail.rise} ${rail.x1},${rail.y + dy}`
    return <>
      <path d={d(0)} fill="none" stroke={palette.overlayBlack} strokeOpacity="0.7" strokeWidth="6.6" />
      <path d={d(0)} fill="none" stroke={body} strokeWidth="5" />
      <path d={d(-1.6)} fill="none" stroke={lit} strokeOpacity="0.6" strokeWidth="0.8" />
    </>
  }
  return (
    <g transform={rail.a ? `rotate(${rail.a} ${rail.cx} ${rail.cy})` : undefined}>
      <rect x={rail.x} y={rail.y} width={rail.w} height={rail.h} rx="1.5" fill={body} stroke={palette.overlayBlack} strokeOpacity="0.7" strokeWidth="0.8" />
      <path d={`M${rail.x + 1},${rail.y + 0.8} H${rail.x + rail.w - 1}`} stroke={lit} strokeOpacity="0.55" strokeWidth="0.8" />
    </g>
  )
}

function Flame({ x, y, moving }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="26" fill="url(#ws-puff)" opacity="0.4">
        {moving && <animate attributeName="opacity" values=".4;.5;.32;.45;.4" dur="2.3s" repeatCount="indefinite" />}
      </circle>
      <path d="M0,-11 Q4.6,-3 2.8,1.6 Q0,4 -2.8,1.6 Q-4.6,-3 0,-11 Z" fill="url(#ws-flame)">
        {moving && <animateTransform attributeName="transform" type="scale" values="1 1;1.08 .9;.94 1.1;1.04 .96;1 1" dur="1.7s" repeatCount="indefinite" />}
      </path>
    </g>
  )
}

function Twinkle({ x, y, k }) {
  return (
    <g transform={`translate(${x},${y})`} opacity="0">
      <circle r="10" fill="url(#ws-puff)" />
      <path d="M0,-7 L1.1,-1.1 L7,0 L1.1,1.1 L0,7 L-1.1,1.1 L-7,0 L-1.1,-1.1 Z" fill={palette.white} />
      <animate attributeName="opacity" values="0;0;.9;0;0" keyTimes="0;.78;.84;.92;1" dur={`${(11 + k * 3.7).toFixed(1)}s`}
               begin={`${(k * 2.9).toFixed(1)}s`} repeatCount="indefinite" />
    </g>
  )
}

/**
 * scene      the castle's scene (workshops.js workshopFor)
 * placed     [{ inst, slot }] (workshops.js placePuzzles)
 * playStates [state] per placed puzzle: 'solved' | 'played' | anything else = untouched
 * isSpecial  (inst) -> round flask instead of a test tube
 * title / nextTitle / state: as LevelScreen
 */
export default function Workshop({ scene, placed, playStates, isSpecial, title, nextTitle, state, onPick, onBack, nudging = false }) {
  const { t, i18n } = useTranslation()
  const moving = useMemo(() => !reducedMotion(), [])
  const looks = useMemo(
    () => placed.map(({ inst, slot }) => potionLook(inst.id, scene, isLying(slot), isSpecial(inst))),
    [placed, scene, isSpecial],
  )
  const c = (name) => palette[`${scene.colours}${name}`]
  const picture = pictureOf(scene.key)
  const { stars, required, done } = state
  const share = Math.min(1, stars / required)
  const upper = (s) => s.toLocaleUpperCase(i18n.language)
  const nextLine = nextTitle ? upper(t(done ? 'castles.nextOpen' : 'castles.toOpen', { name: nextTitle })) : null
  const count = upper(t('home.puzzleCount', { count: placed.length }))
  const choose = t('levelScreen.choose')
  const back = t('levelScreen.back')
  const banner = scene.banner
  const bannerSize = fitSize(choose, banner.size, banner.maxW, 0.45)
  const bannerText = { fontFamily: BANNER_FONT, fontSize: bannerSize, textAnchor: 'middle', letterSpacing: 1.2, x: banner.x, y: banner.y }
  const titleSize = fitSize(title, 25, 168, 0.72)
  const starsText = (
    <>{stars}<tspan fontSize="14" dx="2">/ {required}</tspan></>
  )

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col" style={{ background: c('Bg') }}>
      <div className="ws-backdrop absolute inset-0" style={{ backgroundImage: `url(${picture})` }} aria-hidden="true" />
      <div className="ws-safe relative flex-1 min-h-0">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block w-full h-full">
          <defs>
            <linearGradient id="ws-round" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={palette.overlayBlack} stopOpacity="0.5" />
              <stop offset="0.28" stopColor={palette.overlayBlack} stopOpacity="0" />
              <stop offset="0.7" stopColor={palette.overlayBlack} stopOpacity="0" />
              <stop offset="1" stopColor={palette.overlayBlack} stopOpacity="0.55" />
            </linearGradient>
            {[['ws-cork', 'wsCork'], ['ws-dark-cork', 'wsDarkCork'], ['ws-wood', 'wsWood']].map(([id, key]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={palette[`${key}1`]} />
                <stop offset="0.4" stopColor={palette[`${key}2`]} />
                <stop offset="1" stopColor={palette[`${key}3`]} />
              </linearGradient>
            ))}
            <radialGradient id="ws-medal" cx="0.35" cy="0.3" r="0.8">
              <stop offset="0" stopColor={palette.wsMedalHi} />
              <stop offset="0.5" stopColor={palette.wsMedalMid} />
              <stop offset="1" stopColor={palette.wsMedalLo} />
            </radialGradient>
            <radialGradient id="ws-flame" cx="0.5" cy="0.7" r="0.6">
              <stop offset="0" stopColor={palette.white} />
              <stop offset="0.5" stopColor={palette.wsFlameMid} />
              <stop offset="1" stopColor={palette.wsFlameEdge} stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="ws-puff">
              <stop offset="0" stopColor={palette.white} stopOpacity="0.8" />
              <stop offset="0.5" stopColor={palette.white} stopOpacity="0.3" />
              <stop offset="1" stopColor={palette.white} stopOpacity="0" />
            </radialGradient>
            <clipPath id="ws-in-tube"><path d="M-8.6,-72 V-9.4 A8.6,8.6 0 0 0 8.6,-9.4 V-72 Z" /></clipPath>
            <clipPath id="ws-in-flask"><path d="M-4,-70 V-37 A18.4,18.4 0 1 0 4,-37 V-70 Z" /></clipPath>
          </defs>

          <image href={picture} x="0" y="0" width={W} height={H} preserveAspectRatio="none" aria-hidden="true" />

          {placed.map(({ inst, slot }, k) => {
            const solved = playStates[k] === 'solved'
            const best = solved ? bestStars(inst.id) : null
            return (
              <Potion key={inst.id} slot={slot} look={looks[k]} colour={inst.name_color} special={isSpecial(inst)}
                      state={playStates[k]} best={best} glowId={`ws-glow-${k}`} moving={moving} floating={scene.floating}
                      label={solved ? `${inst.name} ✓${best ? ` ${'★'.repeat(best)}` : ''}` : inst.name}
                      onPick={() => onPick(inst)} />
            )
          })}
          {/* the rack rail stands in front of the potions (taps go through it) */}
          <g pointerEvents="none">{scene.rails.map((rail, k) => <Rail key={k} rail={rail} colours={scene.colours} />)}</g>
          <g pointerEvents="none">
            {scene.flames.map(([x, y]) => <Flame key={`${x},${y}`} x={x} y={y} moving={moving} />)}
            {moving && scene.twinkles.map(([x, y], k) => <Twinkle key={k} x={x} y={y} k={k} />)}
          </g>

          {/* the hanging copper plate: stars collected in this castle / stars that open the next */}
          <g fontFamily={TEXT_FONT} fontWeight="900" textAnchor="middle" role="img"
             aria-label={`★ ${stars} / ${required}${nextLine ? ` · ${nextLine}` : ''}`}>
            <path d={STAR} transform="translate(40,66) scale(11.5)" fill={palette.wsPlateInk} />
            <path d={STAR} transform="translate(39.4,65.3) scale(9.6)" fill={palette.wsPlateGold} />
            <text x="86.6" y="74.6" fontSize="22" fill={palette.wsMedalRing} fillOpacity="0.55">{starsText}</text>
            <text x="86" y="74" fontSize="22" fill={palette.wsPlateInk}>{starsText}</text>
            <rect x="28" y="82" width="88" height="5" rx="2.5" fill={palette.wsPlateInk} opacity="0.85" />
            <rect x="29" y="83" width={86 * share} height="3" rx="1.5" fill={done ? palette.correctGreen : palette.wsPlateGold} />
            {nextLine && (
              <text x="72" y="97.4" fontSize={fitSize(nextLine, 7.2, 86, 0.7)} fontWeight="700" fill={palette.wsPlateInk}>{nextLine}</text>
            )}
          </g>

          {/* the wooden "Home" sign */}
          <g className="ws-sign" role="button" tabIndex={0} aria-label={back} {...activate(onBack)}>
            <g fontFamily={TEXT_FONT} fontWeight="900" fontSize={fitSize(back, 15, 46, 0.72)} textAnchor="middle">
              <text x="347" y="67.4" fill={palette.overlayBlack} opacity="0.8">{back}</text>
              <text x="346.4" y="66.6" fill={c('Sign')}>{back}</text>
            </g>
            <path d="M321,61 l-6,0 m0,0 l4,-4 m-4,4 l4,4" stroke={c('Sign')} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="298" y="36" width="86" height="52" fill={palette.white} fillOpacity="0" />
            <rect className="ws-focus" x="302" y="40" width="78" height="42" rx="6" fill="none" stroke={palette.white} strokeWidth="2" />
          </g>

          {/* castle title and puzzle count, in the dark top of the picture */}
          <g textAnchor="middle" pointerEvents="none">
            <text x="217" y="64" fontFamily={TITLE_FONT} fontSize={titleSize} fontWeight="900" fill={palette.overlayBlack} opacity="0.9" aria-hidden="true">{title}</text>
            <text x="216" y="62.6" fontFamily={TITLE_FONT} fontSize={titleSize} fontWeight="900" fill={c('Title')} role="heading" aria-level="1">{title}</text>
            <path d="M168,74 h36 m24,0 h36" stroke={c('Sub')} strokeWidth="1" />
            <path d="M216,69.5 l4.5,4.5 l-4.5,4.5 l-4.5,-4.5 z" fill={c('Sub')} />
            <text x="216" y="93" fontFamily={TEXT_FONT} fontSize="10.5" fontWeight="700" letterSpacing="1.4" fill={c('Sub')}>{count}</text>
          </g>

          {/* "Pick your poison", on the sign / scroll / stone the picture has for it */}
          <g pointerEvents="none">
            {banner.glow ? <>
              <text {...bannerText} className="ws-glow-text" fill={c('BannerShade')} style={{ '--glow': c('BannerShade') }} aria-hidden="true">{choose}</text>
              <text {...bannerText} fill={c('Banner')}>{choose}</text>
            </> : <>
              <text {...bannerText} x={banner.x + 1} y={banner.y + 1.2} fill={c('BannerShade')} opacity="0.85" aria-hidden="true">{choose}</text>
              <text {...bannerText} fill={c('Banner')}>{choose}</text>
            </>}
          </g>
        </svg>
      </div>
      <ConsentBannerSpacer nudge={nudging} />
    </div>
  )
}
