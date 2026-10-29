import { calculateRosi } from '@/lib/risk-engine'

export const AI_ENGINE_ROLES = Object.freeze({
  LUMA: 'Context assembly, explainable recommendations, and compliance mapping interfaces',
  LF_SECURITY_AI: 'Deterministic threat weighting, vulnerability analysis, and exposure scoring',
  LUMAVEGA: 'Monte Carlo loss-distribution and security-investment scenario modelling',
})

export function summarizeTelemetry(findings) {
  return findings.map((finding) => ({
    id: finding.id,
    category: finding.category,
    severity: finding.severity,
    score: finding.score,
    statutoryTrigger: finding.statutoryTrigger,
  })).sort((a, b) => b.score - a.score)
}

export function runRosiSimulation({ aleBefore, aleAfter, treatmentCost, runs = 10000 }) {
  if (!Number.isInteger(runs) || runs < 100 || runs > 100000) throw new RangeError('runs must be between 100 and 100000')
  const base = calculateRosi({ aleBefore, aleAfter, treatmentCost })
  const samples = []
  for (let index = 0; index < runs; index += 1) {
    const lossReduction = Math.max(0, (aleBefore - aleAfter) * (0.75 + Math.random() * 0.5))
    const cost = treatmentCost * (0.9 + Math.random() * 0.2)
    samples.push(cost === 0 ? 0 : ((lossReduction - cost) / cost) * 100)
  }
  samples.sort((a, b) => a - b)
  return {
    ...base,
    runs,
    p5: samples[Math.floor((runs - 1) * 0.05)],
    p50: samples[Math.floor((runs - 1) * 0.5)],
    p95: samples[Math.floor((runs - 1) * 0.95)],
    engine: 'LUMAVEGA',
    model: 'Illustrative uniform uncertainty; not a calibrated forecast',
  }
}
