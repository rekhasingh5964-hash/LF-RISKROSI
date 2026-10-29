import { recordApiMetric } from './api-metrics.js'

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])

export function observeApiResponse(response, requestHeaders, { now = Date.now(), logger = console.log } = {}) {
  const suppliedId = requestHeaders.get('x-request-id')
  const requestId = suppliedId && REQUEST_ID_PATTERN.test(suppliedId) ? suppliedId : crypto.randomUUID()
  const startedAt = Number(requestHeaders.get('x-request-started-at'))
  const method = requestHeaders.get('x-request-method')
  const durationMs = Number.isSafeInteger(startedAt) && startedAt >= 0 && startedAt <= now
    ? now - startedAt
    : 0
  const observedMethod = METHODS.has(method) ? method : 'UNKNOWN'

  response.headers.set('x-request-id', requestId)
  recordApiMetric({ method: observedMethod, status: response.status, durationMs })
  logger(JSON.stringify({
    event: 'api.response',
    requestId,
    method: observedMethod,
    status: response.status,
    durationMs,
  }))
  return response
}
