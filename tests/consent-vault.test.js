import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateConsentArtifact,
  signAuditEvent,
  signConsentEvidence,
  verifyArtifactIntegrity,
  verifyAuditEvent,
  verifyConsentEvidence,
} from '../lib/consent-vault.js'

const key = 'test-key-with-at-least-thirty-two-bytes'

test('consent evidence signing is canonical and detects tampering', () => {
  const evidence = { organizationId: 'tenant-1', choices: { analytics: false, security: true } }
  const reordered = { choices: { security: true, analytics: false }, organizationId: 'tenant-1' }
  const signed = signConsentEvidence(evidence, key, 'v1')
  assert.equal(verifyConsentEvidence(reordered, signed, key), true)
  assert.equal(verifyConsentEvidence({ ...evidence, organizationId: 'tenant-2' }, signed, key), false)
})

test('audit event signature binds the prior hash and event data', () => {
  const event = { organizationId: 'tenant-1', eventType: 'CONSENT_REVOKED' }
  const signed = signAuditEvent(event, 'previous-event', key, 'v1')
  assert.equal(verifyAuditEvent(event, signed, key), true)
  assert.equal(verifyAuditEvent({ ...event, eventType: 'CONSENT_GRANTED' }, signed, key), false)
  assert.notEqual(signAuditEvent(event, null, key, 'v1').eventHash, signed.eventHash)
})

test('consent receipt binds artifact ID, payload hash, and issuance timestamp', () => {
  const evidence = { principalRef: 'opaque-ref', consentedAt: '2026-10-28T12:00:00.000Z' }
  const receipt = generateConsentArtifact(evidence, key, 'v1')
  assert.match(receipt.artifactId, /^[\da-f-]{36}$/i)
  assert.equal(verifyArtifactIntegrity(
    receipt.artifactId, receipt.evidenceHash, evidence.consentedAt, receipt.receiptSignature, key, receipt.keyVersion,
  ), true)
  assert.equal(verifyArtifactIntegrity(
    receipt.artifactId, receipt.evidenceHash, '2026-10-28T12:00:01.000Z', receipt.receiptSignature, key, receipt.keyVersion,
  ), false)
  assert.equal(verifyArtifactIntegrity(
    'different-artifact', receipt.evidenceHash, evidence.consentedAt, receipt.receiptSignature, key, receipt.keyVersion,
  ), false)
})
