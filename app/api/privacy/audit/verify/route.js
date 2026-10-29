import { verifyConsentAuditChain } from '@/lib/audit'
import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, json } from '@/lib/http'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all') return errorResponse('Select a single tenant to verify its audit chain', 400)
  const result = await verifyConsentAuditChain(scope.tenantId)
  return json(result)
}
