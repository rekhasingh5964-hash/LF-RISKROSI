import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { hashSessionToken, SESSION_COOKIE, SESSION_DURATION_MS, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'

export const runtime = 'nodejs'
const attempts = new Map()

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' && body.password.length <= 256 ? body.password : ''
  if (!email || !password) return errorResponse('Email and password are required', 400)
  const key = `${request.headers.get('x-forwarded-for') || 'local'}:${email}`
  const current = attempts.get(key)
  if (current?.until > Date.now() && current.count >= 8) return errorResponse('Too many sign-in attempts. Try again later.', 429)

  const user = await prisma.user.findUnique({ where: { email }, include: { organization: true } })
  const matches = user
    ? await verifyPassword(password, user.passwordSalt, user.passwordHash)
    : await verifyPassword(password, '00000000000000000000000000000000', '00'.repeat(64))
  if (!user || !matches || !user.active || user.organization.status !== 'ACTIVE') {
    const bucket = current?.until > Date.now() ? current : { count: 0, until: Date.now() + 15 * 60 * 1000 }
    bucket.count += 1
    attempts.set(key, bucket)
    return errorResponse('Email or password is incorrect', 401)
  }
  attempts.delete(key)

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId: user.id, expiresAt } })
  const customers = ['MSSP_ADMIN', 'MSSP_ANALYST', 'SUPER_ADMIN'].includes(user.role)
    ? await prisma.organization.findMany({
      where: { parentId: user.organizationId, kind: 'CUSTOMER', status: 'ACTIVE' },
      include: { _count: { select: { risks: true } } },
      orderBy: { name: 'asc' },
    })
    : [user.organization]
  const tenants = customers.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    industry: tenant.industry,
    status: tenant.status,
    riskCount: tenant._count?.risks || 0,
    criticalCount: 0,
  }))
  if (['MSSP_ADMIN', 'MSSP_ANALYST', 'SUPER_ADMIN'].includes(user.role)) {
    tenants.unshift({ id: 'all', name: 'All customer tenants', industry: 'MSSP portfolio', status: 'PORTFOLIO', riskCount: 0, criticalCount: 0 })
  }
  const response = await json({
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      organizationId: user.organizationId, organizationName: user.organization.name,
    },
    tenants,
    selectedTenantId: tenants.some((tenant) => tenant.id === 'all') ? 'all' : user.organizationId,
  })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', expires: expiresAt,
  })
  return response
}
