const bucketsMs = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'UNKNOWN']
const statuses = [200, 201, 202, 204, 301, 302, 304, 400, 401, 403, 404, 405, 409, 413, 429, 500, 501, 502, 503, 504, 'other']

function methodLabel(value) {
  return methods.includes(value) ? value : 'UNKNOWN'
}

function statusLabel(value) {
  return statuses.includes(value) ? String(value) : 'other'
}

export function createApiMetrics() {
  const requestCounts = new Map()
  const durationBuckets = new Map()
  let durationCount = 0
  let durationSum = 0

  function record({ method, status, durationMs }) {
    const labels = `${methodLabel(method)}|${statusLabel(status)}`
    requestCounts.set(labels, (requestCounts.get(labels) || 0) + 1)

    const duration = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0
    durationCount += 1
    durationSum += duration
    for (const bucket of bucketsMs) {
      if (duration <= bucket) durationBuckets.set(bucket, (durationBuckets.get(bucket) || 0) + 1)
    }
  }

  function render() {
    const lines = [
      '# HELP lf_api_responses_total Total observed API responses.',
      '# TYPE lf_api_responses_total counter',
    ]

    for (const [labels, count] of requestCounts) {
      const [method, status] = labels.split('|')
      lines.push(`lf_api_responses_total{method="${method}",status="${status}"} ${count}`)
    }

    lines.push(
      '# HELP lf_api_response_duration_ms API response duration in milliseconds.',
      '# TYPE lf_api_response_duration_ms histogram',
    )
    for (const bucket of bucketsMs) {
      lines.push(`lf_api_response_duration_ms_bucket{le="${bucket}"} ${durationBuckets.get(bucket) || 0}`)
    }
    lines.push(
      `lf_api_response_duration_ms_bucket{le="+Inf"} ${durationCount}`,
      `lf_api_response_duration_ms_sum ${durationSum}`,
      `lf_api_response_duration_ms_count ${durationCount}`,
    )
    return `${lines.join('\n')}\n`
  }

  return { record, render }
}

const apiMetrics = createApiMetrics()
export const recordApiMetric = apiMetrics.record
export const renderApiMetrics = apiMetrics.render
