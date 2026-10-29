import { createHmac } from 'node:crypto'
import https from 'node:https'
import IORedis from 'ioredis'
import { Worker, Queue } from 'bullmq'
import { appendConsentAudit } from '../lib/audit.js'
import { decryptWebhookSecret } from '../lib/webhook-crypto.js'
import { resolvePublicWebhookAddress, validatePublicHttpsWebhookUrl } from '../lib/webhook-url.js'
import { prisma } from '../lib/prisma.js'
import { logWorkerEvent } from '../lib/worker-observability.js'

const queueName = 'dpdp-erasure'
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
})
const queue = new Queue(queueName, { connection })

async function postWebhook(endpoint, delivery) {
  const target = await validatePublicHttpsWebhookUrl(endpoint.url)
  const resolved = await resolvePublicWebhookAddress(target.hostname)
  const secret = decryptWebhookSecret(endpoint.secret)
  const body = Buffer.from(JSON.stringify(delivery.payload))
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body.toString('utf8')}`).digest('hex')

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: target.hostname,
      port: 443,
      path: `${target.pathname}${target.search}`,
      method: 'POST',
      servername: target.hostname,
      lookup: (_hostname, options, callback) => {
        const address = { address: resolved.address, family: resolved.family }
        if (options?.all) callback(null, [address])
        else callback(null, address.address, address.family)
      },
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        'X-LF-Event': delivery.eventType,
        'X-LF-Delivery': delivery.id,
        'X-LF-Timestamp': timestamp,
        'X-LF-Signature': `sha256=${signature}`,
      },
      timeout: 10000,
    }, (response) => {
      response.resume()
      response.on('aborted', () => reject(new Error('Webhook response was interrupted')))
      response.on('error', reject)
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.statusCode)
        else reject(new Error(`Webhook returned HTTP ${response.statusCode || 'unknown'}`))
      })
    })
    request.on('timeout', () => request.destroy(new Error('Webhook request timed out')))
    request.on('error', reject)
    request.end(body)
  })
}

async function processDelivery(job) {
  if (job.name === 'dispatch-outbox') {
    const pending = await prisma.webhookDelivery.findMany({
      where: { status: { in: ['QUEUED', 'RETRYING'] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] },
      select: { id: true },
      take: 100,
      orderBy: { createdAt: 'asc' },
    })
    for (const delivery of pending) {
      await queue.add('deliver-erasure', { deliveryId: delivery.id }, {
        jobId: delivery.id,
        attempts: 8,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 3600, count: 10000 },
        removeOnFail: { age: 30 * 24 * 3600, count: 10000 },
      })
    }
    return { enqueued: pending.length }
  }

  const { deliveryId } = job.data
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  })
  if (!delivery || delivery.status === 'DELIVERED') return { skipped: true }
  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: { attempts: { increment: 1 }, status: 'RETRYING', lastError: null },
  })
  try {
    if (!delivery.endpoint.enabled) throw new Error('Webhook endpoint is disabled')
    const responseCode = await postWebhook(delivery.endpoint, delivery)
    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'DELIVERED', responseCode, deliveredAt: new Date(), lastError: null },
      }),
      prisma.auditEvent.create({
        data: {
        organizationId: delivery.organizationId, actorId: 'system:dpdp-worker',
        action: 'privacy.erasure_webhook.delivered', entityType: 'WebhookDelivery',
        entityId: delivery.id, details: { responseCode, eventType: delivery.eventType },
        },
      }),
    ])
    return { delivered: true, responseCode }
  } catch (error) {
    const finalAttempt = (job.attemptsMade || 0) + 1 >= (job.opts.attempts || 1)
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: finalAttempt ? 'FAILED' : 'RETRYING',
        lastError: error.message.slice(0, 500),
        nextAttemptAt: finalAttempt ? null : new Date(Date.now() + Math.min(3600000, 5000 * (2 ** (job.attemptsMade || 0)))),
      },
    })
    throw error
  }
}

async function expireConsents() {
  const expired = await prisma.consentArtifact.findMany({
    where: { status: 'ACTIVE', retentionExpiresAt: { lte: new Date() } },
    select: { id: true, organizationId: true, purposeId: true, dataPrincipalRef: true },
    take: 100,
    orderBy: { retentionExpiresAt: 'asc' },
  })
  for (const artifact of expired) {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.consentArtifact.updateMany({
        where: { id: artifact.id, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      })
      if (!changed.count) return
      const endpoints = await tx.webhookEndpoint.findMany({
        where: { organizationId: artifact.organizationId, enabled: true, events: { has: 'data.erasure.requested' } },
      })
      const deliveries = []
      for (const endpoint of endpoints) {
        const delivery = await tx.webhookDelivery.create({
          data: {
            organizationId: artifact.organizationId, endpointId: endpoint.id, consentId: artifact.id,
            eventType: 'data.erasure.requested',
            payload: {
              event: 'data.erasure.requested', consentId: artifact.id, purposeId: artifact.purposeId,
              dataPrincipalRef: artifact.dataPrincipalRef, statutoryEvent: 'DPDP_SECTION_12_ERASURE',
              requestedAt: new Date().toISOString(), statutoryReference: 'DPDP Act 2023 Section 12',
            },
          },
        })
        deliveries.push(delivery.id)
      }
      await appendConsentAudit(tx, {
        organizationId: artifact.organizationId, consentId: artifact.id, actorId: 'system:dpdp-worker',
        eventType: 'CONSENT_EXPIRED',
        payload: { purposeId: artifact.purposeId, erasedWebhookDeliveries: deliveries.length },
      })
    }, { isolationLevel: 'Serializable' })
  }
  return expired.length
}

async function pruneEndpointTelemetry() {
  const now = new Date()
  let prunedCount = 0
  for (let batch = 0; batch < 5; batch += 1) {
    const expired = await prisma.endpointTelemetryEvent.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true },
      orderBy: { expiresAt: 'asc' },
      take: 1000,
    })
    if (!expired.length) return prunedCount
    await prisma.endpointTelemetryEvent.deleteMany({
      where: { id: { in: expired.map((event) => event.id) } },
    })
    prunedCount += expired.length
    if (expired.length < 1000) return prunedCount
  }
  return prunedCount
}

const worker = new Worker(queueName, processDelivery, { connection, concurrency: 5 })
worker.on('completed', (job, result) => {
  if (job.name === 'dispatch-outbox' && result?.enqueued === 0) return
  const durationMs = Number.isSafeInteger(job.processedOn) && Number.isSafeInteger(job.finishedOn)
    ? Math.max(0, job.finishedOn - job.processedOn)
    : 0
  logWorkerEvent({
    operation: 'queue_job',
    status: 'completed',
    durationMs,
    count: job.name === 'dispatch-outbox' ? result?.enqueued : undefined,
  })
})
worker.on('failed', (job, error) => {
  const durationMs = Number.isSafeInteger(job?.processedOn) && Number.isSafeInteger(job?.finishedOn)
    ? Math.max(0, job.finishedOn - job.processedOn)
    : 0
  logWorkerEvent({
    operation: 'queue_job',
    status: 'failed',
    durationMs,
    errorType: error?.name,
  }, console.error)
})
worker.on('error', (error) => {
  logWorkerEvent({
    operation: 'worker',
    status: 'failed',
    errorType: error?.name,
  }, console.error)
})

async function observeMaintenance(operation, task) {
  const startedAt = Date.now()
  try {
    const count = await task()
    if (count > 0) {
      logWorkerEvent({ operation, status: 'completed', durationMs: Date.now() - startedAt, count })
    }
  } catch (error) {
    logWorkerEvent({
      operation,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      errorType: error?.name,
    }, console.error)
  }
}

let lastTelemetryPruneAt = 0
const dispatcher = setInterval(() => {
  queue.add('dispatch-outbox', {}, {
    jobId: `outbox-${Math.floor(Date.now() / 5000)}`, removeOnComplete: true, removeOnFail: 100,
  }).catch((error) => {
    logWorkerEvent({
      operation: 'outbox_dispatch',
      status: 'failed',
      errorType: error?.name,
    }, console.error)
  })
  observeMaintenance('consent_expiry', expireConsents)
  if (Date.now() - lastTelemetryPruneAt >= 60000) {
    lastTelemetryPruneAt = Date.now()
    observeMaintenance('telemetry_prune', pruneEndpointTelemetry)
  }
}, 5000)
dispatcher.unref()

queue.add('dispatch-outbox', {}, {
  jobId: `outbox-${Math.floor(Date.now() / 5000)}`, removeOnComplete: true, removeOnFail: 100,
}).catch((error) => {
  logWorkerEvent({
    operation: 'outbox_dispatch',
    status: 'failed',
    errorType: error?.name,
  }, console.error)
})
observeMaintenance('consent_expiry', expireConsents)
observeMaintenance('telemetry_prune', pruneEndpointTelemetry)
console.log(JSON.stringify({ event: 'worker.started', queue: queueName }))

async function shutdown() {
  clearInterval(dispatcher)
  await worker.close()
  await queue.close()
  await connection.quit()
  await prisma.$disconnect()
}

process.on('SIGINT', () => shutdown().then(() => process.exit(0)))
process.on('SIGTERM', () => shutdown().then(() => process.exit(0)))
