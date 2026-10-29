import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ENDPOINT_TELEMETRY_RETENTION_DAYS,
  endpointTelemetryExpiry,
  validateEndpointTelemetryEvent,
} from '../lib/endpoint-telemetry.js'

const now = new Date('2026-10-28T12:00:00.000Z')

test('endpoint telemetry accepts only bounded agent lifecycle events', () => {
  const event = validateEndpointTelemetryEvent({
    eventId: 'A'.repeat(32),
    eventType: 'HEARTBEAT_FAILED',
    occurredAt: now.toISOString(),
    details: { failureClass: 'NETWORK' },
  }, now)
  assert.equal(event.eventId, 'a'.repeat(32))
  assert.equal(event.eventType, 'HEARTBEAT_FAILED')
  assert.deepEqual(event.details, { failureClass: 'NETWORK' })
})

test('endpoint telemetry rejects unapproved types, details, and future timestamps', () => {
  const valid = {
    eventId: 'a'.repeat(32),
    eventType: 'AGENT_STARTED',
    occurredAt: now.toISOString(),
    details: {},
  }
  assert.equal(validateEndpointTelemetryEvent({ ...valid, eventType: 'PROCESS_STARTED' }, now), null)
  assert.equal(validateEndpointTelemetryEvent({ ...valid, details: { commandLine: 'secret' } }, now), null)
  assert.equal(validateEndpointTelemetryEvent({
    ...valid,
    occurredAt: new Date(now.getTime() + 6 * 60 * 1000).toISOString(),
  }, now), null)
  assert.equal(validateEndpointTelemetryEvent({
    ...valid,
    occurredAt: new Date(now.getTime() - 181 * 24 * 60 * 60 * 1000).toISOString(),
  }, now), null)
  assert.equal(validateEndpointTelemetryEvent({ ...valid, occurredAt: 'not-a-time' }, now), null)
  assert.equal(validateEndpointTelemetryEvent({ ...valid, extra: 'unexpected' }, now), null)
})

test('endpoint telemetry expires exactly 180 days after server receipt', () => {
  const receivedAt = new Date('2026-10-28T12:00:00.000Z')
  const expiry = endpointTelemetryExpiry(receivedAt)
  assert.equal(ENDPOINT_TELEMETRY_RETENTION_DAYS, 180)
  assert.equal(expiry.getTime() - receivedAt.getTime(), 180 * 24 * 60 * 60 * 1000)
})
