import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function hexEqual(left, right) {
  if (!/^[\da-f]+$/i.test(left) || !/^[\da-f]+$/i.test(right)) return false
  const a = Buffer.from(left, 'hex')
  const b = Buffer.from(right, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function canonicalJson(value) {
  return stable(value)
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function signConsentEvidence(evidence, key, keyVersion) {
  if (!key || Buffer.byteLength(key) < 32) throw new Error('CONSENT_HMAC_KEY must contain at least 32 bytes')
  const canonical = canonicalJson(evidence)
  const evidenceHash = sha256(canonical)
  const signature = createHmac('sha256', key).update(`${keyVersion}.${evidenceHash}`).digest('hex')
  return { evidenceHash, signature, keyVersion }
}

export function generateConsentArtifact(evidence, key, keyVersion) {
  const timestamp = evidence?.consentedAt
  if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) {
    throw new TypeError('Consent evidence must contain a valid consentedAt timestamp')
  }
  const artifactId = randomUUID()
  const signedEvidence = signConsentEvidence(evidence, key, keyVersion)
  const receiptSignature = createHmac('sha256', key)
    .update(`${keyVersion}.${artifactId}.${signedEvidence.evidenceHash}.${timestamp}`)
    .digest('hex')
  return {
    artifactId,
    ...signedEvidence,
    receiptSignature,
  }
}

export function verifyArtifactIntegrity(artifactId, payloadHash, timestamp, providedSignature, key, keyVersion) {
  if (
    typeof artifactId !== 'string' ||
    typeof payloadHash !== 'string' ||
    !/^[\da-f]{64}$/i.test(payloadHash) ||
    typeof timestamp !== 'string' ||
    !Number.isFinite(Date.parse(timestamp)) ||
    typeof keyVersion !== 'string' ||
    typeof providedSignature !== 'string' ||
    !key ||
    Buffer.byteLength(key) < 32
  ) return false
  const expectedSignature = createHmac('sha256', key)
    .update(`${keyVersion}.${artifactId}.${payloadHash}.${timestamp}`)
    .digest('hex')
  return hexEqual(expectedSignature, providedSignature)
}

export function verifyConsentEvidence(evidence, artifact, key) {
  if (!artifact || !key || Buffer.byteLength(key) < 32) return false
  const actual = signConsentEvidence(evidence, key, artifact.keyVersion)
  return hexEqual(actual.evidenceHash, artifact.evidenceHash) && hexEqual(actual.signature, artifact.signature)
}

export function signAuditEvent(event, previousHash, key, keyVersion) {
  if (!key || Buffer.byteLength(key) < 32) throw new Error('AUDIT_HMAC_KEY must contain at least 32 bytes')
  const eventHash = sha256(canonicalJson({ previousHash, event }))
  const signature = createHmac('sha256', key).update(`${keyVersion}.${eventHash}`).digest('hex')
  return { previousHash, eventHash, signature, keyVersion }
}

export function verifyAuditEvent(event, record, key) {
  if (!record || !key) return false
  const expected = signAuditEvent(event, record.previousHash, key, record.keyVersion)
  return hexEqual(expected.eventHash, record.eventHash) && hexEqual(expected.signature, record.signature)
}
