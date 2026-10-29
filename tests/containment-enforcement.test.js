import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ENFORCEMENT_UNAVAILABLE,
  isEnforcementUnavailableAcknowledgment,
} from '../lib/containment-enforcement.js'

test('host enforcement acknowledgement has the declared unavailable status', () => {
  assert.equal(ENFORCEMENT_UNAVAILABLE, 'ENFORCEMENT_UNAVAILABLE')
  assert.equal(isEnforcementUnavailableAcknowledgment({
    status: 'FAILED',
    result: 'ENFORCEMENT_UNAVAILABLE',
  }), true)
  assert.equal(isEnforcementUnavailableAcknowledgment({
    status: 'APPLIED',
    result: 'ENFORCEMENT_UNAVAILABLE',
  }), false)
  assert.equal(isEnforcementUnavailableAcknowledgment({
    status: 'FAILED',
    result: 'HOST_ENFORCEMENT_NOT_CONFIGURED',
  }), false)
  assert.equal(isEnforcementUnavailableAcknowledgment({
    status: 'FAILED',
    result: 'ENFORCEMENT_UNAVAILABLE',
    applied: true,
  }), false)
})
