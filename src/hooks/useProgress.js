import { useSyncExternalStore } from 'react'
import { subscribeProgress, progressVersion } from '../engine/progress.js'

/** Re-render the calling component whenever the player's progress or consent changes.
 *  Returns the change counter (the values themselves are read from engine/progress.js). */
export function useProgress() {
  return useSyncExternalStore(subscribeProgress, progressVersion, progressVersion)
}
