# Testing and Validation

## Current Commands

```bash
npm run typecheck
npm run test:guardrails
npm run test
npm run build
npm run cf:build
git diff --check
```

## What Is Covered

- TypeScript compile correctness.
- AI guardrail validation against mock findings and contradictions.
- Next.js production build.
- OpenNext/Cloudflare build.
- CI deploy workflow runs typecheck, guardrails, Cloudflare build, and deploy.

## AI Guardrail Checks

`scripts/validate-ai-guardrails.ts` checks that findings and contradictions include:

- Exact quotes.
- Timestamps.
- Categories.
- Confidence values.
- `whyItMatters`.
- No forbidden conclusion language.

## What Is Not Yet Covered

- Unit tests for route handlers and repository methods.
- Playwright e2e tests for dashboard, upload, workspace, supervisor review, and exports.
- Integration tests against Neon.
- Integration tests against AWS services.
- Contract tests for Bedrock output parsing.
- Terraform validation because Terraform is not present.

## Recommended Next Tests

1. Unit tests for AI validation edge cases.
2. API route tests for auth and role enforcement.
3. Playwright smoke test for sample workflow.
4. Playwright smoke test for export gating.
5. Integration test for uploaded-audio processing with a short synthetic audio file.
6. Build/deploy smoke test after Cloudflare deployment.
