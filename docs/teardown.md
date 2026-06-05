# Teardown

This document covers cleanup for demo and pilot resources.

## Local

```bash
rm -rf .next .open-next
```

Do not delete `.env.local` until any secret values have been rotated or captured elsewhere.

## Cloudflare

1. Delete or disable the Worker deployment.
2. Remove Worker secrets.
3. Remove repository deploy secrets if the repo no longer deploys.
4. Confirm the live URL no longer serves the app.

## Neon

1. Export or archive data if needed.
2. Delete the Neon project or branch.
3. Rotate any leaked/stale `DATABASE_URL` values.

## AWS

Clean up resources used by the pilot:

- S3 audio bucket objects.
- S3 export/transcript bucket objects.
- KMS key grants/policies if created only for this project.
- Transcribe jobs and output artifacts.
- SQS queue and DLQ.
- Step Functions state machine executions.
- IAM users/access keys used for the Worker.
- Bedrock access configuration if dedicated to this pilot.

## Data Safety

Before teardown, confirm whether any customer-approved pilot audio, transcripts, or exports must be retained, deleted, or placed under legal hold. This repo does not yet automate retention/legal hold.
