// Validates the shipped catalog (public/catalog): structure, ids, features, level files.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { idPayload, isPlayable, SUPPORTED_FEATURES } from '../src/engine/engine.js'

const dir = new URL('../public/catalog/', import.meta.url)
const read = (f) => JSON.parse(readFileSync(new URL(f, dir)))

test('catalog exists', () => assert.ok(existsSync(new URL('index.json', dir)), 'run the factory export first'))

test('catalog is consistent and every instance is valid', () => {
  const index = read('index.json')
  assert.match(index.schema_version, /^1\./)
  const seen = new Set()
  for (const lvl of index.levels) {
    const pack = read(lvl.file)
    assert.equal(pack.level, lvl.level)
    assert.equal(pack.catalog_version, index.catalog_version)
    let live = 0
    for (const inst of pack.instances) {
      assert.ok(!seen.has(inst.id), `duplicate ${inst.id}`)
      seen.add(inst.id)
      assert.equal(inst.level, lvl.level)
      assert.equal(index.instances[inst.id], lvl.level)
      const id = 'loc_' + createHash('sha256').update(idPayload(inst)).digest('hex').slice(0, 16)
      assert.equal(inst.id, id, `id hash mismatch for ${inst.id}`)
      assert.match(inst.rule.table, /^[UOBGX]{165}$/)
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
})
