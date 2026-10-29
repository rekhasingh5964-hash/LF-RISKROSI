# Phase 0 Threat Boundary and Non-Enforcement Baseline

**Product:** LumeraVega SMB IN BOX  
**Baseline artifact:** `UNBEATABLE_PHASE0_BASELINE`  
**Status:** Draft evidence record; security-owner review and signature outstanding  
**Owner supplied by user:** Abhishek (Solutions Architect)  
**Scope:** Six trust boundaries and explicit non-goals represented by the current repository. This document does not assert legal approval, production security, or deployment verification.

## Safety invariant: host enforcement disabled

Privileged OS-level host containment (Windows Filtering Platform or Linux `nftables`) and automated threat quarantine are **DISABLED**. The current agent may verify and acknowledge a signed command, but it does not apply firewall, process, or network changes; it reports `ENFORCEMENT_UNAVAILABLE`. Command delivery, approval, watchdog helper logic, and stored policy values are not proof of isolation or rollback.

Do not enable or describe host containment as operational until the Phase 9 gates are implemented, independently tested on supported systems, reviewed, and signed by the accountable security/product/operations owners. At minimum, those gates include a privileged OS adapter, verified lease and idempotent rollback, pinned and reachable control-plane configuration, MFA-backed distinct approval, trusted detection, failure-injection/recovery tests, and an operational rollback procedure.

## Threat-boundary matrix

| # | Boundary / assets | STRIDE threats considered | Existing repository controls | Required evidence / residual risk |
|---|---|---|---|---|
| 1 | Authenticated user to tenant APIs; sessions, roles, and tenant data | **S:** stolen/replayed sessions; **T:** forged tenant identifiers or request bodies; **R:** disputed administrative changes; **I:** cross-tenant reads; **D:** credential stuffing or request exhaustion; **E:** role escalation and CSRF-assisted actions | Session-backed identity, server-side tenant scoping in implemented routes, same-origin checks for browser mutations, and audit records exist in parts of the application. | Route-by-route negative tenant and role authorization tests; centralized login/API rate limits; MFA/SSO; CSRF and session-lifecycle review; audit coverage review. Existing patterns do not establish coverage for every API. |
| 2 | Endpoint agent to control plane; enrollment tokens, device credentials, inventory, and telemetry | **S:** cloned device identity; **T:** forged telemetry; **R:** repudiated device actions; **I:** credential or inventory disclosure; **D:** endpoint/API flooding; **E:** stolen device credential used to cross tenant boundaries | Single-use enrollment, hashed device credentials, tenant binding, revocation, and bounded allowlisted lifecycle telemetry are implemented. | Replay, rotation, revocation-race, and cross-tenant tests; secure agent credential storage, edge rate limits, secure updates, stronger device identity, and monitored revocation remain outstanding. |
| 3 | Control plane to endpoint command; signing keys, approval records, and host state | **S:** forged administrator/device; **T:** command alteration/replay; **R:** disputed approval; **I:** key or command disclosure; **D:** severed management channel or orphan host; **E:** compromised admin/key or unsafe privileged action | Signed command workflow, distinct-admin approval, expiry checks, and an unsupported-enforcement acknowledgment exist. Enforcement is deliberately disabled and reports `ENFORCEMENT_UNAVAILABLE`. | Do not permit host action. Phase 9 requires independently reviewed MFA-backed approval, pinned deployment addresses, privileged Windows/Linux adapters, leases, idempotent verified rollback, trusted detector, and fault-injection tests. |
| 4 | Control plane webhook dispatcher to external destinations; payloads and shared secrets | **S:** spoofed receiver; **T:** changed/replayed webhook; **R:** false delivery/deletion claim; **I:** secret or personal-data leakage; **D:** receiver timeout/retry exhaustion; **E:** SSRF or unsafe destination selection | HTTPS/public-address URL validation, signed delivery, bounded retry workflow, and delivery status tracking are present in the implementation. | DNS rebinding and redirect behavior, secret rotation, receiver authentication, idempotency, payload minimization, and independently verified deletion require review/tests. Delivery acknowledgment alone does not prove erasure. |
| 5 | Application to PostgreSQL, Redis, backups, and operator secrets | **S:** stolen operator/service credentials; **T:** database, queue, backup, or key tampering; **R:** incomplete audit trail; **I:** personal data or secrets exposed; **D:** data loss or queue outage; **E:** excessive operator privilege | Application-level tenant relations, signed audit/evidence foundations, and local container health checks exist. | Private deployment networking, least privilege, managed secrets/key rotation, retention/legal-hold policy, access reviews, monitored audit, WAL/PITR setup, and witnessed restore evidence are not established by this source. |
| 6 | Build, dependency, CI/CD, and deployment pipeline; source, artifacts, and configuration | **S:** compromised maintainer/action; **T:** malicious dependency or artifact; **R:** untraceable release; **I:** leaked secrets; **D:** broken/blocked deployment; **E:** unreviewed workflow or deployment permissions | Lockfiles, tests, a repository workflow, and reviewed migration files exist. | Pin and review third-party actions/dependencies, secret scanning, protected release/tag signing, least-privilege CI, provenance, immutable artifacts, deployment configuration review, and rollback evidence. Hosted CI evidence is not yet attached. |

This is a threat-boundary inventory, not a completed STRIDE assessment. The security owner must review abuse cases, likelihood/impact, mitigations, and residual-risk acceptance and sign a revision tied to an exact source commit before GATE-02 passes.

## Explicit non-goals

- No autonomous threat detection, EDR, vulnerability scanning, or threat-triggered quarantine.
- No privileged firewall, process, or network containment; no active dead-man rollback.
- No statutory compliance determination, legal advice, CERT-In filing, or guarantee that an incident meets a reporting deadline.
- No claim of MeitY empanelment, sovereign hosting, residency, availability, or recovery from application configuration or regional metadata alone.
- No proof of downstream deletion from webhook delivery status alone.
- No live integration, health, or alert data for catalogued third-party security tools until a connector is implemented and verified.

## Verification linkage

Record the reviewed source commit, threat-model revision, security-owner approval artifact, relevant CI run IDs, and deployment/configuration evidence in the Phase 0 gate tracker. An absent, unsigned, or stale artifact leaves GATE-02 open.
