import { getSessionUser, resolveTenantScope, mayManagePrivacy } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function DELETE(request, { params }) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !mayManagePrivacy(user, scope.tenantId)) {
    return errorResponse('Endpoint revocation requires tenant privacy administrator access', 403)
  }
  const { id } = await params
  const result = await prisma.$transaction(async (tx) => {
    const revoked = await tx.endpointDevice.updateMany({
      where: { id, organizationId: scope.tenantId, active: true },
      data: { active: false },
    })
    if (!revoked.count) return false
    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId,
        actorId: user.id,
        action: 'endpoint.device.revoked',
        entityType: 'EndpointDevice',
        entityId: id,
        details: { revokedAt: new Date().toISOString() },
      },
    })
    return true
  })
  if (!result) return errorResponse('Active endpoint not found', 404)
  return json({ id, active: false })
}
