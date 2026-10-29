import { createHash, randomBytes } from 'node:crypto'
import { errorResponse, json, readJson } from '@/lib/http'
import { hashEndpointToken, isEndpointArchitecture, isEndpointName, isEndpointVersion } from '@/lib/endpoint-auth'
import { containmentCommandConfiguration } from '@/lib/containment-command'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request) {
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  if (typeof body.enrollmentToken !== 'string' || !/^[\da-f]{64}$/i.test(body.enrollmentToken)) {
    return errorResponse('A valid one-time enrollment token is required', 400)
  }
  if (!isEndpointName(body.name)) return errorResponse('A valid device name of at most 128 characters is required', 400)
  if (!['WINDOWS', 'LINUX'].includes(body.operatingSystem)) {
    return errorResponse('operatingSystem must be WINDOWS or LINUX', 400)
  }
  if (!isEndpointArchitecture(body.architecture)) return errorResponse('Invalid device architecture', 400)
  if (!isEndpointVersion(body.agentVersion)) return errorResponse('Invalid agent version', 400)

  let commandConfiguration
  try {
    commandConfiguration = containmentCommandConfiguration()
  } catch (error) {
    console.error('Endpoint enrollment command configuration is invalid', error)
    return errorResponse('Endpoint enrollment is unavailable due to command signing configuration', 503)
  }

  const enrollmentTokenHash = hashEndpointToken(body.enrollmentToken)
  const deviceToken = randomBytes(32).toString('hex')
  const now = new Date()
  const enrollment = await prisma.$transaction(async (tx) => {
    const candidate = await tx.endpointEnrollmentToken.findUnique({
      where: { tokenHash: enrollmentTokenHash },
      select: {
        id: true, organizationId: true, expiresAt: true, usedAt: true,
        organization: { select: { status: true } },
      },
    })
    if (!candidate || candidate.usedAt || candidate.expiresAt <= now || candidate.organization.status !== 'ACTIVE') return null

    const claimed = await tx.endpointEnrollmentToken.updateMany({
      where: { id: candidate.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (claimed.count !== 1) return null

    const device = await tx.endpointDevice.create({
      data: {
        organizationId: candidate.organizationId,
        name: body.name.trim(),
        operatingSystem: body.operatingSystem,
        architecture: body.architecture,
        agentVersion: body.agentVersion,
        deviceTokenHash: hashEndpointToken(deviceToken),
        commandKeyFingerprint: commandConfiguration
          ? createHash('sha256').update(commandConfiguration.publicKey).digest('hex')
          : null,
        lastSeenAt: now,
      },
      select: { id: true },
    })
    return device
  })
  if (!enrollment) return errorResponse('Enrollment token is expired, already used, or unavailable', 401)

  return json({
    deviceId: enrollment.id,
    deviceToken,
    heartbeatIntervalSeconds: 300,
    ...(commandConfiguration ? { commandSigningPublicKey: commandConfiguration.publicKey } : {}),
  }, 201)
}
