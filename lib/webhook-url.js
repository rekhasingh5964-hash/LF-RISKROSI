import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

function normalizedHostname(hostname) {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname
}

export function isPublicIp(address) {
  const family = isIP(address)
  if (family === 4) {
    const octets = address.split('.').map(Number)
    if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false
    const [a, b, c] = octets
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    )
  }
  if (family === 6) {
    const value = address.toLowerCase()
    const [left = '', right] = value.split('::')
    const leftWords = left ? left.split(':') : []
    const rightWords = right ? right.split(':') : []
    const words = right === undefined
      ? leftWords
      : [...leftWords, ...Array(8 - leftWords.length - rightWords.length).fill('0'), ...rightWords]
    if (words.length !== 8) return false
    const firstHextet = Number.parseInt(words[0], 16)
    const secondHextet = Number.parseInt(words[1], 16)
    return firstHextet >= 0x2000 && firstHextet <= 0x3fff &&
      !(firstHextet === 0x2001 && [0, 2, 0x10, 0x20, 0xdb8].includes(secondHextet)) &&
      firstHextet !== 0x2002 && firstHextet !== 0x3fff
  }
  return false
}

export async function resolvePublicWebhookAddress(hostname) {
  const normalized = normalizedHostname(hostname)
  const family = isIP(normalized)
  const addresses = family
    ? [{ address: normalized, family }]
    : await lookup(normalized, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error('Webhook hostname did not resolve exclusively to public IP addresses')
  }
  return addresses[0]
}

export async function validatePublicHttpsWebhookUrl(value) {
  const endpoint = new URL(value)
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password ||
    (endpoint.port && endpoint.port !== '443') ||
    endpoint.hash
  ) {
    throw new TypeError('Webhook endpoint must be HTTPS on the standard port and cannot contain credentials or a fragment')
  }
  await resolvePublicWebhookAddress(endpoint.hostname)
  return endpoint
}
