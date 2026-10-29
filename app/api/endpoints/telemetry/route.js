import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, json, readJson } from '@/lib/http'
import { hashEndpointToken } from '@/lib/endpoint-auth'
import { endpointTelemetryExpiry, validateEndpointTelemetryEvent } from '@/lib/endpoint-telemetry'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const BEARER_TOKEN_PATTERN = /^[\da-f]{64}$/i

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)

  const events = await prisma.endpointTelemetryEvent.findMany({
    where: { organizationId: { in: scope.organizationIds }, expiresAt: { gt: new Date() } },
    select: {
      id: true, organizationId: true, deviceId: true, eventType: true,
      occurredAt: true, receivedAt: true, details: true,
      device: { select: { name: true } },
      organization: { select: { name: true } },
    },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  })
  return json(events)
}

export async function POST(request) {
  const authorization = request.headers.get('authorization') || ''
  const match = /^Bearer (.+)$/i.exec(authorization)
  if (!match || !BEARER_TOKEN_PATTERN.test(match[1])) {
    return errorResponse('A valid device bearer token is required', 401)
  }

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const event = validateEndpointTelemetryEvent(body)
  if (!event) return errorResponse('Invalid or unsupported endpoint telemetry event', 400)

  const now = new Date()
  const result = await prisma.$transaction(async (tx) => {
    const activeDevice = await tx.endpointDevice.updateMany({
      where: {
        deviceTokenHash: hashEndpointToken(match[1]),
        active: true,
        organization: { is: { status: 'ACTIVE' } },
      },
      data: { lastSeenAt: now },
    })
    if (activeDevice.count !== 1) return 'unavailable'

    const device = await tx.endpointDevice.findUnique({
      where: { deviceTokenHash: hashEndpointToken(match[1]) },
      select: { id: true, organizationId: true },
    })
    if (!device) return 'unavailable'

    const inserted = await tx.endpointTelemetryEvent.createMany({
      data: [{
        organizationId: device.organizationId,
        deviceId: device.id,
        eventId: event.eventId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        receivedAt: now,
        expiresAt: endpointTelemetryExpiry(now),
        details: event.details,
      }],
      skipDuplicates: true,
    })
    return inserted.count === 1 ? 'created' : 'duplicate'
  })

  if (result === 'unavailable') return errorResponse('Device credential is revoked or unavailable', 401)
  return json({ accepted: true, duplicate: result === 'duplicate' }, result === 'created' ? 201 : 200)
}
