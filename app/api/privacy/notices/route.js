import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { sha256 } from '@/lib/consent-vault'
import { canManageTenantPrivacy } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const notices = await prisma.privacyNotice.findMany({
    where: { organizationId: { in: scope.organizationIds } },
    select: { id: true, organizationId: true, purposeId: true, version: true, language: true, contentHash: true, section: true, createdAt: true },
    orderBy: [{ createdAt: 'desc' }],
  })
  return json(notices)
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !canManageTenantPrivacy(user, scope.tenantId)) return errorResponse('Privacy notice authoring is not allowed for this role', 403)
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const purposeId = typeof body.purposeId === 'string' ? body.purposeId : ''
  const language = typeof body.language === 'string' ? body.language.trim().slice(0, 10) : 'en'
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, 20000) : ''
  if (!purposeId || !content) return errorResponse('purposeId and notice content are required', 400)
  const purpose = await prisma.consentPurpose.findFirst({ where: { id: purposeId, organizationId: scope.tenantId, active: true } })
  if (!purpose) return errorResponse('Active consent purpose not found in this tenant', 404)
  const latest = await prisma.privacyNotice.findFirst({
    where: { organizationId: scope.tenantId, purposeId, language },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const notice = await prisma.privacyNotice.create({
    data: {
      organizationId: scope.tenantId, purposeId, version: (latest?.version || 0) + 1,
      language, content, contentHash: sha256(content), createdById: user.id,
    },
  })
  await writeAudit({
    organizationId: scope.tenantId, actorId: user.id, action: 'privacy.notice.created',
    entityType: 'PrivacyNotice', entityId: notice.id,
    details: { purposeId, version: notice.version, language, contentHash: notice.contentHash, legalReference: 'DPDP Act 2023 Section 5' },
  })
  return json({ id: notice.id, purposeId, version: notice.version, language, contentHash: notice.contentHash, section: notice.section }, 201)
}
