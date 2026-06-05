# Deployment

The app deploys to Cloudflare Workers through OpenNext.

## Files

- `open-next.config.ts`
- `wrangler.jsonc`
- `.github/workflows/deploy-cloudflare.yml`

## Local Build

```bash
npm run cf:build
```

## Manual Deploy

```bash
npm run cf:deploy
```

## GitHub Actions Deploy

The workflow runs on pushes to `main` and manual dispatch.

Steps:

1. Checkout.
2. Setup Node 22.
3. `npm ci`.
4. `npm run typecheck`.
5. `npm run test:guardrails`.
6. Validate Cloudflare deploy secrets.
7. `npx wrangler whoami`.
8. `npm run cf:build`.
9. `npx wrangler deploy --keep-vars`.

Required GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## Worker Vars and Secrets

Committed Worker vars live in `wrangler.jsonc`.

Secrets should be set in Cloudflare, not committed:

- `DATABASE_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLAIMAUDIO_PILOT_ACCESS_CODE`
- `CLAIMAUDIO_SUPERVISOR_ACCESS_CODE`
- `CLAIMAUDIO_ADMIN_ACCESS_CODE`
- `CLAIMAUDIO_SESSION_SECRET`

## Post-Deploy Checks

1. Open the live app.
2. Confirm login works.
3. Confirm `/api/health` returns `status: ok`.
4. Confirm `/app/settings` shows expected backend/auth/AWS readiness.
5. Run sample-statement workflow.
6. Confirm export preview/download works after approving evidence.

## Rollback

- Redeploy a known-good commit through GitHub Actions or Cloudflare.
- Use Cloudflare dashboard rollback where available.
- Keep Worker secrets unchanged with `--keep-vars`.
