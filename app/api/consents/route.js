import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { appendConsentAudit } from '@/lib/audit'
import { canonicalJson, generateConsentArtifact } from '@/lib/consent-vault'
import { canManageTenantPrivacy, errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { principalReference, requiredHmacKey, validateChoices } from '@/lib/privacy'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const artifacts = await prisma.consentArtifact.findMany({
    where: { organizationId: { in: scope.organizationIds } },
    select: {
      id: true, organizationId: true, purposeId: true, noticeId: true,
      noticeVersion: true, language: true, status: true, evidenceHash: true,
      keyVersion: true, consentedAt: true, revokedAt: true, erasedAt: true,
      retentionExpiresAt: true, purpose: { select: { code: true, label: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return json(artifacts)
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !canManageTenantPrivacy(user, scope.tenantId)) return errorResponse('Consent capture is not allowed for this role', 403)
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }

  const purposeId = typeof body.purposeId === 'string' ? body.purposeId : ''
  const noticeId = typeof body.noticeId === 'string' ? body.noticeId : ''
  const language = typeof body.language === 'string' ? body.language.trim().slice(0, 10) : 'en'
  let choices
  let principalRef
  try {
    choices = validateChoices(body.choices)
    principalRef = principalReference(scope.tenantId, body.dataPrincipal)
  } catch (error) {
    return errorResponse(error.message, 400)
  }
  if (!purposeId || !noticeId || !Object.values(choices).some(Boolean)) return errorResponse('purposeId, noticeId, and at least one affirmative choice are required', 400)

  const [organization, purpose, notice] = await Promise.all([
    prisma.organization.findUnique({ where: { id: scope.tenantId }, select: { processingPaused: true } }),
    prisma.consentPurpose.findFirst({ where: { id: purposeId, organizationId: scope.tenantId, active: true } }),
    prisma.privacyNotice.findFirst({ where: { id: noticeId, purposeId, organizationId: scope.tenantId, language } }),
  ])
  if (!purpose || !notice) return errorResponse('Purpose or matching notice version was not found in this tenant', 404)
  if (organization?.processingPaused) return errorResponse('Consent-based processing is paused for this tenant', 423)

  const key = requiredHmacKey('CONSENT_HMAC_KEY')
  const keyVersion = process.env.CONSENT_KEY_VERSION || 'v1'
  const consentedAt = new Date()
  const retentionExpiresAt = new Date(consentedAt.getTime() + purpose.retentionDays * 86400000)
  const evidence = {
    organizationId: scope.tenantId, purposeId, noticeId,
    noticeVersion: notice.version, language, choices, principalRef,
    noticeContentHash: notice.contentHash, consentedAt: consentedAt.toISOString(),
    retentionExpiresAt: retentionExpiresAt.toISOString(),
  }
  const receipt = generateConsentArtifact(evidence, key, keyVersion)
  const artifact = await prisma.$transaction(async (tx) => {
    const created = await tx.consentArtifact.create({
      data: {
        id: receipt.artifactId,
        organizationId: scope.tenantId, purposeId, dataPrincipalRef: principalRef,
        noticeId, noticeVersion: notice.version, language, choices, consentedAt,
        retentionExpiresAt,
        evidenceHash: receipt.evidenceHash,
        signature: receipt.signature,
        receiptSignature: receipt.receiptSignature,
        keyVersion: receipt.keyVersion,
      },
    })
    await appendConsentAudit(tx, {
      organizationId: scope.tenantId, consentId: created.id, actorId: user.id,
      eventType: 'CONSENT_GRANTED',
      payload: { evidenceHash: created.evidenceHash, purposeId, noticeId, noticeVersion: notice.version },
    })
    return created
  }, { isolationLevel: 'Serializable' })
  return json({
    id: artifact.id, artifactId: artifact.id, status: artifact.status, evidenceHash: artifact.evidenceHash,
    signature: artifact.signature, receiptSignature: artifact.receiptSignature, keyVersion: artifact.keyVersion,
    consentedAt: artifact.consentedAt, retentionExpiresAt: artifact.retentionExpiresAt,
    evidenceCanonical: canonicalJson(evidence),
  }, 201)
}
