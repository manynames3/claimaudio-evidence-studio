# Cost Model

This project is designed for a low-idle, low-volume pilot.

## Current Cost-Aware Choices

- Local sample mode runs without AWS usage.
- Cloudflare Workers can host the app with low idle cost.
- Neon free tier is sufficient for small demo/pilot datasets.
- S3 signed uploads avoid proxying large audio files through the app server.
- Signed upload/download URLs expire after 15 minutes.
- Uploads are capped at 100 MB.
- Bedrock is only used on uploaded-audio analysis, not local sample mode.

## Expected Cost Drivers

- Amazon Transcribe minutes.
- Bedrock input/output tokens.
- S3 storage and requests.
- KMS requests.
- Neon compute/storage above free-tier limits.
- Cloudflare Worker requests and build/deploy usage.

## Cost Controls To Add

- Per-tenant upload quota.
- Per-tenant processing budget.
- Bedrock token usage logging.
- Retention cleanup jobs.
- S3 lifecycle policies for audio, transcripts, and exports.
- Alerts on unexpected Transcribe/Bedrock volume.

## What Is Not Modeled

- No formal AWS cost estimate is included.
- No Cost Explorer integration exists.
- No automated budget alarms are committed.
- No Terraform module exists to enforce lifecycle policies.
