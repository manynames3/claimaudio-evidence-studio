# Architecture Decision Records

These ADRs describe the most important decisions in the current repository. They are concise and intentionally honest about tradeoffs.

## ADR 001: Keep Local Sample Mode Credential-Free

**Status:** Accepted

**Context:** Reviewers and recruiters should be able to run the app without AWS or Neon credentials. The product also needs a realistic evidence workflow.

**Decision:** Commit synthetic Amazon Polly demo audio and mock claim evidence data, while keeping AWS/Neon production adapters separate.

**Consequences:** The app is easy to inspect locally. The tradeoff is that sample mode must be clearly labeled so users do not confuse it with real uploaded-audio analysis.

## ADR 002: Validate AI Findings Before Persistence Or Export

**Status:** Accepted

**Context:** Insurance claim evidence cannot rely on unsupported AI summaries.

**Decision:** Require exact quote, timestamp, category, confidence, transcript segment linkage, why-it-matters, and forbidden-language checks.

**Consequences:** This reduces unsupported findings and creates a clear human-review gate. The tradeoff is that valid but imperfect model output may be rejected until prompt/output handling improves.

## ADR 003: Use Cloudflare Workers For The Web App And API Routes

**Status:** Accepted

**Context:** The demo needs a public URL and low-idle hosting.

**Decision:** Deploy the Next.js App Router app through OpenNext on Cloudflare Workers.

**Consequences:** Deployment is lightweight and public-demo friendly. The tradeoff is that AWS SDK use must be compatible with the Worker runtime and large server-side file processing should stay out of the Worker.

## ADR 004: Use Neon Postgres For Pilot Persistence

**Status:** Accepted

**Context:** The product needs tenant-scoped claim/project data, audit events, review actions, exports, and transcripts.

**Decision:** Use Neon Serverless Postgres with SQL migrations and a tenant-scoped repository.

**Consequences:** The database model is easy to inspect and low-cost for a pilot. The tradeoff is that database-level RLS and production tenant administration are still needed.

## ADR 005: Start With Pilot Access-Code Auth

**Status:** Accepted for pilot, replace for production

**Context:** The demo needed role-aware access without a full identity provider.

**Decision:** Use server-side access codes to create signed HTTP-only sessions with roles.

**Consequences:** This supports adjuster/supervisor/admin demo flows quickly. The tradeoff is that production should use Cognito/Auth0 JWTs, tenant membership, user invitations, and stronger admin controls.
