import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('./coverage.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } })
const { getCoverageBounds, fetchCoverage } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('viewport includes multiple tiles on both axes at the rounded-up zoom', () => {
  assert.deepEqual(getCoverageBounds(-100, 60, 100, -60, 1.5), [
    { zoom: 2, minTileCol: 0, minTileRow: 1, maxTileCol: 3, maxTileRow: 2 }
  ])
})

test('a point produces a single-tile AABB', () => {
  assert.deepEqual(getCoverageBounds(0, 0, 0, 0, 2), [
    { zoom: 2, minTileCol: 2, minTileRow: 2, maxTileCol: 2, maxTileRow: 2 }
  ])
})

test('world bounds and poles are clamped to valid tile indices', () => {
  assert.deepEqual(getCoverageBounds(-540, 90, 540, -90, 2), [
    { zoom: 2, minTileCol: 0, minTileRow: 0, maxTileCol: 3, maxTileRow: 3 }
  ])
  assert.equal(getCoverageBounds(-180, 85, 180, -85, -1)[0].zoom, 0)
})

test('antimeridian crossings split into two ordered AABBs', () => {
  const expected = [
    { zoom: 2, minTileCol: 3, minTileRow: 1, maxTileCol: 3, maxTileRow: 2 },
    { zoom: 2, minTileCol: 0, minTileRow: 1, maxTileCol: 0, maxTileRow: 2 }
  ]
  assert.deepEqual(getCoverageBounds(170, 10, -170, -10, 2), expected)
  assert.deepEqual(getCoverageBounds(170, 10, 190, -10, 2), expected)
  assert.deepEqual(getCoverageBounds(-190, 10, -170, -10, 2), expected)
})

test('world copies normalize to the same coverage', () => {
  assert.deepEqual(getCoverageBounds(460, 10, 480, -10, 5), getCoverageBounds(100, 10, 120, -10, 5))
})

test('requests use AABB URL ordering, preserve labels, and deduplicate split results', async t => {
  const calls = []
  const layer = { value: '1', label: 'First floor', kind: 'level' }
  const signal = new AbortController().signal
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url)
    assert.equal(options.signal, signal)
    return { ok: true, json: async () => [layer] }
  })
  assert.deepEqual(await fetchCoverage('/token/coverage', getCoverageBounds(170, 10, -170, -10, 2), signal), [layer])
  assert.deepEqual(calls, ['/token/coverage/2/3/1/3/2', '/token/coverage/2/0/1/0/2'])
})

test('HTTP failures reject rather than being treated as layer data', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 400 }))
  await assert.rejects(fetchCoverage('/coverage', getCoverageBounds(0, 0, 0, 0, 0)), /Failed to load coverage: 400/)
})