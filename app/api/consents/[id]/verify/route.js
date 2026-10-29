import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, json } from '@/lib/http'
import { verifyArtifactIntegrity, verifyConsentEvidence } from '@/lib/consent-vault'
import { requiredHmacKey } from '@/lib/privacy'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request, { params }) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const { id } = await params
  const artifact = await prisma.consentArtifact.findFirst({
    where: { id, organizationId: { in: scope.organizationIds } },
    include: { purpose: true },
  })
  if (!artifact) return errorResponse('Consent artifact not found', 404)
  const notice = await prisma.privacyNotice.findFirst({
    where: { id: artifact.noticeId, organizationId: artifact.organizationId },
    select: { contentHash: true },
  })
  if (!notice) return errorResponse('Referenced privacy notice is missing', 409)
  const evidence = {
    organizationId: artifact.organizationId,
    purposeId: artifact.purposeId,
    noticeId: artifact.noticeId,
    noticeVersion: artifact.noticeVersion,
    language: artifact.language,
    choices: artifact.choices,
    principalRef: artifact.dataPrincipalRef,
    noticeContentHash: notice.contentHash,
    consentedAt: artifact.consentedAt.toISOString(),
    retentionExpiresAt: artifact.retentionExpiresAt.toISOString(),
  }
  const key = requiredHmacKey('CONSENT_HMAC_KEY')
  return json({
    valid: verifyConsentEvidence(evidence, artifact, key) &&
      (!artifact.receiptSignature || verifyArtifactIntegrity(
        artifact.id,
        artifact.evidenceHash,
        artifact.consentedAt.toISOString(),
        artifact.receiptSignature,
        key,
        artifact.keyVersion,
      )),
    artifactId: artifact.id,
    status: artifact.status,
    keyVersion: artifact.keyVersion,
    revokedAt: artifact.revokedAt,
    revocationNotes: artifact.revocationNotes,
  })
}
