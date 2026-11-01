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

## Tests

```
npm test            # shared, api (in-memory SQLite), web unit tests
npm run test:e2e    # Playwright against a real API + built web (needs: npx playwright install chromium)
```

## Environment variables (API)

| Var | Default | Meaning |
| --- | --- | --- |
| PORT | 3001 | listen port |
| HOST | 0.0.0.0 | listen host |
| DB_PATH | apps/api/storage/wordmap.db | SQLite file |
| CONTENT_DIR | apps/api/content | folder with words.v1.json, lists.json, credits.json |
| WEB_DIST | apps/web/dist | built web app served with SPA fallback |
| CORS_ORIGIN | * | CORS origin for development |

## Credits

Word list: New General Service List (NGSL); definitions, IPA and examples from open sources. See the in-app
Credits screen and `apps/api/content/credits.json` for licenses.
