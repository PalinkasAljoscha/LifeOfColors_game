import { useEffect, useState } from 'react'
import HomeScreen from './components/HomeScreen.jsx'
import GameScreen from './components/GameScreen.jsx'
import { loadIndex, pickRandom, findById } from './engine/catalog.js'
import { setCatalogVersion } from './telemetry/telemetry.js'

// Two screens: Home (description + level buttons) and Game (one instance).
// Later: a third screen to choose an instance within a level.
export default function App() {
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null)
  const [instance, setInstance] = useState(null)
  const [loadingLevel, setLoadingLevel] = useState(null)

  useEffect(() => {
    loadIndex()
      .then(async (idx) => {
        setIndex(idx)
        setCatalogVersion(idx.catalog_version)
        // ?instance=loc_... opens one specific puzzle (testing, sharing).
        const id = new URLSearchParams(window.location.search).get('instance')
        if (id) {
          const inst = await findById(id)
          if (inst) setInstance(inst)
        }
      })
      .catch((e) => setError(String(e)))
  }, [])

  async function startLevel(level) {
    setLoadingLevel(level)
    try {
      setInstance(await pickRandom(level))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoadingLevel(null)
    }
  }

  function goHome() {
    setInstance(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has('instance')) {
      url.searchParams.delete('instance')
      window.history.replaceState(null, '', url)
    }
  }

  if (instance) {
    return <GameScreen key={instance.id} instance={instance} onHome={goHome} />
  }
  return (
    <HomeScreen
      levels={index?.levels ?? null}
      error={error}
      loadingLevel={loadingLevel}
      onSelectLevel={startLevel}
    />
  )
}
