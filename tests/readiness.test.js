import test from 'node:test'
import assert from 'node:assert/strict'
import { getReadiness } from '../lib/readiness.js'

test('readiness is healthy when database and Redis checks pass', async () => {
  const readiness = await getReadiness({
    database: async () => {},
    redis: async () => {},
  })

  assert.deepEqual(readiness, {
    status: 'ok',
    checks: { database: true, redis: true },
  })
})

test('readiness is unavailable when a dependency check fails', async () => {
  const readiness = await getReadiness({
    database: async () => {},
    redis: async () => { throw new Error('connection failed') },
  })

  assert.deepEqual(readiness, {
    status: 'unavailable',
    checks: { database: true, redis: false },
  })
})

test('readiness times out stalled dependency checks', async () => {
  const readiness = await getReadiness({
    database: () => new Promise(() => {}),
    redis: async () => {},
  }, 10)

  assert.deepEqual(readiness, {
    status: 'unavailable',
    checks: { database: false, redis: true },
  })
})
