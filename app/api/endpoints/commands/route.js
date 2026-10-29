import { getSessionUser } from '@/lib/auth'
import { appendContainmentAudit } from '@/lib/containment-audit'
import { containmentCommandConfiguration, signContainmentCommand } from '@/lib/containment-command'
import { errorResponse, json } from '@/lib/http'
import { hashEndpointToken } from '@/lib/endpoint-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const BEARER_TOKEN_PATTERN = /^[\da-f]{64}$/i
const COMMAND_DELIVERY_TTL_MS = 5 * 60 * 1000
const QUARANTINE_LEASE_MS = 2 * 60 * 60 * 1000

export async function GET(request) {
  const authorization = request.headers.get('authorization') || ''
  const match = /^Bearer (.+)$/i.exec(authorization)
  if (!match || !BEARER_TOKEN_PATTERN.test(match[1])) {
    return errorResponse('A valid device bearer token is required', 401)
  }
  const configuration = containmentCommandConfiguration()
  if (!configuration) return errorResponse('Containment command delivery is disabled', 503)
  if (request.headers.get('x-lv-command-key') !== configuration.publicKey) {
    return errorResponse('Agent command verification key does not match this deployment', 403)
  }

  const now = new Date()
  const result = await prisma.$transaction(async (tx) => {
    const device = await tx.endpointDevice.findFirst({
      where: {
        deviceTokenHash: hashEndpointToken(match[1]),
        active: true,
        commandKeyFingerprint: configuration.keyFingerprint,
        organization: { is: { status: 'ACTIVE' } },
      },
      select: { id: true, organizationId: true },
    })
    if (!device) return { error: 'unavailable' }

    const expiredCommands = await tx.containmentCommand.findMany({
      where: {
        deviceId: device.id,
        organizationId: device.organizationId,
        status: { in: ['PENDING', 'APPROVED', 'DELIVERED'] },
        expiresAt: { lte: now },
      },
      select: { id: true, incidentId: true, action: true },
    })
    for (const command of expiredCommands) {
      const expired = await tx.containmentCommand.updateMany({
        where: { id: command.id, status: { in: ['PENDING', 'APPROVED', 'DELIVERED'] }, expiresAt: { lte: now } },
        data: { status: 'EXPIRED', completedAt: now, result: 'Command expired before application' },
      })
      if (expired.count) {
        await appendContainmentAudit(tx, {
          organizationId: device.organizationId,
          incidentId: command.incidentId,
          commandId: command.id,
          actorId: 'system:containment-expiry',
          action: 'CONTAINMENT_EXPIRED',
          payload: { action: command.action },
        })
      }
    }

    const command = await tx.containmentCommand.findFirst({
      where: {
        organizationId: device.organizationId,
        deviceId: device.id,
        status: 'APPROVED',
        expiresAt: { gt: now },
      },
      orderBy: { approvedAt: 'asc' },
      select: {
        id: true, organizationId: true, deviceId: true, incidentId: true,
        action: true, status: true, reason: true, requestedAt: true, approvedAt: true,
      },
    })
    if (!command) return { error: null, command: null }

    const expiresAt = new Date(now.getTime() + COMMAND_DELIVERY_TTL_MS)
    const leaseExpiresAt = command.action === 'QUARANTINE'
      ? new Date(now.getTime() + QUARANTINE_LEASE_MS)
      : null
    const claimed = await tx.containmentCommand.updateMany({
      where: { id: command.id, status: 'APPROVED' },
      data: { status: 'DELIVERED', expiresAt, leaseExpiresAt },
    })
    if (!claimed.count) return { error: null, command: null }

    const delivered = {
      ...command,
      status: 'DELIVERED',
      expiresAt,
      leaseExpiresAt,
    }
    const signed = signContainmentCommand(delivered, configuration.privateKey)
    await tx.containmentCommand.update({
      where: { id: delivered.id },
      data: { commandSignature: signed.signature },
    })
    await appendContainmentAudit(tx, {
      organizationId: delivered.organizationId,
      incidentId: delivered.incidentId,
      commandId: delivered.id,
      actorId: 'system:endpoint-agent',
      action: 'CONTAINMENT_DELIVERED',
      payload: { action: delivered.action, deviceId: delivered.deviceId, signature: signed.signature },
    })
    return { error: null, command: { ...signed.payload, signature: signed.signature } }
  })

  if (result.error) return errorResponse('Device credential is revoked or unavailable', 401)
  return json({ commands: result.command ? [result.command] : [] })
}
