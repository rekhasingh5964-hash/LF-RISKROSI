import { errorResponse, json, readJson } from '@/lib/http'
import { hashEndpointToken, isEndpointVersion } from '@/lib/endpoint-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const BEARER_TOKEN_PATTERN = /^[\da-f]{64}$/i

export async function POST(request) {
  const authorization = request.headers.get('authorization') || ''
  const match = /^Bearer (.+)$/i.exec(authorization)
  if (!match || !BEARER_TOKEN_PATTERN.test(match[1])) {
    return errorResponse('A valid device bearer token is required', 401)
  }

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  if (!isEndpointVersion(body.agentVersion)) return errorResponse('Invalid agent version', 400)

  const updated = await prisma.endpointDevice.updateMany({
    where: {
      deviceTokenHash: hashEndpointToken(match[1]),
      active: true,
      organization: { is: { status: 'ACTIVE' } },
    },
    data: { lastSeenAt: new Date(), agentVersion: body.agentVersion },
  })
  if (updated.count !== 1) {
    return errorResponse('Device credential is revoked or unavailable', 401)
  }

  return json({ accepted: true, heartbeatIntervalSeconds: 300 })
}
