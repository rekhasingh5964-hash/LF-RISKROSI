import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { runRosiSimulation } from '@/lib/ai-engines'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all') return errorResponse('Select a single tenant for a ROSI scenario', 400)
  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  try {
    const result = runRosiSimulation({
      aleBefore: body.aleBefore,
      aleAfter: body.aleAfter,
      treatmentCost: body.treatmentCost,
      runs: body.runs ?? 10000,
    })
    await prisma.auditEvent.create({
      data: {
        organizationId: scope.tenantId, actorId: user.id, action: 'rosi.simulation',
        entityType: 'RosiScenario', entityId: crypto.randomUUID(),
        details: { runs: result.runs, p50: result.p50, engine: result.engine },
      },
    })
    return json(result)
  } catch (error) {
    return errorResponse(error.message, 400)
  }
}
