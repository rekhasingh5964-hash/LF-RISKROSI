# Phase 0 GATE-06 — Backup, Restore, and Recovery Evidence Packet

**Status:** Prepared for Technical Lead / Operations completion; production recovery objectives unverified  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Technical lead supplied by user:** Abhishek  
**Prepared:** 2026-10-29

## Revision under review

| Item | Revision identifier |
|---|---|
| Repository HEAD at preparation | `c7dac47e183433531449da3140f87d6d5046987b` |
| Synthetic PostgreSQL PITR script | [`../../scripts/ops/verify-pitr.sh`](../../scripts/ops/verify-pitr.sh) |
| PITR script SHA-256 | `BC650C83B7F9352C96FABE7B017AC5BF65E623F9ACE74C5BAE03EB1FD0B37CFA` |
| Local operations manual | [`../../reliability_manual.md`](../../reliability_manual.md) |
| Manual SHA-256 | `B35262EDD4E4BFF3848E912DD43858F52321ACAA5ABD3DDFDAAAA17DD411C0B9` |

These files were untracked and the worktree was not clean when this packet was prepared. The hashes identify the exact file bytes; repository HEAD identifies the source baseline, not a commit containing these drafts. Recompute the hashes after any change. Never record production credentials, connection strings, encryption keys, or sensitive customer data in this source-controlled packet.

## Recovery objectives requiring approval

The following targets are recorded as user-supplied values, not verified or approved production commitments:

| Objective | Declared target | Required owner decision |
|---|---|---|
| Recovery Time Objective (RTO) | <= 4 hours | Define the service/data scope, when timing starts and stops, acceptable degraded service, measurement/witness, and approved recovery procedure. |
| Recovery Point Objective (RPO) | <= 15 minutes | Define the protected data scope, maximum acceptable loss measured against which event/time, measurement method, and treatment of unarchived transactions. |

Targets must be approved by accountable Product/Operations owners and tied to a specific environment and architecture. A synthetic test result or a script threshold does not make the targets operationally achievable.

## Existing repository exercise and limitations

The checked-in PITR script is an isolated synthetic PostgreSQL 17 exercise using temporary Docker containers and volumes. It creates a baseline and a later transaction, restores to a selected time, checks the expected records, and measures restore-to-promotion time in that test environment. Its printed RPO/RTO bounds validate the synthetic exercise’s selected test conditions only.

The exercise does **not** establish:

- production backup scheduling, retention, access controls, or encryption;
- continuous production WAL archival or backup completeness;
- the production restore path, data volume, dependencies, staffing, or recovery duration;
- Redis persistence/backup/recovery or consistency with PostgreSQL;
- measured production RPO/RTO, a witnessed operational recovery, or statutory compliance.

The local operations manual explicitly states that no production backup schedule, WAL archive continuity, or witnessed restore is established by the repository. Do not use a local Docker volume as a verified backup. No PITR run was performed as part of preparing this packet.

## Required recovery evidence register

Complete each applicable item with exact environment, date/time and timezone, tested commit/configuration revision, operator and independent witness, procedure, measured result, and a protected artifact reference.

| Evidence ID | Required evidence | Minimum acceptance evidence | Owner | Status / reference |
|---|---|---|---|---|
| R-01 | Approved RTO/RPO definitions | Signed scope, service/data boundary, clock start/stop, measurement method, dependencies, exclusions, and named approving owners | Product / Operations | Not supplied |
| R-02 | Backup design and operation | Approved schedule, backup types, retention, encryption, immutable/off-site copy where required, access control, monitoring, failure alerting, and last successful run evidence | Database / Operations | Not supplied |
| R-03 | PostgreSQL WAL/PITR continuity | Production configuration and archive destination, continuity/restore-point evidence, monitoring, retention, and demonstrated point-in-time selection | Database operator | Not supplied |
| R-04 | Redis recovery | Approved persistence/backup mechanism, protected copy/location, recovery procedure, and restore validation for queue/cache data as applicable | Operations | Not supplied |
| R-05 | Cross-service consistency and dependencies | Recovery order and treatment of PostgreSQL/Redis/job state, secrets/KMS, DNS/network, application binaries/config, and external dependencies | Architecture / Operations | Not supplied |
| R-06 | Production-equivalent restore drill | Isolated authorized environment, representative data volume, exact procedure, timestamps, integrity/application checks, measured RTO/RPO, independent witness, and retained results | Operations / independent witness | Not supplied |
| R-07 | Failure and access controls | Backup failure alert exercise, restore access approval, credential/key availability and revocation path, evidence of least privilege, and documented escalation | Security / Operations | Not supplied |
| R-08 | Runbook and follow-up | Reviewed runbook, named roles and communications, unresolved findings, remediation owners/due dates, and scheduled re-test date | Operations owner | Not supplied |

Do not use production customer data in a drill unless the approved test design, privacy/security controls, and authorization explicitly allow it. Keep detailed infrastructure paths and recovery credentials in the approved restricted system.

## Recovery drill record

- Environment and deployment ID:
- Tested application/database/cache revisions:
- Authorized change/incident reference:
- Data scope and approximate volume:
- Backup identifiers and backup timestamps:
- Restore target timestamp / recovery point:
- RTO start event, end event, and elapsed time:
- RPO measurement reference and observed data-loss interval:
- PostgreSQL integrity and application-level validation:
- Redis/queue validation and reconciliation:
- Dependency/key/network recovery validation:
- Operators and independent witness:
- Deviations, failed steps, and residual risks:
- Corrective actions, owners, and due dates:
- Evidence artifact location/reference and access classification:
- Run date/time/timezone and next drill date:
- Signed result and accountable owner decision:

## Decision

- [ ] Objectives approved and witnessed recovery demonstrates both targets for the defined scope.
- [ ] Approved with conditions; record each condition, owner, due date, and interim risk decision.
- [ ] Targets not demonstrated / do not approve; record gap and remediation.

## GATE-06 completion criteria

GATE-06 remains **open** until the accountable owners approve the scoped RTO/RPO definitions, production backup and recovery controls are evidenced, PostgreSQL and Redis recovery requirements are addressed, and a production-equivalent restore is independently witnessed with measured RTO/RPO meeting the approved targets. A passing synthetic script, local test, backup configuration, or undocumented manual claim alone does not pass this gate.
