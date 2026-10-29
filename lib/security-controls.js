export const SECURITY_CONTROL_DEFINITIONS = [
  {
    id: 'wazuh',
    name: 'Wazuh',
    type: 'EDR',
    provider: 'Open Source',
    integrationMethod: 'API / webhook',
    capabilities: [
      { id: 'threat_detection', name: 'Threat detection' },
      { id: 'integrity_monitoring', name: 'File integrity monitoring' },
      { id: 'vulnerability_audit', name: 'Vulnerability audit' },
    ],
  },
  {
    id: 'openvas',
    name: 'OpenVAS',
    type: 'Scanner',
    provider: 'Open Source',
    integrationMethod: 'OMP / API',
    capabilities: [
      { id: 'vulnerability_scanning', name: 'Vulnerability scanning' },
      { id: 'asset_discovery', name: 'Asset discovery' },
    ],
  },
  {
    id: 'suricata',
    name: 'Suricata',
    type: 'IDS',
    provider: 'Open Source',
    integrationMethod: 'Log ingestion',
    capabilities: [
      { id: 'network_detection', name: 'Network intrusion detection' },
      { id: 'protocol_analysis', name: 'Protocol analysis' },
    ],
  },
  {
    id: 'thehive',
    name: 'TheHive',
    type: 'Case Management',
    provider: 'Open Source',
    integrationMethod: 'API',
    capabilities: [
      { id: 'case_synchronization', name: 'Case synchronization' },
      { id: 'incident_workflow', name: 'Incident workflow' },
    ],
  },
]

const definitionsById = new Map(SECURITY_CONTROL_DEFINITIONS.map((control) => [control.id, control]))

export function registerControl(config, enabledCapabilities = []) {
  const controlId = typeof config === 'string' ? config : config?.id
  const definition = definitionsById.get(controlId)
  if (!definition) return null
  const enabled = new Set(enabledCapabilities)
  return {
    ...definition,
    status: 'NOT_CONNECTED',
    health: null,
    stats: null,
    capabilities: definition.capabilities.map((capability) => ({
      ...capability,
      enabled: enabled.has(capability.id),
    })),
  }
}

export function toggleCapability(controlId, capabilityId, enabledCapabilities, enabled) {
  const definition = definitionsById.get(controlId)
  if (!definition || !definition.capabilities.some((capability) => capability.id === capabilityId)) return null
  const next = new Set(enabledCapabilities)
  if (enabled) next.add(capabilityId)
  else next.delete(capabilityId)
  return [...next].filter((id) => definition.capabilities.some((capability) => capability.id === id)).sort()
}

export function getControlStatus(controlId, enabledCapabilities) {
  return registerControl(controlId, enabledCapabilities)
}

export const IntegrationManager = Object.freeze({
  registerControl,
  toggleCapability,
  getControlStatus,
})
