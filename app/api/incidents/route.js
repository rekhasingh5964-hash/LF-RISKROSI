import { getSessionUser, mayManagePrivacy, resolveTenantScope } from '@/lib/auth'
import { appendContainmentAudit } from '@/lib/containment-audit'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const INCIDENT_CATEGORIES = new Set([
  'RANSOMWARE_SUSPECTED',
  'DATA_EXFILTRATION_SUSPECTED',
  'WIPER_SUSPECTED',
  'LATERAL_MOVEMENT',
  'EXPLOITATION',
  'OTHER',
])
const INCIDENT_SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const MAX_INCIDENT_AGE_MS = 180 * 24 * 60 * 60 * 1000

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)

  const incidents = await prisma.endpointIncident.findMany({
    where: { organizationId: { in: scope.organizationIds } },
    select: {
      id: true, organizationId: true, deviceId: true, category: true, severity: true,
      status: true, summary: true, firstObservedAt: true, reportedAt: true,
      reportingDeadlineAt: true, resolvedAt: true,
      device: { select: { name: true } },
      organization: { select: { name: true } },
      containmentCommands: {
        select: {
          id: true, action: true, status: true, reason: true, requestedAt: true,
            requestedById: true, approvedById: true, approvedAt: true, expiresAt: true,
            completedAt: true, result: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: 5,
      },
    },
    orderBy: [{ status: 'asc' }, { reportedAt: 'desc' }],
    take: 100,
  })
  return json(incidents)
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope || scope.tenantId === 'all') return errorResponse('Select a customer tenant', 403)
  if (!mayManagePrivacy(user, scope.tenantId)) return errorResponse('Incident reporting requires tenant administrator access', 403)

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const allowedKeys = new Set(['deviceId', 'category', 'severity', 'summary', 'firstObservedAt'])
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) return errorResponse('Incident contains unsupported fields', 400)
  if (typeof body.deviceId !== 'string' || !body.deviceId || !INCIDENT_CATEGORIES.has(body.category)) {
    return errorResponse('A valid endpoint and incident category are required', 400)
  }
  if (!INCIDENT_SEVERITIES.has(body.severity)) return errorResponse('Invalid incident severity', 400)
  if (typeof body.summary !== 'string' || !body.summary.trim() || body.summary.trim().length > 200) {
    return errorResponse('Summary must be between 1 and 200 characters', 400)
  }
  if (typeof body.firstObservedAt !== 'string') return errorResponse('firstObservedAt must be an ISO timestamp', 400)
  const firstObservedAt = new Date(body.firstObservedAt)
  const now = new Date()
  if (!Number.isFinite(firstObservedAt.getTime()) || firstObservedAt > new Date(now.getTime() + 5 * 60 * 1000) ||
      firstObservedAt < new Date(now.getTime() - MAX_INCIDENT_AGE_MS)) {
    return errorResponse('firstObservedAt must be within the last 180 days and not in the future', 400)
  }

  const device = await prisma.endpointDevice.findFirst({
    where: { id: body.deviceId, organizationId: scope.tenantId, active: true },
    select: { id: true },
  })
  if (!device) return errorResponse('Active endpoint not found in the selected tenant', 404)

  const reportedAt = new Date()
  const incident = await prisma.$transaction(async (tx) => {
    const created = await tx.endpointIncident.create({
      data: {
        organizationId: scope.tenantId,
        deviceId: device.id,
        reportedById: user.id,
        category: body.category,
        severity: body.severity,
        summary: body.summary.trim(),
        firstObservedAt,
        reportedAt,
        reportingDeadlineAt: new Date(reportedAt.getTime() + SIX_HOURS_MS),
      },
      select: {
        id: true, organizationId: true, deviceId: true, category: true,
        severity: true, status: true, summary: true, firstObservedAt: true,
        reportedAt: true, reportingDeadlineAt: true,
      },
    })
    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId,
        actorId: user.id,
        action: 'endpoint.incident.reported',
        entityType: 'EndpointIncident',
        entityId: created.id,
        details: { category: created.category, severity: created.severity, deviceId: created.deviceId },
      },
    })
    await appendContainmentAudit(tx, {
      organizationId: scope.tenantId,
      incidentId: created.id,
      actorId: user.id,
      action: 'INCIDENT_REPORTED',
      payload: { category: created.category, severity: created.severity, deviceId: created.deviceId },
    })
    return created
  })

  return json(incident, 201)
}
