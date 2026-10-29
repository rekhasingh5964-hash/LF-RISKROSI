import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiMetrics } from '../lib/api-metrics.js'

test('API metrics expose bounded response counters and cumulative duration buckets', () => {
  const metrics = createApiMetrics()
  metrics.record({ method: 'GET', status: 200, durationMs: 8 })
  metrics.record({ method: 'POST', status: 500, durationMs: 120 })

  const rendered = metrics.render()
  assert.match(rendered, /lf_api_responses_total\{method="GET",status="200"\} 1/)
  assert.match(rendered, /lf_api_responses_total\{method="POST",status="500"\} 1/)
  assert.match(rendered, /lf_api_response_duration_ms_bucket\{le="10"\} 1/)
  assert.match(rendered, /lf_api_response_duration_ms_bucket\{le="250"\} 2/)
  assert.match(rendered, /lf_api_response_duration_ms_sum 128/)
  assert.match(rendered, /lf_api_response_duration_ms_count 2/)
})

test('API metrics normalize unrecognized labels and invalid durations', () => {
  const metrics = createApiMetrics()
  metrics.record({ method: 'GET /sensitive/path', status: 302, durationMs: -5 })

  const rendered = metrics.render()
  assert.match(rendered, /lf_api_responses_total\{method="UNKNOWN",status="302"\} 1/)
  assert.match(rendered, /lf_api_response_duration_ms_sum 0/)
  assert.doesNotMatch(rendered, /sensitive|\/path/)
})
