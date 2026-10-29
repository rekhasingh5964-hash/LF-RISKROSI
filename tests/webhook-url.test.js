import test from 'node:test'
import assert from 'node:assert/strict'
import { isPublicIp, validatePublicHttpsWebhookUrl } from '../lib/webhook-url.js'

test('webhook IP validation rejects local, reserved, and documentation addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.1.1', '192.0.2.10', '::1', 'fc00::1', '2001:db8::1']) {
    assert.equal(isPublicIp(address), false, `${address} should not be public`)
  }
  assert.equal(isPublicIp('8.8.8.8'), true)
  assert.equal(isPublicIp('2606:4700:4700::1111'), true)
})

test('webhook URL policy requires HTTPS and rejects non-public IP destinations', async () => {
  await assert.rejects(() => validatePublicHttpsWebhookUrl('http://8.8.8.8/hook'), /HTTPS/)
  await assert.rejects(() => validatePublicHttpsWebhookUrl('https://127.0.0.1/hook'), /public IP/)
  await assert.rejects(() => validatePublicHttpsWebhookUrl('https://user:pass@8.8.8.8/hook'), /credentials/)
  const endpoint = await validatePublicHttpsWebhookUrl('https://8.8.8.8/hook')
  assert.equal(endpoint.protocol, 'https:')
})
