const OPERATIONS = new Set([
  'queue_job',
  'outbox_dispatch',
  'consent_expiry',
  'telemetry_prune',
  'worker',
])
const STATUSES = new Set(['completed', 'failed'])

export function logWorkerEvent({
  operation,
  status,
  durationMs,
  count,
  errorType,
}, logger = console.log) {
  if (!OPERATIONS.has(operation) || !STATUSES.has(status)) {
    throw new TypeError('Invalid worker observability event')
  }

  const event = {
    event: 'worker.operation',
    operation,
    status,
    durationMs: Number.isSafeInteger(durationMs) && durationMs >= 0 ? durationMs : 0,
  }
  if (Number.isSafeInteger(count) && count >= 0) event.count = count
  if (status === 'failed') {
    event.errorType = typeof errorType === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(errorType)
      ? errorType
      : 'Error'
  }

  logger(JSON.stringify(event))
}
