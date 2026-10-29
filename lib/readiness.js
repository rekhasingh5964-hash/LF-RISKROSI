async function checkDependency(check, timeoutMs) {
  let timeout
  try {
    await Promise.race([
      Promise.resolve().then(check),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Readiness check timed out')), timeoutMs)
      }),
    ])
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function getReadiness(checks, timeoutMs = 2000) {
  const [database, redis] = await Promise.all([
    checkDependency(checks.database, timeoutMs),
    checkDependency(checks.redis, timeoutMs),
  ])
  return {
    status: database && redis ? 'ok' : 'unavailable',
    checks: { database, redis },
  }
}
