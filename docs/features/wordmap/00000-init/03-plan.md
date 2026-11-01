# WordMap — Plan (checklist; states: [ ] todo, [~] in progress, [x] done)

## P0 Foundation (orchestrator)
- [x] Read spec and unpack WordMap App.html design
- [x] Monorepo workspaces: packages/shared, apps/api, apps/web; install; better-sqlite3 builds
- [x] Docs 01-requirements, 02-design, 03-plan

## P1 Shared package
- [x] dto.ts + enums.ts (contract from 02-design)
- [x] Class-based domain: Sm2Strategy/SchedulerManager, PlacementEngine, StatsCalculator, StreakCalculator
- [x] Unit tests ported and extended (all grades, edge cases, streaks, placement, known-over-time)

## P2 Data pipeline (apps/api/data)
- [x] Download NGSL 1.2 (+ spoken) into data/raw with licenses
- [x] Definitions + IPA (dictionaryapi.dev, cached), examples (Tatoeba), forms
- [x] words.v1.json / lists.json / credits.json written to apps/api/content; missing.csv < 5%
- [x] Hand-fix first 1,000 words gaps

## P3 API (apps/api)
- [x] Database + migrations + repositories
- [x] Managers (Content, Progress, Session, Stats, Sync, DataTransfer) and Route classes
- [x] Integration tests with in-memory SQLite for every endpoint
- [x] Static hosting of web dist + production start script

## P4 Web foundation (apps/web)
- [x] tokens.css verbatim from design, fonts, primitives, Shell + TabBar, icons
- [x] ApiClient, OfflineStore, SyncEngine, zustand store
- [x] PWA config (precache words, runtime cache for API GET)

## P5 Web screens (match design pixel for pixel)
- [x] Today (+ done state, learn more)
- [x] Map (bands + compact), Band detail
- [x] Word detail, Search
- [x] Session (review flip card, cloze front, new word card), Summary + confetti
- [x] Placement + onboarding
- [x] Progress, Settings, Credits

## P6 Wire and verify
- [x] Playwright e2e suites (see 01-requirements quality bar)
- [x] Offline queue + sync test
- [x] Design-fidelity review per screen (light and dark) with screenshots vs design (gate round 2: Map compact, Session new card, Summary and Placement result not re-captured in the last round; covered by e2e and earlier screenshots)
- [x] Devlens rules audit; fix findings (AST audit: no function > 50 lines, nesting > 3 or inline comments)
- [x] Root build + tests green; README with run instructions
