import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { appendConsentAudit } from '@/lib/audit'
import { canManageTenantPrivacy, errorResponse, hasSameOrigin, json } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !canManageTenantPrivacy(user, scope.tenantId)) return errorResponse('Kill-switch activation is not allowed for this role', 403)

  const now = new Date()
  const result = await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: scope.tenantId },
      data: { processingPaused: true },
    })
    const active = await tx.consentArtifact.findMany({
      where: { organizationId: scope.tenantId, status: 'ACTIVE' },
      select: { id: true, purposeId: true, dataPrincipalRef: true },
    })
    const endpoints = await tx.webhookEndpoint.findMany({
      where: { organizationId: scope.tenantId, enabled: true, events: { has: 'data.erasure.requested' } },
    })
    let queued = 0
    for (const artifact of active) {
      await tx.consentArtifact.update({
        where: { id: artifact.id },
        data: { status: 'REVOKED', revokedAt: now },
      })
      let consentDeliveries = 0
      for (const endpoint of endpoints) {
        await tx.webhookDelivery.create({
          data: {
            organizationId: scope.tenantId, endpointId: endpoint.id, consentId: artifact.id,
            eventType: 'data.erasure.requested',
            payload: {
              event: 'data.erasure.requested', consentId: artifact.id,
              purposeId: artifact.purposeId, dataPrincipalRef: artifact.dataPrincipalRef,
              statutoryEvent: 'DPDP_SECTION_12_ERASURE', requestedAt: now.toISOString(),
              statutoryReference: 'DPDP Act 2023 Section 12',
            },
          },
        })
        consentDeliveries += 1
      }
      queued += consentDeliveries
      await appendConsentAudit(tx, {
        organizationId: scope.tenantId, consentId: artifact.id, actorId: user.id,
        eventType: 'CONSENT_REVOKED_BY_GLOBAL_KILL_SWITCH',
        payload: { purposeId: artifact.purposeId, erasedWebhookDeliveries: consentDeliveries, revokedAt: now.toISOString() },
      })
    }
    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId, actorId: user.id, action: 'privacy.global_kill_switch',
        entityType: 'Organization', entityId: scope.tenantId,
        details: { processingPaused: true, revokedConsents: active.length, queuedDeliveries: queued, activatedAt: now.toISOString() },
      },
    })
    return { revokedConsents: active.length, queued }
  }, { isolationLevel: 'Serializable' })
  return json({ ...result, processingPaused: true, activation: 'committed', statutoryReference: 'DPDP Act 2023 Sections 5 and 12' })
}
