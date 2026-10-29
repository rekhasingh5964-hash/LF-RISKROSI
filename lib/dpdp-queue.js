import IORedis from 'ioredis'
import { Queue } from 'bullmq'

let connection
let queue

function getConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    })
  }
  return connection
}

export function getErasureQueue() {
  if (!queue) queue = new Queue('dpdp-erasure', { connection: getConnection() })
  return queue
}

export async function enqueueErasureDelivery(deliveryId) {
  return getErasureQueue().add('deliver-erasure-webhook', { deliveryId }, {
    jobId: deliveryId,
    attempts: 8,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 30 * 24 * 60 * 60, count: 10000 },
    removeOnFail: false,
  })
}
