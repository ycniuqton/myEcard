# v00003 design (changes only)

## Architecture
```
Browser (Vite PWA, supabase-js for auth only)
  ├─ Supabase Auth  -- sign up / log in / reset --> access token (JWT)
  └─ fetch /api/*  + Authorization: Bearer <token>
        └─ Vercel function (Fastify behind a thin handler)
             ├─ AuthGuard: verify JWT (JWKS) -> request.userId      (AUTH_MODE=none -> DEV_USER_ID)
             ├─ per-request scope: container.forUser(userId) -> managers over PgProgressRepository(userId)
             └─ Postgres (Supabase pooler, transaction mode) | PGlite in tests and local dev
```

## API
- `ProgressRepository` methods become Promise-returning; `transaction(work: () => Promise<T>)`.
  Managers, routes and tests move to async/await. Behaviour is unchanged.
- `PgProgressRepository(db, userId)` replaces `SqliteProgressRepository`; `UserIds.ME` becomes the dev user id.
- `Container` splits into a shared part (content, clock, config, db pool) and a per-user scope built per request.
- `AuthGuard` (preHandler on the `/api` scope) skips health, content words and credits. It uses `jose` with the
  project JWKS (`SUPABASE_URL/auth/v1/.well-known/jwks.json`) and audience `authenticated`.
- Config env: `AUTH_MODE` (`supabase` or `none`), `SUPABASE_URL`, `DATABASE_URL`, `DEV_USER_ID`.
- `DELETE /api/progress`, import and export act on the caller's rows only.

## Postgres schema (migrations/*.sql, applied in order, tracked in `schema_migrations`)
Tables mirror SQLite: `settings`, `user_words`, `review_logs`, `day_stats`. Every table has `user_id uuid not null`
and primary keys become `(user_id, ...)`. Timestamps stay ISO `text` so the LWW code is identical.
Row level security is enabled on all four with a policy `user_id = auth.uid()` for the authenticated role. The API uses
a server connection and filters by user id explicitly; RLS protects against direct PostgREST access.

## Web
```
App start
  └─ AuthProvider (supabase-js session)
       ├─ no session -> /login, /signup, /forgot, /reset (design-system screens)
       └─ session -> OfflineStore opened as db wordmap-<userId>; ApiClient attaches the Bearer token
            └─ 401 -> refreshSession once -> retry -> else /login
Settings: "Signed in as", Log out (clears that user's cache), existing data tools.
```
- `VITE_AUTH_MODE=none` build flag skips the gate for e2e and local dev.
- First-login migration: if legacy db `wordmap` has progress and the account has none, offer the upload once.

## Deploy
- `vercel.json`: build the web workspace, output `apps/web/dist`, rewrite `/api/*` to the function, SPA fallback.
  The function entry includes `apps/api/content/**`.
- Env on Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `DATABASE_URL`, `AUTH_MODE=supabase`.
