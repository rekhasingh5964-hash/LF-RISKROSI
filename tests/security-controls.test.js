import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getControlStatus,
  IntegrationManager,
  registerControl,
  SECURITY_CONTROL_DEFINITIONS,
  toggleCapability,
} from '../lib/security-controls.js'

test('registry exposes supported tools as unconnected without fabricated health or telemetry', () => {
  assert.deepEqual(SECURITY_CONTROL_DEFINITIONS.map(({ id }) => id), [
    'wazuh', 'openvas', 'suricata', 'thehive',
  ])
  for (const definition of SECURITY_CONTROL_DEFINITIONS) {
    const control = registerControl(definition.id)
    assert.equal(control.status, 'NOT_CONNECTED')
    assert.equal(control.health, null)
    assert.equal(control.stats, null)
    assert.ok(control.capabilities.length > 0)
    assert.ok(control.capabilities.every(({ enabled }) => enabled === false))
  }
  assert.equal(registerControl({ id: 'wazuh', name: 'Untrusted override' }).name, 'Wazuh')
  assert.equal(IntegrationManager.getControlStatus('wazuh', []).status, 'NOT_CONNECTED')
})

test('capability preferences toggle only capabilities declared by their control', () => {
  const next = toggleCapability('wazuh', 'threat_detection', [], true)
  assert.deepEqual(next, ['threat_detection'])
  assert.deepEqual(toggleCapability('wazuh', 'integrity_monitoring', next, true), [
    'integrity_monitoring', 'threat_detection',
  ])
  assert.deepEqual(toggleCapability('wazuh', 'threat_detection', next, false), [])
  assert.equal(toggleCapability('wazuh', 'incident_workflow', [], true), null)
  assert.equal(toggleCapability('unknown', 'threat_detection', [], true), null)
})

test('status projection reflects saved preferences without claiming a live connector', () => {
  const control = getControlStatus('suricata', ['network_detection'])
  assert.equal(control.status, 'NOT_CONNECTED')
  assert.equal(control.capabilities.find(({ id }) => id === 'network_detection').enabled, true)
  assert.equal(control.stats, null)
})
