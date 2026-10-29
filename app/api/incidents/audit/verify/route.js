import { verifyContainmentAudit } from '@/lib/containment-audit'
import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, json } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all') return errorResponse('Select a single tenant to verify its containment audit chain', 400)
  return json(await verifyContainmentAudit(scope.tenantId, prisma))
}
