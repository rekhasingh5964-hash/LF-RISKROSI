import IORedis from 'ioredis'

let client

function getClient() {
  if (!client) {
    client = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      lazyConnect: true,
      connectTimeout: 1000,
      maxRetriesPerRequest: 0,
      retryStrategy: (times) => times > 1 ? null : 100,
    })
  }
  return client
}

export async function pingRedisForReadiness() {
  await getClient().ping()
}
