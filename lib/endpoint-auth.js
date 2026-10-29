import { createHash } from 'node:crypto'

export function hashEndpointToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function isEndpointName(value) {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= 128 &&
    !/[\u0000-\u001f\u007f]/.test(value)
}

export function isEndpointArchitecture(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._-]{1,32}$/.test(value)
}

export function isEndpointVersion(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9.+_-]{1,40}$/.test(value)
}
