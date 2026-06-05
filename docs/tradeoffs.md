# Tradeoffs

## Pilot Auth Instead Of Cognito/Auth0

Pilot access codes made the demo deployable quickly while preserving role-aware API checks. The tradeoff is that this is not an enterprise identity model.

Next step: Cognito/Auth0 JWT validation, tenant membership, invitations, and admin controls.

## Direct Processing Route Instead Of Full Async Orchestration

The current route can start and poll processing directly, which keeps the low-volume pilot understandable. The tradeoff is limited resilience compared with SQS, Step Functions, retries, and DLQs.

Next step: move uploaded-audio processing fully behind async orchestration.

## HTML/Text Exports Instead Of Final PDF/DOCX

HTML/text exports are inspectable and easy to generate in the Worker runtime. The tradeoff is that real claim-file packets usually need polished PDF/DOCX output and stronger signature/audit metadata.

Next step: generate final PDF/DOCX artifacts server-side and store them in encrypted S3.

## Tenant-Scoped Queries Instead Of Database RLS

Repository methods scope queries by tenant ID. The tradeoff is that protection currently relies on application-level discipline.

Next step: add database-level RLS or another defense-in-depth control.

## Mock Sample Data Plus Backend Adapters

The sample mode keeps the app runnable without credentials. The tradeoff is that reviewers must distinguish sample evidence from real uploaded-audio analysis.

Next step: publish a repeatable uploaded-audio smoke test once browser/file-upload constraints are resolved.
