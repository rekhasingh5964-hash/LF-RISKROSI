import { probeHealth } from '../../lib/health-probe.js'

const url = process.argv[2]
if (!url) {
  console.error('Usage: node scripts/ops/probe-health.js <health-endpoint-url>')
  process.exitCode = 2
} else {
  try {
    const result = await probeHealth(url)
    console.log(JSON.stringify({ event: 'synthetic.health_probe', ...result }))
    if (!result.healthy) process.exitCode = 1
  } catch (error) {
    console.error(JSON.stringify({
      event: 'synthetic.health_probe',
      healthy: false,
      error: error.message,
    }))
    process.exitCode = 1
  }
}
