// Validates the shipped catalog (public/catalog): structure, ids, features, level files.
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
  const seen = new Set()
  const names = new Set()
  const seqs = new Set()
  for (const lvl of index.levels) {
    const pack = read(lvl.file)
    assert.equal(pack.level, lvl.level)
    assert.equal(pack.catalog_version, index.catalog_version)
    let live = 0
    let lastSeq = 0
    for (const inst of pack.instances) {
      assert.match(inst.name ?? '', /^\S.{0,58}\S$/, `${inst.id}: name`)
      assert.match(inst.name_color ?? '', /^#[0-9A-F]{6}$/, `${inst.id}: name_color`)
      assert.ok(Number.isInteger(inst.seq) && inst.seq > lastSeq, `${inst.id}: level file not in seq order`)
      lastSeq = inst.seq
      assert.ok(!seqs.has(inst.seq), `duplicate seq ${inst.seq}`)
      seqs.add(inst.seq)
      const key = normalizeName(inst.name)
      assert.ok(!names.has(key), `duplicate name ${inst.name}`)
      names.add(key)
      assert.equal(index.names[key], inst.id, `index.names for ${inst.name}`)
      assert.ok(!seen.has(inst.id), `duplicate ${inst.id}`)
      seen.add(inst.id)
      assert.equal(inst.level, lvl.level)
      assert.equal(index.instances[inst.id], lvl.level)
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
      if (!inst.retired) {
        live++
        for (const f of inst.requires) assert.ok(SUPPORTED_FEATURES.has(f), `${inst.id} requires unsupported ${f}`)
        assert.ok(isPlayable(inst))
      }
    }
    assert.equal(live, lvl.count, `level ${lvl.level} count`)
  }
  assert.equal(seen.size, Object.keys(index.instances).length)
  assert.equal(names.size, Object.keys(index.names).length)
})
