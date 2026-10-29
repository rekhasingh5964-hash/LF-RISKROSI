import test from 'node:test'
import assert from 'node:assert/strict'
import { observeApiResponse } from '../lib/api-observability.js'

test('API response observability adds a request ID and logs bounded metadata', () => {
  const requestId = 'c320d920-b54d-4c36-a93c-b5a3f68588dc'
  const requestHeaders = new Headers({
    'x-request-id': requestId,
    'x-request-started-at': '1000',
    'x-request-method': 'POST',
  })
  const events = []
  const response = new Response('ok', { status: 201 })

  const observed = observeApiResponse(response, requestHeaders, {
    now: 1240,
    logger: (event) => events.push(JSON.parse(event)),
  })

  assert.equal(observed.headers.get('x-request-id'), requestId)
  assert.deepEqual(events, [{
    event: 'api.response',
    requestId,
    method: 'POST',
    status: 201,
    durationMs: 240,
  }])
})

test('API response observability does not log request content or invalid metadata', () => {
  const events = []
  const response = new Response('ok', { status: 500 })

  observeApiResponse(response, new Headers({
    'x-request-id': 'untrusted-value',
    'x-request-started-at': 'not-a-timestamp',
    'x-request-method': 'GET /secret',
  }), {
    now: 1240,
    logger: (event) => events.push(JSON.parse(event)),
  })

  assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/i)
  assert.deepEqual(events, [{
    event: 'api.response',
    requestId: response.headers.get('x-request-id'),
    method: 'UNKNOWN',
    status: 500,
    durationMs: 0,
  }])
})
