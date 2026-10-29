import { createHash, randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { scoreRisk } from '../lib/risk-engine.js'

const scrypt = promisify(scryptCallback)
const prisma = new PrismaClient()

async function passwordRecord(password) {
  const salt = randomBytes(16)
  const hash = Buffer.from(await scrypt(password, salt, 64))
  return { passwordSalt: salt.toString('hex'), passwordHash: hash.toString('hex') }
}

async function seedUser({ id, email, name, role, organizationId, password }) {
  if (!email || !password || password.length < 12) {
    throw new Error(`Set a unique email and a password of at least 12 characters for ${role}`)
  }
  const record = await passwordRecord(password)
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, role, organizationId },
    create: {
      id, email: email.toLowerCase(), name, role, organizationId,
      ...record,
    },
  })
}

async function main() {
  const provider = await prisma.organization.upsert({
    where: { id: 'demo-provider' },
    update: { name: 'LF-RiskROSI MSSP', kind: 'PROVIDER', status: 'ACTIVE' },
    create: { id: 'demo-provider', name: 'LF-RiskROSI MSSP', kind: 'PROVIDER', region: 'IN-SOUTH-01' },
  })
  const customer = await prisma.organization.upsert({
    where: { id: 'demo-customer-northstar' },
    update: { name: 'Northstar Health', parentId: provider.id, industry: 'Healthcare', status: 'ACTIVE' },
    create: {
      id: 'demo-customer-northstar', name: 'Northstar Health', parentId: provider.id,
      kind: 'CUSTOMER', industry: 'Healthcare', region: 'IN-SOUTH-01',
    },
  })
  await prisma.organization.upsert({
    where: { id: 'demo-customer-meridian' },
    update: { name: 'Meridian Finance', parentId: provider.id, industry: 'Financial services', status: 'ACTIVE' },
    create: {
      id: 'demo-customer-meridian', name: 'Meridian Finance', parentId: provider.id,
      kind: 'CUSTOMER', industry: 'Financial services', region: 'IN-SOUTH-01',
    },
  })

  const msspAdmin = await seedUser({
    id: 'demo-mssp-admin', email: process.env.SEED_ADMIN_EMAIL, name: 'MSSP Administrator',
    role: 'MSSP_ADMIN', organizationId: provider.id, password: process.env.SEED_ADMIN_PASSWORD,
  })
  if (process.env.SEED_SUPER_ADMIN_EMAIL || process.env.SEED_SUPER_ADMIN_PASSWORD) {
    await seedUser({
      id: 'demo-super-admin', email: process.env.SEED_SUPER_ADMIN_EMAIL,
      name: 'Platform Super Administrator', role: 'SUPER_ADMIN',
      organizationId: provider.id, password: process.env.SEED_SUPER_ADMIN_PASSWORD,
    })
  }
  await seedUser({
    id: 'demo-tenant-admin', email: process.env.SEED_TENANT_ADMIN_EMAIL, name: 'Tenant Administrator',
    role: 'TENANT_ADMIN', organizationId: customer.id, password: process.env.SEED_TENANT_ADMIN_PASSWORD,
  })

  const purpose = await prisma.consentPurpose.upsert({
    where: { organizationId_code: { organizationId: customer.id, code: 'security-telemetry' } },
    update: { label: 'Security telemetry', retentionDays: 180, lawfulBasis: 'Consent (sample configuration)' },
    create: {
      organizationId: customer.id, code: 'security-telemetry', label: 'Security telemetry',
      description: 'Illustrative purpose for security event processing; configure after legal review.',
      retentionDays: 180, lawfulBasis: 'Consent (sample configuration)',
    },
  })
  const noticeContent = 'Illustrative security telemetry notice. Replace with legally reviewed notice content before use.'
  await prisma.privacyNotice.upsert({
    where: {
      organizationId_purposeId_version_language: {
        organizationId: customer.id, purposeId: purpose.id, version: 1, language: 'en',
      },
    },
    update: {},
    create: {
      organizationId: customer.id, purposeId: purpose.id, version: 1, language: 'en',
      content: noticeContent, contentHash: createHash('sha256').update(noticeContent).digest('hex'),
      section: 'DPDP Act 2023 Section 5', createdById: msspAdmin.id,
    },
  })

  const risks = [
    {
      id: 'demo-risk-healthcare-ransomware', name: 'Ransomware disruption of clinical systems',
      description: 'Illustrative scenario; validate likelihood, impact, and safeguards with the tenant.',
      category: 'Business continuity', likelihood: 5, impact: 5, exposure: 5,
      owner: 'Security operations',
      aleBefore: '4800000.00', aleAfter: '900000.00', treatmentCost: '650000.00',
    },
    {
      id: 'demo-risk-healthcare-access', name: 'Over-privileged third-party access',
      description: 'Illustrative scenario; replace with a verified assessment finding.',
      category: 'Identity and access', likelihood: 4, impact: 4, exposure: 4,
      owner: 'Identity team',
      aleBefore: '1200000.00', aleAfter: '350000.00', treatmentCost: '180000.00',
    },
  ]
  for (const risk of risks) {
    const scoring = scoreRisk(risk)
    await prisma.risk.upsert({
      where: { id: risk.id },
      update: {},
      create: { organizationId: customer.id, ...risk, ...scoring },
    })
  }
}

main()
  .catch((error) => {
    console.error('Demo seed failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
