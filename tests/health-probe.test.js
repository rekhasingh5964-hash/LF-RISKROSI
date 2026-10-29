import test from 'node:test'
import assert from 'node:assert/strict'
import { probeHealth } from '../lib/health-probe.js'

function response(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('health probe succeeds only when HTTP and dependency checks are healthy', async () => {
  let time = 100
  const result = await probeHealth('http://localhost:3000/api/health', {
    fetchImpl: async (url, options) => {
      assert.equal(url.pathname, '/api/health')
      assert.equal(options.redirect, 'error')
      time = 132
      return response(200, { status: 'ok', checks: { database: true, redis: true } })
    },
    now: () => time,
  })

  assert.deepEqual(result, {
    healthy: true,
    statusCode: 200,
    durationMs: 32,
    checks: { database: true, redis: true },
  })
})

test('health probe reports dependency or HTTP failures', async () => {
  const result = await probeHealth('https://localhost/api/health', {
    fetchImpl: async () => response(503, {
      status: 'unavailable',
      checks: { database: true, redis: false },
    }),
  })

  assert.equal(result.healthy, false)
  assert.equal(result.statusCode, 503)
  assert.deepEqual(result.checks, { database: true, redis: false })
})

test('health probe rejects unsafe URLs and invalid timeouts', async () => {
  await assert.rejects(probeHealth('file:///etc/passwd'), /HTTP\(S\)/)
  await assert.rejects(probeHealth('https://user:secret@example.com/health'), /embedded credentials/)
  await assert.rejects(probeHealth('http://localhost/health', { timeoutMs: 0 }), /between 1 and 30000/)
})
