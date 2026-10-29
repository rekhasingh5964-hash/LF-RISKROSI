# Phase 0 Evidence Provenance and Retention Register

**Status:** Draft evidence-handling proposal; evidence system, retention period, and owners are not approved  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Prepared:** 2026-10-29  
**Repository baseline observed:** `c7dac47e183433531449da3140f87d6d5046987b`

## Purpose and current status

This register proposes how Phase 0 approval, CI, security, legal/privacy, deployment, and operational evidence should be identified, protected, retained, reviewed, and linked to source revisions. It does not claim that an evidence repository, retention schedule, immutable store, or approval workflow currently exists.

The recorded repository baseline is local `HEAD` observed during preparation. The worktree contains uncommitted and untracked files; this is not a candidate release commit. Evidence acceptance must identify the exact candidate commit and configuration/environment revision actually tested.

## Evidence handling rules proposed for approval

1. Assign every artifact a unique evidence ID and record its owner, source requirement/gate, candidate commit, configuration revision, environment/deployment ID, procedure, date/time and timezone, result, reviewer, and restricted artifact reference.
2. Preserve the original output from CI or witnessed operations in an access-controlled evidence system. Avoid relying on manually retyped summaries or screenshots without the underlying run/result identifier and procedure.
3. Use a digest or signed manifest to identify artifact bytes when appropriate. A hash proves byte identity only; it does not prove that the artifact is authentic, complete, accurate, or approved. Retain the identity and authority of the signer/reviewer separately.
4. Link source-controlled records to the evidence by stable ID and restricted repository reference. Do not copy secrets, customer data, personal contact details, private CIDRs, credentials, signing keys, production connection strings, sensitive topology, or unredacted logs into public/source-controlled documentation.
5. Apply least-privilege access, access logging, protected backups, integrity monitoring, and documented export procedures to the evidence store. Define separate access for legal, security, operations, release, and independent reviewers.
6. Define retention, legal hold, deletion, backup expiry, and review periods with qualified legal/privacy and records owners before storing regulated or sensitive evidence. No retention period is set by this draft.
7. Record failures, exceptions, residual risks, owners, due dates, expiry/review dates, and superseding evidence. Do not delete superseded evidence until the approved retention/hold policy permits it.
8. Treat missing, stale, unsigned, or unreviewed evidence as **open / unverified**, never as a pass. Evidence must match the applicable candidate revision and deployment scope.

## Decisions required before this register is approved

| Decision ID | Decision | Accountable owner | Current status |
|---|---|---|---|
| EP-01 | Approved evidence system and authoritative location for CI, approvals, security, legal, deployment, and operational artifacts | Release / Operations owner | Not named; location not established |
| EP-02 | Artifact classification, access roles, reviewer authorization, and access-review cadence | Security / Legal-Privacy / Operations | Not approved |
| EP-03 | Retention, deletion, legal hold, backup, and restoration policy for each evidence class | Legal-Privacy / Records owner | Not approved; no periods supplied |
| EP-04 | Integrity and authenticity method: artifact digests, signatures, provenance, and trusted timestamps | Security / Release owner | Not approved |
| EP-05 | CI run/artifact retention and association to commit, workflow revision, runner, and environment | Release owner | Not established |
| EP-06 | Handling of personal data, customer data, secrets, and restricted network/deployment details in evidence | Privacy / Security owner | Draft safeguards stated above; owner approval outstanding |
| EP-07 | Review cadence, stale-evidence rules, revocation/supersession, and release decision ownership | Product / Security / Operations | Not approved |

## Phase 0 evidence index

This is an index of required artifacts and prepared repository records, not evidence that the underlying gates have passed. Restricted external evidence should be referenced by an access-controlled identifier, not copied into this table.

| Evidence ID | Gate / requirement | Source-controlled record or expected artifact | Evidence owner | Status / reference |
|---|---|---|---|---|
| P0-01 | GATE-01 product scope | `docs/compliance/phase0-product-scope.md`; signed approval tied to exact document hash and candidate revision | Product Owner | Draft and unsigned; GATE-01 open |
| P0-02 | GATE-02 threat assessment | `docs/security/threat-model-phase0.md`; completed six-boundary review and signed residual-risk register | Security Owner | Review packet prepared; signed review outstanding |
| P0-03 | GATE-03 legal/privacy decisions | `docs/compliance/dpdp-phase0-scope.md`; completed processing/role register and qualified signed review | Qualified Legal/Privacy Owner | Review packet prepared; qualified review outstanding |
| P0-04 | GATE-04 hosting/network | `docs/delivery/phase0-gate-04-deployment-evidence.md`; provider, region, deployed topology, and independent verification references | Technical Lead / Cloud Operator | Packet prepared; external deployment evidence outstanding |
| P0-05 | GATE-05 service objectives | `docs/delivery/phase0-gate-05-service-objectives.md`; approved definitions, monitoring/alert exercises, measurement, and rota evidence | Product / Operations Owner | Packet prepared; owner and operational evidence outstanding |
| P0-06 | GATE-06 recovery | `docs/delivery/phase0-gate-06-recovery-evidence.md`; backup/WAL evidence and witnessed PostgreSQL/Redis restore | Technical Lead / Operations | Packet prepared; production-equivalent recovery evidence outstanding |
| P0-07 | GATE-07 management access | `docs/delivery/phase0-gate-07-vpn-access-evidence.md`; restricted policy reference and witnessed allowed/denied access tests | Network Security Owner | Packet prepared; policy and tests outstanding |
| P0-08 | GATE-08 enforcement disabled | `docs/delivery/phase0-gate-08-enforcement-disabled-evidence.md`; test/CI artifacts and independent source/runtime review | Product Security / Release Owner | Hosted Node and Go tests and Linux-hosted Linux/Windows amd64 cross-builds passed in run `40828204023`; independent review and signed safety decision outstanding |
| P0-09 | Requirement traceability | `docs/delivery/phase0-requirement-traceability.md`; approved matrix with check results tied to candidate revision | Product / Security / Release Owners | Draft matrix prepared; approval and run artifacts outstanding |
| P0-10 | CI and configuration verification | `.github/workflows/verify.yml`; hosted run IDs, logs, test/build/migration reports, and artifact references | Release Owner | Hosted workflow run `40828204023` passed on commit `e086b5fab15953361ff242dd4841d72fa82b4a63`; original logs and reports must be retained through an approved evidence system |
| P0-11 | Evidence provenance and retention | This register plus approved evidence-system reference, classification, access, retention, and review policy | Release / Operations Owner | Draft proposal only; decisions and evidence system outstanding |
| P0-12 | Phase 0 release decision | Signed pass/fail decision listing accepted evidence IDs, exceptions, owners, and review dates | Release Owner and approving stakeholders | Not issued; Phase 0 acceptance remains blocked |

## Evidence record template

Create one record per artifact or coherent run:

- Evidence ID and requirement/gate:
- Artifact title and description:
- Candidate commit/tag and source/configuration revisions:
- Environment/deployment ID and scope:
- Procedure, inputs, and tool versions:
- Run date/time/timezone and operator:
- Result (pass/fail/partial/not applicable) and deviations:
- Reviewer name, role, authority, and review date:
- Artifact digest/signature/provenance reference:
- Access classification and restricted evidence-system URI/ID:
- Retention class, expiry/review date, and legal-hold status:
- Related risks, corrective actions, owner, and due date:
- Supersedes / superseded by:

Do not fill a result as “pass” unless the evidence has been independently checked against an approved acceptance criterion.

## Approval record

- Approving Release/Operations owner:
- Security reviewer:
- Legal/Privacy reviewer:
- Approved evidence repository and access reference:
- Retention/deletion policy reference and periods:
- Integrity/provenance method:
- Approval date and timezone:
- Conditions and review date:
- Signed approval artifact:

## Acceptance criteria

This policy is accepted only when named owners approve the evidence repository, access/classification model, retention and deletion rules, integrity/provenance approach, and review responsibilities. Phase 0 evidence is accepted only when each artifact is revision-bound, attributable, retrievable by authorized reviewers, current for the claimed environment, and linked to an explicit pass/fail decision. Until then, evidence handling and every dependent gate remain **open / unverified**.
