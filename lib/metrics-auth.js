import { timingSafeEqual } from 'node:crypto'

export function isMetricsAuthorized(request, expectedToken) {
  const authorization = request.headers.get('authorization') || ''
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!expectedToken || !supplied) return false
  const expectedBytes = Buffer.from(expectedToken)
  const suppliedBytes = Buffer.from(supplied)
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
}
