# Observability

The repository includes basic observability for a pilot and documents what would be added for production.

## Current Signals

- Cloudflare Worker observability is enabled in `wrangler.jsonc`.
- Audit events are persisted through `audit_log_events`.
- Processing status is visible in the UI and persisted on audio/project state.
- Export generation and download are separate audit events.
- Supervisor review submit/approve/return actions are audited.

## Useful Log Context

When investigating an issue, capture:

- Claim project ID.
- Audio asset ID.
- Transcription job name.
- S3 object key.
- Export memo ID.
- Audit event ID if available.

## Metrics To Add Next

- Upload success/failure count.
- Transcribe job duration and failure rate.
- Bedrock validation rejection count.
- Findings per statement.
- Exports generated/downloaded.
- Supervisor return rate.
- Processing latency from upload to ready-for-review.

## Alerts To Add Next

- Transcribe failure or timeout.
- Bedrock invocation/validation failures.
- SQS DLQ depth.
- Step Functions failed executions.
- S3 upload errors.
- Neon query failures.
- Export storage failures.

## Dashboard Shape

A production dashboard should show:

- Current processing jobs by state.
- Last 24-hour upload and processing failure counts.
- Average time to ready-for-review.
- DLQ and Step Functions failure panels.
- Export and download counts.
- Audit event volume by action type.

## Current Limitations

No CloudWatch dashboard, alarms, traces, or DLQ monitor is committed yet. The docs and adapter scaffolds identify where those controls belong.
