# Phase 0 GATE-04 — Hosting and Sovereign Boundary Evidence Packet

**Status:** Prepared for Technical Lead / cloud operator completion; deployment claims unverified  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Technical lead supplied by user:** Abhishek  
**Prepared:** 2026-10-29

## Revision under review

| Item | Revision identifier |
|---|---|
| Repository HEAD at preparation | `c7dac47e183433531449da3140f87d6d5046987b` |
| Docker Compose | [`../../docker-compose.yml`](../../docker-compose.yml) |
| Docker Compose SHA-256 | `1945CAF9FBE305A3042266A3A48E4B4E290405D69DFFF7C4023CB1A2822CE89A` |
| Environment-variable template | [`../../.env.example`](../../.env.example) |
| Environment template SHA-256 | `689BEFCF229FA75005E842E9C0CD7C03827BF79E3406085C4A1DCD9EFCAE92FA` |

These configuration files were untracked and the worktree was not clean when this packet was prepared. The hashes identify the exact file bytes reviewed; the repository HEAD identifies the source baseline, not a commit containing these drafts. Recompute the hashes after any change. Never include secret values in this record or its evidence attachments.

## What repository configuration shows (not deployment proof)

- Compose defines local PostgreSQL, Redis, application, worker, migration, and optional monitoring services. PostgreSQL and Redis have no published host ports in this Compose file; this does not prove that a deployed database or cache is private.
- The web service publishes container port 3000 as `3000:3000`, which may bind on all host interfaces. The configuration does not establish a trusted reverse proxy, TLS termination, firewall policy, or public-ingress restrictions.
- Compose requires database, Redis, and application keys via environment variables. `.env.example` contains placeholders, not actual secrets, and does not establish a managed secrets vault, key lifecycle, or production access policy.
- Local monitoring ports are bound to loopback in this Compose configuration. This is not evidence that deployed monitoring endpoints are similarly restricted.
- No Terraform configuration or state-locking setup is represented in the identified repository snapshot. No provider, deployment region, sovereign VPC, egress policy, or cloud security-group evidence is established here.
- `IN-SOUTH-01` and `ap-south-1` references elsewhere are declared metadata/targets only; they do not prove provider location, region, data residency, or zero international routing.

## Required deployment evidence register

For each claim, provide a source artifact or independently verifiable external evidence. Record the deployment identifier, environment, tested revision, date, verifier, result, and access-controlled artifact reference. Redact secrets and sensitive network details from this document; store them only in the approved evidence system.

| Evidence ID | Required decision / evidence | Required artifact or verification | Owner | Status / reference |
|---|---|---|---|---|
| D-01 | Cloud provider and empanelment status | Provider identity, applicable empanelment listing/attestation and validity date, account/project, and verification source | Technical lead / cloud operator | Not supplied |
| D-02 | Actual deployment region and data locations | Provider deployment record for application, database, Redis, backups/WAL, logs, metrics, CI artifacts, support systems, and disaster-recovery copies | Cloud operator | Not supplied |
| D-03 | Sovereign network boundary | Reviewed infrastructure-as-code and deployed VPC/VNet, subnet, route, security-group/firewall, DNS, ingress/egress, peering, and private-service evidence; include exact IaC revision and state-lock configuration | Cloud/network operator | Not supplied |
| D-04 | Data-flow and external route inventory | Verified data-flow diagram and destination inventory covering webhook recipients, email/SMS, identity, observability, support, CI/CD, backups, subprocessors, and cross-region paths | Security / privacy / operations | Not supplied |
| D-05 | Public ingress and trusted proxy | Deployed proxy/load-balancer configuration, TLS/certificate policy, trusted proxy/header handling, public DNS/ingress exposure, and external validation results | Platform operator | Not supplied |
| D-06 | Database and Redis isolation | Deployed listener/bind state, network policies/firewall rules, service identity and least privilege, transport encryption, and negative external reachability test | Platform operator | Not supplied |
| D-07 | Secrets and key management | Vault/KMS identity, key ownership, access control, rotation/revocation evidence, encryption use, and incident procedure; no secret values | Security / platform owner | Not supplied |
| D-08 | Backup, retention, and recovery locations | Backup/WAL destinations and regions, encryption/access controls, retention/deletion policy, restore test, and recovery environment evidence | Operations owner | Not supplied |
| D-09 | Admin and support access | Approved access model, exact restricted CIDRs held in approved secure storage, deployed VPN/firewall policy, MFA/identity controls, operator roster, access review, and witnessed negative access test | Network security / operations | Not supplied |
| D-10 | Independent validation and sign-off | Reviewer, tested environment and date, commands/procedure, exact deployed revision/configuration, outcome, deviations, corrective actions, signed artifact | Technical lead / independent reviewer | Not supplied |

## Deployment decision record

- Provider and account/project:
- Provider attestation/listing reference and validity:
- Environment/deployment ID:
- Application, database, cache, backup, log, monitoring, and support regions:
- Data-flow diagram and revision:
- Infrastructure-as-code revision and state backend/locking evidence:
- Public ingress and trusted proxy:
- Database/Redis isolation validation:
- Egress, peering, webhook, and subprocessor findings:
- Secrets/KMS and operator-access evidence reference:
- Backup/restore evidence reference:
- Residual risks, exceptions, accountable owners, and review date:
- Independent verifier and date:
- Signed deployment decision artifact:

Decision:

- [ ] Deployment boundary verified for the exact environment and revision listed.
- [ ] Verified with explicit conditions; list conditions, owners, and due dates.
- [ ] Not verified / do not approve; list missing evidence and remediation.

## GATE-04 completion criteria

GATE-04 remains **open** until the accountable operator supplies and independently verifies provider, region, network-boundary, deployment, access, and relevant data-location evidence tied to the exact environment and revision, with a dated signed decision. Repository configuration or region metadata alone is not proof of empanelment, sovereign hosting, residency, restricted routing, or private database/Redis exposure. No production or data-residency claim should be made until the evidence is reviewed and accepted.
