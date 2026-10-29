# Phase 0 Local Verification Record

**Status:** Local checks and one hosted CI run recorded; not a Phase 0 acceptance or production evidence package  
**Product:** LumeraVega SMB IN BOX / LF-RISKROSI  
**Recorded:** 2026-10-29  
**Environment:** Windows PowerShell, local development worktree

## Revision and scope

- Local Git `HEAD`: `c7dac47e183433531449da3140f87d6d5046987b`
- Worktree was not clean and contained uncommitted and untracked application, workflow, and documentation changes at the time of verification.
- Therefore, this record does not identify a single committed candidate release revision and must not be used as hosted release acceptance.
- Commands used the local checkout and installed dependencies; no clean dependency install is recorded locally.
- At the time of the initial local checks, a GitHub Actions query returned zero workflows because `.github/workflows/verify.yml` was still untracked locally.
- The workflow was subsequently committed and pushed in commit `e086b5fab15953361ff242dd4841d72fa82b4a63`; the hosted run below executed that exact commit.

## Local results

| Check | Command | Result | Limitations |
|---|---|---|---|
| Node test suite | `npm.cmd test` | **PASS** — 44 tests passed, 0 failed | Local execution only; not tied to hosted CI or a clean candidate commit. |
| Prisma schema validation | `npx.cmd prisma validate` | **PASS** — schema valid | Local validation only; does not execute migrations against a fresh PostgreSQL instance. |
| Production build | `npm.cmd run build` | **PASS** — Prisma Client generated and Next.js production build completed | Local build only; no release artifact provenance or deployment validation. |
| Fresh PostgreSQL migration attempt | `npm.cmd run db:migrate` against an isolated disposable PostgreSQL 16 container | **BLOCKED** — Docker could not create the container because its metadata store returned `read-only file system`; failure occurred before a container or database was created and before migrations ran. | No database was changed. Do not retry against the configured application database; use a writable isolated CI/test environment. |
| Go agent tests / cross-builds | `go test ./...` and workflow cross-build commands | **NOT RUN LOCALLY** — `go.exe` is not available in this environment | Hosted Linux and Windows Go tests and Linux-hosted cross-builds are recorded below. |

## Hosted CI result

| Item | Result |
|---|---|
| Workflow / run | `Verify`, run `40828204023` ([GitHub Actions run](https://github.com/rekhasingh5964-hash/LF-RISKROSI/actions/runs/40828204023)) |
| Event / branch | Push to `main` |
| Candidate commit | `e086b5fab15953361ff242dd4841d72fa82b4a63` |
| Overall conclusion | **SUCCESS** |
| Web job (`ubuntu-latest`) | **SUCCESS** — `npm ci`, Node tests, Prisma validation, migrations against the workflow's PostgreSQL 16 service, and production build completed successfully. |
| Agent job (`ubuntu-latest`) | **SUCCESS** — Go tests and Linux amd64 / Windows amd64 cross-build steps completed successfully. |
| Agent job (`windows-latest`) | **SUCCESS** — Go tests passed; the cross-build step was skipped because it is Linux-only in the workflow. |

This is hosted CI evidence for the checks encoded by that workflow and this commit. It does not validate production deployment, external hosting/residency, legal or security approval, service objectives, production backups/restore, or an active host enforcement capability.

## Not covered by this record

- Clean dependency installation via `npm ci`.
- A separate local successful migration run; the local attempt was blocked, while the hosted workflow migration passed against its PostgreSQL 16 service.
- Windows-hosted cross-build of the agent; this workflow does not perform that step on Windows.
- Production deployment validation, security scanning, or production-like operational evidence.
- Any legal/privacy, threat-model, provider/region, network-boundary, availability, support, or recovery approval.

Do not infer a production-readiness or Phase 0 acceptance decision from these checks. Hosted CI passed for the exact commit identified above, while the separate local migration attempt was blocked by the Docker host's read-only metadata store and did not create a container or modify a database. The hosted run does not replace operational and approval evidence required by the other Phase 0 gates.

## Evidence provenance

The command output was observed in the active local development session on 2026-10-29. A durable, access-controlled CI/evidence repository and retention policy have not yet been approved; see [`phase0-evidence-provenance.md`](./phase0-evidence-provenance.md). This source-controlled summary is not a substitute for original runner logs or reports.
