import { getSessionUser, resolveTenantScope, mayWriteRisk } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { evaluateDeterministicRisk, riskSeverity, scoreRisk } from '@/lib/risk-engine'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const risks = await prisma.risk.findMany({
    where: { organizationId: { in: scope.organizationIds } },
    include: {
      organization: { select: { id: true, name: true } },
      evaluationRecords: { orderBy: { evaluatedAt: 'desc' }, take: 1 },
    },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
  })
  return json(risks)
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  if (scope.tenantId === 'all') return errorResponse('Select a specific customer tenant before creating a risk', 400)
  if (!mayWriteRisk(user, scope.tenantId)) return errorResponse('Your role is read-only for this workspace', 403)

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 160) : ''
  const category = typeof body.category === 'string' ? body.category.trim().slice(0, 60) : 'Uncategorized'
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 1200) : ''
  const owner = typeof body.owner === 'string' ? body.owner.trim().slice(0, 120) : ''
  if (!name) return errorResponse('Risk name is required', 400)

  let scoring
  let vectorEvaluation = null
  const vectorMode = body.riskFactors !== undefined || body.statutoryConditions !== undefined
  try {
    if (vectorMode) {
      if (body.riskFactors === undefined) throw new TypeError('riskFactors is required for vector-based evaluation')
      if (body.statutoryTrigger === true) {
        throw new TypeError('Use statutoryConditions instead of statutoryTrigger for vector-based evaluation')
      }
      scoreRisk({ likelihood: body.likelihood, impact: body.impact, exposure: body.exposure ?? 0 })
      vectorEvaluation = evaluateDeterministicRisk(body.riskFactors, body.statutoryConditions ?? {})
      const score = Math.round(vectorEvaluation.score)
      scoring = {
        score,
        baseScore: score,
        severity: riskSeverity(score),
        statutoryTrigger: vectorEvaluation.statutoryOverrideActive,
        statutoryOverride: vectorEvaluation.statutoryOverrideActive
          ? 'Statutory breach trigger set score to 100'
          : null,
      }
    } else {
      scoring = scoreRisk({
        likelihood: body.likelihood,
        impact: body.impact,
        exposure: body.exposure ?? 0,
        statutoryTrigger: body.statutoryTrigger ?? false,
        statutoryReference: body.statutoryReference,
      })
    }
  } catch (error) {
    return errorResponse(error.message, 400)
  }

  const risk = await prisma.$transaction(async (tx) => {
    const createdRisk = await tx.risk.create({
      data: {
        organizationId: scope.tenantId, name, category: category || 'Uncategorized',
        description, owner, likelihood: body.likelihood, impact: body.impact,
        exposure: body.exposure ?? 0, score: scoring.score, baseScore: scoring.baseScore,
        severity: scoring.severity, statutoryTrigger: scoring.statutoryTrigger,
        statutoryReference: vectorEvaluation
          ? vectorEvaluation.triggers.join(', ') || null
          : body.statutoryTrigger ? body.statutoryReference.trim().slice(0, 120) : null,
        statutoryOverride: scoring.statutoryOverride,
      },
    })
    let evaluation = null
    if (vectorEvaluation) {
      evaluation = await tx.riskEvaluationRecord.create({
        data: {
          organizationId: scope.tenantId,
          riskId: createdRisk.id,
          calculatedScore: vectorEvaluation.score,
          statutoryOverride: vectorEvaluation.statutoryOverrideActive,
          triggeredBreaches: vectorEvaluation.triggers,
          vectorPayloadJson: {
            factors: body.riskFactors,
            statutoryConditions: body.statutoryConditions ?? {},
            clamped: vectorEvaluation.clamped,
          },
          engineEvaluator: 'LF_RISKROSI_DETERMINISTIC_V1',
        },
      })
    }
    await tx.auditEvent.create({
      data: {
        organizationId: scope.tenantId, actorId: user.id, action: 'risk.created',
        entityType: 'Risk', entityId: createdRisk.id,
        details: {
          score: createdRisk.score,
          severity: createdRisk.severity,
          statutoryTrigger: createdRisk.statutoryTrigger,
          evaluationRecordId: evaluation?.id ?? null,
        },
      },
    })
    return { ...createdRisk, ...(evaluation ? { evaluation } : {}) }
  })
  return json(risk, 201)
}
