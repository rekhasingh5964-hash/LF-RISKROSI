# Phase 0 GATE-08 — Host Enforcement Disabled Evidence Packet

**Status:** Repository-level invariant and test references prepared; hosted CI evidence outstanding  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Accountable owner supplied by user:** Product Security Lead (name not supplied)  
**Prepared:** 2026-10-29

## Revision under review

| Item | Revision identifier |
|---|---|
| Repository HEAD at preparation | `c7dac47e183433531449da3140f87d6d5046987b` |
| CI workflow | [`../../.github/workflows/verify.yml`](../../.github/workflows/verify.yml) |
| CI workflow SHA-256 | `42F66DC069563C3CB0F237C3F3D12B4A52E0AC18F676B5B49A8D48EBC19F8AE6` |
| Node enforcement-status test | [`../../tests/containment-enforcement.test.js`](../../tests/containment-enforcement.test.js) |
| Node test SHA-256 | `CBA3D1A2C4E798FE6E7AB9C16F53E6919A019B546B609DDEB9E533F15C845176` |
| Go agent test | [`../../agent/cmd/agent/main_test.go`](../../agent/cmd/agent/main_test.go) |
| Go test SHA-256 | `469539C97E8909D81684CDFA68885F99EF22AFECA8CCC79B93EFEFF6465C0BBC` |
| Go agent main source | [`../../agent/cmd/agent/main.go`](../../agent/cmd/agent/main.go) |
| Go main source SHA-256 | `9D263FC225C89FE7CAE7B00D9626AAFC13F5D9759BF3C664E894A6D54013D351` |

These files were untracked and the worktree was not clean when this packet was prepared. The hashes identify the exact file bytes; repository HEAD identifies the source baseline, not a commit containing these drafts. Recompute the hashes after any change. Hosted workflow results must identify the actual tested commit.

## Safety invariant

Privileged host enforcement remains **DISABLED**. The agent reports `ENFORCEMENT_UNAVAILABLE`; command acknowledgement is not proof of host isolation. No WFP or `nftables` policy should be installed, no process should be terminated, and no autonomous quarantine or active rollback should be inferred from command delivery or helper logic.

The Node test checks the unavailable status and rejects an acknowledgement that claims the action was applied. The Go test exercises that the agent acknowledges the command with a failed/unavailable result and `applied: false`. Other Go tests exercise watchdog helper logic; those tests do not establish that a host firewall or process action is implemented or active.

Do not enable host enforcement until all separate Phase 9 implementation, independent review, supported-OS verification, failure-injection and recovery tests, operational authorization, and signed deployment-specific allowlist gates pass.

## CI coverage represented by the workflow

The checked-in workflow defines:

- A web job on `ubuntu-latest` that runs `npm ci`, the Node test suite, Prisma validation, migrations, and the Next.js build.
- An agent job on both `ubuntu-latest` and `windows-latest` that runs `go test ./...`.
- Linux-hosted cross-build commands for Linux amd64 and Windows amd64 agent targets.

This is workflow configuration only. It does not show that a hosted run has occurred or passed for the candidate release commit. The workflow currently uses version-tagged third-party actions; a separate workflow/action pinning and supply-chain review is not established by this packet.

## Evidence required for GATE-08

| Evidence ID | Required evidence | Minimum acceptance evidence | Owner | Status / reference |
|---|---|---|---|---|
| E-01 | Invariant source and tests | Exact revision of the Node and Go tests, result asserting `ENFORCEMENT_UNAVAILABLE`, and review that `applied` cannot be represented as true | Product Security | Source/test references present; hosted evidence outstanding |
| E-02 | Hosted Node and Go tests | Successful hosted CI run IDs, candidate commit, job/OS matrix, logs and retained artifact references | Release owner | Not supplied |
| E-03 | Cross-platform builds | Successful Linux amd64 and Windows amd64 build outputs from the hosted run, candidate commit, and artifact references | Release owner | Not supplied |
| E-04 | Enforcement implementation audit | Review confirming there is no active host networking/process enforcement path in the candidate and no deployment switch that silently enables it | Independent Security reviewer | Not supplied |
| E-05 | Runtime/deployment behavior | If an agent is deployed for testing, witnessed command acknowledgement with unavailable status and no host state change; include scope, environment, exact binary hash, and test procedure | Product Security / Operations | Not supplied |
| E-06 | Safety gate and authorization | Signed statement that host enforcement remains disabled; Phase 9 activation prerequisites and separate change-approval authority documented | Product / Security / Operations | Not supplied |

## Verification run record

- Candidate commit:
- Workflow file revision:
- Hosted CI provider / run IDs:
- Node job result and artifact reference:
- Linux Go test result and artifact reference:
- Windows Go test result and artifact reference:
- Linux amd64 build result / artifact:
- Windows amd64 build result / artifact:
- Independent source/runtime review and reviewer:
- Runtime test environment and binary hash (if applicable):
- Observed status and confirmation no host state was changed:
- Deviations or failures:
- Follow-up owner and due date:
- Signed Product Security decision artifact:

Decision:

- [ ] Keep enforcement disabled; repository/hosted evidence reviewed for the exact revision.
- [ ] Evidence incomplete; keep enforcement disabled and list required actions.
- [ ] Do not accept; record the reason and remediation.

## GATE-08 completion criteria

GATE-08 is a safety invariant, not authorization to enforce. Record it as **disabled and unavailable** while the Node/Go assertions and hosted cross-platform CI evidence are reviewed. Any missing or failed check keeps host action disabled and must continue to report `ENFORCEMENT_UNAVAILABLE`. No acceptance may claim host isolation. Activation, if ever separately requested, requires all Phase 9 gates, independent verification, operational testing, and signed authorization.
