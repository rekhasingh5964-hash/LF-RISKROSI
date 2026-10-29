# Phase 0 Product Scope Baseline

**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Baseline artifact:** `UNBEATABLE_PHASE0_BASELINE`  
**Status:** Draft scope record for Phase 0 review; not a final approval or production-readiness decision  
**Accountable owner supplied by user:** Rockey (Product Owner / Super Admin)  
**Baseline date:** 2026-10-29

The GATE-01 approval record prepared for this baseline is [`phase0-gate-01-approval.md`](./phase0-gate-01-approval.md). It is unsigned; GATE-01 remains open.

## Scope statement

This document records the working Phase 0 product boundary associated with the current repository snapshot. It is intentionally narrow: it describes the product surface that is represented in source, the controls already implemented or explicitly disabled, and the evidence that remains required before a sign-off decision is accepted.

The repository currently represents a platform for:

- SMB/MSSP tenant administration and partner/site metadata
- deterministic risk and ROSI evaluation workflows
- consent, privacy notice, and erasure-related workflow evidence
- endpoint inventory, lifecycle telemetry, and incident records
- audit trail and evidence export foundations
- API governance, security control catalog, and signed command-delivery scaffolding
- local readiness and operational observability checks

This baseline does not assert a legal compliance determination, an operational certification, or an approved production deployment.

## In-scope product capabilities represented by the repository

The current implementation is considered in-scope for Phase 0 baseline definition only to the extent the repository contains concrete source or config evidence for it.

1. Application shell and tenant-aware API surface
   - Next.js App Router entry points and authenticated dashboard/API patterns
   - tenant-scoped data handling and role-gated administrative views
   - scoped application configuration and middleware behavior

2. Risk and ROSI foundations
   - deterministic risk calculation and exposure scoring workflows
   - risk and governance record structures
   - operator-side review and ranking metadata

3. Consent, privacy, and audit evidence
   - consent notices, data-principal references, and consent/revocation records
   - audit and evidence export logic for activity and containment events
   - webhook delivery tracking and request/response status records

4. Endpoint and incident lifecycle records
   - device inventory, enrollment metadata, revocation state, and lifecycle event records
   - incident intake and containment command audit workflow foundations
   - bounded response and evidence export behavior

5. Observability and recovery preparation
   - structured request and worker logs with request IDs and bounded metrics
   - local Prometheus/Grafana profile and readiness-probe scripts
   - PostgreSQL recovery validation script and operational recovery planning artifacts

6. Safety invariant and disabled enforcement
   - privileged host enforcement is intentionally reported as `ENFORCEMENT_UNAVAILABLE`
   - no active WFP or `nftables` policy installation or host quarantine behavior is implemented
   - host containment remains explicitly disabled until Phase 9 readiness gates are met

## Explicitly out of scope or blocked until evidence is supplied

The following items are not accepted as Phase 0 completion criteria on the basis of prose or local defaults alone:

- Signed Product Owner approval with a verified commit/tag/revision
- Signed legal/privacy review and DPDP applicability decision record
- Verified sovereign hosting provider, region, network boundary, and access restrictions
- SLA, incident-response, and recovery objectives tied to measured evidence
- Hosted CI/CD run evidence or artifact provenance for release validation
- Production deployment authorization and operational ownership sign-off
- Host-level enforcement, rollback, and active containment activation
- Any claim that the repository is production-ready, legal-compliant, or deployable without the missing evidence

## Current decision record

The user-supplied Phase 0 scope decision is:

- Product owner: Rockey (user-designated Product Owner / Super Admin)
- Approval intent: establish the Phase 0 baseline and evidence gate as the current product boundary
- Scope review status: draft / partial sign-off reported; not yet accepted as a final approval
- Evidence required before acceptance: verified commit/tag, exact source revision, signed approval artifact, and approved scope conditions

## Acceptance gate for this scope baseline

This document should be treated as a working baseline, not a sign-off. The following are required before GATE-01 is considered passed:

1. Exact baseline document and revision/hash are recorded.
2. The approved scope, out-of-scope claims, and deferred items are signed by the accountable owner.
3. The review references a verified repository commit or tag and an attached signed artifact.
4. Any exceptions or conditions are explicitly recorded and associated with named owners.

If any of the above are missing, the current status remains: reported, unverified, or not implemented.
