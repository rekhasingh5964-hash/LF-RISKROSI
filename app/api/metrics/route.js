import { renderApiMetrics } from '@/lib/api-metrics'
import { isMetricsAuthorized } from '@/lib/metrics-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  if (process.env.PROMETHEUS_METRICS_ENABLED !== 'true') {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  if (!isMetricsAuthorized(request, process.env.PROMETHEUS_METRICS_TOKEN)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
        'WWW-Authenticate': 'Bearer',
      },
    })
  }

  return new Response(renderApiMetrics(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
