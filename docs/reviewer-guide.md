# Reviewer Guide

This guide is for a busy recruiter or hiring manager reviewing the repository quickly.

## What To Look At First

1. [README](../README.md) for the 60-second summary.
2. [Architecture](architecture.md) for the system shape and runtime flow.
3. `lib/services/aws` for AWS adapter boundaries.
4. `app/api/projects/[id]/processing/route.ts` for the processing workflow.
5. `lib/ai/validation.ts` and `scripts/validate-ai-guardrails.ts` for AI output guardrails.
6. `.github/workflows/deploy-cloudflare.yml` for CI/CD discipline.

## What This Project Proves

- Ability to translate a domain workflow into a structured web product.
- Cloud runtime awareness across Cloudflare Workers, Neon, and AWS.
- Practical security thinking: role gates, signed sessions, tenant scoping, upload gating, no fake production claims.
- AI workflow discipline: exact quote/timestamp requirements and validation before export.
- Operational thinking: audit logs, failure states, deploy checks, cost controls, teardown docs, and known limitations.

## Where To Find Evidence

| Concern | Files |
|---|---|
| Frontend | `app/app`, `components`, `app/globals.css` |
| Backend/API | `app/api`, `lib/server` |
| Persistence | `lib/db/claim-audio-repository.ts`, `db/migrations` |
| AWS adapters | `lib/services/aws` |
| AI prompts | `lib/ai/prompts` |
| AI validation | `lib/ai/validation.ts`, `scripts/validate-ai-guardrails.ts` |
| Auth/RBAC | `lib/server/auth.ts`, `lib/server/session.ts`, `middleware.ts` |
| CI/CD | `.github/workflows/deploy-cloudflare.yml` |
| Deployment | `wrangler.jsonc`, `open-next.config.ts` |
| Operations docs | `docs/runbook.md`, `docs/security.md`, `docs/observability.md`, `docs/teardown.md` |

## How To Run Or Inspect

```bash
npm install
npm run dev
```

Open <http://localhost:3000/app> and use the local default pilot code `demo-pilot`.

Validation commands:

```bash
npm run typecheck
npm run test:guardrails
npm run cf:build
git diff --check
```

## Strongest Engineering Decisions

- Treating AI output as untrusted until exact quote/timestamp support is present.
- Keeping the app runnable locally without AWS keys.
- Separating mock services from AWS adapter scaffolds.
- Tenant-scoping repository access from the authenticated session.
- Gating real upload until backend readiness requirements are met.
- Documenting what is incomplete instead of masking it.

## Tradeoffs

- Pilot auth is faster to demo than Cognito/Auth0 but not production-grade.
- Direct route-triggered processing is simpler than full SQS/Step Functions orchestration.
- HTML/text exports are easier to inspect than final PDF/DOCX output, but less claim-file polished.
- Zustand works well for UI cache and mock mode, but deeper server-state tooling may be useful later.

## Demo-Only Or Incomplete

- Local sample mode uses synthetic Polly audio and mock evidence data.
- SQS and Step Functions adapters are present but not the primary processing path yet.
- CloudWatch alarms and DLQ dashboards are documented but not fully implemented.
- Real audio clipping and PDF/DOCX export generation are planned.
- Cognito/Auth0, database RLS, retention/legal hold, and claim-system integrations are not complete.

## What I Would Improve Next

1. Add production identity provider integration.
2. Add database-level tenant isolation.
3. Move upload processing fully async with SQS, Step Functions, retries, and DLQs.
4. Add Playwright e2e smoke tests.
5. Add Terraform for AWS resources if the repo becomes a deployable platform stack.
