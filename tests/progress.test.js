// Player progress and the storage opt-in (src/engine/progress.js), with a fake localStorage.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  initProgress, resetProgressForTests, storageConsent, setStorageConsent, recordTried, recordSolved,
  puzzleState, bestStars, progressTotals, STORAGE_CONSENT_KEY, PROGRESS_KEY, CONSENT_GRANTED, CONSENT_DENIED,
} from '../src/engine/progress.js'

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial))
  return {
    map: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}

let store
beforeEach(() => {
  resetProgressForTests()
  store = fakeStorage()
  initProgress(store)
})

test('nothing is written to the browser before the player opts in', () => {
  assert.equal(storageConsent(), null)
  recordTried('a')
  recordSolved('a', 4)
  assert.equal(store.map.size, 0)
  assert.equal(puzzleState('a'), 'solved')          // still tracked for this visit
})

test('opting in saves this visit and everything after it', () => {
  recordSolved('a', 3)
  setStorageConsent(CONSENT_GRANTED)
  assert.equal(store.getItem(STORAGE_CONSENT_KEY), CONSENT_GRANTED)
  assert.deepEqual(JSON.parse(store.getItem(PROGRESS_KEY)), { v: 1, p: { a: 3 } })
  recordTried('b')
  assert.deepEqual(JSON.parse(store.getItem(PROGRESS_KEY)).p, { a: 3, b: 't' })
})

test('declining stores only the answer; withdrawing deletes saved progress', () => {
  setStorageConsent(CONSENT_DENIED)
  recordSolved('a', 5)
  assert.deepEqual([...store.map.keys()], [STORAGE_CONSENT_KEY])
  setStorageConsent(CONSENT_GRANTED)
  assert.ok(store.getItem(PROGRESS_KEY))
  setStorageConsent(CONSENT_DENIED)
  assert.equal(store.getItem(PROGRESS_KEY), null)
  assert.equal(store.getItem(STORAGE_CONSENT_KEY), CONSENT_DENIED)
})

test('saved progress comes back in the next visit, only with consent', () => {
  const saved = fakeStorage({ [STORAGE_CONSENT_KEY]: CONSENT_GRANTED, [PROGRESS_KEY]: JSON.stringify({ v: 1, p: { a: 2, b: 't' } }) })
  resetProgressForTests()
  initProgress(saved)
  assert.equal(storageConsent(), CONSENT_GRANTED)
  assert.equal(bestStars('a'), 2)
  assert.equal(puzzleState('b'), 'played')

  // progress left over without consent (e.g. consent value cleared) is ignored and removed
  const stray = fakeStorage({ [PROGRESS_KEY]: JSON.stringify({ v: 1, p: { a: 2 } }) })
  resetProgressForTests()
  initProgress(stray)
  assert.equal(puzzleState('a'), null)
  assert.equal(stray.getItem(PROGRESS_KEY), null)
})

test('a puzzle keeps its BEST rating; totals count at most 5 stars per puzzle', () => {
  assert.deepEqual(recordSolved('a', 2), { previousBest: null, best: 2, newBest: false })
  assert.deepEqual(recordSolved('a', 4), { previousBest: 2, best: 4, newBest: true })
  assert.deepEqual(recordSolved('a', 1), { previousBest: 4, best: 4, newBest: false })
  recordSolved('a', 5)
  recordSolved('a', 5)
  recordSolved('b', 3)
  recordSolved('c', null)              // no rating for this puzzle: solved, 0 stars
  recordTried('d')
  recordTried('a')                     // re-opening a solved puzzle keeps it solved
  assert.deepEqual(progressTotals(), { solved: 3, stars: 8, tried: 4 })
  assert.deepEqual(progressTotals(['a', 'd', 'x']), { solved: 1, stars: 5, tried: 2 })
  assert.equal(puzzleState('c'), 'solved')
  assert.equal(bestStars('c'), 0)
  assert.equal(bestStars('d'), null)
})

test('corrupt or foreign stored data is ignored, storage errors never break the game', () => {
  const bad = fakeStorage({ [STORAGE_CONSENT_KEY]: CONSENT_GRANTED,
    [PROGRESS_KEY]: JSON.stringify({ v: 1, p: { a: 9, b: 'x', c: 3 } }) })
  resetProgressForTests()
  initProgress(bad)
  assert.deepEqual(progressTotals(), { solved: 1, stars: 3, tried: 1 })

  const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('full') }, removeItem() { throw new Error('x') } }
  resetProgressForTests()
  initProgress(broken)
  setStorageConsent(CONSENT_GRANTED)
  recordSolved('a', 5)
  assert.equal(bestStars('a'), 5)
})
