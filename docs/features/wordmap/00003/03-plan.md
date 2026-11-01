# v00003 plan (checklist; [ ] todo, [~] in progress, [x] done)

- [x] Docs 01/02/03 (this folder)
- [x] SQL migrations (Postgres) and a runner usable on PGlite and Supabase
- [x] Async ProgressRepository + PgProgressRepository (per-user) + PGlite test setup
- [x] Managers, routes and API tests updated to async; user scoping in Container
- [x] AuthGuard (Supabase JWT via JWKS) + AUTH_MODE=none; 401 contract; isolation tests (two users)
- [x] Web AuthProvider, login/signup/forgot/reset screens, Settings account row and log out
- [x] ApiClient Bearer token, refresh-and-retry once, per-user OfflineStore, first-login upload
- [x] Web unit tests and e2e (auth flow with fake provider; existing suites in AUTH_MODE=none)
- [~] Apply schema to the real Supabase project (done, RLS verified); live two-account smoke test pending owner approval
- [x] Vercel function entry, vercel.json, build-vercel script, local output verified (first real deploy still to do)
- [x] README: free-tier limits, deploy steps, owner data import
