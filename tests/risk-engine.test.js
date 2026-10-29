import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRosi, evaluateDeterministicRisk, riskSeverity, scoreRisk } from '../lib/risk-engine.js'

test('risk score stays in range and applies the statutory floor', () => {
  const minimum = scoreRisk({ likelihood: 1, impact: 1 })
  const maximum = scoreRisk({ likelihood: 5, impact: 5, exposure: 5 })
  const statutory = scoreRisk({ likelihood: 1, impact: 1, statutoryTrigger: true, statutoryReference: 'Rule 1' })
  assert.equal(minimum.score, 0)
  assert.equal(maximum.score, 100)
  assert.equal(statutory.score, 85)
  assert.equal(statutory.baseScore, 0)
  assert.equal(statutory.severity, 'CRITICAL')
})

test('risk score rejects invalid inputs and missing statutory references', () => {
  assert.throws(() => scoreRisk({ likelihood: 6, impact: 1 }), RangeError)
  assert.throws(() => scoreRisk({ likelihood: 3, impact: 3, statutoryTrigger: true }), TypeError)
})

test('vector evaluation adds mitigated exposure and clamps the result', () => {
  const result = evaluateDeterministicRisk([
    { vectorId: 'vulnerability-1', severity: 8, assetCriticality: 4, mitigationFactor: 0.5 },
    { vectorId: 'control-gap-1', severity: 3, assetCriticality: 2, mitigationFactor: 0.25 },
  ])
  assert.deepEqual(result, {
    score: 20.5,
    clamped: false,
    statutoryOverrideActive: false,
    triggers: [],
  })

  const clamped = evaluateDeterministicRisk([
    { vectorId: 'vector-a', severity: 10, assetCriticality: 5, mitigationFactor: 0 },
    { vectorId: 'vector-b', severity: 10, assetCriticality: 5, mitigationFactor: 0 },
    { vectorId: 'vector-c', severity: 10, assetCriticality: 5, mitigationFactor: 0 },
  ])
  assert.equal(clamped.score, 100)
  assert.equal(clamped.clamped, true)
  assert.equal(riskSeverity(clamped.score), 'CRITICAL')
})

test('vector evaluation applies the hard statutory override and validates inputs', () => {
  const result = evaluateDeterministicRisk([], { unauthorizedTransfer: true, noticeOmission: true })
  assert.deepEqual(result, {
    score: 100,
    clamped: false,
    statutoryOverrideActive: true,
    triggers: ['DPDP_SEC8_CROSS_BORDER_VIOLATION', 'DPDP_SEC5_DEFECTIVE_NOTICE'],
  })
  assert.throws(() => evaluateDeterministicRisk([{ vectorId: 'v', severity: 11, assetCriticality: 2, mitigationFactor: 0 }]), RangeError)
  assert.throws(() => evaluateDeterministicRisk([{ vectorId: 'v', severity: 1, assetCriticality: 2, mitigationFactor: 1.1 }]), RangeError)
  assert.throws(() => evaluateDeterministicRisk([], { unknown: true }), TypeError)
})

test('ROSI calculation handles no cost and rejects invalid amounts', () => {
  assert.deepEqual(calculateRosi({ aleBefore: 100, aleAfter: 40, treatmentCost: 20 }), { avoidedLoss: 60, rosi: 200 })
  assert.equal(calculateRosi({ aleBefore: 100, aleAfter: 40, treatmentCost: 0 }).rosi, null)
  assert.throws(() => calculateRosi({ aleBefore: -1, aleAfter: 0, treatmentCost: 0 }), RangeError)
})
