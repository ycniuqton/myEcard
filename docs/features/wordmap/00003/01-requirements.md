# WordMap v00003 — Accounts and zero-cost hosting on Vercel + Supabase (changes only)

Builds on 00000-init, 00001, 00002. Everything not listed here is unchanged.

## Why
The app is single-user (hard-coded user `me`, SQLite file, one Node server). The owner wants to serve many learners
at $0: Vercel (web + one serverless API function) and Supabase (Postgres + Auth). No server to manage.

## Requirements
1. Accounts: Supabase Auth, email + password. Screens: Sign up, Log in, Forgot password, Reset password; Log out and
   "Signed in as <email>" in Settings. Design follows the existing theme (light/dark tokens, fonts).
2. Every API route except health, content and credits needs `Authorization: Bearer <Supabase access token>`.
   The API verifies the JWT and derives the user id; a missing or invalid token gives 401 code UNAUTHENTICATED.
3. Data isolation: every progress row belongs to a user (`user_id uuid`). A user can never read or write another
   user's rows (enforced by API scoping and by Postgres row level security as defence in depth).
4. Storage: Postgres on Supabase replaces SQLite. The repository contract becomes async and per-user.
   Migrations are plain SQL files, applied to Supabase and to the in-memory test database.
5. Word content (10,000 words, `words.v2.json`) stays a static file served by the API / CDN, not a table.
6. Offline cache and outbox are scoped per signed-in user. Switching account never shows or pushes another
   account's data. Logging out clears the local cache of that user.
7. First login on a device with existing local-only progress (pre-accounts) offers to upload it to the account once.
   The owner's current data (export JSON) can be imported through the existing Import in Settings.
8. Local development keeps working without Supabase: `AUTH_MODE=none` uses a fixed dev user and an embedded
   Postgres (PGlite) so unit and e2e tests need no network and no Docker.
9. Deploy: web as a static build on Vercel, API as a Vercel function (`/api/*`), same origin, no CORS needed.
   Required env vars are documented; no secret is committed (the repo is public).
10. Free-tier realities documented: Supabase built-in email rate limit, project pause after inactivity, 500 MB DB.

## Acceptance
- Two accounts on the same server see only their own progress (automated test).
- Unauthenticated calls get 401; an expired token triggers refresh then one retry.
- Full unit suites and e2e pass in `AUTH_MODE=none`; auth flow e2e passes against a fake auth provider.
- Schema applied to the real Supabase project and a live smoke test (sign up, learn, sync, second account isolated).
- Vercel build config verified locally (static build plus function bundle).

## Out of scope
Social login, email template design, payments, admin console, multi-device conflict UI beyond existing LWW.
