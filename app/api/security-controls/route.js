import { getSessionUser, mayManagePrivacy, resolveTenantScope } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import {
  getControlStatus,
  SECURITY_CONTROL_DEFINITIONS,
  toggleCapability,
} from '@/lib/security-controls'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const canManageControls = (user, organizationId) =>
  user.role === 'SUPER_ADMIN' ||
  (user.role === 'MSSP_ADMIN' && user.organizationId !== organizationId) ||
  mayManagePrivacy(user, organizationId)

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)

  const [organizations, configurations] = await Promise.all([
    prisma.organization.findMany({
      where: { id: { in: scope.organizationIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.securityControlConfiguration.findMany({
      where: { organizationId: { in: scope.organizationIds } },
      select: { organizationId: true, controlId: true, enabledCapabilities: true },
    }),
  ])
  const configurationMap = new Map(
    configurations.map((configuration) => [
      `${configuration.organizationId}:${configuration.controlId}`,
      configuration.enabledCapabilities,
    ]),
  )

  return json(organizations.flatMap((organization) =>
    SECURITY_CONTROL_DEFINITIONS.map((definition) => ({
      ...getControlStatus(
        definition.id,
        configurationMap.get(`${organization.id}:${definition.id}`) || [],
      ),
      organizationId: organization.id,
      organizationName: organization.name,
    })),
  ))
}

export async function PATCH(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all' || !canManageControls(user, scope.tenantId)) {
    return errorResponse('Security control administrator access required for one customer tenant', 403)
  }

  let body
  try {
    body = await readJson(request)
  } catch (error) {
    return errorResponse(error.message, 400)
  }
  if (
    typeof body.controlId !== 'string' ||
    typeof body.capabilityId !== 'string' ||
    typeof body.enabled !== 'boolean'
  ) {
    return errorResponse('Control, capability, and boolean enabled value are required', 400)
  }

  if (!toggleCapability(body.controlId, body.capabilityId, [], body.enabled)) {
    return errorResponse('Unknown control capability', 400)
  }

  const configuration = await prisma.$transaction(async (tx) => {
    const current = await tx.securityControlConfiguration.findUnique({
      where: {
        organizationId_controlId: {
          organizationId: scope.tenantId,
          controlId: body.controlId,
        },
      },
    })
    const enabledCapabilities = toggleCapability(
      body.controlId,
      body.capabilityId,
      current?.enabledCapabilities || [],
      body.enabled,
    )
    const saved = await tx.securityControlConfiguration.upsert({
      where: {
        organizationId_controlId: {
          organizationId: scope.tenantId,
          controlId: body.controlId,
        },
      },
      create: {
        organizationId: scope.tenantId,
        controlId: body.controlId,
        enabledCapabilities,
      },
      update: { enabledCapabilities },
    })
    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId,
        actorId: user.id,
        action: 'security_control.capability_preference.updated',
        entityType: 'SecurityControlConfiguration',
        entityId: saved.id,
        details: {
          controlId: body.controlId,
          capabilityId: body.capabilityId,
          enabled: body.enabled,
        },
      },
    })
    return saved
  }, { isolationLevel: 'Serializable' })

  return json(getControlStatus(configuration.controlId, configuration.enabledCapabilities))
}
