# Runbook

This runbook covers local demo, low-volume pilot checks, common failures, and recovery steps.

## Local Demo

```bash
npm install
npm run dev
```

Open <http://localhost:3000/app>. Use the local default pilot code `demo-pilot`.

## Pilot Readiness Checks

Check the UI:

- `/app/settings` shows backend readiness, auth status, tenant scope, AWS status, and audit log.
- `/app/projects/new` shows whether real upload is available.

Check the API:

```bash
curl https://claimaudio-evidence-studio.hangi87.workers.dev/api/health
```

Unauthenticated health responses are intentionally minimal.

## Processing Failure Modes

| Failure | Likely Cause | Action |
|---|---|---|
| Real upload disabled | Missing Neon, AWS, auth, or tenant config | Check Worker vars/secrets and `/app/settings`. |
| Signed upload fails | S3 CORS, expired URL, content type, credentials | Recreate project/upload, verify S3 bucket policy/CORS, rotate credentials if needed. |
| Transcribe stuck | Batch job still running or failed | Poll processing endpoint; inspect Transcribe console and output bucket. |
| No findings | Bedrock disabled, output invalid, validation rejected all findings | Inspect audit event metadata and validation logs. |
| Export disabled | No approved/edited findings or contradictions | Approve evidence before generating claim-file exports. |
| Supervisor buttons disabled | Current role lacks supervisor authority | Sign in with supervisor, defense attorney, or admin pilot code. |

## Retry and Recovery

- UI has retry hooks for processing runs.
- Uploaded-audio processing can be restarted through `POST /api/projects/[id]/processing`.
- Existing Transcribe job names are deterministic by audio asset ID, so retry can reconcile an existing job.
- Supervisor review packets can be returned with notes instead of silently failing review.

## Rollback

- Cloudflare deploy rollback should use the Cloudflare dashboard or redeploy a known-good GitHub commit.
- Database migrations are forward-only SQL in this repo. Prepare manual rollback SQL before applying migrations to a shared pilot database.
- Because GitHub Actions uses `--keep-vars`, Worker secrets are not overwritten by a rollback deploy.

## Escalation Checklist

1. Capture claim project ID and audio asset ID.
2. Check app audit events.
3. Check Cloudflare Worker logs.
4. Check Neon rows for project, processing jobs, transcript segments, findings, and audit events.
5. Check AWS service console for S3 object, Transcribe job, Bedrock invocation failure, or Step Functions execution if used.
