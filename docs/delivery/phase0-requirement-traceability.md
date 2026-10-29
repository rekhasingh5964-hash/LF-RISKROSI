# Phase 0 Requirement-to-Check Traceability

**Status:** Draft working register; requirements and acceptance have not been approved  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Prepared:** 2026-10-29  
**Repository baseline observed:** `c7dac47e183433531449da3140f87d6d5046987b`

## Purpose and evidence rules

This register connects the current product boundary and Phase 0 gates to source/configuration surfaces, repeatable checks, accountable owners, and known evidence gaps. It is not a signed requirements baseline, a CI evidence package, a legal/security approval, or a production-readiness decision.

The recorded repository baseline is the local `HEAD` observed while preparing this register. The working tree contains uncommitted and untracked changes, so this value does not identify a revision containing the current documents. Before release acceptance, create and review a candidate commit, update the baseline, and attach CI and operational artifacts tied to that exact revision.

Status meanings:

- **Repository check exists:** a corresponding source/test or validation procedure is present. It does not imply the check passed on a release candidate.
- **Prepared / owner review pending:** documentation or a review packet exists, but an accountable owner has not completed and signed the decision.
- **External evidence outstanding:** the required deployment, operational, legal, or hosted-CI artifact is not present.
- **Not implemented / disabled:** the capability is absent or intentionally unavailable; do not claim it is operating.

No evidence is considered accepted solely because a file or test exists. Record the candidate commit, configuration revision, CI run or witnessed environment, procedure, timestamp, outcome, artifact reference, owner, and review/expiry date.

## Product and capability traceability

| Requirement ID | Draft requirement / externally visible claim | Source and configuration surfaces | Repeatable check / expected evidence | Accountable owner | Current status and limitation |
|---|---|---|---|---|---|
| SCOPE-01 | Product scope is limited to repository-backed tenant administration, risk/ROSI, privacy/audit workflow foundations, endpoint lifecycle records, and local operational foundations. | [`../../README.md`](../../README.md); [`../compliance/phase0-product-scope.md`](../compliance/phase0-product-scope.md) | Product Owner reviews and signs the exact scope document hash and source revision using [`../compliance/phase0-gate-01-approval.md`](../compliance/phase0-gate-01-approval.md). | Rockey (Product Owner, as designated) | Scope and approval form prepared; signature and verified release revision outstanding. |
| SCOPE-02 | Product, legal, residency, availability, recovery, and security claims must not exceed verified evidence. | [`../../README.md`](../../README.md); [`../compliance/dpdp-phase0-scope.md`](../compliance/dpdp-phase0-scope.md); [`../security/threat-model-phase0.md`](../security/threat-model-phase0.md) | Owner review of customer-facing claims against the actual candidate configuration and attached approval/evidence records. | Product, Legal/Privacy, Security, Operations | Draft guardrails exist; approvals and environment-specific evidence outstanding. |
| CAP-01 | Tenant and role boundaries protect tenant-specific application operations. | `app/api/`, `lib/auth.js`, Prisma models in `prisma/schema.prisma` | Route-by-route negative authorization tests for unauthenticated, wrong-role, and cross-tenant access; retain named test inventory and run results. | Product Security / application owner | Patterns and selected tests exist; complete route coverage and release-bound evidence are not established. |
| CAP-02 | Risk/ROSI calculations are deterministic for the documented inputs and outputs; results are decision support, not calibrated financial forecasts. | `lib/risk-engine.js`; `tests/risk-engine.test.js`; README product-boundary language | Focused unit/boundary tests and approved calculation specification; record expected input/output cases and test run. | Product / risk-engine owner | Test suite exists; approved requirements, model limitations, and calibration evidence are not established. |
| CAP-03 | Consent/privacy records and erasure dispatch provide workflow evidence, not proof of legal sufficiency or downstream deletion. | `lib/consent-vault.js`; `lib/privacy.js`; `lib/dpdp-queue.js`; `workers/dpdp-worker.js`; `tests/consent-vault.test.js` | Unit/integration tests for consent evidence, revocation, retries and failure handling; separately obtain qualified legal review and downstream acknowledgment contract. | Privacy owner / Engineering | Workflow foundation and tests exist; legal decisions and verified downstream deletion remain outstanding. |
| CAP-04 | Audit/evidence records are scoped and integrity controls are tested; do not imply a complete immutable infrastructure log vault. | `lib/audit.js`; `lib/containment-audit.js`; `tests/` audit/containment tests | Integrity/tamper tests and coverage inventory; operational evidence for access, retention, time source, backup, monitoring, and deletion. | Security / Operations | Application-level records exist; complete coverage, immutable storage, and operational controls are not established. |
| CAP-05 | Endpoint enrollment and telemetry are limited to basic inventory and allowlisted lifecycle events; they are not host threat detection or OS event monitoring. | `agent/cmd/agent/`; `lib/endpoint-auth.js`; `lib/endpoint-telemetry.js`; `tests/endpoint-auth.test.js`; `tests/endpoint-telemetry.test.js` | Enrollment, tenant binding, revocation, input allowlist, and supported-platform CI tests; confirm claims match collected fields and deployed behavior. | Endpoint / Security owner | Basic lifecycle foundation and tests exist; OS event collection, detection, secure updates, mTLS, and complete hosted evidence are absent. |
| CAP-06 | Security-control catalog/preferences do not represent connected or operational third-party tools. | [`../../security_controls_spec.md.resolved`](../../security_controls_spec.md.resolved); `lib/security-controls.js`; `app/api/security-controls/route.js` | Test authorization, tenant scope, audit and `NOT_CONNECTED` state; integration claims require connector-specific integration tests and live endpoint evidence. | Product / integrations owner | Catalog/preferences are implemented; connectors, health, event ingestion, and alert synchronization are not implemented. |
| CAP-07 | Webhook destination and signature controls constrain outbound delivery; delivery status does not prove recipient deletion. | `lib/webhook-url.js`; `lib/webhook-crypto.js`; `tests/webhook-url.test.js`; `tests/consent-vault.test.js` | URL-policy, signature/tamper, retry and destination tests; review DNS rebinding/redirect behavior and verify destination/deletion independently. | Security / privacy / Engineering | Selected controls and tests exist; independent destination review and downstream deletion evidence remain outstanding. |
| CAP-08 | Readiness, structured API logs, and local metrics describe local operational foundations, not availability or SLA attainment. | `lib/readiness.js`; `lib/api-observability.js`; `lib/api-metrics.js`; `monitoring/prometheus.yml`; `scripts/ops/probe-health.js`; corresponding `tests/` | Unit tests, configuration validation, then named-environment monitoring/scrape/alert test and objective measurement over an approved window. | Operations / SRE | Local implementation and checks exist; deployed durable monitoring, alert routing, and measured availability are not established. |
| SAFE-01 | Privileged host enforcement and autonomous quarantine remain disabled; unavailable status must not imply action was applied. | `lib/containment-enforcement.js`; `agent/cmd/agent/main.go`; `tests/containment-enforcement.test.js`; `agent/cmd/agent/main_test.go` | Node assertion; Go agent tests; independent source/runtime review; hosted Windows/Linux jobs and cross-build evidence. | Product Security Lead | Node focused test passed locally; hosted Node/Go checks and Linux-hosted cross-builds passed in run `40828204023`; independent review and signed safety decision remain outstanding. |

## Phase 0 gate traceability

| Requirement ID | Gate / acceptance requirement | Primary evidence artifact | Required check or owner decision | Owner | Current status |
|---|---|---|---|---|---|
| GATE-01 | Product Owner approval of exact product boundary and baseline revision. | [`../compliance/phase0-product-scope.md`](../compliance/phase0-product-scope.md); [`../compliance/phase0-gate-01-approval.md`](../compliance/phase0-gate-01-approval.md) | Verify candidate commit/tag; sign scope hash, conditions, date and artifact reference. | Rockey | Prepared; unsigned; open. |
| GATE-02 | Six-boundary threat review, residual-risk treatment, and continued non-enforcement. | [`../security/threat-model-phase0.md`](../security/threat-model-phase0.md); [`../security/phase0-gate-02-review.md`](../security/phase0-gate-02-review.md) | Complete boundary assessment and risk ratings/dispositions, cite evidence, sign exact revision. | Abhishek (Solutions Architect, as designated) | Prepared; signed assessment and risk acceptance outstanding; open. |
| GATE-03 | Qualified, authorized legal/privacy decision and completed processing/role register. | [`../compliance/dpdp-phase0-scope.md`](../compliance/dpdp-phase0-scope.md); [`../compliance/phase0-gate-03-review.md`](../compliance/phase0-gate-03-review.md) | Verify authoritative legal sources and deployment context; record roles, decisions, conditions and signed review. | Rockey / qualified Legal-Privacy reviewer | Prepared; qualified review and signed decision outstanding; open. |
| GATE-04 | Verified provider, region, deployed network boundary, access, and data-location evidence. | [`phase0-gate-04-deployment-evidence.md`](./phase0-gate-04-deployment-evidence.md) | Independent environment-specific review of provider/region, IaC/state locking, routes, ingress/egress, data flows and access tests. | Abhishek / cloud operator | Evidence packet prepared; infrastructure/deployment evidence absent; open. |
| GATE-05 | Approved availability/P1/coverage objectives with tested monitoring and support. | [`phase0-gate-05-service-objectives.md`](./phase0-gate-05-service-objectives.md) | Approve definitions; measure over the approved window; test end-to-end alerts, P1 response and out-of-hours rota. | Named Product / Operations owner | Evidence packet prepared; owner, definitions and operational evidence absent; open. |
| GATE-06 | Approved RTO/RPO with protected backups and witnessed production-equivalent restore. | [`phase0-gate-06-recovery-evidence.md`](./phase0-gate-06-recovery-evidence.md); `scripts/ops/verify-pitr.sh` | Run synthetic test only in authorized test environment; separately witness PostgreSQL/Redis production-equivalent restore and verify objectives. | Abhishek / Operations | Evidence packet prepared; production-equivalent backup/restore proof absent; open. |
| GATE-07 | Management access restricted to the approved VPN pool across all ingress paths. | [`phase0-gate-07-vpn-access-evidence.md`](./phase0-gate-07-vpn-access-evidence.md) | Keep CIDRs restricted; review deployed routes/proxies/firewalls and witness permitted/denied access tests. | Named Network Security Lead | Evidence packet prepared; owner/configuration/CIDRs/tests absent; open. |
| GATE-08 | Enforcement remains disabled and reports unavailable until separate Phase 9 authorization. | [`phase0-gate-08-enforcement-disabled-evidence.md`](./phase0-gate-08-enforcement-disabled-evidence.md) | Run Node and Go tests in hosted CI, cross-build Windows/Linux targets, independently review no active host action, retain signed decision. | Product Security Lead / Release owner | Disabled; hosted Node/Go checks and Linux-hosted cross-builds passed in run `40828204023`; independent review and signed safety decision outstanding. |

## Release verification and evidence record

The workflow at [`../../.github/workflows/verify.yml`](../../.github/workflows/verify.yml) configures clean Node install/tests, Prisma validation, migrations, production build, Go tests on Linux and Windows, and Linux-hosted Linux/Windows amd64 cross-builds. Hosted run `40828204023` passed against commit `e086b5fab15953361ff242dd4841d72fa82b4a63`; this result covers only the encoded checks, not the remaining operational approvals and deployment evidence.

Complete this record for every candidate:

- Candidate commit and tag:
- Workflow revision and hosted run ID(s):
- Environment and runner matrix:
- Node install/test, Prisma validation, migrations, and build outcomes:
- Go Linux/Windows test and cross-build outcomes:
- Configuration/security checks and reports:
- Operational test/deployment environment references:
- Artifact store, access classification, and retention:
- Release owner and independent reviewers:
- Exceptions, failed checks, risk owners, and expiry/review dates:
- Final pass/fail decision and signed artifact:

No value is populated as a pass until the corresponding artifact is reviewed and linked.

## Acceptance status

This matrix is **draft and not approved**. Requirements, owners, and checks must be reviewed against the intended product scope. GATE-01 through GATE-07 remain open pending the specified owner decisions and external evidence. GATE-08 records the safety invariant; it does not authorize enforcement. Phase 0 release acceptance remains blocked until each applicable requirement has a candidate-revision-bound check, accountable owner decision, evidence reference, and dated release decision.
