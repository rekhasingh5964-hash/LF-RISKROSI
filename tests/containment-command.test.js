import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, verify } from 'node:crypto'
import test from 'node:test'
import { canonicalJson } from '../lib/consent-vault.js'
import { containmentCommandPayload, containmentCommandConfiguration, signContainmentCommand } from '../lib/containment-command.js'

function withCommandKeys(callback) {
  const original = {
    enabled: process.env.CONTAINMENT_COMMANDS_ENABLED,
    privateKey: process.env.CONTAINMENT_COMMAND_PRIVATE_KEY,
    publicKey: process.env.CONTAINMENT_COMMAND_PUBLIC_KEY,
  }
  const keys = generateKeyPairSync('ed25519')
  process.env.CONTAINMENT_COMMANDS_ENABLED = 'true'
  process.env.CONTAINMENT_COMMAND_PRIVATE_KEY = keys.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')
  process.env.CONTAINMENT_COMMAND_PUBLIC_KEY = keys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
  try {
    callback(keys)
  } finally {
    for (const [key, value] of Object.entries({
      CONTAINMENT_COMMANDS_ENABLED: original.enabled,
      CONTAINMENT_COMMAND_PRIVATE_KEY: original.privateKey,
      CONTAINMENT_COMMAND_PUBLIC_KEY: original.publicKey,
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('containment command is signed over its canonical tenant and device-bound payload', () => {
  withCommandKeys(({ publicKey }) => {
    const configuration = containmentCommandConfiguration()
    assert.equal(
      configuration.keyFingerprint,
      createHash('sha256').update(configuration.publicKey).digest('hex'),
    )
    const command = {
      id: 'command-1',
      organizationId: 'tenant-1',
      deviceId: 'device-1',
      incidentId: null,
      action: 'QUARANTINE',
      reason: 'Contain <safe> device & review',
      approvedAt: new Date('2026-10-28T08:00:00.000Z'),
      expiresAt: new Date('2026-10-28T08:05:00.000Z'),
      leaseExpiresAt: new Date('2026-10-28T10:00:00.000Z'),
    }
    const result = signContainmentCommand(command, configuration.privateKey)
    assert.deepEqual(result.payload, containmentCommandPayload(command))
    assert.equal(
      verify(null, Buffer.from(canonicalJson(result.payload)), publicKey, Buffer.from(result.signature, 'base64')),
      true,
    )
    assert.notEqual(result.payload.organizationId, 'another-tenant')
  })
})

test('command signing is disabled by default and rejects mismatched or non-Ed25519 keys', () => {
  const original = {
    enabled: process.env.CONTAINMENT_COMMANDS_ENABLED,
    privateKey: process.env.CONTAINMENT_COMMAND_PRIVATE_KEY,
    publicKey: process.env.CONTAINMENT_COMMAND_PUBLIC_KEY,
  }
  try {
    process.env.CONTAINMENT_COMMANDS_ENABLED = 'false'
    assert.equal(containmentCommandConfiguration(), null)
    const ed25519Keys = generateKeyPairSync('ed25519')
    const otherKeys = generateKeyPairSync('ed25519')
    process.env.CONTAINMENT_COMMANDS_ENABLED = 'true'
    process.env.CONTAINMENT_COMMAND_PRIVATE_KEY = ed25519Keys.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')
    process.env.CONTAINMENT_COMMAND_PUBLIC_KEY = otherKeys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    assert.throws(() => containmentCommandConfiguration(), /do not match/)

    const rsaKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })
    process.env.CONTAINMENT_COMMAND_PRIVATE_KEY = rsaKeys.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')
    process.env.CONTAINMENT_COMMAND_PUBLIC_KEY = rsaKeys.publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    assert.throws(() => containmentCommandConfiguration(), /must use Ed25519/)
  } finally {
    for (const [key, value] of Object.entries({
      CONTAINMENT_COMMANDS_ENABLED: original.enabled,
      CONTAINMENT_COMMAND_PRIVATE_KEY: original.privateKey,
      CONTAINMENT_COMMAND_PUBLIC_KEY: original.publicKey,
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
