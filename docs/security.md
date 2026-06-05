# Security Model

This is a pilot-grade security model with clear production gaps. It is designed to avoid fake claims while showing security-aware engineering.

## Authentication

- Pilot access codes create signed HTTP-only sessions.
- The server assigns role based on access code.
- Session cookies use `httpOnly`, `sameSite=lax`, `secure` in production, and a fixed max age.
- `CLAIMAUDIO_REQUIRE_AUTH=false` exists only for local/internal demo use.

Production next step: replace pilot access-code auth with Cognito/Auth0 JWT validation and tenant membership.

## Authorization

- API routes call `requireAuth`.
- Mutation routes require writable roles.
- Supervisor approve/return actions require supervisor, defense attorney, or admin roles.
- Export routes require export-capable roles.

## Tenant Scope

- Session payload includes `tenantId`.
- Repository construction receives tenant ID.
- SQL queries are scoped by tenant ID.

Production next step: add database-level row-level security or equivalent defense-in-depth.

## Secrets Management

- `.env.example` contains placeholders only.
- Cloudflare Worker secrets hold `DATABASE_URL`, AWS credentials, and pilot access/session secrets.
- GitHub Actions deploys with `wrangler deploy --keep-vars` so Worker secrets are not committed or replaced by source.

## Data Protection

- Real upload is disabled unless Neon, AWS, signed auth, and tenant scope are configured.
- S3 upload/download uses signed URLs.
- AWS export storage uses SSE-KMS when configured.
- Upload size is capped at 100 MB.
- The committed audio and data are synthetic.

## IAM Approach

The code expects AWS credentials with access to:

- Create signed S3 upload and download URLs.
- Start and poll Amazon Transcribe jobs.
- Invoke a configured Bedrock model.
- Send SQS messages and start Step Functions executions when async orchestration is wired.

Least-privilege policies should scope access to the specific buckets, KMS key, SQS queue, Step Functions state machine, Transcribe actions, and Bedrock model. This repo does not yet include Terraform/IAM policy definitions.

## Network Boundaries

- Browser talks to Cloudflare Worker.
- Worker talks to Neon and AWS services.
- Browser uploads audio directly to S3 via signed URL.
- No private VPC or WAF policy is modeled in this repo.

## Audit Logging

Audit events record project creation, upload registration, transcription/analysis events, finding and contradiction decisions, clip creation, export generation/download, and supervisor review actions.

## Known Gaps

- No Cognito/Auth0.
- No database RLS.
- No customer-managed tenant admin/invitation workflow.
- No retention/legal hold enforcement.
- No SIEM export.
- No formal compliance certification claim.
