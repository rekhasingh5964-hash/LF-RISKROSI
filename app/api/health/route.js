import { headers } from 'next/headers'
import { getReadiness } from '@/lib/readiness'
import { pingRedisForReadiness } from '@/lib/redis-readiness'
import { prisma } from '@/lib/prisma'
import { observeApiResponse } from '@/lib/api-observability'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const readiness = await getReadiness({
    database: () => prisma.$queryRaw`SELECT 1`,
    redis: pingRedisForReadiness,
  })

  if (readiness.status !== 'ok') {
    console.error('[health] readiness check failed', readiness.checks)
  }

  const response = Response.json(readiness, {
    status: readiness.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
  return observeApiResponse(response, await headers())
}
