import { appendContainmentAudit } from '@/lib/containment-audit'
import { ENFORCEMENT_UNAVAILABLE, isEnforcementUnavailableAcknowledgment } from '@/lib/containment-enforcement'
import { errorResponse, json, readJson } from '@/lib/http'
import { hashEndpointToken } from '@/lib/endpoint-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const BEARER_TOKEN_PATTERN = /^[\da-f]{64}$/i
export async function POST(request, { params }) {
  const authorization = request.headers.get('authorization') || ''
  const match = /^Bearer (.+)$/i.exec(authorization)
  if (!match || !BEARER_TOKEN_PATTERN.test(match[1])) {
    return errorResponse('A valid device bearer token is required', 401)
  }
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  if (!isEnforcementUnavailableAcknowledgment(body)) {
    return errorResponse('This agent build can only acknowledge that host enforcement is unavailable', 400)
  }

  const { id } = await params
  const now = new Date()
  const result = await prisma.$transaction(async (tx) => {
    const device = await tx.endpointDevice.findFirst({
      where: {
        deviceTokenHash: hashEndpointToken(match[1]),
        active: true,
        organization: { is: { status: 'ACTIVE' } },
      },
      select: { id: true, organizationId: true },
    })
    if (!device) return 'unavailable'

    const command = await tx.containmentCommand.findFirst({
      where: {
        id,
        deviceId: device.id,
        organizationId: device.organizationId,
        status: 'DELIVERED',
        expiresAt: { gt: now },
      },
      select: { id: true, incidentId: true, action: true },
    })
    if (!command) return 'not-delivered'

    const updated = await tx.containmentCommand.updateMany({
      where: { id: command.id, deviceId: device.id, status: 'DELIVERED', expiresAt: { gt: now } },
      data: {
        status: 'FAILED',
        acknowledgedAt: now,
        completedAt: now,
        result: ENFORCEMENT_UNAVAILABLE,
      },
    })
    if (!updated.count) return 'not-delivered'

    await appendContainmentAudit(tx, {
      organizationId: device.organizationId,
      incidentId: command.incidentId,
      commandId: command.id,
      actorId: 'system:endpoint-agent',
      action: 'CONTAINMENT_NOT_APPLIED',
      payload: { action: command.action, result: ENFORCEMENT_UNAVAILABLE },
    })
    return 'failed'
  })

  if (result === 'unavailable') return errorResponse('Device credential is revoked or unavailable', 401)
  if (result !== 'failed') return errorResponse('Active delivered command not found', 404)
  return json({ acknowledged: true, applied: false, result: ENFORCEMENT_UNAVAILABLE })
}
