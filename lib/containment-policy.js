import { isIP } from 'node:net'

const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)(?:\.(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?))*$/i
const MAX_PINNED_IPS = 16
const MAX_MANAGEMENT_CIDRS = 32

function isValidCidr(value) {
  const [address, prefix, ...extra] = value.split('/')
  const version = isIP(address)
  if (!version || extra.length > 0) return false
  if (prefix === undefined) return false
  if (!/^(0|[1-9]\d{0,2})$/.test(prefix)) return false
  const bits = version === 4 ? 32 : 128
  const number = Number(prefix)
  return number >= 0 && number <= bits
}

function normalizeList(value) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) return null
  const normalized = value.map((entry) => entry.trim()).filter(Boolean)
  if (normalized.length !== new Set(normalized).size) return null
  return normalized
}

export function validateContainmentPolicy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'Containment policy must be an object' }
  }
  const allowedFields = new Set(['controlPlaneHostname', 'pinnedControlPlaneIps', 'allowedManagementCidrs'])
  if (Object.keys(input).some((field) => !allowedFields.has(field))) {
    return { valid: false, error: 'Containment policy contains unsupported fields' }
  }

  const hostname = typeof input.controlPlaneHostname === 'string'
    ? input.controlPlaneHostname.trim().toLowerCase()
    : null
  if (hostname === null || (hostname && (
    !HOSTNAME_PATTERN.test(hostname) || isIP(hostname) || !hostname.includes('.')
  ))) {
    return { valid: false, error: 'Provide a fully qualified control-plane hostname or leave it blank until configured' }
  }

  const pinnedControlPlaneIps = normalizeList(input.pinnedControlPlaneIps)
  if (!pinnedControlPlaneIps || pinnedControlPlaneIps.length > MAX_PINNED_IPS ||
      pinnedControlPlaneIps.some((address) => !isIP(address))) {
    return { valid: false, error: `Provide up to ${MAX_PINNED_IPS} unique pinned IPv4 or IPv6 addresses` }
  }

  const allowedManagementCidrs = normalizeList(input.allowedManagementCidrs)
  if (!allowedManagementCidrs || allowedManagementCidrs.length > MAX_MANAGEMENT_CIDRS ||
      allowedManagementCidrs.some((cidr) => !isValidCidr(cidr))) {
    return { valid: false, error: `Provide up to ${MAX_MANAGEMENT_CIDRS} unique IPv4 or IPv6 CIDR ranges` }
  }

  return {
    valid: true,
    policy: { controlPlaneHostname: hostname, pinnedControlPlaneIps, allowedManagementCidrs },
  }
}
