import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, json } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)
  const risks = await prisma.risk.findMany({
    where: { organizationId: { in: scope.organizationIds }, status: { not: 'CLOSED' } },
    include: { organization: { select: { id: true, name: true, industry: true } } },
  })
  const criticalRisks = risks.filter((risk) => risk.severity === 'CRITICAL').length
  const highRisks = risks.filter((risk) => risk.severity === 'HIGH').length
  const tenants = scope.tenantId === 'all'
    ? await prisma.organization.findMany({ where: { id: { in: scope.organizationIds } }, select: { id: true, name: true, industry: true } })
    : []
  const portfolio = tenants.map((tenant) => {
    const tenantRisks = risks.filter((risk) => risk.organizationId === tenant.id)
    return {
      ...tenant,
      riskCount: tenantRisks.length,
      critical: tenantRisks.filter((risk) => risk.severity === 'CRITICAL').length,
    }
  })
  const totalTreatmentCost = risks.reduce((total, risk) => total + Number(risk.treatmentCost), 0)
  const avoidedLoss = risks.reduce((total, risk) => total + Math.max(0, Number(risk.aleBefore) - Number(risk.aleAfter)), 0)
  const avgRosi = totalTreatmentCost === 0 ? 0 : Math.round(((avoidedLoss - totalTreatmentCost) / totalTreatmentCost) * 100)
  const postureScore = Math.max(0, Math.min(100,
    100 - criticalRisks * 16 - highRisks * 7 -
    risks.filter((risk) => risk.severity === 'MEDIUM').length * 3,
  ))
  return json({
    tenantCount: scope.tenantId === 'all' ? scope.organizationIds.length : 1,
    totalRisks: risks.length,
    openRisks: risks.length,
    criticalRisks,
    highRisks,
    avgRosi,
    postureScore,
    portfolio,
    aiEngines: [
      { name: 'LUMA', status: 'INTERFACE_ONLY' },
      { name: 'LF_SECURITY_AI', status: 'DETERMINISTIC_CORE' },
      { name: 'LUMAVEGA', status: 'SIMULATION_CORE' },
    ],
  })
}
