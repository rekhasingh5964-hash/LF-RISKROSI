import { randomBytes } from 'node:crypto'
import { makePasswordRecord, getSessionUser } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { prisma } from '@/lib/prisma'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  if (!['MSSP_ADMIN', 'MSSP_ANALYST', 'SUPER_ADMIN'].includes(user.role)) return errorResponse('MSSP provider access required', 403)
  const tenants = await prisma.organization.findMany({
    where: { parentId: user.organizationId, kind: 'CUSTOMER', status: 'ACTIVE' },
    include: { _count: { select: { risks: true } } },
    orderBy: { name: 'asc' },
  })
  return json(tenants.map((tenant) => ({
    id: tenant.id, name: tenant.name, industry: tenant.industry,
    status: tenant.status, riskCount: tenant._count.risks, region: tenant.region,
  })))
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  if (user.role !== 'MSSP_ADMIN') return errorResponse('MSSP administrator role required', 403)
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
  const industry = typeof body.industry === 'string' ? body.industry.trim().slice(0, 80) : ''
  const adminEmail = typeof body.adminEmail === 'string' ? body.adminEmail.trim().toLowerCase() : ''
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return errorResponse('Organization name and valid admin email are required', 400)
  }
  if (await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } })) {
    return errorResponse('That email already has an account', 409)
  }
  const temporaryPassword = randomBytes(18).toString('base64url')
  const password = await makePasswordRecord(temporaryPassword)
  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.organization.create({
      data: {
        parentId: user.organizationId, name, industry: industry || null,
        kind: 'CUSTOMER', region: process.env.DEFAULT_DATA_REGION || 'IN-SOUTH-01',
      },
    })
    const tenantUser = await tx.user.create({
      data: {
        organizationId: tenant.id, email: adminEmail, name: `${name} Admin`,
        role: 'TENANT_ADMIN', ...password,
      },
    })
    await tx.auditEvent.create({
      data: {
        organizationId: tenant.id, actorId: user.id, action: 'tenant.created',
        entityType: 'Organization', entityId: tenant.id,
        details: { providerOrganizationId: user.organizationId, region: tenant.region },
      },
    })
    return { tenant, tenantUser }
  })
  return json({
    tenant: { id: created.tenant.id, name: created.tenant.name, industry: created.tenant.industry, status: created.tenant.status, riskCount: 0, criticalCount: 0 },
    user: { id: created.tenantUser.id, email: created.tenantUser.email },
    temporaryPassword,
  }, 201)
}
