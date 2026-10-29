# LumeraVega SMB IN BOX | Lumera Foundary-Security 

LumeraVega SMB IN BOX is the customer-facing security and compliance operations suite for Indian MSMEs, trading firms, manufacturers, and professional-services organizations. Lumera Foundary-Security's LF-RISKROSI remains its specialized risk-return, statutory workflow, and audit foundation. This repository implements a local-development web control plane with a Next.js App Router interface, Prisma/PostgreSQL data layer, Redis/BullMQ privacy worker, bounded risk scoring, and consent-management and audit primitives.

This repository is a software foundation and demonstration—not an endpoint-defense appliance, compliance certification, legal interpretation, calibrated financial forecast, or production-ready service. Sample organizations, risks, notices, and figures are illustrative. A `region` value is metadata only; data residency depends on the actual infrastructure and deployment region.

## Brand, product boundary, and deployment status

- **Product brand:** LumeraVega SMB IN BOX.
- **Engine boundary:** LumeraVega SMB RISKROSI provides the existing risk scoring/ROSI, tenant-scoped consent, audit, and privacy workflow foundation. It is not currently a separate deployable algorithm service.
- **Implemented control plane:** Provider-to-customer tenant administration, risk register, risk/ROSI dashboard, notice and consent records, kill switch, audit verification, signed downstream erasure webhooks, and basic Windows/Linux endpoint enrollment, inventory, heartbeat, lifecycle telemetry ingestion, and revocation. Provider administrators and platform super administrators can save an audited containment network policy; those values are configuration records only.
- **Not implemented in this repository:** One-line enrollment installers or service management, operating-system security event collection, endpoint threat detection/isolation, vulnerability scanning, gRPC/mTLS telemetry, WORM log storage, trusted sovereign time synchronization, tenant envelope encryption/cryptographic backup erasure, CERT-In reportability/filing/escalation workflows, data-protection authority notification, CA audit export bundles, subscription billing, and subscription entitlement enforcement. The product name and positioning do not imply that these capabilities are live.
- **Hosting and residency:** `IN-SOUTH-01` is an organization metadata default, not a Pune/Mumbai hosting guarantee. No MeitY empanelment, sovereign-cloud deployment, or data-residency guarantee is established by this code. Configure and independently verify the hosting provider, region, replication, backup, logging, and operator access before making a residency claim.
- **Legal posture:** DPDP Act and CERT-In references identify workflows to support. They are not legal advice or proof that a duty is met. A product workflow cannot determine every reportability question or guarantee reporting within a statutory deadline.
- **Data governance inventory:** The draft [DPDP and cyber-incident evidence inventory](./docs/compliance/dpdp-phase0-scope.md) maps current data categories, missing systems, and user-proposed deployment controls. It explicitly distinguishes stored records from future endpoint IP/MAC/process/forensics collection and unverified proposals such as WORM retention, India-only routing, cryptographic backup erasure, tax-record retention, and notification deadlines. Legal/security/operations review and evidence are still required.

### Target architecture (proposed; not deployed by this repository)

| Plane | Proposed responsibility | Current state / implementation gate |
|---|---|---|
| LumeraVega sovereign control plane | India-hosted multi-tenant management and partner operations | Current web app is deployable by an operator; region and sovereign-hosting attestations are outside this codebase. |
| Partner / client / asset hierarchy | CA or MSP partner → MSME customer → site, asset, endpoint | Current database supports provider → customer tenancy and tenant-scoped endpoint inventory; partner contracts and site/asset models are not implemented. |
| SMB Gateway appliance | Enrollment, policy, local event collection, and constrained response | A basic Windows/Linux command-line agent supports tenant-bound, one-time enrollment, local credential storage, host identity, lifecycle telemetry, and administrative revocation. It does not collect OS security events, install as a service, isolate threats, or provide signed update/secure-boot controls. |
| Telemetry ingestion | Authenticated endpoint-to-control-plane event delivery | The agent posts a strict allowlist of lifecycle events over HTTPS using its tenant-bound bearer credential. This is operational telemetry, not operating-system security-event collection. Rate limiting, mutual TLS, and offline buffering remain production requirements. |
| Retention and audit evidence | Tamper-evident event retention, export, and deletion policy | PostgreSQL stores agent lifecycle events with server receipt time and a 180-day expiry; the worker prunes expired rows in bounded batches. This is not a tamper-evident security-log vault. Integrity checkpoints, quotas, legal holds, backups, and restore tests remain to be designed. |
| Security response | Alert triage, isolation request/approval, watchdog, and evidence trail | Tenant-scoped operator-reported incidents, HMAC hash-chained activity records, distinct-admin request/approval, and opt-in Ed25519-signed command delivery are implemented. Watchdog deadline/rollback-callback logic is unit-tested but is not connected to an isolation lifecycle or a firewall adapter. The current agent does not apply firewall or process changes; this is not an isolation capability. |
| Compliance operations | Notice/consent records and incident-readiness tracking | Consent and erasure webhook workflows exist. Manual incident records have an internal six-hour readiness timer and bounded tenant CSV export; these do not determine reportability, prepare or submit a statutory form, or guarantee a deadline. Validate current obligations with counsel. |

### Partner-led commercial proposal (planning assumptions)

The CA, auditor, tax-consultant, and MSP channel is a proposed B2B2B distribution motion, not a currently provisioned partner program. All listed capabilities, prices, margins, and cost targets below are planning inputs—not live catalog, quotes, or financial forecasts. Prices exclude GST.

| Proposed tier | Monthly price | Intended profile | Proposed bundle |
|---|---:|---|---|
| Starter | ₹999 | Micro-firms, 1–5 users, CA offices, traders | Essential endpoint protection and a DPDP Section 5 notice workflow. Endpoint protection is not implemented here. |
| Growth | ₹2,499 | Growing MSMEs, 6–25 users, clinics, retail | EDR telemetry, 180-day event vault, consent tracking, and vulnerability scans. These endpoint/logging capabilities are not implemented here. |
| Business | ₹5,999 | Mid-sized units, 26–75 users, tier-2 vendors | Managed-detection integration, Section 12 erasure webhooks, and a CA audit export bundle. Only the privacy webhook workflow is currently present; managed detection and the export bundle are not. |

Proposed partner recurring margin is 20–25%. Proposed gross-margin target is 75–82%, dependent on validated infrastructure, support, storage, security operations, and channel costs. Partner profiles, customer attribution, and manual subscription metadata are implemented as a foundation. There is no payment provider integration, GST invoicing, recurring commission calculation or payout, metering, subscription entitlement enforcement, or validated unit economics. Do not market “IT security readiness certificates” as independent certification; provide clearly scoped evidence reports unless a qualified certification scheme and authorized assessor are in place.

## Delivery phase status: Phase 0 through current implementation

The repository does not contain an approved, versioned Phase 0–9 delivery plan. The table below reconstructs a practical status view from the older Phase 1–4 checklist in [`task.md.resolved`](./task.md.resolved), current code, and the work represented in this README. Phase 5–9 labels are retrospective groupings for visibility, not claims that an original phase plan or acceptance contract existed. Phase 0 has user-reported partial sign-off, but its evidence and acceptance gates remain outstanding. Each capability or readiness assertion must map to a versioned requirement, exact source/configuration revision, and reproducible CI/CD or witnessed operational check; absent or stale evidence is not a pass. “Implemented” means only that the described repository-level foundation exists; it does not mean production-ready or legally compliant.

A proposed, unapproved acceptance roadmap is now documented in [`docs/delivery/phase-0-9-plan.md`](./docs/delivery/phase-0-9-plan.md). For the Phase 0 scope baseline specifically, the draft product-boundary record is in [`docs/compliance/phase0-product-scope.md`](./docs/compliance/phase0-product-scope.md). It does not change the status of any gate or imply stakeholder approval.

A draft requirement-to-check traceability register is in [`docs/delivery/phase0-requirement-traceability.md`](./docs/delivery/phase0-requirement-traceability.md). It maps the repository-backed product claims and GATE-01–08 to their source surfaces, checks, owners, and outstanding evidence; it is not an approved requirements baseline or release evidence package.

The draft [Phase 0 evidence provenance and retention register](./docs/delivery/phase0-evidence-provenance.md) indexes required gate artifacts and proposes evidence-handling rules. The evidence repository, access model, retention schedule, and approval are not established yet.

Local Node, Prisma-schema, and production-build checks are summarized in the [Phase 0 local verification record](./docs/delivery/phase0-local-verification.md). They are not hosted CI or release acceptance; Go validation and deployment/operational evidence remain outstanding.

The [Phase 0 release decision record](./docs/delivery/phase0-release-decision.md) is a pending decision template. It consolidates gate status and approval fields without marking any gate accepted.

| Phase | Scope represented | Status | Missing / acceptance gaps |
|---|---|---|---|
| **0 — Baseline and scope** | Record the initial system, constraints, threat model, deployment assumptions, and measurable completion criteria. | **Partial sign-off reported; evidence and acceptance gates outstanding.** | See [`task.md.resolved`](./task.md.resolved) for GATE-01 through GATE-08 and the draft [threat model](./docs/security/threat-model-phase0.md), [data-protection inventory](./docs/compliance/dpdp-phase0-scope.md), and [PITR verification script](./scripts/ops/verify-pitr.sh). The supplied commit, GPG tag, and branch are not present locally; reviews/signatures, deployment and hosting evidence, and witnessed recovery remain outstanding. `READY_FOR_EVIDENCE_ATTACHMENT` is submitted metadata, not acceptance. |
| **1 — Codebase transformation** *(legacy checklist)* | Modular application, named `NexusApp` / `AdminControlCenter`, `IntegrationManager`, and design system. | **In progress; legacy completion claim is stale.** | Current app is Next.js, but the checklist's named modules are not present in the current `src`, `app`, or `server` implementation. A Phase 1 UI callback state-scope defect was fixed; the requirements-to-current-architecture map and approved acceptance evidence remain outstanding. |
| **2 — Instrumentation and monitoring** *(legacy checklist)* | `LoggerService`, component/report latency, and export instrumentation. | **In progress; local monitoring is implemented but not running.** | API responses carry request IDs and emit structured response timing/status logs, including readiness and CSV export; the worker emits bounded job and retention-task outcome/duration logs; a CLI synthetic readiness probe verifies HTTP, database, and Redis status. An opt-in, bearer-protected local Prometheus endpoint and provisioned Prometheus/Grafana profile are implemented and covered by tests/config validation; host-side smoke testing confirmed HTTP 401 without a token and HTTP 200 with Prometheus exposition for an authorized request. Docker's WSL data-disk/storage errors persist: image layer extraction still reports read-only filesystem, C: had about 72 MB free at the latest check, and the health endpoint returned HTTP 503 with database and Redis checks false. Monitoring containers, scraping, and dashboard have not been verified running. Audit events, limited endpoint lifecycle telemetry, durable/distributed collection, alerting, and demonstrated alert routing remain outstanding. |
| **3 — Compliance and resilience** *(legacy checklist)* | Legal visibility, board reporting, recovery/chaos controls, snapshots, and failure handling. | **Partial.** | Risk, consent, erasure-webhook, manual incident-readiness, audit-chain, bounded CSV, and a draft DPDP/CERT-In data-evidence inventory exist. The draft is not legal approval; complete processing-role/retention decisions, comprehensive security-log sources, statutory filing/escalation, legal reportability decisions, recovery evidence, and the named legacy modules remain outstanding. |
| **4 — Automation and knowledge transfer** *(legacy checklist)* | CI/CD, math-engine tests, training/recovery manual. | **Partial; local operations manual drafted.** | Node and Go tests, Prisma migrations, Docker Compose, `.github/workflows/verify.yml`, and a local [reliability and operations manual](./reliability_manual.md) are present. The manual is not a production-approved runbook; a hosted CI run, release/deployment automation, `rosi_math.test.js`, named-owner review, and witnessed recovery drills remain outstanding. |
| **5 — Risk and consent foundation** *(retrospective)* | Deterministic risk scoring/ROSI, signed consent evidence, audit, and erasure dispatch. | **Foundation implemented; production controls missing.** | No separately deployable risk service or deployed AI; scores require human validation. Key management/rotation, legal review, production-grade operational controls, and proof of downstream deletion are outstanding. |
| **6 — Multi-tenant control plane and commercial metadata** *(retrospective)* | Provider/customer tenants, partner attribution, subscription metadata, and global policy administration. | **Foundation implemented; commercial and deployment gaps remain.** | No payments, GST invoices, commissions/payouts, entitlements, MFA/SSO, production residency attestation, full partner/site/asset hierarchy, or deployment evidence. `SUPER_ADMIN` and `MSSP_ADMIN` can save global containment network values, but those values are not enforced. |
| **7 — Endpoint enrollment and telemetry** *(retrospective)* | Windows/Linux enrollment, inventory, heartbeat, lifecycle events, revocation, and security-control integrations. | **Basic agent and integration catalog implemented.** | Tenant-scoped capability preferences for Wazuh, OpenVAS, Suricata, and TheHive are configuration only; no connector, credentials, ingestion, health, or alert synchronization exists. Also missing: OS security-event collection, threat detection, installer/service supervision, offline buffering, mTLS, rate limiting, secure updates, hardware-backed identity, and EDR/vulnerability scanning. |
| **8 — Incident readiness and partner workflow** *(retrospective)* | Manual incident tracking, evidence export, partner and tier records. | **Workflow foundations implemented.** | The six-hour clock is internal readiness metadata only. No automated CERT-In reportability assessment, filing, escalation/notification, CA certification, or payment-backed commercial operation exists. |
| **9 — Containment, watchdog, and rollback** *(retrospective/current)* | Dual-control authorization and signed command delivery; privileged WFP/nftables host containment and automated threat quarantine are explicitly disabled pending signed Phase 9 gates. | **Authorization/delivery foundation only; host enforcement disabled and not implemented.** | Watchdog logic/tests are not wired into an isolation state or rollback handler. No firewall rules are installed or removed, and no active host rollback occurs. Pinned IPs/allowlists were not supplied or validated for deployment. Privileged Windows/Linux enforcement, rollback/recovery testing, MFA-backed approval, trusted detection, independent verification, and signed authorization remain blocking requirements. |

### Verification evidence and overall readiness

The current implementation has previously been locally validated with the Node test suite, Go agent tests and Windows/Linux cross-builds, Prisma schema validation, fresh PostgreSQL migration deployment, and a Next.js production build. These local checks are not a CI/CD evidence record tied to a candidate release commit; they do not establish production security, deployment readiness, compliance, service availability, data residency, or end-to-end host isolation. Every future release assertion must link its source/configuration revision to repeatable CI/CD or witnessed operational evidence, including run/environment identifiers and retained results. The legacy “all phases complete” / “platform ready for production deployment” statement in [`task.md.resolved`](./task.md.resolved) is superseded and must not be used as the current status.

Phase 0 acceptance criteria, explicit trust boundaries, data categories, candidate release gates, and the partial sign-off record are maintained in [`task.md.resolved`](./task.md.resolved). The draft [DPDP and cyber-incident data inventory](./docs/compliance/dpdp-phase0-scope.md) maps current data stores and evidence gaps; it is not legal advice or an approval. Current endpoint telemetry is limited to lifecycle events and does not provide comprehensive CERT-In security-log coverage. The supplied uptime target is 99.9%, P1 response is within 15 minutes, high-severity statutory incidents have 24x7 coverage, RTO is at most 4 hours, and RPO at most 15 minutes. These are recorded as user-provided decisions, not independently tested service commitments. The user reports that Rockey, identified as Product Owner/Super Admin and designated for DPO/legal review, granted both approvals on 2026-10-28. The approved scope/revision, legal review basis, signed records, and deployment verification remain outstanding.

## Stack

- Next.js 15 and React 18
- PostgreSQL 16 with Prisma 6 and checked-in SQL migrations
- Redis 7 and BullMQ for erasure webhook delivery
- Node.js 22+
- Docker Compose for a local multi-service environment
- Go 1.22+ for building the Windows/Linux heartbeat agent

## Run with Docker Compose

1. Copy `.env.example` to `.env`.
2. Replace all placeholder passwords and keys. Use high-entropy values, a distinct key for each HMAC/encryption purpose, and keep `.env` out of source control. `WEBHOOK_ENCRYPTION_KEY` must be exactly 64 hexadecimal characters.
3. Configure `DATABASE_URL` to use the same PostgreSQL username/password/database values as `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. Configure `REDIS_URL` with the same password as `REDIS_PASSWORD`.
4. Start PostgreSQL, Redis, run migrations, and launch the web app and worker:

   ```powershell
   docker compose up --build -d
   ```

5. Seed the demo accounts and sample tenant data once:

   ```powershell
   docker compose --profile seed run --rm seed
   ```

6. Open <http://localhost:3000>. Credentials are the two email/password pairs configured with `SEED_ADMIN_*` and `SEED_TENANT_ADMIN_*` in `.env`.

To inspect service logs or stop the local stack:

```powershell
docker compose logs -f web worker
docker compose down
```

`docker compose down` preserves named database volumes. Do not remove volumes unless you intend to delete local data.

See the [reliability and operations manual](./reliability_manual.md) for non-destructive startup, readiness checks, storage-error triage, monitoring setup, and recovery limitations.

### Local Prometheus and Grafana

The optional monitoring profile exposes Prometheus at <http://localhost:9090> and Grafana at <http://localhost:3001>; both ports bind only to loopback. Before enabling it, set `PROMETHEUS_METRICS_ENABLED=true`, a unique high-entropy `PROMETHEUS_METRICS_TOKEN`, and a unique `GRAFANA_ADMIN_PASSWORD` in the ignored `.env` file. Prometheus sends the bearer token through a Compose secret; `/api/metrics` is otherwise disabled or returns unauthorized.

Start the app with the profile:

```powershell
docker compose --profile monitoring up --build -d
```

Sign into Grafana with `GRAFANA_ADMIN_USER` (default `admin`) and the password from `.env`. The provisioned API dashboard shows response rate, p95 latency, server-error ratio, and process-lifetime observation count. Metrics are in-memory and reset when the web process restarts; this single-process local setup is not production-grade distributed telemetry. The authenticated endpoint was smoke-tested directly, but Docker's WSL data-disk/storage errors prevent building the updated app image and starting the monitoring containers. The authorized build-cache prune reclaimed 7.22 GB, but C: had only about 72 MB free at the latest check. Scraping and dashboard rendering remain unverified. Add externally managed retention, alert routing, and access controls before using monitoring beyond local development.

### Synthetic readiness probe

Run a single bounded probe against the local readiness endpoint:

```powershell
npm run probe:health -- http://localhost:3000/api/health
```

The probe succeeds only when the endpoint returns HTTP 200 and both database and Redis checks are `true`. It emits one JSON result and exits nonzero for unhealthy responses or request errors. Use a supervised external scheduler/monitor to collect repeated results and route alerts; a local probe does not establish uptime, SLA, or production monitoring.

## Run the application outside Docker

Use a PostgreSQL and Redis instance and set the variables in `.env.example` for those services. Then:

```powershell
npm ci
npx prisma migrate deploy
npm run db:seed
npm run dev
```

In a second terminal, start the queue/retention worker:

```powershell
npm run dev:worker
```

For production, build with `npm run build`, then run `npm start` and `npm run start:worker` as separate supervised processes. Apply migrations before starting application processes.

## Seed data

The seed command requires distinct MSSP and tenant administrator emails and passwords of at least 12 characters. It stores scrypt password hashes, uses stable demo identifiers, and does not reset a seeded user's password on subsequent runs. Seeded risks are scored by the same deterministic scoring function used by the API.

## Tenant and authorization model

- An MSSP provider organization owns customer organizations.
- MSSP administrators and analysts can view their provider's customer portfolio; only administrators can create customer tenants or write tenant risks.
- Tenant administrators and risk managers are scoped to their organization. Auditors are read-only.
- API tenant scope is resolved from the authenticated user and the provider/customer relationship, not trusted from a client-supplied organization ID.
- The database uses tenant-scoped unique keys and composite foreign keys to keep a consent artifact tied to a notice and purpose from the same tenant.
- Sessions use random opaque HttpOnly cookies; only a hash of the session token is persisted. Passwords are stored as scrypt hashes.

## Endpoint enrollment and lifecycle telemetry

After applying migrations, open **Endpoint inventory** in a customer tenant as a tenant administrator or provider administrator and issue a one-time enrollment token. Tokens expire after 30 minutes and can enroll one device; only their SHA-256 hashes are stored. Enrollment returns a per-device bearer credential once. The agent stores that credential in the current user's configuration directory (`%AppData%` on Windows or the platform's user config directory on Linux), sends basic host inventory with a five-minute heartbeat, and reports agent start plus heartbeat failure/recovery transitions. Device credentials are hashed at rest, and administrators can revoke a device; subsequent heartbeats and telemetry are rejected.

Telemetry is deliberately limited to `AGENT_STARTED`, `HEARTBEAT_FAILED`, and `HEARTBEAT_RESTORED`. The API rejects arbitrary event types and free-text details; the only additional field is a bounded heartbeat failure class. Event IDs are deduplicated per device, tenant ownership is derived from the authenticated device credential, and event timestamps more than five minutes ahead or 180 days behind server time are rejected. Each accepted event expires 180 days after server receipt. The worker performs retention cleanup in batches. The UI shows the latest 100 events within the selected tenant scope. Event delivery is best-effort and is not buffered offline. This milestone does not read Windows Event Log, Linux audit/journal logs, process lists, command lines, network flows, or detect threats; it is not EDR or a CERT-In reporting system. The 180-day setting is an application policy, not legal advice or proof of statutory compliance.

Build the agent from `agent/` with Go 1.22 or later:

```powershell
Set-Location agent
go build -o lvsmb-agent.exe ./cmd/agent
.\lvsmb-agent.exe enroll -server-url https://smb.example
.\lvsmb-agent.exe run
```

On Linux, from `agent/`, build without the `.exe` suffix and run the same `enroll` and `run` commands. Enrollment prompts for the token so it is not exposed as a command-line argument. For automation, `LUMERAVEGA_ENROLLMENT_TOKEN` is accepted, but environment variables may be visible to local process-inspection tools. The agent currently runs in the foreground; configure service supervision, package signing, updates, and OS-specific credential protections before production deployment.

## Incident readiness and evidence export

Tenant administrators can manually record an endpoint incident from **Incident readiness**, add an operator resolution note, and verify the HMAC-signed incident audit chain. The six-hour clock is an internal readiness timer measured from record creation—not an assessment of whether an event is reportable or when any legal deadline starts. The tenant-scoped evidence CSV contains up to 1,000 incident rows, 1,000 lifecycle telemetry rows, and 1,000 signed containment-audit rows; spreadsheet formulas are neutralized. It is an operational evidence export, not a prescribed CERT-In form or certificate.

### Containment workflow boundary

The dashboard can record a quarantine request for an open incident, require approval or rejection by a different authorized administrator, and preserve the decision in the tenant audit chain. Command delivery is disabled by default with `CONTAINMENT_COMMANDS_ENABLED=false`. When enabled, generate a dedicated Ed25519 key pair and configure the base64-encoded PKCS#8 private key and SPKI public key in `CONTAINMENT_COMMAND_PRIVATE_KEY` and `CONTAINMENT_COMMAND_PUBLIC_KEY`; keep the private key in a deployment secret manager, never in source control. For example, generate compatible values with Node.js:

```powershell
node -e "const {generateKeyPairSync}=require('node:crypto');const k=generateKeyPairSync('ed25519');console.log('CONTAINMENT_COMMAND_PRIVATE_KEY='+k.privateKey.export({format:'der',type:'pkcs8'}).toString('base64'));console.log('CONTAINMENT_COMMAND_PUBLIC_KEY='+k.publicKey.export({format:'der',type:'spki'}).toString('base64'))"
```

Newly enrolled agents store the public verification key returned by the control plane, and the server records the matching key fingerprint per endpoint. Only endpoints enrolled while the active key is configured can submit requests or receive signed commands. Rotation therefore requires coordinated server key configuration and re-enrollment/re-provisioning of agents; no key rotation protocol is implemented. An approved command is signed, bound to its tenant, endpoint, incident, reason, action, issuance time, and short expiry. The current Windows/Linux agent verifies the signature and then acknowledges `HOST_ENFORCEMENT_NOT_CONFIGURED`; it never changes host networking or processes. The UI/API do not claim that a host was contained or released.

Do not enable command delivery as a production isolation control. Actual enforcement remains blocked on a privileged and separately signed platform service, deployment-pinned allowlists, verified rollback and lease recovery, supported OS-level integration, real MFA-backed dual control, and a trusted hardware-attested detector. The supplied `.internal` FQDNs and example sovereign CIDR are not verified production addresses. No autonomous statutory trigger, firewall change, or process suspension is implemented.

## Partner and subscription records

Provider administrators can create channel-partner profiles, assign customer tenants, and record a proposed Starter/Growth/Business tier with a manual subscription status. Catalogue prices and included seat counts are fixed to the planning inputs in this README; partner margins are bounded to 20–25%. These records support administration and audit history only. They are not customer quotes, payment records, tax invoices, entitlements, or evidence that payment is current.

## Risk, AI, and ROSI behavior

- Risk scoring is deterministic and bounded to 0–100; a referenced statutory trigger imposes an 85-point minimum.
- The risk API also accepts a vector evaluation using `riskFactors` (`vectorId`, `severity` 1–10, `assetCriticality` 1–5, and `mitigationFactor` 0–1) and optional boolean `statutoryConditions`. Vector exposure is additive and clamped to 0–100; any configured statutory condition sets the score to 100. Existing likelihood/impact fields remain required risk metadata. Vector inputs and results are stored in tenant-scoped `RiskEvaluationRecord` history and included with risk reads.
- The statutory trigger codes and evaluator are deterministic workflow metadata; they do not establish that a legal breach occurred or provide legal advice. Vector scores and any AI-supplied factors require human validation.
- ROSI calculations validate non-negative finite inputs. The LUMAVEGA scenario output is an illustrative randomized sensitivity range, not a calibrated forecast.
- LF Security AI and LUMAVEGA are deterministic calculation interfaces, not deployed AI models. LUMA is an interface placeholder; external model inference is not configured.
- The dashboard's posture and ROSI values are estimates derived from the current demonstration data.

## Consent and DPDP workflow primitives

- Consent evidence binds a tenant, purpose, notice content hash/version, choices, and timestamps using canonical JSON and HMAC-SHA256.
- New consent artifacts receive an opaque random receipt ID and a separate HMAC receipt signature bound to the evidence hash and consent timestamp. The verification endpoint checks both signatures. Existing artifacts without a receipt signature continue to verify using their original evidence signature.
- Consent audit events use a tenant-scoped hash chain with HMAC signatures.
- Revocation and the tenant kill switch stop new consent capture and enqueue downstream erasure webhook requests. The BullMQ worker delivers signed HTTPS webhooks with retry handling and revalidates/pins public DNS addresses at connection time. Section 12 erasure requests carry the opaque principal reference and a statutory workflow label; successful webhook delivery confirms receipt by the endpoint, not deletion in that external system.
- Retention expiry is scanned by the worker. Erasure is requested from configured downstream endpoints; the platform cannot prove or perform deletion inside an external system by itself.
- Statutory references and workflow labels are implementation metadata, not legal advice or proof that a statutory duty has been satisfied. Obtain qualified legal review and configure notices, lawful bases, retention, and downstream integrations for the deployment.

## Security and deployment caveats

Before handling real customer data, add and independently test production controls such as MFA/SSO, centralized rate limiting, key rotation/KMS, monitoring and alerting, backup/restore drills, incident response, data minimization, access reviews, and deployment-specific network policy. Endpoint enrollment and heartbeat routes also need edge rate limiting and operational monitoring before production. Restrict PostgreSQL/Redis to private networks; Compose publishes only the web service. Use HTTPS at a trusted reverse proxy and deploy within the required sovereign region if data residency is required.

The same-origin guard uses the request `Host` and `X-Forwarded-Proto` when present. A reverse proxy must overwrite forwarded headers and accept traffic only from trusted upstreams; do not expose the app directly with client-controlled forwarded headers. The in-memory login throttling is process-local and is not a substitute for edge rate limiting. Webhook delivery is at-least-once; receivers must deduplicate using the `X-LF-Delivery` identifier and verify `X-LF-Signature` over `<timestamp>.<raw request body>`. Never expose secrets or use the demo seed accounts in production.
