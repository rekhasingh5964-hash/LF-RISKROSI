import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const scrypt = promisify(scryptCallback)
export const SESSION_COOKIE = 'lf-riskrosi-session'
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function makePasswordRecord(password) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  return { passwordSalt: salt.toString('hex'), passwordHash: Buffer.from(hash).toString('hex') }
}

export async function verifyPassword(password, saltHex, hashHex) {
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), 64))
  const expected = Buffer.from(hashHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !/^[\da-f]{64}$/.test(token)) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { organization: true } } },
  })
  if (!session || session.expiresAt <= new Date() || !session.user.active || session.user.organization.status !== 'ACTIVE') return null
  return session.user
}

export async function resolveTenantScope(user, tenantId) {
  if (['MSSP_ADMIN', 'MSSP_ANALYST', 'SUPER_ADMIN'].includes(user.role)) {
    const customers = await prisma.organization.findMany({
      where: { parentId: user.organizationId, kind: 'CUSTOMER', status: 'ACTIVE' },
      select: { id: true },
    })
    const allowed = customers.map((tenant) => tenant.id)
    if (!tenantId || tenantId === 'all') return { tenantId: 'all', organizationIds: allowed }
    if (!allowed.includes(tenantId)) return null
    return { tenantId, organizationIds: [tenantId] }
  }
  if (tenantId && tenantId !== user.organizationId) return null
  return { tenantId: user.organizationId, organizationIds: [user.organizationId] }
}

export function mayWriteRisk(user, organizationId) {
  if (user.role === 'MSSP_ADMIN') return true
  return ['TENANT_ADMIN', 'RISK_MANAGER'].includes(user.role) && user.organizationId === organizationId
}

export function mayManagePrivacy(user, organizationId) {
  return ['MSSP_ADMIN', 'TENANT_ADMIN'].includes(user.role) && (
    user.role === 'MSSP_ADMIN' || user.organizationId === organizationId
  )
}
