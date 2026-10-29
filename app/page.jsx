'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Activity, ArrowDownRight, ArrowUpRight, Building2, Check, ChevronDown,
  ClipboardList, Copy, ExternalLink, Gauge, HelpCircle, LayoutDashboard,
  Laptop, LogOut, Network, PlugZap, Plus, Search, Shield, ShieldAlert, Users, X,
} from 'lucide-react'

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.tenantId) headers.set('X-Tenant-ID', options.tenantId)
  if (options.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload.data
}

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()
}

function Modal({ title, children, close }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="eyebrow">LUMERAVEGA · SMB IN BOX</span><h2>{title}</h2></div><button className="icon-button" onClick={close} aria-label="Close"><X size={18} /></button></div>{children}</section></div>
}

function RiskTable({ risks, showTenant }) {
  if (!risks.length) return <div className="empty-state">No risks to display.</div>
  return <div className="table-scroll"><table className="risk-table"><thead><tr>{showTenant && <th>CUSTOMER</th>}<th>RISK</th><th>SEVERITY</th><th>SCORE</th><th>STATUS</th><th>OWNER</th></tr></thead><tbody>
    {risks.map((risk) => <tr key={risk.id}>{showTenant && <td>{risk.organization?.name || 'Customer'}</td>}<td><strong>{risk.name}</strong><div className="risk-meta">{risk.category} · L{risk.likelihood}/I{risk.impact}{risk.statutoryTrigger ? ` · ${risk.statutoryReference}` : ''}</div></td><td><span className={`severity severity-${risk.severity.toLowerCase()}`}>{risk.severity}</span></td><td><div className="score-cell"><div className="score-track"><span style={{ width: `${risk.score}%` }} /></div><strong>{risk.score}</strong></div></td><td>{risk.status.replaceAll('_', ' ')}</td><td>{risk.owner || 'Unassigned'}</td></tr>)}
  </tbody></table></div>
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [tenants, setTenants] = useState([])
  const [tenantId, setTenantId] = useState('')
  const [summary, setSummary] = useState(null)
  const [risks, setRisks] = useState([])
  const [endpoints, setEndpoints] = useState([])
  const [telemetryEvents, setTelemetryEvents] = useState([])
  const [incidents, setIncidents] = useState([])
  const [commercial, setCommercial] = useState({ plans: [], subscriptions: [], partners: [] })
  const [securityControls, setSecurityControls] = useState([])
  const [securityControlsLoading, setSecurityControlsLoading] = useState(false)
  const [containmentPolicy, setContainmentPolicy] = useState({
    controlPlaneHostname: '',
    pinnedControlPlaneIps: [],
    allowedManagementCidrs: [],
    heartbeatDeadlineSeconds: 180,
    enforcementEnabled: false,
    updatedAt: null,
    updatedBy: null,
  })
  const [page, setPage] = useState('dashboard')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [riskOpen, setRiskOpen] = useState(false)
  const [incidentOpen, setIncidentOpen] = useState(false)
  const [partnerOpen, setPartnerOpen] = useState(false)
  const [tenantOpen, setTenantOpen] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const [createdEnrollmentToken, setCreatedEnrollmentToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const isMssp = user?.role?.startsWith('MSSP_') || user?.role === 'SUPER_ADMIN'
  const canManageContainmentPolicy = ['MSSP_ADMIN', 'SUPER_ADMIN'].includes(user?.role)
  const canWrite = ['MSSP_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER'].includes(user?.role)
  const activeTenant = useMemo(() => tenants.find((tenant) => tenant.id === tenantId), [tenantId, tenants])
  const isAll = tenantId === 'all'

  async function loadData(id = tenantId) {
    if (!user || !id) return
    setLoading(true)
    setError('')
    try {
      const [dashboard, riskRows, endpointRows, eventRows, incidentRows, commercialData] = await Promise.all([
        api('/api/dashboard', { tenantId: id }),
        api('/api/risks', { tenantId: id }),
        api('/api/endpoints', { tenantId: id }),
        api('/api/endpoints/telemetry', { tenantId: id }),
        api('/api/incidents', { tenantId: id }),
        api('/api/commercial', { tenantId: id }),
      ])
      setSummary(dashboard)
      setRisks(riskRows)
      setEndpoints(endpointRows)
      setTelemetryEvents(eventRows)
      setIncidents(incidentRows)
      setCommercial(commercialData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function requestContainment(incident, action) {
    const reason = window.prompt(`Explain why ${action === 'QUARANTINE' ? 'quarantine' : 'release'} is requested (required, max 300 characters):`)
    if (reason === null) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/incidents/${encodeURIComponent(incident.id)}/containment`, {
        method: 'POST',
        tenantId,
        body: JSON.stringify({ action, reason }),
      })
      setNotice('Containment request recorded. A different administrator must approve it; this workflow does not isolate the host.')
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function decideContainment(command, decision) {
    const note = window.prompt(`Add an audit note for ${decision.toLowerCase()} (required, max 300 characters):`)
    if (note === null) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/containment/${encodeURIComponent(command.id)}/approval`, {
        method: 'POST',
        tenantId,
        body: JSON.stringify({ decision, note }),
      })
      setNotice(decision === 'APPROVE'
        ? 'Request approved. The signed agent workflow does not perform host enforcement.'
        : 'Containment request rejected and recorded.')
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function loadProfile() {
    try {
      const profile = await api('/api/auth/me')
      setUser(profile.user)
      setTenants(profile.tenants)
      setTenantId(profile.selectedTenantId)
    } catch {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (user && tenantId) loadData(tenantId) }, [user, tenantId])
  useEffect(() => {
    if (!user || page !== 'containment-policy' || !canManageContainmentPolicy) return
    api('/api/admin/containment-policy')
      .then(setContainmentPolicy)
      .catch((err) => setError(err.message))
  }, [user, page, canManageContainmentPolicy])
  useEffect(() => {
    if (!user || page !== 'security-controls' || !tenantId) return
    setSecurityControlsLoading(true)
    api('/api/security-controls', { tenantId })
      .then(setSecurityControls)
      .catch((err) => setError(err.message))
      .finally(() => setSecurityControlsLoading(false))
  }, [user, page, tenantId])
  useEffect(() => {
    setCreatedEnrollmentToken(null)
    setTelemetryEvents([])
  }, [tenantId])

  async function handleLogin(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      setUser(result.user)
      setTenants(result.tenants)
      setTenantId(result.selectedTenantId)
      setNotice(`Welcome, ${result.user.name}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { /* Clear the local view if the session expired. */ }
    setUser(null)
    setSummary(null)
    setRisks([])
    setEndpoints([])
    setTelemetryEvents([])
    setIncidents([])
    setCommercial({ plans: [], subscriptions: [], partners: [] })
    setCreatedEnrollmentToken(null)
  }

  async function addRisk(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await api('/api/risks', {
        method: 'POST',
        tenantId,
        body: JSON.stringify({
          name: form.get('name'), category: form.get('category'), owner: form.get('owner'),
          description: form.get('description'), likelihood: Number(form.get('likelihood')),
          impact: Number(form.get('impact')), exposure: Number(form.get('exposure')),
          statutoryTrigger: form.get('statutoryTrigger') === 'on',
          statutoryReference: form.get('statutoryReference'),
        }),
      })
      setRiskOpen(false)
      setNotice('Risk recorded. Score and any statutory override were calculated by the server.')
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function addTenant(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const created = await api('/api/tenants', {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name'), industry: form.get('industry'), adminEmail: form.get('adminEmail') }),
      })
      setTenants((current) => [...current.filter((tenant) => tenant.id !== 'all'), created.tenant, ...current.filter((tenant) => tenant.id === 'all')])
      setCreatedCredentials(created)
      setTenantOpen(false)
      setNotice('Customer tenant created. Securely share its one-time password.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function issueEndpointEnrollmentToken() {
    setBusy(true)
    setError('')
    try {
      const result = await api('/api/endpoints', { method: 'POST', tenantId })
      setCreatedEnrollmentToken(result)
      setNotice('One-time enrollment token created. It is shown only once and expires in 30 minutes.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function revokeEndpoint(endpoint) {
    if (!window.confirm(`Revoke endpoint access for "${endpoint.name}"? Its next heartbeat will be rejected.`)) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/endpoints/${encodeURIComponent(endpoint.id)}`, { method: 'DELETE', tenantId })
      setEndpoints((current) => current.map((item) => item.id === endpoint.id ? { ...item, active: false } : item))
      setNotice(`Access revoked for ${endpoint.name}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function reportIncident(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await api('/api/incidents', {
        method: 'POST',
        tenantId,
        body: JSON.stringify({
          deviceId: form.get('deviceId'),
          category: form.get('category'),
          severity: form.get('severity'),
          summary: form.get('summary'),
          firstObservedAt: new Date(form.get('firstObservedAt')).toISOString(),
        }),
      })
      setIncidentOpen(false)
      setNotice('Incident recorded. The displayed six-hour timer is an operational readiness aid, not a filing or compliance determination.')
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function closeIncident(incident, status) {
    const resolutionNote = window.prompt(`Add an audit note for ${status === 'FALSE_POSITIVE' ? 'marking this incident as a false positive' : 'resolving this incident'} (required, max 500 characters):`)
    if (resolutionNote === null) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/incidents/${encodeURIComponent(incident.id)}`, {
        method: 'PATCH',
        tenantId,
        body: JSON.stringify({ status, resolutionNote }),
      })
      setNotice(`Incident ${status === 'FALSE_POSITIVE' ? 'marked false positive' : 'resolved'} with an audit note.`)
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function exportIncidentEvidence() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/incidents/export', {
        headers: { 'X-Tenant-ID': tenantId },
        credentials: 'same-origin',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Export failed (${response.status})`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'lumera-smb-incident-evidence.csv'
      link.click()
      URL.revokeObjectURL(url)
      setNotice('Tenant evidence CSV downloaded. The export is bounded to the selected customer.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function createPartner(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await api('/api/commercial', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_partner',
          name: form.get('name'),
          contactEmail: form.get('contactEmail'),
          marginBasisPoints: Number(form.get('marginBasisPoints')),
        }),
      })
      setPartnerOpen(false)
      setNotice('Channel partner profile created. This does not activate payments or commissions.')
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function assignPartner(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await api('/api/commercial', {
        method: 'POST',
        body: JSON.stringify({
          action: 'assign_partner',
          partnerId: form.get('partnerId'),
          customerOrganizationId: form.get('customerOrganizationId'),
        }),
      })
      setNotice('Customer partner attribution updated.')
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function setSubscription(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await api('/api/commercial', {
        method: 'POST',
        body: JSON.stringify({
          action: 'set_subscription',
          customerOrganizationId: form.get('customerOrganizationId'),
          tier: form.get('tier'),
          status: form.get('status'),
        }),
      })
      setNotice('Subscription record updated as commercial metadata. No payment was collected and no entitlement is enforced.')
      await loadData(tenantId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveContainmentPolicy(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const saved = await api('/api/admin/containment-policy', {
        method: 'PUT',
        body: JSON.stringify({
          controlPlaneHostname: form.get('controlPlaneHostname'),
          pinnedControlPlaneIps: String(form.get('pinnedControlPlaneIps'))
            .split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
          allowedManagementCidrs: String(form.get('allowedManagementCidrs'))
            .split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
        }),
      })
      setContainmentPolicy(saved)
      setNotice('Containment network policy saved. It is not applied to endpoints; host enforcement remains disabled.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function triggerKillSwitch() {
    if (!window.confirm('Pause all consent-based processing for this customer and queue downstream erasure requests?')) return
    setBusy(true)
    try {
      const result = await api('/api/privacy/kill-switch', { method: 'POST', tenantId })
      setNotice(`Processing paused. ${result.queued} downstream erasure deliveries queued.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateSecurityControlCapability(control, capability, enabled) {
    setBusy(true)
    setError('')
    try {
      const saved = await api('/api/security-controls', {
        method: 'PATCH',
        tenantId,
        body: JSON.stringify({
          controlId: control.id,
          capabilityId: capability.id,
          enabled,
        }),
      })
      setSecurityControls((current) => current.map((item) =>
        item.id === control.id && item.organizationId === control.organizationId
          ? { ...item, ...saved }
          : item,
      ))
      setNotice('Capability preference saved. No connector is configured and no security events are being received.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const providerAdmin = user?.role === 'MSSP_ADMIN'
  const canManageEndpoints = ['MSSP_ADMIN', 'TENANT_ADMIN'].includes(user?.role) && !isAll
  const canManageIncidents = ['MSSP_ADMIN', 'TENANT_ADMIN'].includes(user?.role) && !isAll
  const canManageSecurityControls = ['MSSP_ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(user?.role) && !isAll
  const navigation = [
    { id: 'dashboard', title: 'Portfolio overview', icon: LayoutDashboard },
    { id: 'risks', title: 'Risk register', icon: ShieldAlert },
    { id: 'endpoints', title: 'Endpoint inventory', icon: Laptop },
    { id: 'incidents', title: 'Incident readiness', icon: ShieldAlert },
    { id: 'security-controls', title: 'Security integrations', icon: PlugZap },
    ...(isMssp ? [{ id: 'commercial', title: 'Partner & plans', icon: Users }] : []),
    ...(isMssp ? [{ id: 'customers', title: 'Customer tenants', icon: Building2 }] : []),
    ...(canManageContainmentPolicy ? [{ id: 'containment-policy', title: 'Containment policy', icon: Network }] : []),
    { id: 'privacy', title: 'Privacy controls', icon: Shield },
  ]
  const visibleRisks = risks.filter((risk) => `${risk.name} ${risk.category} ${risk.organization?.name || ''}`.toLowerCase().includes(search.toLowerCase()))

  if (!user) return <main className="login-page"><section className="login-panel">
    <div className="brand-lockup"><Image src="/icon.png" alt="" width={38} height={38} priority /><span className="brand-copy"><strong>LumeraVega</strong><small>SMB IN BOX</small></span></div>
    <div className="eyebrow">SECURITY &amp; COMPLIANCE OPERATIONS</div>
    <h1>One trusted view.<br /><span>Clearer next steps.</span></h1>
    <p className="copy">Risk, privacy, and security governance workflows for Indian MSMEs and the CA and MSP partners who support them.</p>
    <form className="form-stack" onSubmit={handleLogin}><label>Work email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <div className="alert error">{error}</div>}<button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowUpRight size={16} /></button></form>
    <p className="hint">Local demo credentials are printed once in the app container logs during initial setup.</p>
    <p className="engine-credit">Risk and audit foundation: <strong>LF-RISKROSI</strong></p>
  </section><aside className="login-aside"><div className="eyebrow">LUMERAVEGA SMB IN BOX</div><h2>Built for MSMEs.<br />Ready for partner delivery.</h2><p>Tenant-scoped risk and privacy workflows designed to support CA, auditor, and managed-service partner operations.</p><div className="aside-kpis"><span><strong>PARTNER</strong>CA &amp; MSP channel</span><span><strong>INDIA</strong>Deployment configured by operator</span><span><strong>DPDP</strong>Workflow support</span></div><p className="aside-disclaimer">Regional defaults are metadata only; they do not establish hosting location, certification, or compliance.</p></aside></main>

  return <div className="app-shell"><aside className="sidebar">
    <div className="brand-lockup"><Image src="/icon.png" alt="" width={34} height={34} /><span className="brand-copy"><strong>LumeraVega</strong><small>SMB IN BOX</small></span></div>
    <div className="provider-badge"><span /> PARTNER CONTROL PLANE</div>
    <div className="nav-caption">WORKSPACE</div>
    <nav>{navigation.map(({ id, title, icon: Icon }) => <button key={id} onClick={() => setPage(id)} className={`nav-item ${page === id ? 'selected' : ''}`}><Icon size={17} />{title}{id === 'customers' && <span className="count">{tenants.filter((tenant) => tenant.id !== 'all').length}</span>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="help"><HelpCircle size={16} /><div><strong>Governance guide</strong><small>Workflows and audit trail</small></div><ExternalLink size={13} /></div><div className="user-chip"><span className="avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.role.replaceAll('_', ' ')}</small></div><button onClick={logout} aria-label="Sign out"><LogOut size={15} /></button></div></div>
  </aside>
  <main className="main-panel"><header className="topbar"><div className="breadcrumb">SMB IN BOX <span>·</span> <b>{page.toUpperCase()}</b></div><div className="top-actions"><label className="tenant-select"><Building2 size={15} /><select aria-label="Select tenant" value={tenantId} onChange={(event) => setTenantId(event.target.value)}>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select><ChevronDown size={14} /></label><span className="avatar top-avatar">{initials(user.name)}</span></div></header>
    <section className="content"><div className="page-heading"><div><div className="eyebrow">{isMssp ? 'MANAGED SECURITY PORTFOLIO' : 'CUSTOMER SECURITY WORKSPACE'}</div><h1>{page === 'dashboard' ? 'Portfolio overview' : page === 'risks' ? 'Risk register' : page === 'endpoints' ? 'Endpoint inventory' : page === 'incidents' ? 'Incident readiness' : page === 'security-controls' ? 'Security integrations' : page === 'commercial' ? 'Partner & plans' : page === 'customers' ? 'Customer tenants' : page === 'containment-policy' ? 'Containment policy' : 'Privacy controls'}</h1><p>{page === 'dashboard' ? 'Prioritized risk and investment signals across managed organizations.' : page === 'risks' ? 'Scores are calculated server-side with statutory override precedence.' : page === 'endpoints' ? 'Enrolled Windows and Linux devices with basic inventory and heartbeat status.' : page === 'incidents' ? 'Record incidents, track readiness deadlines, and preserve operator decisions.' : page === 'security-controls' ? 'Review supported security-control integrations and configure capability preferences.' : page === 'commercial' ? 'Track proposed partner attribution and manual subscription records.' : page === 'customers' ? 'Onboard organizations below the provider boundary.' : page === 'containment-policy' ? 'Configure proposed control-plane and management network values. These settings are stored only and do not change endpoint firewalls.' : 'Consent records, processing control, and downstream erasure status.'}</p></div>
      {page === 'risks' && canWrite && !isAll && <button className="primary" onClick={() => setRiskOpen(true)}><Plus size={16} /> Add risk</button>}
      {page === 'endpoints' && canManageEndpoints && <button className="primary" onClick={issueEndpointEnrollmentToken} disabled={busy}><Plus size={16} /> Enroll endpoint</button>}
      {page === 'incidents' && canManageIncidents && endpoints.some((endpoint) => endpoint.active) && <button className="primary" onClick={() => setIncidentOpen(true)} disabled={busy}><Plus size={16} /> Record incident</button>}
      {page === 'incidents' && tenantId && tenantId !== 'all' && <button className="secondary-button" onClick={exportIncidentEvidence} disabled={busy}>Export evidence CSV</button>}
      {page === 'commercial' && providerAdmin && <button className="primary" onClick={() => setPartnerOpen(true)} disabled={busy}><Plus size={16} /> Add channel partner</button>}
      {page === 'customers' && providerAdmin && <button className="primary" onClick={() => setTenantOpen(true)}><Plus size={16} /> Add customer</button>}
      {page === 'privacy' && canWrite && !isAll && <button className="danger-button" onClick={triggerKillSwitch} disabled={busy}><ShieldAlert size={16} /> Global kill-switch</button>}
    </div>
    {(error || notice) && <div className={`alert ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error || notice}<button onClick={() => { setError(''); setNotice('') }} aria-label="Dismiss"><X size={15} /></button></div>}
    {loading && <div className="loading">Loading tenant-scoped data…</div>}
    {!loading && summary && page === 'dashboard' && <>
      <div className="stats-grid">
        <Stat label={isMssp && isAll ? 'Customer tenants' : 'Selected workspace'} value={isMssp && isAll ? summary.tenantCount : activeTenant?.name} note={isMssp && isAll ? 'Active customer organizations' : 'Explicit tenant boundary'} icon={Building2} />
        <Stat label="Tracked risks" value={summary.totalRisks} note={`${summary.openRisks} open findings`} icon={ClipboardList} tone="violet" />
        <Stat label="Critical / high" value={`${summary.criticalRisks} / ${summary.highRisks}`} note="Triage and assign treatment" icon={ShieldAlert} tone="red" />
        <Stat label="Average ROSI" value={`${summary.avgRosi}%`} note="Illustrative risk-reduction estimate" icon={Gauge} tone="green" />
      </div>
      <div className="columns"><section className="panel"><div className="panel-title"><div><h2>{isAll ? 'Customer portfolio' : 'Risk posture'}</h2><p>{isAll ? 'Risk signals grouped by organization' : 'Explainable, bounded score index'}</p></div><Activity size={18} /></div>
        {isAll ? <div className="portfolio">{summary.portfolio.map((tenant) => <button key={tenant.id} onClick={() => setTenantId(tenant.id)}><span className="customer-mark">{initials(tenant.name)}</span><span><strong>{tenant.name}</strong><small>{tenant.industry} · {tenant.riskCount} risks</small></span><i>{tenant.critical} critical</i><ArrowUpRight size={15} /></button>)}</div> : <div className="posture"><strong>{summary.postureScore}<small>/100</small></strong><span>Calculated from open severity, treatment status, and mandatory-control triggers. This is a prioritization signal, not a certification.</span></div>}
      </section><section className="panel"><div className="panel-title"><div><h2>Priority attention</h2><p>Highest scoring open risks</p></div><button className="text-button" onClick={() => setPage('risks')}>All risks <ArrowUpRight size={14} /></button></div><RiskTable risks={[...risks].sort((a, b) => b.score - a.score).slice(0, 4)} showTenant={isAll} /></section></div>
    </>}
    {!loading && page === 'risks' && <section className="panel"><div className="table-tools"><label><Search size={15} /><input placeholder="Search risks and organizations" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span><Shield size={14} /> {isAll ? 'MSSP portfolio scope' : activeTenant?.name}</span></div><RiskTable risks={visibleRisks} showTenant={isAll} /></section>}
    {!loading && page === 'endpoints' && <>
      <section className="panel"><div className="panel-title"><div><h2>Enrolled devices</h2><p>Basic host inventory and five-minute check-ins. The agent reports its own lifecycle and heartbeat transitions only.</p></div><Laptop size={18} /></div>{!endpoints.length ? <div className="empty-state">No endpoints enrolled for this tenant.</div> : <div className="table-scroll"><table className="risk-table"><thead><tr>{isAll && <th>CUSTOMER</th>}<th>DEVICE</th><th>PLATFORM</th><th>AGENT</th><th>LAST CHECK-IN</th><th>ACCESS</th>{canManageEndpoints && <th>ACTION</th>}</tr></thead><tbody>{endpoints.map((endpoint) => <tr key={endpoint.id}>{isAll && <td>{endpoint.organization?.name || 'Customer'}</td>}<td><strong>{endpoint.name}</strong><div className="risk-meta">{endpoint.id}</div></td><td>{endpoint.operatingSystem} · {endpoint.architecture}</td><td>{endpoint.agentVersion}</td><td>{endpoint.lastSeenAt ? new Date(endpoint.lastSeenAt).toLocaleString() : 'Never'}</td><td>{endpoint.active ? 'Enabled' : 'Revoked'}</td>{canManageEndpoints && <td>{endpoint.active && <button className="text-button" disabled={busy} onClick={() => revokeEndpoint(endpoint)}>Revoke</button>}</td>}</tr>)}</tbody></table></div>}</section>
      <section className="panel"><div className="panel-title"><div><h2>Recent agent events</h2><p>Operational lifecycle telemetry only; no OS security logs, process data, threat detection, or isolation. Events expire 180 days after receipt.</p></div><Activity size={18} /></div>{!telemetryEvents.length ? <div className="empty-state">No agent lifecycle events have been received.</div> : <div className="table-scroll"><table className="risk-table"><thead><tr>{isAll && <th>CUSTOMER</th>}<th>DEVICE</th><th>EVENT</th><th>DETAIL</th><th>OCCURRED</th><th>RECEIVED</th></tr></thead><tbody>{telemetryEvents.map((event) => <tr key={event.id}>{isAll && <td>{event.organization?.name || 'Customer'}</td>}<td><strong>{event.device.name}</strong><div className="risk-meta">{event.deviceId}</div></td><td>{event.eventType.replaceAll('_', ' ')}</td><td>{event.details.failureClass ? `Failure class: ${event.details.failureClass}` : '—'}</td><td>{new Date(event.occurredAt).toLocaleString()}</td><td>{new Date(event.receivedAt).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>
    </>}
    {!loading && page === 'incidents' && <section className="panel">
      <div className="panel-title"><div><h2>Incident register</h2><p>Manually reported endpoint incidents and operational readiness timers.</p></div><ShieldAlert size={18} /></div>
      <div className="privacy-note"><strong>Containment workflow only — no host isolation</strong><span>Signed workflow delivery is disabled by default. When enabled, requests require a different administrator's approval and an endpoint enrolled with the active verification key. The current agent deliberately reports enforcement unavailable; no firewall, process, or network changes are made. Autonomous detection, MFA-backed approval, and privileged WFP/nftables enforcement are not implemented.</span></div>
      {!incidents.length ? <div className="empty-state">No incidents recorded for this tenant.</div> : <div className="table-scroll"><table className="risk-table"><thead><tr>{isAll && <th>CUSTOMER</th>}<th>INCIDENT</th><th>DEVICE</th><th>SEVERITY</th><th>STATUS</th><th>REPORTING TIMER</th>{canManageIncidents && <th>ACTION</th>}</tr></thead><tbody>{incidents.map((incident) => {
        const remainingMs = new Date(incident.reportingDeadlineAt).getTime() - Date.now()
        const timer = incident.status === 'RESOLVED' || incident.status === 'FALSE_POSITIVE'
          ? 'Closed'
          : remainingMs <= 0
            ? 'Deadline passed'
            : `${Math.floor(remainingMs / 3600000)}h ${Math.floor((remainingMs % 3600000) / 60000)}m remaining`
        const canClose = ['OPEN', 'CONTAINED', 'MONITORING'].includes(incident.status)
        const activeCommand = incident.containmentCommands?.find((command) => ['PENDING', 'APPROVED', 'DELIVERED'].includes(command.status))
        return <tr key={incident.id}>{isAll && <td>{incident.organization?.name || 'Customer'}</td>}<td><strong>{incident.summary}</strong><div className="risk-meta">{incident.category.replaceAll('_', ' ')} · Reported {new Date(incident.reportedAt).toLocaleString()}{incident.containmentCommands?.map((command) => <span key={command.id}> · {command.action} {command.status}{command.result ? ` — ${command.result}` : ''}</span>)}</div></td><td>{incident.device.name}</td><td><span className={`severity severity-${incident.severity.toLowerCase()}`}>{incident.severity}</span></td><td>{incident.status.replaceAll('_', ' ')}</td><td>{timer}</td>{canManageIncidents && <td>{canClose && <>{incident.status === 'OPEN' && !activeCommand && <button className="text-button" disabled={busy} onClick={() => requestContainment(incident, 'QUARANTINE')}>Request quarantine</button>}{incident.status === 'CONTAINED' && !activeCommand && <button className="text-button" disabled={busy} onClick={() => requestContainment(incident, 'RELEASE')}>Request release</button>}{activeCommand?.status === 'PENDING' && activeCommand.requestedById !== user.id && <><button className="text-button" disabled={busy} onClick={() => decideContainment(activeCommand, 'APPROVE')}>Approve</button><button className="text-button" disabled={busy} onClick={() => decideContainment(activeCommand, 'REJECT')}>Reject</button></>}{canClose && <><button className="text-button" disabled={busy} onClick={() => closeIncident(incident, 'RESOLVED')}>Resolve</button><button className="text-button" disabled={busy} onClick={() => closeIncident(incident, 'FALSE_POSITIVE')}>False positive</button></>}</>}</td>}</tr>
      })}</tbody></table></div>}
      <p className="hint">The six-hour timer is an incident-readiness aid only. It does not determine reportability, prepare a statutory filing, or guarantee a reporting deadline.</p>
      <button className="secondary-button" onClick={() => api('/api/incidents/audit/verify', { tenantId }).then((result) => setNotice(`Containment audit chain: ${result.valid ? 'VALID' : 'INVALID'} · ${result.checked} events checked`)).catch((err) => setError(err.message))}>Verify incident audit chain</button>
    </section>}
    {!loading && page === 'security-controls' && <div className="security-control-grid">
      <div className="privacy-note security-controls-note"><strong>Registry only — no live integrations</strong><span>Capability selections are saved as configuration preferences. No connector credentials, event ingestion, scans, alert synchronization, or live health checks are configured. Every listed control remains NOT CONNECTED.</span></div>
      {securityControlsLoading ? <div className="loading">Loading security-control registry…</div> : securityControls.map((control) => <section className="panel security-control-card" key={`${control.organizationId}:${control.id}`}>
        <div className="panel-title"><div><h2>{control.name}</h2><p>{control.type} · {control.provider} · {control.integrationMethod}</p>{isAll && <p>Customer: {control.organizationName}</p>}</div><span className="control-status">{control.status.replaceAll('_', ' ')}</span></div>
        <div className="capability-list">{control.capabilities.map((capability) => <label key={capability.id} className="capability-option"><span><strong>{capability.name}</strong><small>{capability.id}</small></span><input type="checkbox" checked={capability.enabled} disabled={!canManageSecurityControls || busy} onChange={(event) => updateSecurityControlCapability(control, capability, event.target.checked)} /></label>)}</div>
        <p className="hint">Health and alert statistics are unavailable until a verified connector is implemented and configured.</p>
      </section>)}
      {!securityControlsLoading && !securityControls.length && <div className="empty-state">No customer tenants are available in this scope.</div>}
    </div>}
    {!loading && page === 'containment-policy' && canManageContainmentPolicy && <section className="panel">
      <div className="panel-title"><div><h2>Global endpoint safety policy</h2><p>Editable by provider administrators and platform super administrators.</p></div><Network size={18} /></div>
      <div className="privacy-note"><strong>Configuration only — enforcement disabled</strong><span>Values below are validated and audited but are not sent to agents or installed as firewall rules. The 180-second watchdog has no active rollback adapter until supported, privileged Windows/Linux enforcement is separately implemented and verified.</span></div>
      <form key={containmentPolicy.updatedAt || 'unconfigured'} className="modal-form" onSubmit={saveContainmentPolicy}>
        <label>Control-plane hostname<input name="controlPlaneHostname" type="text" maxLength={253} defaultValue={containmentPolicy.controlPlaneHostname} placeholder="in-south-01.lumeravega.internal" /></label>
        <label>Pinned control-plane IP addresses <small>One exact IPv4 or IPv6 address per line.</small><textarea name="pinnedControlPlaneIps" rows={4} defaultValue={containmentPolicy.pinnedControlPlaneIps.join('\n')} placeholder={'10.0.0.10\n2001:db8::10'} /></label>
        <label>Management allowlist CIDRs <small>One IPv4 or IPv6 CIDR per line.</small><textarea name="allowedManagementCidrs" rows={4} defaultValue={containmentPolicy.allowedManagementCidrs.join('\n')} placeholder={'10.0.1.0/24\n2001:db8:1::/48'} /></label>
        <div className="privacy-note"><strong>Dead-man deadline: {containmentPolicy.heartbeatDeadlineSeconds} seconds</strong><span>The agent-side timer logic is not connected to an isolation lifecycle or rollback handler. No active timer or firewall rollback is currently running.</span></div>
        {containmentPolicy.updatedAt && <p className="hint">Last saved {new Date(containmentPolicy.updatedAt).toLocaleString()}{containmentPolicy.updatedBy ? ` by ${containmentPolicy.updatedBy.name} (${containmentPolicy.updatedBy.role.replaceAll('_', ' ')})` : ''}.</p>}
        <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save policy'}</button>
      </form>
    </section>}
    {!loading && page === 'commercial' && isMssp && <>
      <section className="stats-grid">{commercial.plans.map((plan) => <Stat key={plan.tier} label={plan.tier} value={`₹${Number(plan.monthlyAmount).toLocaleString('en-IN')} / month`} note={`${plan.seatsIncluded} users · proposed catalogue`} icon={Users} />)}</section>
      <section className="panel"><div className="panel-title"><div><h2>Channel partners</h2><p>CA, auditor, and MSP attribution records. Margin is stored in basis points.</p></div><Users size={18} /></div>
        {!commercial.partners.length ? <div className="empty-state">No channel partners configured.</div> : <div className="table-scroll"><table className="risk-table"><thead><tr><th>PARTNER</th><th>CONTACT</th><th>MARGIN</th><th>ASSIGNED CUSTOMERS</th><th>STATUS</th></tr></thead><tbody>{commercial.partners.map((partner) => <tr key={partner.id}><td><strong>{partner.name}</strong></td><td>{partner.contactEmail}</td><td>{(partner.marginBasisPoints / 100).toFixed(2)}%</td><td>{partner.assignments.map((assignment) => assignment.customerOrganization.name).join(', ') || 'None'}</td><td>{partner.active ? 'Active' : 'Inactive'}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="panel"><div className="panel-title"><div><h2>Customer subscriptions</h2><p>Manual metadata only. No payment collection, commissions, metering, or entitlement enforcement.</p></div><ClipboardList size={18} /></div>
        {!commercial.subscriptions.length ? <div className="empty-state">No subscription records configured.</div> : <div className="table-scroll"><table className="risk-table"><thead><tr><th>CUSTOMER</th><th>TIER</th><th>STATUS</th><th>MONTHLY PRICE</th><th>SEATS</th><th>NEXT REVIEW</th></tr></thead><tbody>{commercial.subscriptions.map((subscription) => <tr key={subscription.id}><td>{subscription.organization.name}</td><td>{subscription.tier}</td><td>{subscription.status}</td><td>{subscription.currency} {Number(subscription.monthlyAmount).toLocaleString('en-IN')}</td><td>{subscription.seatsIncluded}</td><td>{subscription.renewsAt ? new Date(subscription.renewsAt).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>}
        {providerAdmin && <div className="columns commercial-forms">
          <form className="modal-form" onSubmit={assignPartner}><strong>Assign channel partner</strong><label>Partner<select name="partnerId" required defaultValue="">{commercial.partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label><label>Customer<select name="customerOrganizationId" required defaultValue="">{tenants.filter((tenant) => tenant.id !== 'all').map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label><button className="secondary-button" disabled={busy || !commercial.partners.length}>Save attribution</button></form>
          <form className="modal-form" onSubmit={setSubscription}><strong>Set subscription record</strong><label>Customer<select name="customerOrganizationId" required defaultValue="">{tenants.filter((tenant) => tenant.id !== 'all').map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label><div className="form-grid"><label>Tier<select name="tier" defaultValue="STARTER"><option>STARTER</option><option>GROWTH</option><option>BUSINESS</option></select></label><label>Status<select name="status" defaultValue="TRIAL"><option>TRIAL</option><option>ACTIVE</option><option>PAST_DUE</option><option>CANCELLED</option></select></label></div><button className="secondary-button" disabled={busy}>Save subscription metadata</button></form>
        </div>}
      </section>
      <p className="hint">Prices and margins are planning inputs. Subscription status is operator-maintained metadata—not a live billing state, quote, or forecast.</p>
    </>}
    {!loading && page === 'customers' && isMssp && <section className="tenant-grid">{tenants.filter((tenant) => tenant.id !== 'all').map((tenant) => <button className="tenant-card" key={tenant.id} onClick={() => { setTenantId(tenant.id); setPage('dashboard') }}><span className="customer-mark">{initials(tenant.name)}</span><span className="status-tag">{tenant.status}</span><h2>{tenant.name}</h2><p>{tenant.industry || 'Customer organization'}</p><div>{tenant.riskCount} risks · {tenant.criticalCount} critical</div><strong>Open workspace <ArrowUpRight size={14} /></strong></button>)}</section>}
    {!loading && page === 'privacy' && <section className="panel privacy-panel"><div className="panel-title"><div><h2>Consent governance boundary</h2><p>Revocation changes tenant processing state and queues downstream erasure delivery.</p></div><Shield size={19} /></div><div className="privacy-cards"><article><FileCheckIcon /><strong>Section 5 · Notice</strong><span>Versioned, hashed privacy notice records tied to purpose.</span></article><article><ShieldAlert size={20} /><strong>Consent vault</strong><span>HMAC-signed consent evidence and verifiable audit chain.</span></article><article><ArrowDownRight size={20} /><strong>Section 12 · Erasure</strong><span>Asynchronous, retried webhook delivery with signed payloads.</span></article></div><div className="privacy-note"><strong>Data residency</strong><span>New organization records default to region IN-SOUTH-01. Actual residency depends on the PostgreSQL deployment region; configure infrastructure in India before production use.</span></div><button className="secondary-button" onClick={() => api('/api/privacy/audit/verify', { tenantId }).then((result) => setNotice(`Consent audit chain: ${result.valid ? 'VALID' : 'INVALID'} · ${result.checked} events checked`)).catch((err) => setError(err.message))}>Verify consent audit chain <Check size={15} /></button></section>}
    </section>
  </main>
  {riskOpen && <Modal title="Create a risk" close={() => setRiskOpen(false)}><form className="modal-form" onSubmit={addRisk}><label>Risk name<input name="name" required maxLength="160" /></label><div className="form-grid"><label>Category<input name="category" defaultValue="Technology" maxLength="60" /></label><label>Owner<input name="owner" maxLength="120" /></label></div><div className="form-grid"><label>Likelihood (1–5)<input name="likelihood" type="number" min="1" max="5" defaultValue="3" required /></label><label>Impact (1–5)<input name="impact" type="number" min="1" max="5" defaultValue="3" required /></label></div><label>Exposure (0–5)<input name="exposure" type="number" min="0" max="5" defaultValue="0" required /></label><label className="checkbox"><input type="checkbox" name="statutoryTrigger" /> Mandatory statutory control trigger</label><label>Statutory reference (required when triggered)<input name="statutoryReference" maxLength="120" placeholder="Applicable rule / control reference" /></label><label>Description<textarea name="description" rows="3" maxLength="1200" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setRiskOpen(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Create risk'}</button></div></form></Modal>}
  {incidentOpen && <Modal title="Record an endpoint incident" close={() => setIncidentOpen(false)}><form className="modal-form" onSubmit={reportIncident}><label>Endpoint<select name="deviceId" required defaultValue="">{endpoints.filter((endpoint) => endpoint.active).map((endpoint) => <option key={endpoint.id} value={endpoint.id}>{endpoint.name} · {endpoint.operatingSystem}</option>)}</select></label><div className="form-grid"><label>Incident category<select name="category" defaultValue="OTHER"><option value="RANSOMWARE_SUSPECTED">Suspected ransomware</option><option value="DATA_EXFILTRATION_SUSPECTED">Suspected data exfiltration</option><option value="WIPER_SUSPECTED">Suspected wiper</option><option value="LATERAL_MOVEMENT">Lateral movement</option><option value="EXPLOITATION">Exploitation</option><option value="OTHER">Other</option></select></label><label>Severity<select name="severity" defaultValue="MEDIUM"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label></div><label>Summary<input name="summary" required maxLength="200" /></label><label>First observed at<input name="firstObservedAt" type="datetime-local" required defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} /></label><p className="hint">This records an operator-reported incident. It does not trigger endpoint isolation or constitute a statutory report.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setIncidentOpen(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Record incident'}</button></div></form></Modal>}
  {partnerOpen && <Modal title="Add a channel partner" close={() => setPartnerOpen(false)}><form className="modal-form" onSubmit={createPartner}><label>Partner name<input name="name" required maxLength="120" /></label><label>Contact email<input name="contactEmail" type="email" required maxLength="254" /></label><label>Proposed recurring margin<select name="marginBasisPoints" defaultValue="2000"><option value="2000">20%</option><option value="2250">22.5%</option><option value="2500">25%</option></select></label><p className="hint">This creates partner attribution metadata only. It does not create partner credentials or calculate/pay commissions.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPartnerOpen(false)}>Cancel</button><button className="primary" disabled={busy}>Create partner</button></div></form></Modal>}
  {tenantOpen && <Modal title="Add a customer tenant" close={() => setTenantOpen(false)}><form className="modal-form" onSubmit={addTenant}><label>Organization name<input name="name" required maxLength="100" /></label><label>Industry<input name="industry" maxLength="80" /></label><label>Tenant administrator email<input name="adminEmail" type="email" required maxLength="254" /></label><p className="hint">A random one-time password is generated. Share securely; it is displayed once.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setTenantOpen(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create tenant'}</button></div></form></Modal>}
  {createdCredentials && <Modal title="Customer created" close={() => setCreatedCredentials(null)}><div className="credential-box"><p>Share these bootstrap credentials securely. They are shown only once here.</p><div><small>ADMIN</small><strong>{createdCredentials.user.email}</strong></div><div><small>TEMPORARY PASSWORD</small><strong className="secret">{createdCredentials.temporaryPassword}</strong></div><button className="secondary-button" onClick={async () => { await navigator.clipboard.writeText(`${createdCredentials.user.email}\n${createdCredentials.temporaryPassword}`); setNotice('Credentials copied to clipboard.') }}><Copy size={15} /> Copy credentials</button></div></Modal>}
  {createdEnrollmentToken && <Modal title="One-time endpoint enrollment token" close={() => setCreatedEnrollmentToken(null)}><div className="credential-box"><p>Give this token to the endpoint operator using a secure channel. It expires at {new Date(createdEnrollmentToken.expiresAt).toLocaleString()} and can enroll one device only.</p><div><small>ENROLLMENT TOKEN</small><strong className="secret">{createdEnrollmentToken.token}</strong></div><p>Run the agent’s <code>enroll</code> command on the Windows or Linux device and enter this token when prompted. The agent stores its device credential under the current user’s private config directory.</p><button className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(createdEnrollmentToken.token); setNotice('Enrollment token copied. Share it securely and clear it from the clipboard when finished.') } catch (err) { setError(`Could not access clipboard: ${err.message}`) } }}><Copy size={15} /> Copy token</button></div></Modal>}
  </div>
}

function Stat({ label, value, note, icon: Icon, tone = 'blue' }) {
  return <article className={`stat tone-${tone}`}><div>{label}<i><Icon size={17} /></i></div><strong>{value ?? '—'}</strong><small>{note}</small></article>
}

function FileCheckIcon() {
  return <ClipboardList size={20} />
}
