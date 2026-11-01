# WordMap

A personal English vocabulary app built around a knowledge map of 10,000 words (the 2,809 NGSL core plus 7,191 extended words). Placement test, daily
spaced-repetition sessions (SM-2), band map, search, progress and offline use as an installable PWA.

Monorepo (npm workspaces): `packages/shared` (DTOs, learning logic), `apps/api` (Fastify + SQLite), `apps/web`
(React + Vite PWA). Design source: `docs/design/wordmap-design.template.html`; docs: `docs/features/wordmap/`.

## Prerequisites

- Node 20.9 or newer, npm 10
- Windows, macOS or Linux (better-sqlite3 uses a prebuilt binary)

## Install

```
npm install
```

## Develop

Run both in separate terminals. The web dev server proxies `/api` to `http://localhost:3001`.

```
npm run dev:api     # API on :3001 (tsx watch)
npm run dev:web     # Vite on :5173
```

## Build and run in production

```
npm run build       # type-checks shared and api, builds web into apps/web/dist (with service worker)
npm start           # API serves apps/web/dist and /api on http://localhost:3001
```

The service worker precaches the app shell and `/api/content/words`, and runtime-caches other API GETs, so the app
opens and the map works offline. Progress is stored in IndexedDB and synced when the API is reachable.

## Data

Progress lives in SQLite (`apps/api/storage/wordmap.db`, created on first start). Word content is the static file
`apps/api/content/words.v2.json` (plus `lists.json`, `credits.json`), `contentVersion` "2".

### The 10,000-word map

- Ranks 1-2,809 are the NGSL core (ids `ngsl:0001`..`ngsl:2809`, list `ngsl`, 3 examples each). Their ids and order
  never change, so existing progress stays valid.
- Ranks 2,810-10,000 are extended words (ids `ext:<rank>`, list `extended`, 2 examples each), taken in frequency order
  from the NGSL 1.2 frequencies to 31k (CC BY-SA 4.0), filtered (lemmatised, deduplicated against NGSL forms, no proper
  nouns, numerals, abbreviations or offensive words) and kept only when they have a definition and an example.
- Definitions and IPA come from Wiktionary (CC BY-SA 3.0), examples from Tatoeba (CC BY 2.0 FR); all sources and
  licences are listed in the app under Settings, About and credits.
- The map has 100 bands of 100 words. Size budget: `words.v2.json` gzips to about 1.5 MB (limit 1.95 MB).

Rebuild the content (needs network on the first run, responses are cached under `apps/api/data/cache`):

```
npm run build:words
```

Corrections for single words go in `apps/api/data/raw/manual-fixes.json`; words that could not be completed are
logged in `apps/api/data/missing.csv`. Bump nothing by hand: the exporter writes `contentVersion` and clients refresh
their cached word list when it changes.

### Vietnamese meanings

Every word has a short Vietnamese meaning (`vi`, `contentVersion` "3"). Sources, highest priority first:
`apps/api/data/raw/vi-meanings.json` (reviewed, written for WordMap) then Wiktionary translation tables cached in
`apps/api/data/cache/vi-wiktionary.json` (CC BY-SA 3.0). Run after `build:words` (a rebuild drops `vi`):

```
npm run build:vi -w @wordmap/api            # merge overrides + cache into words.v2.json
npm run build:vi -w @wordmap/api -- --fetch  # also download missing Wiktionary tables first
```

Words without a meaning are listed in `data/missing.csv` with gap `vi`. In the app, Settings, Meanings switches between
"Tiếng Việt + EN" and "English" (stored in the browser, not synced).

## Tests

```
npm test            # shared, api (in-memory SQLite), web unit tests
npm run test:e2e    # Playwright against a real API + built web (needs: npx playwright install chromium)
```

## Web accounts (Supabase)

The web app signs users in with Supabase email and password and sends `Authorization: Bearer <access_token>` on
every API call except health and content. Build-time env (apps/web, e.g. `.env.local`, never committed):

| Variable | Meaning |
| --- | --- |
| VITE_AUTH_MODE | `supabase` (default), `fake` (in-browser users and fake tokens, used by e2e and tests, no network) or `none` (no login, legacy `wordmap` IndexedDB, used by dev tests and the main e2e suite) |
| VITE_SUPABASE_URL | project URL (supabase mode) |
| VITE_SUPABASE_PUBLISHABLE_KEY | publishable (anon) key (supabase mode) |

Each user has an IndexedDB named `wordmap-<userId>`; log out clears it. A 401 triggers one token refresh and retry,
then sign out (unsynced changes stay in that user cache until they log in again). On the first login on a device with
legacy progress and an empty account, a one-time prompt offers to upload it. The e2e suite builds the web app per server
(`apps/web/dist-e2e-<port>`); the `auth-fake` project runs with `VITE_AUTH_MODE=fake` against an in-test API mock.

## Environment variables (API)

| Var | Default | Meaning |
| --- | --- | --- |
| PORT | 3001 | listen port |
| HOST | 0.0.0.0 | listen host |
| DATABASE_URL | unset | Postgres connection string (Supabase pooler, port 6543). Unset uses embedded PGlite. Secret: never commit |
| PGLITE_DIR | apps/api/storage/pglite | embedded database folder, or `:memory:` |
| AUTH_MODE | `supabase` when DATABASE_URL is set, else `none` | `supabase` verifies Supabase JWTs, `none` uses one fixed dev user |
| SUPABASE_URL | unset | `https://<ref>.supabase.co`, needed for JWT verification |
| DEV_USER_ID | fixed dev uuid | user id in `none` mode |
| CONTENT_DIR | apps/api/content | folder with words.v2.json, lists.json, credits.json |
| WEB_DIST | apps/web/dist | built web app served with SPA fallback |
| CORS_ORIGIN | * | CORS origin for development |

## Deploy on Vercel + Supabase (free tiers)

1. Supabase: create a project, then apply the schema once with `DATABASE_URL=<pooler url> npm run migrate -w @wordmap/api`
   (or paste `apps/api/src/db/migrations/*.sql` in order into the SQL Editor).
2. Supabase Authentication, URL Configuration: add your Vercel URL as Site URL and `<your-url>/reset` as a redirect URL.
3. Vercel: import the GitHub repo, leave Root Directory empty (repo root). `vercel.json` runs `scripts/build-vercel.mjs`,
   which builds the web app and bundles the API into one function (`/api/*`).
4. Vercel environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public), `SUPABASE_URL`,
   `AUTH_MODE=supabase`, and `DATABASE_URL` (secret, the Supabase transaction pooler string).
5. Load your old progress: log in, then Settings, Import, and pick the JSON from the old server's `/api/export`.

Free-tier limits to know: Supabase built-in email is limited to a few messages per hour (connect SMTP such as Resend before
real sign-ups); free projects pause after about a week without activity; the database is capped at 500 MB (roughly a few
hundred active learners); Vercel Hobby is for non-commercial use.

## Credits

Word list: New General Service List (NGSL); definitions, IPA and examples from open sources. See the in-app
Credits screen and `apps/api/content/credits.json` for licenses.
