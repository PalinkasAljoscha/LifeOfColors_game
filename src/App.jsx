import { useEffect, useMemo, useState } from 'react'
import HomeScreen from './components/HomeScreen.jsx'
import LevelScreen from './components/LevelScreen.jsx'
import GameScreen from './components/GameScreen.jsx'
import ConsentBanner from './components/ConsentBanner.jsx'
import { loadIndex, loadLevel, pickRandom, markPlayed, findById } from './engine/catalog.js'
import { setCatalogVersion, screenView } from './telemetry/telemetry.js'

// Three screens: Home (description + level buttons) -> Level (Random pick + grid of all puzzles
// of the level) -> Game (one instance). Home in the game goes back to the level's grid.
// `pick` records how the puzzle was chosen (telemetry): 'random' | 'grid' | 'link' (?instance=).
export default function App() {
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(null)       // { level, pool } while a level is open
  const [game, setGame] = useState(null)         // { instance, pick } while playing
  const [loadingLevel, setLoadingLevel] = useState(null)
  // { level: [ids] } from the catalog index, for the per-level progress on the home screen.
  const levelIds = useMemo(() => {
    const out = {}
    for (const [id, lvl] of Object.entries(index?.instances ?? {})) (out[lvl] ??= []).push(id)
    return out
  }, [index])

  // Telemetry: one screen_views row per screen shown (once the catalog is loaded).
  const screen = game ? 'game' : level ? 'level' : 'home'
  const viewLevel = game?.instance.level ?? level?.level ?? null
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
        // ?instance=<name or id> opens one specific puzzle (testing, sharing).
        const ref = new URLSearchParams(window.location.search).get('instance')
        if (ref) {
          const inst = await findById(ref)
          if (inst) {
            markPlayed(inst)
            setLevel({ level: inst.level, pool: await loadLevel(inst.level) })
            setGame({ instance: inst, pick: 'link' })
          }
        }
      })
      .catch((e) => setError(String(e)))
  }, [])

  async function openLevel(lvl) {
    setLoadingLevel(lvl)
    try {
      setLevel({ level: lvl, pool: await loadLevel(lvl) })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoadingLevel(null)
    }
  }

  async function playRandom() {
    try {
      setGame({ instance: await pickRandom(level.level), pick: 'random' })
    } catch (e) {
      setError(String(e))
      setLevel(null)
    }
  }

  function playPicked(inst) {
    markPlayed(inst, level.pool.length)
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

  if (game) {
    return (
      <GameScreen
        key={game.instance.id}
        instance={game.instance}
        pick={game.pick}
        onPickNew={leaveGame}
        onHome={() => { leaveGame(); setLevel(null) }}
      />
    )
  }
  if (level) {
    return (
      <>
      <ConsentBanner />
      <LevelScreen
        level={level.level}
        pool={level.pool}
        onRandom={playRandom}
        onPick={playPicked}
        onBack={() => setLevel(null)}
      />
      </>
    )
  }
  // The opt-in banner shows on the home and level screens until answered (never over a game).
  return (
    <>
    <ConsentBanner />
    <HomeScreen
      levels={index?.levels ?? null}
      levelIds={index ? levelIds : null}
      error={error}
      loadingLevel={loadingLevel}
      onSelectLevel={openLevel}
    />
    </>
  )
}
