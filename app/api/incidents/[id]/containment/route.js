import { getSessionUser, mayManagePrivacy, resolveTenantScope } from '@/lib/auth'
import { appendContainmentAudit } from '@/lib/containment-audit'
import { containmentCommandConfiguration } from '@/lib/containment-command'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const CONTAINMENT_ACTIONS = new Set(['QUARANTINE', 'RELEASE'])
const MAX_REASON_LENGTH = 300

export async function POST(request, { params }) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope || scope.tenantId === 'all') return errorResponse('Select a customer tenant', 403)
  if (!mayManagePrivacy(user, scope.tenantId)) return errorResponse('Containment requests require tenant administrator access', 403)

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  if (Object.keys(body).some((key) => !['action', 'reason'].includes(key)) ||
      !CONTAINMENT_ACTIONS.has(body.action) ||
      typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > MAX_REASON_LENGTH ||
      /[\u2028\u2029]/.test(body.reason)) {
    return errorResponse('Provide a supported action and reason of at most 300 characters', 400)
  }
  let configuration
  try {
    configuration = containmentCommandConfiguration()
  } catch (error) {
    console.error('Containment signing configuration is invalid', error)
    return errorResponse('Signed containment workflow is unavailable due to signing configuration', 503)
  }
  if (!configuration) return errorResponse('Signed containment workflow is disabled', 503)

  const { id: incidentId } = await params
  const incident = await prisma.endpointIncident.findFirst({
    where: { id: incidentId, organizationId: scope.tenantId },
    select: { id: true, deviceId: true, status: true, organizationId: true },
  })
  if (!incident) return errorResponse('Incident not found in the selected tenant', 404)
  if (body.action === 'QUARANTINE' && incident.status !== 'OPEN') {
    return errorResponse('Quarantine requests require an open incident', 409)
  }
  if (body.action === 'RELEASE' && incident.status !== 'CONTAINED') {
    return errorResponse('Release requests require a contained incident', 409)
  }

  try {
    const command = await prisma.$transaction(async (tx) => {
      const now = new Date()
      const expiredCommands = await tx.containmentCommand.findMany({
        where: {
          organizationId: scope.tenantId,
          deviceId: incident.deviceId,
          status: { in: ['PENDING', 'APPROVED', 'DELIVERED'] },
          expiresAt: { lte: now },
        },
        select: { id: true, incidentId: true, action: true },
      })
      for (const expiredCommand of expiredCommands) {
        const expired = await tx.containmentCommand.updateMany({
          where: {
            id: expiredCommand.id,
            status: { in: ['PENDING', 'APPROVED', 'DELIVERED'] },
            expiresAt: { lte: now },
          },
          data: { status: 'EXPIRED', completedAt: now, result: 'Command expired before application' },
        })
        if (expired.count) {
          await appendContainmentAudit(tx, {
            organizationId: scope.tenantId,
            incidentId: expiredCommand.incidentId,
            commandId: expiredCommand.id,
            actorId: 'system:containment-expiry',
            action: 'CONTAINMENT_EXPIRED',
            payload: { action: expiredCommand.action },
          })
        }
      }

      const active = await tx.endpointDevice.findFirst({
        where: {
          id: incident.deviceId,
          organizationId: scope.tenantId,
          active: true,
          commandKeyFingerprint: configuration.keyFingerprint,
        },
        select: { id: true },
      })
      if (!active) return null
      const created = await tx.containmentCommand.create({
        data: {
          organizationId: scope.tenantId,
          deviceId: incident.deviceId,
          incidentId: incident.id,
          requestedById: user.id,
          action: body.action,
          reason: body.reason.trim(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
        select: { id: true, action: true, status: true, reason: true, requestedAt: true },
      })
      await tx.auditEvent.create({
        data: {
          organizationId: scope.tenantId,
          actorId: user.id,
          action: `endpoint.containment.${body.action.toLowerCase()}.requested`,
          entityType: 'ContainmentCommand',
          entityId: created.id,
          details: { incidentId: incident.id, deviceId: incident.deviceId },
        },
      })
      await appendContainmentAudit(tx, {
        organizationId: scope.tenantId,
        incidentId: incident.id,
        commandId: created.id,
        actorId: user.id,
        action: 'CONTAINMENT_REQUESTED',
        payload: { action: created.action, deviceId: incident.deviceId, reason: created.reason },
      })
      return created
    })
    if (!command) return errorResponse('Active endpoint is not enrolled with the active command verification key', 409)
    return json(command, 201)
  } catch (error) {
    if (error.code === 'P2002') return errorResponse('An active containment command already exists for this endpoint', 409)
    throw error
  }
}
