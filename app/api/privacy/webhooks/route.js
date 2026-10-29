import { randomBytes } from 'node:crypto'
import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { canManageTenantPrivacy, errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { encryptWebhookSecret } from '@/lib/webhook-crypto'
import { validatePublicHttpsWebhookUrl } from '@/lib/webhook-url'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId: { in: scope.organizationIds } },
    select: { id: true, organizationId: true, url: true, events: true, enabled: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return json(endpoints)
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !canManageTenantPrivacy(user, scope.tenantId)) return errorResponse('Webhook administration is not allowed for this role', 403)
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }

  let endpoint
  try {
    endpoint = await validatePublicHttpsWebhookUrl(body.url)
  } catch (error) {
    return errorResponse(error instanceof TypeError ? error.message : 'Webhook host could not be safely resolved', 400)
  }
  const secret = randomBytes(32).toString('base64url')
  const target = await prisma.webhookEndpoint.create({
    data: {
      organizationId: scope.tenantId,
      url: endpoint.toString(),
      secret: encryptWebhookSecret(secret),
      events: ['data.erasure.requested'],
    },
  })
  await writeAudit({
    organizationId: scope.tenantId, actorId: user.id, action: 'privacy.webhook.created',
    entityType: 'WebhookEndpoint', entityId: target.id,
    details: { hostname: endpoint.hostname, events: target.events },
  })
  return json({
    endpoint: { id: target.id, url: target.url, events: target.events, enabled: target.enabled },
    signingSecret: secret,
  }, 201)
}
