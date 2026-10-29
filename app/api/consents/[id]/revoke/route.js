import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { appendConsentAudit, writeAudit } from '@/lib/audit'
import { canManageTenantPrivacy, errorResponse, hasSameOrigin, json, readOptionalJson } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !canManageTenantPrivacy(user, scope.tenantId)) return errorResponse('Consent revocation is not allowed for this role', 403)
  let body
  try { body = await readOptionalJson(request) } catch (error) { return errorResponse(error.message, 400) }
  if (body.revocationReason !== undefined && typeof body.revocationReason !== 'string') {
    return errorResponse('revocationReason must be a string', 400)
  }
  const revocationNotes = typeof body.revocationReason === 'string'
    ? body.revocationReason.trim().slice(0, 500) || null
    : null
  const { id } = await params
  const now = new Date()
  try {
    const result = await prisma.$transaction(async (tx) => {
      const artifact = await tx.consentArtifact.findFirst({
        where: { id, organizationId: scope.tenantId },
        select: { id: true, status: true, purposeId: true, dataPrincipalRef: true },
      })
      if (!artifact) return { error: 'Consent artifact not found' }
      if (artifact.status !== 'ACTIVE') return { alreadyRevoked: true, artifactId: artifact.id, queued: 0 }

      const updated = await tx.consentArtifact.update({
        where: { id: artifact.id },
        data: { status: 'REVOKED', revokedAt: now, revocationNotes },
      })
      const endpoints = await tx.webhookEndpoint.findMany({
        where: { organizationId: scope.tenantId, enabled: true, events: { has: 'data.erasure.requested' } },
      })
      const deliveries = []
      for (const endpoint of endpoints) {
        const delivery = await tx.webhookDelivery.create({
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
        deliveries.push(delivery)
      }
      await appendConsentAudit(tx, {
        organizationId: scope.tenantId, consentId: artifact.id, actorId: user.id,
        eventType: 'CONSENT_REVOKED',
        payload: {
          purposeId: artifact.purposeId,
          erasedWebhookDeliveries: deliveries.length,
          revokedAt: now.toISOString(),
          revocationNotes,
        },
      })
      return { artifactId: updated.id, revokedAt: updated.revokedAt, queued: deliveries.length, deliveryIds: deliveries.map((item) => item.id) }
    }, { isolationLevel: 'Serializable' })
    if (result.error) return errorResponse(result.error, 404)
    if (!result.alreadyRevoked) {
      await writeAudit({
        organizationId: scope.tenantId, actorId: user.id, action: 'privacy.consent.revoked',
        entityType: 'ConsentArtifact', entityId: result.artifactId,
        details: { queuedDeliveries: result.queued },
      })
    }
    return json({ ...result, processingStopped: true, statutoryReference: 'DPDP Act 2023 Section 12' })
  } catch (error) {
    if (error.code === 'P2034') return errorResponse('A concurrent consent change occurred; retry the request', 409)
    throw error
  }
}
