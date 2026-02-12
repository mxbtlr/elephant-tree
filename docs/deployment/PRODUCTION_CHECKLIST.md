# Production readiness checklist

Use this before deploying TreeFlow to production.

## Environment & config

- [ ] **Supabase:** Project created; URL and anon key set (in `client/.env` or injected via `window.__ENV__`).
- [ ] **Client env:** No secrets in client bundle; anon key is public by design; RLS protects data.
- [ ] **Server (if used):** `PORT` and any API keys set; CORS and allowed origins configured.

## Database

- [ ] **Migrations:** All files in `supabase/migrations/` applied in order (e.g. `supabase db push` or run manually).
- [ ] **RLS:** Row Level Security enabled and tested for workspaces, outcomes, and workspace_members.
- [ ] **Auth:** Email/password or providers configured in Supabase Dashboard; redirect URLs set for production domain.

## Build & run

- [ ] **Build:** `npm run build` succeeds; no ESLint errors (or CI=0 if you temporarily allow warnings).
- [ ] **Tests:** `npm test` passes (client + server).
- [ ] **Health:** `GET /api/health` (or `GET /health`) returns 200 and is used by your load balancer or monitoring.

## Security & performance

- [ ] **HTTPS:** App and API served over HTTPS.
- [ ] **CORS:** Allowed origins restricted to your production domain(s).
- [ ] **Rate limiting / DDoS:** Consider for public API if applicable.

## Post-deploy

- [ ] **Smoke test:** Log in, create a workspace, add an outcome, open tree view.
- [ ] **Monitoring:** Errors and health checks monitored; logs retained as needed.

## Optional

- [ ] **CI/CD:** Run `npm test` and `npm run build` on every push (e.g. GitHub Actions).
- [ ] **Backups:** Supabase backups enabled or custom backup strategy for DB.
- [ ] **Docs:** Point team to [docs/README.md](../README.md) and [README.md](../../README.md).
