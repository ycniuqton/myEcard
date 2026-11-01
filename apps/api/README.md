# @wordmap/api

Fastify 4 + better-sqlite3 (WAL) API for WordMap. Single personal account (`user_id = 'me'`).

## Run

```
npm run dev   -w @wordmap/api     # tsx watch
npm run start -w @wordmap/api     # tsx src/server.ts
npm run build -w @wordmap/api     # type-check
npm run test  -w @wordmap/api     # vitest (in-memory SQLite, fixtures in test/fixtures)
```

## Environment

| Var | Default | Meaning |
| --- | --- | --- |
| PORT | 3001 | listen port |
| HOST | 0.0.0.0 | listen host |
| DB_PATH | apps/api/storage/wordmap.db | SQLite file; `:memory:` for tests |
| CONTENT_DIR | apps/api/content | folder with words.v1.json + credits.json; falls back to data/raw/seed.txt when words.v1.json is missing |
| WEB_DIST | apps/web/dist | built web app; served with SPA fallback when the folder exists |
| CORS_ORIGIN | * | CORS origin for dev |

## Endpoints (prefix /api, JSON)

GET /health, GET /content/words (ETag, Cache-Control, gzip, 304), GET /content/credits,
GET /words/search?q=&limit=, GET /state, PUT /settings, POST /placement,
POST /words/:id/know|learn|reset, POST /reviews (idempotent on clientId),
GET /session?date=, POST /session/day, GET /stats?date=, POST /sync, GET /export, POST /import, DELETE /progress.

Errors: `{ error: { code, message } }` with 400 validation_error, 404 not_found, 500 internal_error.

## Behaviour notes

- Sync: user words are last-writer-wins on `updatedAt` per row (ties keep the server row); review logs append by id;
  day stats merge monotonically (max counters, goalMet OR); settings are LWW via the optional `settingsUpdatedAt`
  on `SyncChanges` (additive DTO field). `serverChanges` use the server receive time (`serverTime` is the next `since`).
- `POST /words/:id/reset` stores a fresh `unknown` row (a tombstone so the reset syncs) and returns `null`.
- Day goal met when new learned >= dailyNew, or after at least one non-new review and no reviews left due.
- `DELETE /progress` clears words, logs and day stats, sets placementDone=false and keeps other settings; it returns the new state.
- `POST /import` replaces all progress and settings and returns the new state.
- Layout: config/, db/ (Migrator + numbered migrations), repositories/ (abstract ProgressRepository -> Sqlite), content/ (sources),
  services/ (managers), http/ (BaseRoute, one route class per resource, RouteManager). server.ts only composes.
