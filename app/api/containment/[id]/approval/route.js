import { getSessionUser, mayManagePrivacy, resolveTenantScope } from '@/lib/auth'
import { appendContainmentAudit } from '@/lib/containment-audit'
import { containmentCommandConfiguration } from '@/lib/containment-command'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope || scope.tenantId === 'all') return errorResponse('Select a customer tenant', 403)
  if (!mayManagePrivacy(user, scope.tenantId)) return errorResponse('Containment approval requires tenant administrator access', 403)

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  if (Object.keys(body).some((key) => !['decision', 'note'].includes(key)) ||
      !['APPROVE', 'REJECT'].includes(body.decision) ||
      typeof body.note !== 'string' || !body.note.trim() || body.note.trim().length > 300) {
    return errorResponse('Provide an approval decision and note of at most 300 characters', 400)
  }
  let configuration = null
  if (body.decision === 'APPROVE') {
    try {
      configuration = containmentCommandConfiguration()
    } catch (error) {
      console.error('Containment signing configuration is invalid', error)
      return errorResponse('Signed containment workflow is unavailable due to signing configuration', 503)
    }
  }
  if (body.decision === 'APPROVE' && !configuration) {
    return errorResponse('Signed containment workflow is disabled', 503)
  }

  const { id } = await params
  const updated = await prisma.$transaction(async (tx) => {
    const command = await tx.containmentCommand.findFirst({
      where: { id, organizationId: scope.tenantId },
      select: {
        id: true, action: true, status: true, requestedById: true,
        requestedAt: true, incidentId: true, deviceId: true,
        device: { select: { commandKeyFingerprint: true, active: true } },
        incident: { select: { status: true } },
      },
    })
    if (!command || command.status !== 'PENDING') return { error: 'unavailable' }
    if (command.requestedById === user.id) return { error: 'self_approval' }
    if (body.decision === 'APPROVE' &&
        (!command.device.active || command.device.commandKeyFingerprint !== configuration.keyFingerprint)) {
      return { error: 'agent_unpinned' }
    }
    if (body.decision === 'APPROVE' &&
        ((command.action === 'QUARANTINE' && command.incident?.status !== 'OPEN') ||
         (command.action === 'RELEASE' && command.incident?.status !== 'CONTAINED'))) {
      return { error: 'incident_state_changed' }
    }
    if (command.requestedAt.getTime() + 30 * 60 * 1000 <= Date.now()) {
      await tx.containmentCommand.updateMany({
        where: { id: command.id, status: 'PENDING' },
        data: { status: 'EXPIRED', completedAt: new Date(), result: 'Approval window expired' },
      })
      await appendContainmentAudit(tx, {
        organizationId: scope.tenantId,
        incidentId: command.incidentId,
        commandId: command.id,
        actorId: 'system:containment-expiry',
        action: 'CONTAINMENT_REQUEST_EXPIRED',
        payload: { action: command.action },
      })
      return { error: 'expired' }
    }

    const now = new Date()
    const status = body.decision === 'APPROVE' ? 'APPROVED' : 'CANCELLED'
    const changed = await tx.containmentCommand.updateMany({
      where: { id: command.id, organizationId: scope.tenantId, status: 'PENDING', requestedById: { not: user.id } },
      data: {
        status,
        approvedById: user.id,
        approvedAt: now,
        expiresAt: body.decision === 'APPROVE' ? new Date(now.getTime() + 30 * 60 * 1000) : undefined,
        completedAt: body.decision === 'REJECT' ? new Date() : null,
        result: body.decision === 'REJECT' ? body.note.trim() : null,
      },
    })
    if (!changed.count) return { error: 'unavailable' }

    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId,
        actorId: user.id,
        action: body.decision === 'APPROVE'
          ? 'endpoint.containment.approved'
          : 'endpoint.containment.rejected',
        entityType: 'ContainmentCommand',
        entityId: command.id,
        details: { note: body.note.trim(), requestedById: command.requestedById },
      },
    })
    await appendContainmentAudit(tx, {
      organizationId: scope.tenantId,
      incidentId: command.incidentId,
      commandId: command.id,
      actorId: user.id,
      action: body.decision === 'APPROVE' ? 'CONTAINMENT_APPROVED' : 'CONTAINMENT_REJECTED',
      payload: { action: command.action, note: body.note.trim(), requestedById: command.requestedById },
    })
    return {
      error: null,
      command: { id: command.id, action: command.action, status },
    }
  })

  if (updated.error === 'self_approval') return errorResponse('A different authorized administrator must approve this request', 403)
  if (updated.error === 'agent_unpinned') return errorResponse('Endpoint is not enrolled with the active command verification key', 409)
  if (updated.error === 'incident_state_changed') return errorResponse('Incident state changed; request a new command for its current state', 409)
  if (updated.error === 'expired') return errorResponse('Containment approval window expired', 409)
  if (updated.error) return errorResponse('Pending containment request not found', 404)
  return json(updated.command)
}
