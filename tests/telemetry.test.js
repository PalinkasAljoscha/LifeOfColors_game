// Telemetry: snapshots, counters, visible-time clock and click-list encoding.
// Rows go to a test sink instead of Supabase.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import * as tm from '../src/telemetry/telemetry.js'

const INST = { id: 'loc_0123456789abcdef', level: 2, board: { rows: 9, cols: 6 } }
let rows, clock

beforeEach(() => {
  rows = []
  clock = 0
  tm.__test.reset()
  tm.__test.setSink((table, row) => rows.push({ table, ...row }))
  tm.__test.setNow(() => clock)
})

// Decoder as the factory would write it.
function decode(list) {
  let t = 0
  return list.map((v) => {
    if (v < 0) { t += -v - 1; return { restart: true, t } }
    t += Math.floor(v / 128)
    return { t, cell: (v >> 1) & 63, changed: v & 1 }
  })
}

test('screen views: one row per screen, consecutive duplicates skipped', () => {
  tm.setCatalogVersion('c1')
  tm.screenView('home')
  tm.screenView('home')
  tm.screenView('level', { level: 2 })
  tm.screenView('game', { level: 2, instanceId: INST.id, pick: 'grid' })
  tm.screenView('level', { level: 2 })
  assert.deepEqual(rows.map((r) => r.screen), ['home', 'level', 'game', 'level'])
  assert.equal(rows[2].instance_id, INST.id)
  assert.equal(rows[2].pick, 'grid')
  assert.equal(rows[0].catalog_version, 'c1')
  assert.equal(new Set(rows.map((r) => r.visit_id)).size, 1)
})

test('a full play: clicks, retry, win, hidden, leave', () => {
  tm.startPlay(INST, 'random')
  tm.startPlay(INST, 'random')                  // StrictMode re-run: same play
  clock = 1000; tm.recordClick(0, 0, true, 5, 'O')
  clock = 1500; tm.recordClick(0, 1, false, 7, null)
  clock = 2000; tm.recordClick(1, 0, true, 9, 'B')
  clock = 3000; tm.restartPlay()
  clock = 3200; tm.recordClick(8, 5, true, 5, 'O')
  clock = 4000; tm.recordWin()
  assert.equal(rows.length, 1)
  let s = rows[0]
  assert.equal(s.reason, 'won')
  assert.equal(s.snapshot, 0)
  assert.equal(s.n_clicks, 4)
  assert.equal(s.n_moves, 3)
  assert.equal(s.n_restarts, 1)
  assert.equal(s.n_wins, 1)
  assert.equal(s.best_win_clicks, 1)
  assert.equal(s.best_win_moves, 1)
  assert.deepEqual(s.rules, [5, 9])
  assert.deepEqual([s.n_to_orange, s.n_to_blue, s.n_to_green, s.n_to_uncolored], [2, 1, 0, 0])
  assert.equal(s.active_ms, 4000)
  assert.equal(s.last_click_ms, 3200)
  assert.deepEqual(decode(s.clicks), [
    { t: 10, cell: 0, changed: 1 },
    { t: 15, cell: 1, changed: 0 },
    { t: 20, cell: 6, changed: 1 },
    { restart: true, t: 30 },
    { t: 32, cell: 53, changed: 1 },
  ])

  // Page hidden for 10 minutes: not counted as play time; only new clicks in the next snapshot.
  clock = 5000; tm.onHidden()
  tm.onHidden()                                  // pagehide after visibilitychange: no duplicate
  clock = 605000; tm.onVisible()
  clock = 606000; tm.restartPlay()
  clock = 607000; tm.recordClick(2, 2, true, 3, 'G')
  clock = 608000; tm.endPlay('pick_new')
  assert.deepEqual(rows.map((r) => r.reason), ['won', 'hidden', 'pick_new'])
  assert.deepEqual(rows.map((r) => r.snapshot), [0, 1, 2])
  assert.equal(rows[1].active_ms, 5000)
  assert.deepEqual(rows[1].clicks, [])
  s = rows[2]
  assert.equal(s.active_ms, 8000)
  assert.equal(s.n_restarts, 2)
  assert.equal(s.n_wins, 1)
  assert.deepEqual(s.rules, [3, 5, 9])
  // dts continue across snapshots: decoding the concatenated lists gives visible time since start.
  const all = decode(rows.flatMap((r) => r.clicks))
  assert.deepEqual(all.slice(-2), [{ restart: true, t: 60 }, { t: 70, cell: 14, changed: 1 }])
  assert.equal(new Set(rows.map((r) => r.play_id)).size, 1)

  tm.recordClick(0, 0, true, 1, 'O')            // play ended: ignored
  assert.equal(rows.length, 3)
})

test('best win is the minimum over winning attempts', () => {
  tm.startPlay(INST, 'grid')
  for (let i = 0; i < 5; i++) tm.recordClick(0, 0, i % 2 === 0, 1, 'O')
  tm.recordWin()                                 // 5 clicks, 3 moves
  tm.restartPlay()
  tm.recordClick(0, 0, true, 1, 'O'); tm.recordClick(0, 1, true, 1, 'O')
  tm.recordWin()                                 // 2 clicks, 2 moves
  tm.restartPlay()
  for (let i = 0; i < 9; i++) tm.recordClick(0, 0, true, 1, 'O')
  tm.recordWin()
  const last = rows.at(-1)
  assert.equal(last.n_wins, 3)
  assert.equal(last.best_win_clicks, 2)
  assert.equal(last.best_win_moves, 2)
})

test('click list is capped per snapshot, counters keep counting', () => {
  tm.startPlay(INST, 'link')
  for (let i = 0; i < tm.MAX_ENTRIES + 50; i++) tm.recordClick(0, 0, false, 1, null)
  tm.onHidden()
  assert.equal(rows[0].clicks.length, tm.MAX_ENTRIES)
  assert.equal(rows[0].clicks_truncated, true)
  assert.equal(rows[0].n_clicks, tm.MAX_ENTRIES + 50)
  tm.onVisible()
  tm.recordClick(0, 0, true, 1, 'O')
  tm.endPlay('back')
  assert.equal(rows[1].clicks.length, 1)
  assert.equal(rows[1].clicks_truncated, false)
})

test('opening another puzzle while a play is open ends the old play', () => {
  tm.startPlay(INST, 'grid')
  tm.recordClick(0, 0, true, 1, 'O')
  tm.startPlay({ ...INST, id: 'loc_fedcba9876543210' }, 'random')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].reason, 'back')
})
