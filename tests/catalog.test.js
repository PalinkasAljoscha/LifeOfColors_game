// Validates the shipped catalog (public/catalog): structure, ids, features, ranking and training order.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { idPayload, isPlayable, SUPPORTED_FEATURES } from '../src/engine/engine.js'

// Same rule as src/engine/catalog.js normalizeName (catalog.js itself needs a browser).
const normalizeName = (n) => String(n).toLowerCase().replace(/[^a-z0-9]/g, '')

const dir = new URL('../public/catalog/', import.meta.url)
const read = (f) => JSON.parse(readFileSync(new URL(f, dir)))

test('catalog exists', () => assert.ok(existsSync(new URL('index.json', dir)), 'run the factory export first'))

test('catalog is consistent and every instance is valid', () => {
  const index = read('index.json')
  assert.match(index.schema_version, /^1\./)
  const pack = read(index.file)
  assert.equal(pack.catalog_version, index.catalog_version)
  const seen = new Set()
  const names = new Set()
  let lastSeq = 0
  let live = 0
  const rankings = []
  const positions = []
  for (const inst of pack.instances) {
    assert.match(inst.name ?? '', /^\S.{0,58}\S$/, `${inst.id}: name`)
    assert.match(inst.name_color ?? '', /^#[0-9A-F]{6}$/, `${inst.id}: name_color`)
    assert.ok(Number.isInteger(inst.seq) && inst.seq > lastSeq, `${inst.id}: puzzles not in seq order`)
    lastSeq = inst.seq
    const key = normalizeName(inst.name)
    assert.ok(!names.has(key), `duplicate name ${inst.name}`)
    names.add(key)
    assert.equal(index.names[key], inst.id, `index.names for ${inst.name}`)
    assert.ok(!seen.has(inst.id), `duplicate ${inst.id}`)
    seen.add(inst.id)
    assert.equal(inst.level, undefined, `${inst.id}: levels are decided by the app, not the catalog`)
    const id = 'loc_' + createHash('sha256').update(idPayload(inst)).digest('hex').slice(0, 16)
    assert.equal(inst.id, id, `id hash mismatch for ${inst.id}`)
    assert.match(inst.rule.table, /^[UOBGX]{165}$/)
    assert.ok([undefined, null, true, false].includes(inst.start_cell_required), `${inst.id}: start_cell_required`)
    const mtw = inst.moves_to_win_min
    assert.ok(mtw === undefined || mtw === null || (Number.isInteger(mtw) && mtw >= 1), `${inst.id}: moves_to_win_min`)
    const { rows, cols, start } = inst.board
    assert.ok(rows >= 1 && rows <= 9 && cols >= 1 && cols <= 6, `${inst.id}: board ${rows}x${cols} exceeds 9x6`)
    for (const s of start) assert.ok(s.at[0] < rows && s.at[1] < cols)
    assert.ok(inst.goal.at[0] < rows && inst.goal.at[1] < cols)
    checkSpecialCells(inst)
    if (inst.retired) {
      assert.equal(inst.difficulty_ranking, undefined, `${inst.id}: retired with a ranking`)
      assert.equal(inst.training_position, undefined, `${inst.id}: retired in training`)
    } else {
      live++
      for (const f of inst.requires) assert.ok(SUPPORTED_FEATURES.has(f), `${inst.id} requires unsupported ${f}`)
      assert.ok(isPlayable(inst))
      assert.ok(Number.isInteger(inst.difficulty_ranking) || Number.isInteger(inst.training_position),
        `${inst.id}: live without difficulty_ranking or training_position`)
      if (inst.difficulty_ranking !== undefined) rankings.push(inst.difficulty_ranking)
      if (inst.training_position !== undefined) positions.push(inst.training_position)
    }
  }
  const oneToN = (xs) => [...xs].sort((a, b) => a - b).every((x, i) => x === i + 1)
  assert.ok(oneToN(rankings), 'difficulty_ranking must be 1..K without gaps or ties')
  assert.ok(oneToN(positions), 'training_position must be 1..k without gaps or ties')
  assert.equal(live, index.count)
  assert.equal(rankings.length, index.ranked)
  assert.equal(positions.length, index.training)
  assert.equal(names.size, Object.keys(index.names).length)
})

// board.special_cells: the same contract as the factory's instance.validate_instance.
const SPECIAL_FEATURE = { blocked: 'special-blocked', bomb: 'special-bomb', mirror: 'special-mirror', clock: 'special-clock' }
const SPECIAL_KEYS = { blocked: 'cells,type', mirror: 'cells,type', bomb: 'at,taps_to_explode,trigger,type', clock: 'at,cycle,start,type' }
function checkSpecialCells(inst) {
  const sc = inst.board.special_cells ?? []
  const extra = inst.requires.filter((f) => f !== 'core')
  if (!sc.length) {
    assert.deepEqual(extra, [], `${inst.id}: special feature tag without special cells`)
    return
  }
  assert.equal(sc.length, 1, `${inst.id}: at most one special-cell entry`)
  const e = sc[0]
  assert.ok(SPECIAL_FEATURE[e.type], `${inst.id}: unknown special type ${e.type}`)
  assert.deepEqual(extra, [SPECIAL_FEATURE[e.type]], `${inst.id}: requires must name exactly its special type`)
  assert.equal(Object.keys(e).sort().join(','), SPECIAL_KEYS[e.type], `${inst.id}: keys of the ${e.type} entry`)
  assert.ok(Number(inst.schema_version.split('.')[1]) >= 1, `${inst.id}: special cells need schema_version >= 1.1`)
  assert.equal(inst.training_position, undefined, `${inst.id}: special-cell puzzles are never in training`)
  const cells = e.cells ?? [e.at]
  const taken = new Set([...inst.board.start.map((s) => s.at.join(',')), inst.goal.at.join(',')])
  const keys = cells.map((x) => x.join(','))
  assert.equal(new Set(keys).size, keys.length, `${inst.id}: repeated special cell`)
  for (const [r, c] of cells) {
    assert.ok(r >= 0 && r < inst.board.rows && c >= 0 && c < inst.board.cols, `${inst.id}: special cell off the board`)
    assert.ok(!taken.has(`${r},${c}`), `${inst.id}: special cell on a start cell or the goal`)
  }
  if (e.type === 'mirror') assert.equal(cells.length, 2, `${inst.id}: a mirror has two cells`)
  if (e.type === 'bomb') {
    assert.ok(['O', 'B', 'G'].includes(e.trigger), `${inst.id}: bomb trigger`)
    assert.ok(Number.isInteger(e.taps_to_explode) && e.taps_to_explode >= 1, `${inst.id}: taps_to_explode`)
  }
  if (e.type === 'clock') {
    assert.ok(e.cycle.length >= 2 && e.cycle.length <= 4 && new Set(e.cycle).size === e.cycle.length
      && e.cycle.every((x) => 'UOBG'.includes(x)), `${inst.id}: clock cycle`)
    assert.ok(Number.isInteger(e.start) && e.start >= 0 && e.start < e.cycle.length, `${inst.id}: clock start`)
  }
}

