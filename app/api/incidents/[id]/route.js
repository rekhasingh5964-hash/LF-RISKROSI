import { getSessionUser, mayManagePrivacy, resolveTenantScope } from '@/lib/auth'
import { appendContainmentAudit } from '@/lib/containment-audit'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const CLOSING_STATUSES = new Set(['RESOLVED', 'FALSE_POSITIVE'])

export async function PATCH(request, { params }) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope || scope.tenantId === 'all') return errorResponse('Select a customer tenant', 403)
  if (!mayManagePrivacy(user, scope.tenantId)) return errorResponse('Incident closure requires tenant administrator access', 403)

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  if (Object.keys(body).some((key) => !['status', 'resolutionNote'].includes(key)) ||
      !CLOSING_STATUSES.has(body.status)) {
    return errorResponse('Only RESOLVED or FALSE_POSITIVE incident closure is supported', 400)
  }
  if (typeof body.resolutionNote !== 'string' || !body.resolutionNote.trim() || body.resolutionNote.trim().length > 500) {
    return errorResponse('A resolution note of at most 500 characters is required', 400)
  }

  const { id } = await params
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.endpointIncident.updateMany({
      where: {
        id,
        organizationId: scope.tenantId,
        status: { in: ['OPEN', 'CONTAINED', 'MONITORING'] },
      },
      data: { status: body.status, resolvedAt: new Date() },
    })
    if (!result.count) return null

    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId,
        actorId: user.id,
        action: `endpoint.incident.${body.status.toLowerCase()}`,
        entityType: 'EndpointIncident',
        entityId: id,
        details: { resolutionNote: body.resolutionNote.trim() },
      },
    })
    await appendContainmentAudit(tx, {
      organizationId: scope.tenantId,
      incidentId: id,
      actorId: user.id,
      action: body.status === 'RESOLVED' ? 'INCIDENT_RESOLVED' : 'INCIDENT_MARKED_FALSE_POSITIVE',
      payload: { resolutionNote: body.resolutionNote.trim() },
    })
    return tx.endpointIncident.findUnique({
      where: { id },
      select: { id: true, status: true, resolvedAt: true },
    })
  })

  if (!updated) return errorResponse('Open incident not found in the selected tenant', 404)
  return json(updated)
}
