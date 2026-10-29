import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { hasSameOrigin } from '@/lib/origin'
import { readJsonBody } from '@/lib/json-body'
import { observeApiResponse } from '@/lib/api-observability'

export { hasSameOrigin } from '@/lib/origin'

export async function json(data, status = 200) {
  const response = NextResponse.json({ data }, { status, headers: { 'Cache-Control': 'no-store' } })
  return observeApiResponse(response, await headers())
}

export async function errorResponse(message, status = 400) {
  const response = NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
  return observeApiResponse(response, await headers())
}

export async function readJson(request) {
  return readJsonBody(request)
}

export async function readOptionalJson(request) {
  return readJsonBody(request, { optional: true })
}

export async function requireUser() {
  const user = await getSessionUser()
  return user
}

export async function requireTenantScope(request, user) {
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  return scope
}

export function isMssp(user) {
  return user.role === 'MSSP_ADMIN' || user.role === 'MSSP_ANALYST'
}

export function canWriteTenantRisk(user, organizationId) {
  return user.role === 'MSSP_ADMIN' ||
    (['TENANT_ADMIN', 'RISK_MANAGER'].includes(user.role) && user.organizationId === organizationId)
}

export function canManageTenantPrivacy(user, organizationId) {
  return user.role === 'MSSP_ADMIN' ||
    (user.role === 'TENANT_ADMIN' && user.organizationId === organizationId)
}
