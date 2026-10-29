import assert from 'node:assert/strict'
import test from 'node:test'
import { validateContainmentPolicy } from '../lib/containment-policy.js'

test('containment policy accepts a hostname, pinned addresses, and IPv4/IPv6 CIDRs', () => {
  const result = validateContainmentPolicy({
    controlPlaneHostname: 'IN-SOUTH-01.LUMERAVEGA.INTERNAL',
    pinnedControlPlaneIps: ['10.20.30.40', '2001:db8::1'],
    allowedManagementCidrs: ['10.20.30.0/24', '2001:db8:1::/48'],
  })
  assert.deepEqual(result, {
    valid: true,
    policy: {
      controlPlaneHostname: 'in-south-01.lumeravega.internal',
      pinnedControlPlaneIps: ['10.20.30.40', '2001:db8::1'],
      allowedManagementCidrs: ['10.20.30.0/24', '2001:db8:1::/48'],
    },
  })
})

test('containment policy rejects malformed values, duplicates, and unsupported fields', () => {
  const base = {
    controlPlaneHostname: 'control.example',
    pinnedControlPlaneIps: ['192.0.2.1'],
    allowedManagementCidrs: ['192.0.2.0/24'],
  }
  for (const input of [
    { ...base, controlPlaneHostname: 'https://control.example' },
    { ...base, pinnedControlPlaneIps: ['not-an-ip'] },
    { ...base, allowedManagementCidrs: ['192.0.2.0/33'] },
    { ...base, pinnedControlPlaneIps: ['192.0.2.1', '192.0.2.1'] },
    { ...base, enforcementEnabled: true },
  ]) {
    assert.equal(validateContainmentPolicy(input).valid, false)
  }
})

test('empty control-plane policy is allowed but remains an incomplete configuration', () => {
  assert.deepEqual(validateContainmentPolicy({
    controlPlaneHostname: '',
    pinnedControlPlaneIps: [],
    allowedManagementCidrs: [],
  }), {
    valid: true,
    policy: {
      controlPlaneHostname: '',
      pinnedControlPlaneIps: [],
      allowedManagementCidrs: [],
    },
  })
})
