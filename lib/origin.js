export function hasSameOrigin(request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host || host.includes(',')) return false
  try {
    const requestUrl = new URL(request.url)
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
    const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1)
    if (!['http', 'https'].includes(protocol)) return false
    const expectedOrigin = new URL(`${protocol}://${host}`).origin
    return new URL(origin).origin === expectedOrigin
  } catch {
    return false
  }
}
