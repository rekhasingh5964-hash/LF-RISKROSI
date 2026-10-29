import { getSessionUser, resolveTenantScope } from '@/lib/auth'
import { errorResponse, hasSameOrigin, json, readJson } from '@/lib/http'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const PLANS = {
  STARTER: { monthlyAmount: '999.00', seatsIncluded: 5 },
  GROWTH: { monthlyAmount: '2499.00', seatsIncluded: 25 },
  BUSINESS: { monthlyAmount: '5999.00', seatsIncluded: 75 },
}
const SUBSCRIPTION_STATUSES = new Set(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED'])

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  const scope = await resolveTenantScope(user, request.headers.get('x-tenant-id'))
  if (!scope) return errorResponse('You do not have access to that tenant', 403)

  const subscriptions = await prisma.productSubscription.findMany({
    where: { organizationId: { in: scope.organizationIds } },
    include: {
      organization: { select: { id: true, name: true, parentId: true } },
    },
    orderBy: [{ status: 'asc' }, { organization: { name: 'asc' } }],
  })
  const partners = user.role === 'MSSP_ADMIN'
    ? await prisma.channelPartner.findMany({
      where: { providerOrganizationId: user.organizationId },
      include: {
        assignments: {
          include: { customerOrganization: { select: { id: true, name: true } } },
          orderBy: { assignedAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })
    : []

  return json({
    plans: Object.entries(PLANS).map(([tier, plan]) => ({
      tier,
      monthlyAmount: plan.monthlyAmount,
      currency: 'INR',
      seatsIncluded: plan.seatsIncluded,
      billingConfigured: false,
    })),
    subscriptions: subscriptions.map(({ organization, ...subscription }) => ({
      ...subscription,
      organization,
    })),
    partners,
  })
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return errorResponse('Request origin is not allowed', 403)
  const user = await getSessionUser()
  if (!user) return errorResponse('Sign in required', 401)
  if (user.role !== 'MSSP_ADMIN') return errorResponse('Commercial administration requires provider administrator access', 403)

  let body
  try { body = await readJson(request) } catch (error) { return errorResponse(error.message, 400) }
  const action = body.action
  if (!['create_partner', 'assign_partner', 'set_subscription'].includes(action)) {
    return errorResponse('Unsupported commercial action', 400)
  }

  let result
  if (action === 'create_partner') {
    if (Object.keys(body).some((key) => !['action', 'name', 'contactEmail', 'marginBasisPoints'].includes(key))) {
      return errorResponse('Partner request contains unsupported fields', 400)
    }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const contactEmail = typeof body.contactEmail === 'string' ? body.contactEmail.trim().toLowerCase() : ''
    const marginBasisPoints = body.marginBasisPoints ?? 2000
    if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ||
        !Number.isInteger(marginBasisPoints) || marginBasisPoints < 2000 || marginBasisPoints > 2500) {
      return errorResponse('Provide a partner name, valid contact email, and margin between 2000 and 2500 basis points', 400)
    }
    result = await prisma.$transaction(async (tx) => {
      const partner = await tx.channelPartner.create({
        data: { providerOrganizationId: user.organizationId, name, contactEmail, marginBasisPoints },
      })
      await tx.auditEvent.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.id,
          action: 'commercial.partner.created',
          entityType: 'ChannelPartner',
          entityId: partner.id,
          details: { name, contactEmail, marginBasisPoints },
        },
      })
      return partner
    })
  } else if (action === 'assign_partner') {
    if (Object.keys(body).some((key) => !['action', 'partnerId', 'customerOrganizationId'].includes(key)) ||
        typeof body.partnerId !== 'string' || typeof body.customerOrganizationId !== 'string') {
      return errorResponse('A partner and customer organization are required', 400)
    }
    const [partner, customer] = await Promise.all([
      prisma.channelPartner.findFirst({
        where: { id: body.partnerId, providerOrganizationId: user.organizationId, active: true },
        select: { id: true },
      }),
      prisma.organization.findFirst({
        where: {
          id: body.customerOrganizationId,
          parentId: user.organizationId,
          kind: 'CUSTOMER',
          status: 'ACTIVE',
        },
        select: { id: true },
      }),
    ])
    if (!partner || !customer) return errorResponse('Partner or customer tenant is outside your provider scope', 404)
    result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.partnerCustomerAssignment.upsert({
        where: { customerOrganizationId: customer.id },
        update: { partnerId: partner.id, assignedAt: new Date() },
        create: { partnerId: partner.id, customerOrganizationId: customer.id },
      })
      await tx.auditEvent.create({
        data: {
          organizationId: customer.id,
          actorId: user.id,
          action: 'commercial.partner.assigned',
          entityType: 'PartnerCustomerAssignment',
          entityId: assignment.id,
          details: { partnerId: partner.id, customerOrganizationId: customer.id },
        },
      })
      return assignment
    })
  } else {
    if (Object.keys(body).some((key) => !['action', 'customerOrganizationId', 'tier', 'status'].includes(key)) ||
        typeof body.customerOrganizationId !== 'string' || !Object.hasOwn(PLANS, body.tier) ||
        !SUBSCRIPTION_STATUSES.has(body.status)) {
      return errorResponse('Subscription requires a valid customer, tier, and status', 400)
    }
    const customer = await prisma.organization.findFirst({
      where: {
        id: body.customerOrganizationId,
        parentId: user.organizationId,
        kind: 'CUSTOMER',
        status: 'ACTIVE',
      },
      select: { id: true },
    })
    if (!customer) return errorResponse('Customer tenant is outside your provider scope', 404)
    const plan = PLANS[body.tier]
    const now = new Date()
    result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.productSubscription.upsert({
        where: { organizationId: customer.id },
        update: {
          tier: body.tier,
          status: body.status,
          monthlyAmount: plan.monthlyAmount,
          seatsIncluded: plan.seatsIncluded,
          renewsAt: body.status === 'CANCELLED' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          cancelledAt: body.status === 'CANCELLED' ? now : null,
        },
        create: {
          organizationId: customer.id,
          tier: body.tier,
          status: body.status,
          monthlyAmount: plan.monthlyAmount,
          seatsIncluded: plan.seatsIncluded,
          startsAt: now,
          renewsAt: body.status === 'CANCELLED' ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          cancelledAt: body.status === 'CANCELLED' ? now : null,
        },
      })
      await tx.auditEvent.create({
        data: {
          organizationId: customer.id,
          actorId: user.id,
          action: 'commercial.subscription.updated',
          entityType: 'ProductSubscription',
          entityId: subscription.id,
          details: { tier: body.tier, status: body.status, monthlyAmount: plan.monthlyAmount },
        },
      })
      return subscription
    })
  }

  return json(result, action === 'create_partner' ? 201 : 200)
}
