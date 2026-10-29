import { getSessionUser } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { validateContainmentPolicy } from '@/lib/containment-policy'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const POLICY_ADMIN_ROLES = new Set(['MSSP_ADMIN', 'SUPER_ADMIN'])
const POLICY_ID = 'global'

function mayManagePolicy(user) {
  return POLICY_ADMIN_ROLES.has(user.role) && user.organization.kind === 'PROVIDER'
}

function policyResponse(policy) {
  return {
    controlPlaneHostname: policy?.controlPlaneHostname || '',
    pinnedControlPlaneIps: policy?.pinnedControlPlaneIps || [],
    allowedManagementCidrs: policy?.allowedManagementCidrs || [],
    heartbeatDeadlineSeconds: 180,
    enforcementEnabled: false,
    updatedAt: policy?.updatedAt || null,
    updatedBy: policy?.updatedBy
      ? { id: policy.updatedBy.id, name: policy.updatedBy.name, role: policy.updatedBy.role }
      : null,
  }
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  if (!mayManagePolicy(user)) return errorResponse('Provider super-admin access required', 403)

  const policy = await prisma.globalContainmentPolicy.findUnique({
    where: { id: POLICY_ID },
    include: { updatedBy: { select: { id: true, name: true, role: true } } },
  })
  return json(policyResponse(policy))
}

export async function PUT(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  if (!mayManagePolicy(user)) return errorResponse('Provider super-admin access required', 403)

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const validation = validateContainmentPolicy(body)
  if (!validation.valid) return errorResponse(validation.error, 400)

  const policy = await prisma.$transaction(async (tx) => {
    const saved = await tx.globalContainmentPolicy.upsert({
      where: { id: POLICY_ID },
      create: { id: POLICY_ID, ...validation.policy, updatedById: user.id },
      update: { ...validation.policy, updatedById: user.id },
      include: { updatedBy: { select: { id: true, name: true, role: true } } },
    })
    await tx.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: 'endpoint.containment_policy.updated',
        entityType: 'GlobalContainmentPolicy',
        entityId: POLICY_ID,
        details: {
          controlPlaneHostname: saved.controlPlaneHostname,
          pinnedControlPlaneIps: saved.pinnedControlPlaneIps,
          allowedManagementCidrs: saved.allowedManagementCidrs,
          enforcementEnabled: false,
        },
      },
    })
    return saved
  })

  return json(policyResponse(policy))
}
