import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, json } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const organizations = scope.tenantId === 'all'
    ? await prisma.organization.findMany({
      where: { parentId: user.organizationId, kind: 'CUSTOMER', status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    })
    : [user.organization]
  const tenants = organizations.map((organization) => ({
    id: organization.id, name: organization.name, industry: organization.industry,
    status: organization.status, riskCount: 0, criticalCount: 0,
  }))
  if (scope.tenantId === 'all') tenants.unshift({ id: 'all', name: 'All customer tenants', industry: 'MSSP portfolio', status: 'PORTFOLIO', riskCount: 0, criticalCount: 0 })
  return json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId, organizationName: user.organization.name },
    tenants,
    selectedTenantId: scope.tenantId,
  })
}
