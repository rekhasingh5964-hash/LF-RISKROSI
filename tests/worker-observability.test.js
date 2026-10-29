import test from 'node:test'
import assert from 'node:assert/strict'
import { logWorkerEvent } from '../lib/worker-observability.js'

test('worker observability logs bounded operation metadata', () => {
  const events = []
  logWorkerEvent({
    operation: 'telemetry_prune',
    status: 'completed',
    durationMs: 120,
    count: 42,
  }, (event) => events.push(JSON.parse(event)))

  assert.deepEqual(events, [{
    event: 'worker.operation',
    operation: 'telemetry_prune',
    status: 'completed',
    durationMs: 120,
    count: 42,
  }])
})

test('worker failures log an error class but not its message', () => {
  const events = []
  logWorkerEvent({
    operation: 'outbox_dispatch',
    status: 'failed',
    durationMs: -1,
    errorType: 'WebhookError',
  }, (event) => events.push(JSON.parse(event)))

  assert.deepEqual(events, [{
    event: 'worker.operation',
    operation: 'outbox_dispatch',
    status: 'failed',
    durationMs: 0,
    errorType: 'WebhookError',
  }])
})

test('worker observability rejects unknown operation names', () => {
  assert.throws(() => logWorkerEvent({
    operation: 'tenant-secret',
    status: 'completed',
  }, () => {}), TypeError)
})
