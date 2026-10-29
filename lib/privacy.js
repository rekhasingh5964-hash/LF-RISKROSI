import { createHmac } from 'node:crypto'

export function requiredHmacKey(name) {
  const value = process.env[name]
  if (!value || Buffer.byteLength(value) < 32) throw new Error(`${name} must be configured with at least 32 bytes`)
  return value
}

export function principalReference(organizationId, principal) {
  const normalized = principal.trim().toLowerCase()
  if (!normalized || normalized.length > 254) throw new TypeError('A valid data principal reference is required')
  return createHmac('sha256', requiredHmacKey('CONSENT_HMAC_KEY'))
    .update(`${organizationId}.${normalized}`)
    .digest('hex')
}

export function validateChoices(choices) {
  if (!choices || typeof choices !== 'object' || Array.isArray(choices)) throw new TypeError('Consent choices must be an object')
  const entries = Object.entries(choices)
  if (!entries.length || entries.length > 30) throw new TypeError('Provide between 1 and 30 consent choices')
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z0-9_.-]{1,60}$/.test(key) || typeof value !== 'boolean') {
      throw new TypeError('Consent choices must map short keys to boolean values')
    }
  }
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)))
}
