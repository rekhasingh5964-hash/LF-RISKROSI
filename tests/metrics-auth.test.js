import test from 'node:test'
import assert from 'node:assert/strict'
import { isMetricsAuthorized } from '../lib/metrics-auth.js'

test('metrics endpoint accepts only the configured bearer token', () => {
  const request = (authorization) => new Request('http://localhost/api/metrics', {
    headers: authorization ? { authorization } : {},
  })

  assert.equal(isMetricsAuthorized(request('Bearer local-secret'), 'local-secret'), true)
  assert.equal(isMetricsAuthorized(request('Bearer wrong'), 'local-secret'), false)
  assert.equal(isMetricsAuthorized(request('local-secret'), 'local-secret'), false)
  assert.equal(isMetricsAuthorized(request('Bearer local-secret'), ''), false)
})
