# WordMap — Design (API contract, storage, flows)

## Stack
Fastify 4 + zod + better-sqlite3 (WAL). `@wordmap/shared` is imported by both apps (TS source, no build step).
Single personal account: every row carries `user_id` (constant `'me'` in v1) so accounts can be added later.

## Class layout (Devlens rules 11-16)
```
apps/api/src
  server.ts                composition root only (builds Container, starts Fastify)
  config/AppConfig.ts      env: PORT, DB_PATH, WEB_DIST, CONTENT_DIR
  db/Database.ts           opens SQLite, runs Migrator
  db/migrations/*.ts       numbered migrations (class Migration base)
  repositories/            base ProgressRepository (abstract) -> SqliteProgressRepository
  services/                ContentManager, ProgressManager, SessionManager, StatsManager, SyncManager, DataTransferManager
  http/                    one Route class per resource (WordsRoute, StateRoute, ReviewRoute, ...), base BaseRoute
packages/shared/src
  dto.ts                   all request/response types below (single source of truth)
  domain/scheduling/       SchedulingStrategy (abstract) -> Sm2Strategy; SchedulerManager picks by config
  domain/placement/        PlacementEngine
  domain/stats/            StatsCalculator, StreakCalculator
  enums.ts                 Status, Grade, ReviewMode, ListId, SettingsTheme
```

## Storage (SQLite)
```
user_words(user_id, word_id, status, assumed, ease, interval, reps, lapses, due, first_seen_at, updated_at)  PK(user_id, word_id)
review_logs(id PK, user_id, word_id, at, mode, grade, ms_taken)            append-only
day_stats(user_id, date, new_learned, reviewed, goal_met, updated_at)       PK(user_id, date)
settings(user_id PK, daily_new, reminder_time, theme, voice, active_list_id, placement_done, updated_at)
meta(key PK, value)
```
Content (words) is NOT in SQLite: `apps/api/content/words.v1.json`, `lists.json`, `credits.json`, loaded in memory.
Only non-default rows are stored in `user_words` (missing = unknown).

## Endpoints (all JSON, prefix /api; DTOs in shared/dto.ts)
```
GET    /health                        -> {ok, contentVersion}
GET    /content/words                 -> {contentVersion, words: Word[]}   ETag + Cache-Control, gzip
GET    /content/credits               -> Credit[]
GET    /words/search?q=&limit=        -> {hits: {id, lemma, rank, definition, status}[]}
GET    /state                         -> {settings, userWords: UserWord[], dayStats: DayStat[], serverTime}
PUT    /settings                      -> Settings (partial body)
POST   /placement                     body {results: BandResult[]} -> {knownCount, state}
POST   /words/:id/know | /learn | /reset   -> UserWord | null
POST   /reviews                       body {wordId, grade, at, msTaken?, clientId} -> {userWord, dayStat}  idempotent on clientId
GET    /session?date=YYYY-MM-DD       -> {due: string[], fresh: string[], doneNew: number, goalNew: number}
POST   /session/day                   body {date, newLearned?, reviewed?, goalMet?} -> DayStat
GET    /stats?date=                   -> {counts, percentKnown, streak:{current,best}, dueToday, dueTomorrow, knownOverTime[], reviewsPerDay[14]}
POST   /sync                          body {since, changes:{userWords,reviewLogs,dayStats,settings}} -> {serverChanges, serverTime}
GET    /export                        -> full snapshot file     POST /import  replaces progress
DELETE /progress                      resets all progress
```
Errors: `{error: {code, message}}` with 400 validation / 404 unknown word / 409 never (LWW) / 500.

## Flows
```
User taps grade (Good) in session                                   [user action]
  └─ web optimistic update: schedule() from shared -> local UserWord, push to outbox
       └─ online -> POST /reviews                                    [async]
            ├─ clientId already seen -> 200 with stored result      (idempotent, no double count)
            └─ new -> ProgressManager.review()
                 └─ SchedulerManager.schedule(card, grade, now) -> UserWord upsert + ReviewLog + DayStat bump
                      └─ response -> web reconciles local row (server wins on updatedAt)
       └─ offline -> stays in outbox -> replayed on 'online' / app start via POST /sync  [event]
---
App start                                                           [trigger]
  └─ web loads cached words.json (service worker) + IndexedDB snapshot -> renders immediately
       └─ [async] GET /state + POST /sync(outbox) -> merge LWW on updatedAt -> store updated
---
Placement finishes                                                  [user action]
  └─ POST /placement {results} -> PlacementEngine.knownIds -> assumed-known rows (due +30d)
       └─ settings.placement_done=true -> response {state} -> web replaces local snapshot
---
Daily goal                                                          [event: review/new action]
  └─ day_stats.goal_met = all due reviews done OR new goal met      -> streak recalculated in StatsManager
```

## Web structure (apps/web/src)
```
app/            router, Shell (phone frame on desktop), TabBar
design/         tokens.css (verbatim from design), Icon set, primitives (Card, Chip, Tile, Segmented, Stepper)
api/            ApiClient (typed), SyncEngine (outbox + sync), OfflineStore (Dexie cache)
store/          zustand store hydrated from OfflineStore, actions call ApiClient/SyncEngine
features/       today, map(bands, compact), band, word, search, progress, session(+summary), placement, settings, credits
```
Fonts: Inter, IBM Plex Mono, Source Serif 4 (self-hosted woff2 via @fontsource, matches the design).

## Unchanged from the product spec
Learning logic (statuses, SM-2 table, placement rules, daily-session rules), data model field names, license obligations.
