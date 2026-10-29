import { signAuditEvent } from './consent-vault.js'

function requiredAuditKey() {
  const key = process.env.AUDIT_HMAC_KEY
  if (!key || Buffer.byteLength(key) < 32) throw new Error('AUDIT_HMAC_KEY must contain at least 32 bytes')
  return key
}

export async function appendContainmentAudit(tx, {
  organizationId,
  incidentId = null,
  commandId = null,
  actorId,
  action,
  payload,
}) {
  const key = requiredAuditKey()
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))::text AS locked`
  const previous = await tx.containmentAuditRecord.findFirst({
    where: { organizationId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { eventHash: true, createdAt: true },
  })
  const createdAt = new Date(Math.max(Date.now(), (previous?.createdAt.getTime() || 0) + 1))
  const event = {
    organizationId,
    incidentId,
    commandId,
    actorId,
    action,
    payload,
    at: createdAt.toISOString(),
  }
  const signed = signAuditEvent(event, previous?.eventHash || null, key, process.env.AUDIT_KEY_VERSION || 'v1')
  return tx.containmentAuditRecord.create({
    data: {
      organizationId,
      incidentId,
      commandId,
      actorId,
      action,
      payload,
      createdAt,
      ...signed,
    },
  })
}

export async function verifyContainmentAudit(organizationId, prisma) {
  const key = requiredAuditKey()
  const records = await prisma.containmentAuditRecord.findMany({
    where: { organizationId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  let previousHash = null
  for (const record of records) {
    const event = {
      organizationId: record.organizationId,
      incidentId: record.incidentId,
      commandId: record.commandId,
      actorId: record.actorId,
      action: record.action,
      payload: record.payload,
      at: record.createdAt.toISOString(),
    }
    const expected = signAuditEvent(event, previousHash, key, record.keyVersion)
    if (expected.eventHash !== record.eventHash ||
        expected.signature !== record.signature ||
        record.previousHash !== previousHash) {
      return { valid: false, checked: records.length, brokenEventId: record.id }
    }
    previousHash = record.eventHash
  }
  return { valid: true, checked: records.length, head: previousHash }
}
