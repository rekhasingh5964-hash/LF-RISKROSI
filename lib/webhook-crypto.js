import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function encryptionKey() {
  const raw = process.env.WEBHOOK_ENCRYPTION_KEY
  if (!raw || !/^[\da-f]{64}$/i.test(raw)) throw new Error('WEBHOOK_ENCRYPTION_KEY must be a 32-byte hexadecimal value')
  return Buffer.from(raw, 'hex')
}

export function encryptWebhookSecret(secret) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptWebhookSecret(value) {
  const [version, ivHex, tagHex, ciphertextHex] = String(value).split(':')
  if (version !== 'v1' || !ivHex || !tagHex || !ciphertextHex) throw new Error('Unsupported encrypted webhook secret')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]).toString('utf8')
}
