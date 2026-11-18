import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import HomeScreen from './components/HomeScreen.jsx'
import LevelScreen from './components/LevelScreen.jsx'
import GameScreen from './components/GameScreen.jsx'
import ConsentBanner from './components/ConsentBanner.jsx'
import { loadIndex, loadAll, loadLevelGraph, markPlayed, findById } from './engine/catalog.js'
import {
  assignCastles, castleStates as computeStates, earnedUnlocks, highestUnlocked, CASTLE_COUNT,
} from './engine/castles.js'
import { chainGraph, parseLevelGraph } from './engine/levelGraph.js'
import { castleStars, progressTotals, recentlyPlayed, seedCastleStars, storageConsent, wildcardOpened, CONSENT_GRANTED } from './engine/progress.js'
import { availableWildcards, wildcardOpens } from './wildcards.js'
import { useProgress } from './hooks/useProgress.js'
import { siteName } from './sites.js'
import { fitToScenes } from './workshops.js'
import { setCatalogVersion, screenView } from './telemetry/telemetry.js'

// Three screens: Home (castle map, engine/castles.js) -> Castle (grid of its puzzles; the
// LevelScreen component) -> Game (one instance). Back in the game returns to the castle's grid.
// `pick` records how the puzzle was chosen (telemetry): 'grid' | 'link' (?instance=).
// Castles: the level graph shipped with the catalog (engine/levelGraph.js: how many castles there
// are and which lead into which) and the catalog's difficulty_ranking / training_position
// (engine/castles.js). Telemetry `level`: the castle number (= the graph's node id), on the castle
// screen and in a game (instance.level is set to its castle by assignCastles).
// Review: ?map=all in the URL opens every castle (nothing is saved for it; reload without it to
// play normally).
export default function App() {
  const { t } = useTranslation()
  const [index, setIndex] = useState(null)
  const [castles, setCastles] = useState(null)   // [{ castle, pool }] once the catalog is loaded
  const [graph, setGraph] = useState(null)       // engine/levelGraph.js, once loaded
  const [review] = useState(() => new URLSearchParams(window.location.search).get('map') === 'all')
  const [error, setError] = useState(null)
  const [castle, setCastle] = useState(null)     // number of the open castle, or null on the map
  const [game, setGame] = useState(null)         // { instance, pick } while playing
  const progressVersion = useProgress()          // castle states follow the stars

  const states = useMemo(
    () => castles && computeStates(castles, (pool, c) => ({
      solved: progressTotals(pool.map((i) => i.id)).solved,
      stars: castleStars(c),                      // the castle's own counter (engine/progress.js)
    }), graph, { allOpen: review, opened: wildcardOpened() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [castles, graph, progressVersion],
  )

  // Nudge the opt-in once per visit when play opens a new castle and progress is not being saved
  // (otherwise the opened castles are gone next time).
  const [nudge, setNudge] = useState(null)       // castle number just opened, while nudging
  const baseline = useRef(null)
  const nudged = useRef(false)
  const unlocks = states ? earnedUnlocks(states) : null
  useEffect(() => {
    if (unlocks === null) return
    if (baseline.current === null || unlocks < baseline.current) { baseline.current = unlocks; return }
    if (unlocks > baseline.current) {
      baseline.current = unlocks
      if (!nudged.current && storageConsent() !== CONSENT_GRANTED) {
        nudged.current = true
        setNudge(highestUnlocked(states))
      }
    }
  }, [unlocks, states])

  // Telemetry: one screen_views row per screen shown (once the catalog is loaded).
  const screen = game ? 'game' : castle !== null ? 'level' : 'home'
  const viewLevel = game?.instance.level ?? castle
  const viewId = game?.instance.id ?? null
  const viewPick = game?.pick ?? null
  useEffect(() => {
    if (index) screenView(screen, { level: viewLevel, instanceId: viewId, pick: viewPick })
  }, [index, screen, viewLevel, viewId, viewPick])

  useEffect(() => {
    loadIndex()
      .then(async (idx) => {
        setIndex(idx)
        setCatalogVersion(idx.catalog_version)
        const [instances, graphData] = await Promise.all([loadAll(), loadLevelGraph()])
        const g = graphData ? parseLevelGraph(graphData) : chainGraph(CASTLE_COUNT)
        // a castle never shows more puzzles than its workshop scene has places: the surplus is left
        // out everywhere (not on the map's counts, not in the history; ?instance= still opens it)
        const { castles: all, skipped } = fitToScenes(assignCastles(instances, g.count))
        for (const { castle: c, ids } of skipped) console.warn(`castle ${c}: ${ids.length} puzzle(s) left out, its scene is full`, ids)
        setGraph(g)
        seedCastleStars(all)                        // once, for progress saved before castle counters
        setCastles(all)
        // ?instance=<name or id> opens one specific puzzle (testing, sharing), even in a locked castle.
        const ref = new URLSearchParams(window.location.search).get('instance')
        if (ref) {
          const inst = await findById(ref)
          if (inst) {
            markPlayed(inst)
            const home = all.find((c) => c.pool.some((i) => i.id === inst.id))
            setCastle(home ? home.castle : null)
            setGame({ instance: inst, pick: 'link' })
          }
        }
      })
      .catch((e) => setError(String(e)))
  }, [])

  // A level's name: "Training castle", then each level's own name, e.g. "Amethyst Hut" (sites.js siteName).
  const castleName = (c) => siteName(t, c)
  const pool = castle !== null ? castles?.[castle]?.pool ?? [] : []
  // What finishing a castle opens: its children in the graph -- one name ("House of the Lily"), or how
  // many when there are several ("3 new places"). Null when it leads nowhere.
  const opensNext = (c) => {
    const next = states?.[c]?.children ?? []
    if (next.length === 0) return null
    if (next.length === 1) return { one: castleName(next[0]) }
    return { count: next.length }
  }

  // Wildcards (src/wildcards.js): the ones whose place is still locked, and starting a try.
  const wildcards = useMemo(() => (states && castles ? availableWildcards(states, castles) : []), [states, castles])
  function playWildcard(level) {
    const w = wildcards.find((x) => x.level === level)
    if (!w) return
    markPlayed(w.inst)
    setCastle(level)
    setGame({ instance: w.inst, pick: 'grid', wildcard: level })   // telemetry: 'grid'
  }
  // Back from a game: to its castle's workshop -- or to the map when that castle is locked
  // (a wildcard try, or a puzzle opened by a link).
  function backFromGame() {
    leaveGame()
    if (castle !== null && !states?.[castle]?.unlocked) setCastle(null)
  }

  function playPicked(inst) {
    markPlayed(inst)
    setGame({ instance: inst, pick: 'grid' })
  }

  // Homepage history: the recently played puzzles that are still in the catalog, with their castle.
  function recent() {
    if (!castles) return []
    const where = new Map()
    for (const { castle: c, pool: p } of castles) for (const inst of p) where.set(inst.id, { inst, c })
    return recentlyPlayed().filter((id) => where.has(id))
      .map((id) => ({ inst: where.get(id).inst, castle: where.get(id).c, castleName: castleName(where.get(id).c) }))
  }

  // Replay from the history: open it in its castle (Back returns to that castle's grid).
  // Telemetry pick 'grid' (chosen from a list in the app; the database only accepts random/grid/link).
  function playRecent(inst) {
    const entry = recent().find((r) => r.inst.id === inst.id)
    markPlayed(inst)
    setCastle(entry ? entry.castle : null)
    setGame({ instance: inst, pick: 'grid' })
  }

  function leaveGame() {
    setGame(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has('instance')) {
      url.searchParams.delete('instance')
      window.history.replaceState(null, '', url)
    }
  }

  const banner = <ConsentBanner nudge={nudge === null ? null : castleName(nudge)} onNudgeDone={() => setNudge(null)} />

  if (game) {
    return (
      <GameScreen
        key={game.instance.id}
        instance={game.instance}
        place={castle !== null ? castleName(castle) : null}
        training={states?.[castle]?.training ? {
          day: pool.findIndex((i) => i.id === game.instance.id) + 1 || null,   // position in the training plan
          ids: pool.map((i) => i.id),
          next: opensNext(castle)?.one ?? null,
        } : null}
        pick={game.pick}
        onPickNew={backFromGame}
        onHome={() => { leaveGame(); setCastle(null) }}
        wildcard={game.wildcard !== undefined && graph ? { level: game.wildcard, opens: wildcardOpens(graph, game.wildcard) } : null}
        // still locked places this castle leads to: reaching its stars here opens (some of) them
        canUnlock={castle !== null && !!states?.[castle]?.unlocked && !states[castle].training
          && (states[castle].children ?? []).some((c) => !states[c]?.unlocked)}
      />
    )
  }
  if (castle !== null && states) {
    return (
      <>
      {banner}
      <LevelScreen
        title={castleName(castle)}
        next={opensNext(castle)}
        state={states[castle]}
        pool={pool}
        onPick={playPicked}
        onBack={() => setCastle(null)}
        nudging={nudge !== null}
      />
      </>
    )
  }
  // The opt-in banner shows on the home and castle screens until answered (never over a game).
  return (
    <>
    {banner}
    <HomeScreen
      castleStates={states}
      graph={graph}
      review={review}
      error={error}
      loadingCastle={null}
      onSelectCastle={setCastle}
      recent={recent}
      onPlayRecent={playRecent}
      wildcards={review ? [] : wildcards}
      onWildcard={playWildcard}
      nudging={nudge !== null}
    />
    </>
  )
}
