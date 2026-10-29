function parseHealthUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new TypeError('Health probe URL must be an absolute HTTP(S) URL')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new TypeError('Health probe URL must use HTTP(S) without embedded credentials')
  }
  return url
}

export async function probeHealth(value, {
  fetchImpl = fetch,
  timeoutMs = 3000,
  now = () => performance.now(),
} = {}) {
  const url = parseHealthUrl(value)
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new RangeError('Health probe timeout must be between 1 and 30000 milliseconds')
  }

  const startedAt = now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    })
    let payload
    try {
      payload = await response.json()
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
    }

    const checks = payload?.checks && typeof payload.checks === 'object'
      ? {
          database: payload.checks.database === true,
          redis: payload.checks.redis === true,
        }
      : { database: false, redis: false }
    return {
      healthy: response.status === 200 && payload?.status === 'ok' && checks.database && checks.redis,
      statusCode: response.status,
      durationMs: Math.max(0, Math.round(now() - startedAt)),
      checks,
    }
  } finally {
    clearTimeout(timeout)
  }
}
