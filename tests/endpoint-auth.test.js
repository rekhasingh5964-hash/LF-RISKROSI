import test from 'node:test'
import assert from 'node:assert/strict'
import { hashEndpointToken, isEndpointArchitecture, isEndpointName, isEndpointVersion } from '../lib/endpoint-auth.js'

test('endpoint tokens are stored as deterministic SHA-256 digests', () => {
  const token = 'a'.repeat(64)
  const digest = hashEndpointToken(token)
  assert.match(digest, /^[\da-f]{64}$/)
  assert.equal(hashEndpointToken(token), digest)
  assert.notEqual(digest, token)
})

test('endpoint inventory fields accept bounded values and reject invalid input', () => {
  assert.equal(isEndpointName(' workstation-1 '), true)
  assert.equal(isEndpointName('  '), false)
  assert.equal(isEndpointName('x'.repeat(129)), false)
  assert.equal(isEndpointName('device\nname'), false)
  assert.equal(isEndpointArchitecture('amd64'), true)
  assert.equal(isEndpointArchitecture('amd64;command'), false)
  assert.equal(isEndpointVersion('0.1.0'), true)
  assert.equal(isEndpointVersion('0.1.0/release'), false)
})
