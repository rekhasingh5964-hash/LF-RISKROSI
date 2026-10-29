# Phase 0 GATE-05 — Service Objectives and Support Evidence Packet

**Status:** Prepared for Product/Operations owner decision; targets and operational coverage are not verified  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Accountable owner:** Product / Operations owner not yet named  
**Prepared:** 2026-10-29

## Revision under review

| Item | Revision identifier |
|---|---|
| Repository HEAD at preparation | `c7dac47e183433531449da3140f87d6d5046987b` |
| Prometheus scrape configuration | [`../../monitoring/prometheus.yml`](../../monitoring/prometheus.yml) |
| Prometheus configuration SHA-256 | `695ABAB68FE499B118230267F586344F27715A1558EB82E927865A35696F65EA` |
| Readiness probe | [`../../scripts/ops/probe-health.js`](../../scripts/ops/probe-health.js) |
| Probe SHA-256 | `9170CB7A4927996D68B9B3EFC0BFC82676B421283790E1F8A959A833C9037C26` |
| Local operations manual | [`../../reliability_manual.md`](../../reliability_manual.md) |
| Manual SHA-256 | `B35262EDD4E4BFF3848E912DD43858F52321ACAA5ABD3DDFDAAAA17DD411C0B9` |

These files were untracked and the worktree was not clean when this packet was prepared. The hashes identify the exact file bytes; repository HEAD identifies the source baseline, not a commit containing these drafts. Recompute the hashes after any change. Local configuration is not evidence that monitoring is deployed or objectives are being met.

## Declared targets requiring owner decision

These values are recorded as user-supplied targets, not approved service commitments or demonstrated performance:

| Objective | Supplied target | Owner decision / definition |
|---|---|---|
| Availability | 99.9% | Service boundary, measurement window, calculation, exclusions, maintenance policy, data source, and approval remain to be defined. |
| P1 response | <= 15 minutes | P1 definition, clock start/stop, acknowledgement versus mitigation, support channel, clock coverage, and owner remain to be defined. |
| High-severity statutory incidents | 24x7 coverage reported | Severity and reportability are human/legal decisions; accountable rota, handoff, backup coverage, escalation, and evidence are not supplied. |

## Proposed measurement and support contract for owner approval

The following is a measurement template, not an asserted commitment. The accountable Product/Operations owner must accept, amend, or reject each element before launch.

### Availability

- In-scope customer-facing service and dependency boundary:
- Measurement window and reporting cadence:
- Measurement source and independent synthetic-check locations:
- Availability calculation (eligible minutes, successful/failed checks, and aggregation):
- Readiness versus customer transaction criteria:
- Planned maintenance treatment:
- Exclusions and service credits/remedies, if any:
- Minimum evidence retention and report owner:
- Error budget/escalation policy:

Use the approved formula once specified. Do not equate container uptime, a single readiness response, API request metrics, or process-local counters with 99.9% service availability.

### Priority-1 response

- P1 definition, impact/severity thresholds, and examples:
- Clock start event and authoritative timestamp source:
- Response means acknowledgement, triage start, mitigation, or other explicitly selected milestone:
- Clock stop/suspension rules:
- Customer reporting channel and acknowledgement path:
- Business-hours or continuous coverage:
- Primary and backup owner, escalation chain, and handoff:
- Audit record and test scenario for measuring compliance:

### 24x7 high-severity incident coverage

- Named primary/backup roles and approved contact/rota reference:
- Definition of high severity and conditions requiring urgent legal/security review:
- Detection-to-awareness and escalation clock ownership:
- Approved communication and escalation channels:
- Handoff evidence and periodic coverage test:
- Human decision authority for legal reportability and external notification:

This packet does not set statutory deadlines or determine reportability. The application's internal six-hour timer is readiness metadata only.

## Current repository evidence and limits

- A bounded CLI readiness probe exists and checks HTTP readiness plus database and Redis status. It is a point-in-time probe, not a scheduler, alert route, availability measure, or coverage rota.
- The readiness endpoint is used by the local Compose web health check. A local healthy result does not establish deployed availability.
- A local Prometheus configuration scrapes the web metrics endpoint at a 15-second interval. The local monitoring profile is optional; the local operations manual says metrics are process-local and reset on web restart.
- The repository does not establish deployed monitoring, durable/distributed metrics, alert rules, alert delivery, on-call ownership, alert acknowledgement, or measured availability over an approved window.
- A synthetic health probe returning success, metrics endpoint accessibility, dashboard presence, or alert-rule syntax alone does not demonstrate objective attainment or operational response.

## Evidence required before GATE-05 can pass

| Evidence ID | Required evidence | Minimum acceptance evidence | Owner | Status / reference |
|---|---|---|---|---|
| S-01 | Approved objective definitions | Signed revision-specific definitions for availability, P1 response, high-severity incidents, measurement window, exclusions, and clock semantics | Product / Operations owner | Not supplied |
| S-02 | Service measurement | Named production-like or production environment, synthetic checks from approved locations, transaction criteria, timestamped results over the agreed window, and reproducible calculation/report | SRE / Operations | Not supplied |
| S-03 | Monitoring and alert rules | Version-controlled alert rules and validation output for availability, dependency health, and critical service signals; thresholds tied to approved objectives | Monitoring owner | Not supplied |
| S-04 | End-to-end alert delivery | Witnessed test from signal through routing to primary and backup; retained timestamps, acknowledgement, escalation, and failure-path results | Operations owner | Not supplied |
| S-05 | P1 response exercise | Recorded P1 scenario with start/acknowledgement milestones, named responders, and measured response against approved definition | Product / Operations | Not supplied |
| S-06 | 24x7 coverage | Approved rota, escalation contacts held securely, backup/handoff procedure, and witnessed out-of-hours test | Operations / Security | Not supplied |
| S-07 | Review and retention | Evidence location, access control, retention, report cadence, accountable reviewer, exceptions, and follow-up process | Release / Operations | Not supplied |

Do not put personal phone numbers, private responder details, alert credentials, or customer data in this source-controlled packet. Reference the approved access-controlled rota and evidence system instead.

## Owner decision record

- Named accountable Product/Operations owner:
- Objective definitions and approved measurement method:
- Approved production/service boundary:
- Effective date and review date:
- Monitoring and alerting owner:
- P1 and high-severity definitions:
- Primary/backup rota and secure reference:
- Exceptions, exclusions, conditions, and escalation:
- Evidence repository/reference and retention:
- Signed approval artifact:

Decision:

- [ ] Approve the defined objectives and evidence plan for the stated scope.
- [ ] Approve with recorded conditions, owners, and due dates.
- [ ] Do not approve; list required decisions or evidence.

## GATE-05 completion criteria

GATE-05 remains **open** until a named Product/Operations owner approves the objective definitions and support model, monitoring and alerting are exercised end-to-end in a named environment, availability evidence covers the approved measurement window, P1 response and 24x7 coverage are tested, and results are retained with exact revision/environment references. Targets alone, local readiness, dashboards, or untested alert rules do not pass this gate.
