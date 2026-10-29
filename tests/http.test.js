import test from 'node:test'
import assert from 'node:assert/strict'
import { hasSameOrigin } from '../lib/origin.js'

test('same-origin validation uses the external host and forwarded protocol', () => {
  const request = new Request('http://localhost:3000/api/auth/login', {
    headers: {
      host: 'app.example.test',
      origin: 'https://app.example.test',
      'x-forwarded-proto': 'https',
    },
  })
  assert.equal(hasSameOrigin(request), true)
})

test('same-origin validation rejects cross-origin and malformed requests', () => {
  const crossOrigin = new Request('http://localhost:3000/api/auth/login', {
    headers: { host: 'app.example.test', origin: 'https://attacker.example' },
  })
  const missingOrigin = new Request('http://localhost:3000/api/auth/login', {
    headers: { host: 'app.example.test' },
  })
  const invalidProtocol = new Request('http://localhost:3000/api/auth/login', {
    headers: { host: 'app.example.test', origin: 'https://app.example.test', 'x-forwarded-proto': 'file' },
  })

  assert.equal(hasSameOrigin(crossOrigin), false)
  assert.equal(hasSameOrigin(missingOrigin), false)
  assert.equal(hasSameOrigin(invalidProtocol), false)
})
