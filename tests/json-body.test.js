import test from 'node:test'
import assert from 'node:assert/strict'
import { readJsonBody } from '../lib/json-body.js'

test('JSON body reader accepts objects and an optional empty request', async () => {
  assert.deepEqual(await readJsonBody(new Request('https://example.test', {
    method: 'POST',
    body: JSON.stringify({ device: 'workstation-1' }),
  })), { device: 'workstation-1' })
  assert.deepEqual(await readJsonBody(new Request('https://example.test', { method: 'POST' }), { optional: true }), {})
})

test('JSON body reader rejects non-object and oversized bodies', async () => {
  await assert.rejects(
    readJsonBody(new Request('https://example.test', { method: 'POST', body: '[]' })),
    /JSON object/,
  )
  await assert.rejects(
    readJsonBody(new Request('https://example.test', {
      method: 'POST',
      body: JSON.stringify({ value: 'a'.repeat(128 * 1024) }),
    })),
    /too large/,
  )
})
