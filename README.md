# ClaimAudio Evidence Studio

ClaimAudio Evidence Studio is a SaaS product demo for reviewing insurance recorded statements as timestamped claim evidence.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Zustand local state
- Preloaded Amazon Polly sample recorded statement audio with local mock transcript, evidence, contradiction, clip, and export data
- Neon Postgres for paid-pilot persistence
- AWS SDK server-only adapters for S3 signed uploads, Amazon Transcribe, Amazon Bedrock, SQS, Step Functions, and encrypted exports
- Pilot access-code auth with signed HTTP-only sessions, code-assigned roles, role-aware UI, tenant-scoped API calls, and TODO hooks for Cognito/Auth0

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/app](http://localhost:3000/app). You will be redirected to `/login`.

Local default pilot access code:

```text
demo-pilot
```

Set `CLAIMAUDIO_PILOT_ACCESS_CODE`, `CLAIMAUDIO_SUPERVISOR_ACCESS_CODE`, and `CLAIMAUDIO_SESSION_SECRET` before any external pilot. Users do not choose their own role; the access code assigns it.

## MVP Notes

The sample-statement demo path uses a synthetic Amazon Polly recorded statement at `public/demo-audio/auto-bi-7842-recorded-statement.wav`. Transcript, evidence findings, contradictions, exports, and clips remain local mock data, but their timestamps are aligned to the generated audio through `lib/demo-audio/polly-demo-timings.json`. When AWS is configured, the uploaded-audio path is backend-connected for low-volume pilot use:

- creates a persisted claim project in Neon
- returns a signed S3 upload URL
- stores uploaded audio in an SSE-KMS encrypted S3 bucket
- starts an Amazon Transcribe batch job
- normalizes Transcribe JSON into timestamped transcript segments
- invokes Amazon Bedrock with strict quote/timestamp evidence prompts
- persists only findings that pass validation and quote-support checks
- generates claim-file-style HTML evidence memo exports from reviewed findings
- records export generation and export download as separate audit events

If Neon is configured but AWS is not, the UI disables real audio upload and keeps the sample statement available. This prevents creating claim records that cannot actually receive or transcribe audio.

TODO comments still mark where full SQS/Step Functions orchestration, production retries, real audio clipping, Cognito/Auth0 JWT validation, and claim-system integrations should plug in.

## Neon + AWS Backend Path

The app remains runnable with no environment variables. For a paid pilot, use Neon free tier for Postgres and AWS for encrypted storage, workflow, transcription, analysis, exports, and logs.

1. Create a Neon project named `claimaudio-evidence-studio`.
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` to the Neon pooled connection string.
4. Run all schema migrations:

```bash
npm run db:migrate
```

5. Seed the current demo claim data into Neon:

```bash
npm run db:seed
```

6. Start the app and check `/app/settings` or `/api/health` for backend readiness.

```bash
npm run dev
```

## Polly Demo Audio

The flagship sample claim uses a two-speaker Amazon Polly conversation:

- Adjuster voice: Matthew
- Claimant voice: Joanna
- Scenario: auto BI recorded statement with lane-change uncertainty, work-errand coverage facts, delayed treatment, prior lower-back condition, missing witness contact info, and contradiction-ready speed/lane/pain chronology.

Regenerate the demo audio and timing JSON with:

```bash
npm run demo:polly
```

This command calls AWS Polly using your local AWS credentials, stitches raw PCM responses into a browser-playable WAV, and writes the timing file used by the transcript and evidence markers. The generated file is synthetic and non-confidential; do not use real claim facts in this script.

The Neon schema lives in `db/migrations` and includes:

- tenant and user placeholders
- claim projects
- audio assets
- processing jobs
- transcript segments
- evidence findings
- contradictions
- evidence clips
- export memos
- user review actions
- audit log events

The server repository lives in `lib/db/claim-audio-repository.ts`. API routes are available for backend migration work:

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/[id]`
- `POST /api/projects/[id]/processing`
- `POST /api/projects/[id]/review-actions`
- `POST /api/projects/[id]/clips`
- `POST /api/projects/[id]/exports`
- `POST /api/projects/[id]/exports/download`
- `POST /api/projects/[id]/supervisor-review`
- `GET /api/audit-events`

Protected app routes and API routes require a signed pilot session unless `CLAIMAUDIO_REQUIRE_AUTH=false`. Mutation routes require `DATABASE_URL`. Read-only routes fall back to mock data when Neon is not configured.

Pilot roles are assigned by access code:

- `CLAIMAUDIO_PILOT_ACCESS_CODE` creates an adjuster session.
- `CLAIMAUDIO_SUPERVISOR_ACCESS_CODE` creates a supervisor session.
- `CLAIMAUDIO_ADMIN_ACCESS_CODE` creates an admin session for controlled internal use.

The frontend is backend-aware:

- Dashboard hydrates from `GET /api/projects`.
- Project overview, workspace, and export center hydrate from `GET /api/projects/[id]`.
- New project creation uses `POST /api/projects` when Neon is configured, then starts `POST /api/projects/[id]/processing`.
- Finding approvals/rejections/edits use `POST /api/projects/[id]/review-actions`.
- Clip creation uses `POST /api/projects/[id]/clips`.
- Export generation uses `POST /api/projects/[id]/exports`.
- Export downloads are audited through `POST /api/projects/[id]/exports/download`.
- Supervisor submit/approve/return uses `POST /api/projects/[id]/supervisor-review`.
- Zustand remains the UI cache and falls back to local mock behavior when Neon is absent.

## Low-Volume Pilot Runbook

For a small paid pilot, use this operating model:

1. Create the Neon free-tier project.
2. Set `DATABASE_URL` in `.env.local`.
3. Run `npm run db:migrate`.
4. Run `npm run db:seed`.
5. Provision the AWS resources documented below or reuse the current pilot resources.
6. Configure Worker/local environment variables from `.env.example`.
7. Confirm `/api/health` shows `neonConfigured: true` and `awsConfigured: true`.
8. Confirm `/api/health` shows `auth.authConfigured: true` before an external pilot.
9. Create a project with either the sample statement or a controlled test audio file.
10. For uploaded audio, confirm the processing flow reaches `readyForReview` after Transcribe and optional Bedrock extraction.
11. Verify approvals, edits, clips, supervisor review, exports, and audit events survive refresh.

This is enough for low-volume workflow pilots with controlled, non-confidential or customer-approved pilot files. It is not yet enough for broad confidential claim-file rollout until Cognito/Auth0, customer tenant provisioning, retention/legal hold enforcement, and production processing orchestration are complete.

## Cloudflare Deployment

The app is configured for Cloudflare Workers through OpenNext for Cloudflare.

Key files:

- `open-next.config.ts`
- `wrangler.jsonc`

Deployment commands:

```bash
npm run cf:build
npm run cf:deploy
```

GitHub-based deployment is configured in `.github/workflows/deploy-cloudflare.yml`.
Pushes to `main` run:

1. `npm ci`
2. `npm run typecheck`
3. `npm run test:guardrails`
4. `npm run cf:build`
5. `npx wrangler deploy --keep-vars`

Add these GitHub repository secrets before relying on automatic deploys:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The workflow uses `--keep-vars` so existing Cloudflare Worker secrets such as `DATABASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLAIMAUDIO_PILOT_ACCESS_CODE`, `CLAIMAUDIO_SUPERVISOR_ACCESS_CODE`, and `CLAIMAUDIO_SESSION_SECRET` remain in Cloudflare and are not committed to GitHub.

The deployed Worker uses:

- Cloudflare Workers for the Next.js frontend, SSR pages, and API routes.
- Neon Postgres for persisted project/evidence/audit data.
- Cloudflare Worker secret `DATABASE_URL` for the Neon connection string.
- Cloudflare Worker secrets for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- Cloudflare Worker secrets for `CLAIMAUDIO_PILOT_ACCESS_CODE` and `CLAIMAUDIO_SESSION_SECRET`.
- Worker vars for `CLAIMAUDIO_BACKEND_MODE`, `CLAIMAUDIO_TENANT_ID`, `AWS_REGION`, S3 buckets, KMS key ARN, SQS queue URL, Step Functions ARN, and Bedrock model ID.

Current deployment URL:

```text
https://claimaudio-evidence-studio.hangi87.workers.dev
```

Useful checks:

```bash
curl https://claimaudio-evidence-studio.hangi87.workers.dev/api/health
```

If `DATABASE_URL` changes, update the Cloudflare secret:

```bash
printf '%s' "$DATABASE_URL" | npx wrangler secret put DATABASE_URL
```

If AWS Worker credentials are rotated:

```bash
printf '%s' "$AWS_ACCESS_KEY_ID" | npx wrangler secret put AWS_ACCESS_KEY_ID
printf '%s' "$AWS_SECRET_ACCESS_KEY" | npx wrangler secret put AWS_SECRET_ACCESS_KEY
```

If pilot auth secrets are rotated:

```bash
printf '%s' "$CLAIMAUDIO_PILOT_ACCESS_CODE" | npx wrangler secret put CLAIMAUDIO_PILOT_ACCESS_CODE
printf '%s' "$CLAIMAUDIO_SUPERVISOR_ACCESS_CODE" | npx wrangler secret put CLAIMAUDIO_SUPERVISOR_ACCESS_CODE
printf '%s' "$CLAIMAUDIO_SESSION_SECRET" | npx wrangler secret put CLAIMAUDIO_SESSION_SECRET
```

## Backend-Ready Mock Services

Service abstractions live in `lib/services`:

- `storage-service.ts`
- `transcription-service.ts`
- `analysis-service.ts`
- `export-service.ts`
- `clip-service.ts`
- `audit-log-service.ts`

The sample-statement project flow simulates upload, transcription, analysis, and ready-for-review states locally. The preloaded sample recording is committed under `public/demo-audio`, so no AWS keys or environment variables are required to run the app after the audio has been generated.

Server-only AWS production adapter scaffolds live in `lib/services/aws`:

- `aws-storage-service.ts`: S3 signed upload URLs. Bucket defaults enforce SSE-KMS encryption for browser uploads.
- `aws-workflow-service.ts`: SQS message plus Step Functions execution start.
- `aws-transcription-service.ts`: Amazon Transcribe job start with speaker labels.
- `aws-analysis-service.ts`: Bedrock invocation using the production prompt templates, Cloudflare-compatible fetch handler, and finding validation.
- `aws-export-service.ts`: encrypted S3 export artifact storage and signed downloads.

Required AWS environment variables are documented in `.env.example`. Credentials are intentionally not required for local demo mode.

## AI Prompt Templates

Production-ready prompt templates live in `lib/ai/prompts`:

- `evidenceExtractionPrompt.ts`
- `contradictionDetectionPrompt.ts`
- `claimMemoPrompt.ts`
- `followUpQuestionsPrompt.ts`
- `supervisorReviewPrompt.ts`

These templates are designed for Amazon Bedrock or an OpenAI-compatible analysis service. The current uploaded-audio path uses Bedrock model ID `us.anthropic.claude-sonnet-4-5-20250929-v1:0`. The production path should:

1. Store encrypted audio in S3 using KMS.
2. Generate transcript segments with Amazon Transcribe or Transcribe Call Analytics.
3. Send transcript segments and claim context to Bedrock using the prompt builders.
4. Validate model JSON with `lib/ai/validation.ts`.
5. Reject findings that lack exact quote, timestamp, category, confidence, transcript segment link, or `whyItMatters`.
6. Reject any output using forbidden conclusion language such as “fraudulent claim” or “claimant is lying.”
7. Persist validated findings, contradictions, memos, and audit events in Neon Postgres.

The sample-statement mock analysis service imports the prompt builders and validation utilities but does not call a real model. Uploaded audio uses `AwsAnalysisService` after Transcribe completes.

## Paid Pilot Next Steps

Before real claim files are uploaded:

1. Replace pilot access-code auth with Cognito/Auth0 JWT validation and customer tenant provisioning.
2. Add RLS or equivalent database-level tenant isolation in addition to API tenant checks.
3. Replace synchronous processing polling with SQS and Step Functions.
4. Add processing-job tables, retries, dead-letter queues, and admin retry tooling.
5. Add real evidence clip generation with stored clipped audio artifacts.
6. Harden exports into claim-file-ready PDF/DOCX/HTML packets.
7. Extend human-review gates to contradiction review, supervisor signatures, and final export/download audit events.
8. Add CloudWatch alarms, dead-letter queues, and processing-job retry dashboards.
9. Add retention/legal hold controls before production customer data.

## Verification

```bash
npm run typecheck
npm run test:guardrails
npm run build
```

`npm run test:guardrails` validates that mock findings and contradictions include exact quotes, timestamps, supported categories, confidence scores, and no forbidden conclusion language.
