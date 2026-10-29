# Phase 0 GATE-07 — Management Access and Sovereign VPN Evidence Packet

**Status:** Prepared for Network Security / Platform Operations; access restriction unverified  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Accountable owner:** Network Security Lead not yet identified  
**Prepared:** 2026-10-29

## Current repository evidence

The Phase 0 tracker declares that management access should be restricted to a Sovereign VPN pool. The exact CIDRs were not supplied. The referenced `nginx/conf.d/control-plane.conf` configuration and deployed route/firewall evidence are not present in the current repository snapshot. A claim or example address in other documentation is not an approved production allowlist.

Accordingly, this packet does not contain CIDRs, credentials, topology details, or claim that management access is restricted. Do not copy real network ranges into this public/source-controlled review packet. Keep the exact allowlist and sensitive policy configuration in the approved access-controlled network configuration/evidence system and cite its restricted reference here.

## Required policy properties

The Network Security Lead and platform operator must document and verify:

- Which administrative and management surfaces are protected, including application routes, infrastructure control planes, monitoring, database/cache consoles, deployment systems, and support access.
- The authoritative VPN address pools and their lifecycle/ownership, stored only in approved restricted storage.
- Deny-by-default ingress policy, permitted management paths, required authentication/MFA, and any trusted-proxy boundary.
- Correct source-address handling through load balancers/proxies; client-supplied forwarding headers must not bypass enforcement.
- Whether IPv4 and IPv6 are both covered, and how alternate ingress, peering, direct host access, emergency access, and failover paths are controlled.
- Logging, alerting, access review, change approval, emergency revocation, and periodic policy recertification.

An application-level origin check or a declared VPN target alone is not network enforcement evidence.

## Evidence register

Reference artifacts by restricted evidence-system identifier; do not embed secrets, private topology, credentials, or the exact CIDR list in this packet.

| Evidence ID | Required evidence | Minimum acceptance evidence | Owner | Status / restricted reference |
|---|---|---|---|---|
| V-01 | Accountable ownership and approved policy | Named Network Security Lead, authorized approver, scope of protected management surfaces, policy revision, and dated approval | Network Security | Not supplied |
| V-02 | VPN pool allowlist | Exact CIDRs, authoritative allocation/owner, environment, approval history, and secure configuration reference | Network / VPN operator | Not supplied |
| V-03 | Deployed ingress and routing policy | Reviewed proxy/load-balancer, route table, firewall/security-group/NACL policy, DNS, IPv4/IPv6 paths, and exact deployed configuration revision | Network / Platform operator | Not supplied |
| V-04 | Authentication and trusted proxy | MFA/identity policy for administrators, proxy trust configuration, verified source-address behavior, and negative test against forwarded-header spoofing | Identity / Platform owner | Not supplied |
| V-05 | Negative reachability validation | Witnessed test from a permitted VPN source and denied non-VPN sources across all public/alternate ingress paths; include environment, timestamp, procedure, result, and source revision | Independent network verifier | Not supplied |
| V-06 | Logging, monitoring, and access review | Evidence of access logging, alert routing, periodic roster/policy review, emergency revocation procedure, and review owner/date | Security / Operations | Not supplied |
| V-07 | Change management and recovery | Approved change/rollback procedure, policy-change audit trail, break-glass authorization, and tested restoration of the prior safe policy | Platform Operations | Not supplied |

## Validation record

- Environment / deployment ID:
- Protected management surfaces:
- Restricted evidence-system reference for CIDR allowlist:
- Firewall/proxy/routing policy revision:
- Source-address and trusted-proxy verification:
- IPv4 and IPv6 coverage:
- Alternate ingress and break-glass paths reviewed:
- Allowed-source test procedure/result:
- Denied-source test procedure/result:
- Test date/time and timezone:
- Operator and independent witness:
- Logging/alerting and access-review evidence:
- Exceptions, residual risks, owners, and due dates:
- Rollback/change record:
- Signed Network Security decision artifact:

Decision:

- [ ] Management access is restricted for the exact surfaces and environment reviewed.
- [ ] Verified with explicit conditions; record each condition, owner, and due date.
- [ ] Not verified / do not approve; record missing evidence and remediation.

## GATE-07 completion criteria

GATE-07 remains **open** until a named Network Security owner approves the exact restricted access policy, deployed route/firewall/proxy configuration is reviewed for all ingress paths, and witnessed positive and negative reachability tests pass for the named environment and revision. A declared VPN pool, an absent configuration file, an application origin check, or an untested policy does not pass this gate.
