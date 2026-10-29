export const ENDPOINT_TELEMETRY_RETENTION_DAYS = 180
export const ENDPOINT_TELEMETRY_RETENTION_MS = ENDPOINT_TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000

const EVENT_ID_PATTERN = /^[\da-f]{32}$/i
const EVENT_TYPES = new Set(['AGENT_STARTED', 'HEARTBEAT_FAILED', 'HEARTBEAT_RESTORED'])
const FAILURE_CLASSES = new Set(['NETWORK', 'CONTROL_PLANE'])

export function validateEndpointTelemetryEvent(body, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  if (Object.keys(body).some((key) => !['eventId', 'eventType', 'occurredAt', 'details'].includes(key))) return null
  if (typeof body.eventId !== 'string' || !EVENT_ID_PATTERN.test(body.eventId)) return null
  if (typeof body.eventType !== 'string' || !EVENT_TYPES.has(body.eventType)) return null

  if (typeof body.occurredAt !== 'string') return null
  const occurredAt = new Date(body.occurredAt)
  if (!Number.isFinite(occurredAt.getTime())) return null
  if (occurredAt.getTime() > now.getTime() + 5 * 60 * 1000 ||
      occurredAt.getTime() < now.getTime() - 180 * 24 * 60 * 60 * 1000) return null

  if (!body.details || typeof body.details !== 'object' || Array.isArray(body.details)) return null
  const keys = Object.keys(body.details)
  if (body.eventType === 'HEARTBEAT_FAILED') {
    if (keys.length !== 1 || keys[0] !== 'failureClass' || !FAILURE_CLASSES.has(body.details.failureClass)) return null
  } else if (keys.length !== 0) {
    return null
  }

  return {
    eventId: body.eventId.toLowerCase(),
    eventType: body.eventType,
    occurredAt,
    details: body.details,
  }
}

export function endpointTelemetryExpiry(receivedAt) {
  return new Date(receivedAt.getTime() + ENDPOINT_TELEMETRY_RETENTION_MS)
}
