import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto'
import { canonicalJson } from './consent-vault.js'

export function containmentCommandConfiguration() {
  if (process.env.CONTAINMENT_COMMANDS_ENABLED !== 'true') return null
  const privateKeyValue = process.env.CONTAINMENT_COMMAND_PRIVATE_KEY
  const publicKeyValue = process.env.CONTAINMENT_COMMAND_PUBLIC_KEY
  if (!privateKeyValue || !publicKeyValue) {
    throw new Error('Containment command signing keys must be configured when command delivery is enabled')
  }
  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyValue, 'base64'),
    format: 'der',
    type: 'pkcs8',
  })
  const publicKey = createPublicKey({
    key: Buffer.from(publicKeyValue, 'base64'),
    format: 'der',
    type: 'spki',
  })
  if (privateKey.asymmetricKeyType !== 'ed25519' || publicKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('Containment command keys must use Ed25519')
  }
  const derivedPublicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' })
  if (!derivedPublicKey.equals(publicKey.export({ format: 'der', type: 'spki' }))) {
    throw new Error('Containment command public and private keys do not match')
  }
  const canonicalPublicKey = publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
  return {
    privateKey,
    publicKey: canonicalPublicKey,
    keyFingerprint: createHash('sha256').update(canonicalPublicKey).digest('hex'),
  }
}

export function containmentCommandPayload(command) {
  return {
    action: command.action,
    commandId: command.id,
    deviceId: command.deviceId,
    expiresAt: command.expiresAt.toISOString(),
    incidentId: command.incidentId,
    issuedAt: command.approvedAt.toISOString(),
    leaseExpiresAt: command.leaseExpiresAt?.toISOString() || null,
    organizationId: command.organizationId,
    reason: command.reason,
  }
}

export function signContainmentCommand(command, privateKey) {
  const payload = containmentCommandPayload(command)
  const signature = sign(null, Buffer.from(canonicalJson(payload)), privateKey).toString('base64')
  return { payload, signature }
}
