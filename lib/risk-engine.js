export const RISK_SCORE_MIN = 0
export const RISK_SCORE_MAX = 100
export const STATUTORY_SCORE_FLOOR = 85

export const STATUTORY_BREACH_TYPES = Object.freeze([
  'DPDP_SEC8_CROSS_BORDER_VIOLATION',
  'DPDP_SEC9_CHILD_DATA_PROTECTION',
  'DPDP_SEC5_DEFECTIVE_NOTICE',
  'DPDP_SEC12_RETENTION_BREACH',
])

const STATUTORY_CONDITION_CODES = Object.freeze({
  unauthorizedTransfer: STATUTORY_BREACH_TYPES[0],
  unverifiedMinorData: STATUTORY_BREACH_TYPES[1],
  noticeOmission: STATUTORY_BREACH_TYPES[2],
  retentionLimitExceeded: STATUTORY_BREACH_TYPES[3],
})

const SEVERITY_THRESHOLDS = Object.freeze([
  { minimum: 80, severity: 'CRITICAL' },
  { minimum: 60, severity: 'HIGH' },
  { minimum: 35, severity: 'MEDIUM' },
  { minimum: 0, severity: 'LOW' },
])

function boundedInteger(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`)
  }
  return value
}

export function evaluateDeterministicRisk(factors, statutoryConditions = {}) {
  if (!Array.isArray(factors) || factors.length > 1000) {
    throw new TypeError('factors must be an array containing no more than 1000 entries')
  }
  if (!statutoryConditions || typeof statutoryConditions !== 'object' || Array.isArray(statutoryConditions)) {
    throw new TypeError('statutoryConditions must be an object')
  }

  const conditionNames = Object.keys(STATUTORY_CONDITION_CODES)
  for (const name of Object.keys(statutoryConditions)) {
    if (!conditionNames.includes(name)) throw new TypeError(`Unknown statutory condition: ${name}`)
  }
  for (const name of conditionNames) {
    if (statutoryConditions[name] !== undefined && typeof statutoryConditions[name] !== 'boolean') {
      throw new TypeError(`${name} must be a boolean`)
    }
  }

  const triggers = conditionNames
    .filter((name) => statutoryConditions[name] === true)
    .map((name) => STATUTORY_CONDITION_CODES[name])
  let rawScore = 0
  for (const [index, factor] of factors.entries()) {
    if (!factor || typeof factor !== 'object' || Array.isArray(factor)) {
      throw new TypeError(`factors[${index}] must be an object`)
    }
    if (typeof factor.vectorId !== 'string' || !factor.vectorId.trim() || factor.vectorId.length > 120) {
      throw new TypeError(`factors[${index}].vectorId must be a non-empty string of at most 120 characters`)
    }
    for (const [name, value, minimum, maximum] of [
      ['severity', factor.severity, 1, 10],
      ['assetCriticality', factor.assetCriticality, 1, 5],
      ['mitigationFactor', factor.mitigationFactor, 0, 1],
    ]) {
      if (!Number.isFinite(value) || value < minimum || value > maximum) {
        throw new RangeError(`factors[${index}].${name} must be a finite number from ${minimum} to ${maximum}`)
      }
    }
    rawScore += factor.severity * factor.assetCriticality * (1 - factor.mitigationFactor)
  }

  if (!Number.isFinite(rawScore)) throw new RangeError('Calculated risk score is not finite')
  if (triggers.length) {
    return { score: 100, clamped: false, statutoryOverrideActive: true, triggers }
  }
  const score = Math.min(RISK_SCORE_MAX, Math.max(RISK_SCORE_MIN, rawScore))
  return {
    score: Number(score.toFixed(2)),
    clamped: rawScore > RISK_SCORE_MAX || rawScore < RISK_SCORE_MIN,
    statutoryOverrideActive: false,
    triggers: [],
  }
}

export function riskSeverity(score) {
  if (!Number.isFinite(score) || score < RISK_SCORE_MIN || score > RISK_SCORE_MAX) {
    throw new RangeError(`score must be a finite number from ${RISK_SCORE_MIN} to ${RISK_SCORE_MAX}`)
  }
  return SEVERITY_THRESHOLDS.find((threshold) => score >= threshold.minimum).severity
}

export function scoreRisk({ likelihood, impact, exposure = 0, statutoryTrigger = false, statutoryReference = null }) {
  boundedInteger(likelihood, 'likelihood', 1, 5)
  boundedInteger(impact, 'impact', 1, 5)
  boundedInteger(exposure, 'exposure', 0, 5)
  if (typeof statutoryTrigger !== 'boolean') throw new TypeError('statutoryTrigger must be a boolean')
  if (statutoryTrigger && !String(statutoryReference || '').trim()) {
    throw new TypeError('A statutory reference is required for a statutory trigger')
  }

  const baseScore = Math.round(((likelihood * impact - 1) / 24) * 80 + (exposure / 5) * 20)
  const score = Math.max(RISK_SCORE_MIN, Math.min(
    RISK_SCORE_MAX,
    statutoryTrigger ? Math.max(baseScore, STATUTORY_SCORE_FLOOR) : baseScore,
  ))
  const severity = riskSeverity(score)

  return {
    score,
    baseScore,
    severity,
    statutoryTrigger,
    statutoryOverride: statutoryTrigger ? `Mandatory floor ${STATUTORY_SCORE_FLOOR}/100 applied` : null,
  }
}

export function calculateRosi({ aleBefore, aleAfter, treatmentCost }) {
  for (const [name, value] of Object.entries({ aleBefore, aleAfter, treatmentCost })) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite non-negative number`)
  }
  const avoidedLoss = Math.max(0, aleBefore - aleAfter)
  const rosi = treatmentCost === 0 ? (avoidedLoss > 0 ? null : 0) : ((avoidedLoss - treatmentCost) / treatmentCost) * 100
  return { avoidedLoss, rosi }
}
