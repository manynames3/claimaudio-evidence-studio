# ClaimAudio Evidence Studio

ClaimAudio Evidence Studio is a production-style SaaS work sample for reviewing insurance recorded statements as timestamped claim evidence. The app turns a recorded statement into a transcript, claim-relevant evidence findings, contradiction candidates, evidence clips, supervisor review packets, and exportable claim-file work product. It is built as a realistic AWS/cloud/platform engineering sample, not as a generic transcription demo.

**Positioning:** a claim evidence workbench for adjusters, TPAs, SIU, and insurance defense teams.

**Live demo:** <https://claimaudio-evidence-studio.hangi87.workers.dev>

Screenshots are not committed yet. The live demo and local app show the current UI.

## Problem

Recorded statements often contain liability facts, injury details, prior-condition mentions, coverage facts, and inconsistencies, but long audio is slow to review and easy to misquote. Claim teams need exact quotes, timestamps, review decisions, and exportable memos.

## Solution

The app models a claim-review workflow around proof, not transcription alone:

- Recorded statement upload or sample-statement processing.
- Timestamped transcript with speaker labels.
- AI evidence findings that must include exact quote, timestamp, category, confidence, and why-it-matters.
- Human approve, reject, edit, clip, supervisor review, and export workflow.
- Audit events for key review and export actions.

## Operational Value

The repository shows how I would structure a low-volume pilot for a cloud workflow product:

- Cloudflare Workers deployment through OpenNext.
- Neon Postgres persistence for tenant-scoped claim data.
- AWS adapter scaffolding for S3, Transcribe, Bedrock, SQS, Step Functions, KMS, and export storage.
- Guardrail validation around AI output before persistence/export.
- Pilot auth, role gates, audit logging, deployment checks, and known limitations documented honestly.

## Tech Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS and local shadcn/ui-style components
- Zustand for client-side UI cache
- Neon Serverless Postgres and SQL migrations
- Cloudflare Workers with OpenNext for deployment
- AWS SDK adapters for S3, Transcribe, Bedrock, SQS, Step Functions, and KMS-backed exports
- GitHub Actions for typecheck, AI guardrail validation, Cloudflare build, and deploy

## Engineering Highlights

- Backend-ready service boundaries in `lib/services` and `lib/services/aws`.
- Tenant-scoped repository in `lib/db/claim-audio-repository.ts`.
- Signed HTTP-only pilot sessions with role-aware API guards in `lib/server/auth.ts`.
- AI prompt templates in `lib/ai/prompts` and validation in `lib/ai/validation.ts`.
- Upload gating for real audio until Neon, AWS, auth, and tenant scope are configured.
- Claim-file export generation with reviewer metadata and human-review disclaimers.
- Supervisor review workflow and audit event persistence.
- Cloudflare deployment workflow that checks deploy secrets before deploy.

## Architecture Overview

Start here:

- [Architecture](docs/architecture.md)
- [Reviewer guide](docs/reviewer-guide.md)
- [Security model](docs/security.md)
- [Runbook](docs/runbook.md)
- [Deployment](docs/deployment.md)
- [Testing](docs/testing.md)
- [Tradeoffs](docs/tradeoffs.md)
- [ADRs](docs/adrs/README.md)

## Evidence Matrix

| Area | Evidence |
|---|---|
| IaC | `wrangler.jsonc`, `open-next.config.ts`, SQL migrations in `db/migrations`. Terraform is not present. |
| CI/CD | `.github/workflows/deploy-cloudflare.yml` runs install, typecheck, AI guardrails, Cloudflare build, and deploy. |
| Security | Role-aware API guards, signed HTTP-only pilot sessions, tenant-scoped repository access, upload gating, S3/KMS adapter scaffolds. |
| Reliability | Processing state model, retry hooks, Transcribe polling path, explicit failure states, supervisor return workflow. DLQ/alarm automation is planned, not complete. |
| Observability | Cloudflare Worker observability enabled, app audit log events, processing/audit records in Neon. CloudWatch alarms are documented but not fully wired. |
| Cost | Cloudflare Workers, Neon free-tier pilot path, signed S3 upload, bounded upload size, sample mode with no AWS usage. |
| Operations | Runbook, deployment notes, teardown notes, known failure modes, pilot readiness gate in the UI. |
| Testing | TypeScript check, AI guardrail validation, Cloudflare build. Unit/e2e coverage is limited and documented. |
| Documentation | Architecture docs, reviewer guide, security, observability, cost model, testing, teardown, tradeoffs, and ADRs. |

## Local Quickstart

```bash
npm install
npm run dev
```

Open <http://localhost:3000/app>. The app redirects to `/login`.

Local default pilot access code:

```text
demo-pilot
```

For any external pilot, set real values for `CLAIMAUDIO_PILOT_ACCESS_CODE`, `CLAIMAUDIO_SUPERVISOR_ACCESS_CODE`, `CLAIMAUDIO_ADMIN_ACCESS_CODE`, and `CLAIMAUDIO_SESSION_SECRET`.

## Test and Validation Commands

```bash
npm run typecheck
npm run test:guardrails
npm run test
npm run build
npm run cf:build
git diff --check
```

`npm run test:guardrails` checks mock findings and contradictions for required quote, timestamp, category, confidence, why-it-matters, and forbidden conclusion language.

## Runtime Modes

The app remains runnable with no environment variables.

- **Sample mode:** uses committed synthetic Amazon Polly audio plus mock transcript, evidence, contradiction, clip, and export data.
- **Neon-backed pilot mode:** persists claim projects, transcript segments, findings, clips, export memos, review actions, and audit events.
- **AWS upload path:** when configured, creates signed S3 upload URLs, starts Transcribe, normalizes timestamped transcript segments, invokes Bedrock analysis, validates output, and persists only supported evidence.

## Neon + AWS Backend Path

1. Create a Neon project.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL`.
4. Run migrations:

```bash
npm run db:migrate
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Configure AWS and auth variables from `.env.example`.
7. Start the app and check `/app/settings` or `/api/health`.

## Deployment Overview

The app deploys to Cloudflare Workers through OpenNext.

Key files:

- `open-next.config.ts`
- `wrangler.jsonc`
- `.github/workflows/deploy-cloudflare.yml`

Commands:

```bash
npm run cf:build
npm run cf:deploy
```

GitHub Actions deploys from `main` when `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets are configured. The workflow uses `wrangler deploy --keep-vars` so application secrets stay in Cloudflare and are not committed.

More detail: [Deployment](docs/deployment.md).

## Security Model Summary

- Pilot auth uses access codes to create signed HTTP-only sessions.
- API routes enforce role sets for mutation, export, and supervisor actions.
- Repository access is tenant-scoped by session tenant ID.
- Real upload is disabled unless Neon, AWS, auth, and tenant scope are configured.
- AWS adapters assume encrypted S3/KMS storage for uploaded audio and generated exports.

This is not yet a full enterprise auth model. Cognito/Auth0, customer tenant provisioning, database-level tenant isolation, retention/legal hold enforcement, and complete IAM policy automation are documented next steps.

More detail: [Security](docs/security.md).

## Observability Model Summary

- Cloudflare Worker observability is enabled in `wrangler.jsonc`.
- App-level audit events track project creation, upload, transcription, analysis, review decisions, clips, exports, downloads, and supervisor review actions.
- Processing status is visible in the UI.
- CloudWatch alarms, DLQs, tracing, and dashboards are planned for the AWS async path.

More detail: [Observability](docs/observability.md).

## Cost Controls Summary

- Sample mode runs without AWS usage.
- Low-volume pilot design uses Cloudflare Workers and Neon free-tier Postgres.
- Signed upload URLs expire after 15 minutes.
- Audio uploads are capped at 100 MB.
- Export signed download URLs expire after 15 minutes.
- Teardown docs cover Cloudflare, Neon, and AWS cleanup.

More detail: [Cost model](docs/cost-model.md) and [Teardown](docs/teardown.md).

## Project Structure

```text
app/                    Next.js App Router pages and API routes
components/             UI components and workflow panels
db/migrations/          Neon Postgres schema migrations
lib/ai/                 Prompt templates and AI output validation
lib/client/             Browser API clients
lib/db/                 Neon repository and database access
lib/demo-audio/         Polly sample timing data and helpers
lib/mock-data/          Sample claim, transcript, evidence, and memo data
lib/server/             Auth, env, and API guard helpers
lib/services/           Service interfaces and mock implementations
lib/services/aws/       AWS service adapter scaffolds
public/demo-audio/      Synthetic Polly WAV used by the demo
scripts/                Migration, seed, guardrail, and Polly generation scripts
docs/                   Architecture, operations, security, and reviewer docs
```

## Known Limitations

- Current auth is pilot access-code based, not Cognito/Auth0.
- Database-level row-level security is not implemented.
- Real upload depends on configured AWS and browser file-upload support.
- SQS and Step Functions adapters exist, but the current processing route still uses a direct server-triggered path.
- CloudWatch alarms, DLQ dashboards, and full tracing are documented but not fully implemented.
- Exports are HTML/text work-product artifacts, not final binary PDF/DOCX packets.
- Evidence clips are metadata/transcript clips; real clipped audio artifacts are still planned.
- No claim system, document management, email, or file-note integration exists yet.

## What I Would Improve Next

1. Replace pilot access codes with Cognito/Auth0 JWT validation and tenant membership management.
2. Add database-level tenant isolation and retention/legal hold controls.
3. Move uploaded-audio processing fully behind SQS, Step Functions, retries, and DLQs.
4. Add CloudWatch alarms, structured logs, traces, and operational dashboards.
5. Generate final PDF/DOCX export packets with immutable audit IDs and signed S3 storage.
6. Add Playwright e2e smoke tests for upload, review, supervisor, and export flows.
7. Add Terraform or another IaC layer for AWS resources if this becomes a deployable production stack.

## Important Privacy Note

The committed audio and data are synthetic. Do not upload confidential claim files unless the deployment has signed auth, tenant scoping, Neon persistence, AWS encrypted storage, and customer-approved pilot controls configured.

©2026 SUPREME AI VENTURES LLC
