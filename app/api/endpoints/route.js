import { randomBytes } from 'node:crypto'
import { getSessionUser, mayManagePrivacy, resolveTenantScope } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json } from '@/lib/http'
import { hashEndpointToken } from '@/lib/endpoint-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const ENROLLMENT_TOKEN_TTL_MS = 30 * 60 * 1000

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const devices = await prisma.endpointDevice.findMany({
    where: { organizationId: { in: scope.organizationIds } },
    select: {
      id: true, organizationId: true, name: true, operatingSystem: true,
      architecture: true, agentVersion: true, active: true,
      enrolledAt: true, lastSeenAt: true,
      organization: { select: { name: true } },
    },
    orderBy: [{ active: 'desc' }, { lastSeenAt: 'desc' }, { enrolledAt: 'desc' }],
  })
  return json(devices)
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !mayManagePrivacy(user, scope.tenantId)) {
    return errorResponse('Endpoint enrollment tokens require tenant privacy administrator access', 403)
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ENROLLMENT_TOKEN_TTL_MS)
  const enrollment = await prisma.$transaction(async (tx) => {
    const created = await tx.endpointEnrollmentToken.create({
      data: {
        organizationId: scope.tenantId,
        tokenHash: hashEndpointToken(token),
        createdById: user.id,
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    })
    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId,
        actorId: user.id,
        action: 'endpoint.enrollment_token.created',
        entityType: 'EndpointEnrollmentToken',
        entityId: created.id,
        details: { expiresAt: created.expiresAt.toISOString() },
      },
    })
    return created
  })

  return json({
    token,
    expiresAt: enrollment.expiresAt,
    oneTimeUse: true,
  }, 201)
}
