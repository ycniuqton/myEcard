# WordMap — Requirements (v1 full-stack)

Source of truth: `WordMap — Product & Technical Spec (v1).md` (product/learning logic) and
`WordMap App.html` (visual design: unpack with the bundler format, template + script inside).
Decisions confirmed with the owner: SQLite (better-sqlite3), server = source of truth with offline cache,
real NGSL 1.2 + dictionaryapi.dev + Tatoeba data, npm workspaces monorepo.

## Layout
- `packages/shared`  types, API DTOs, pure domain logic (scheduler, placement, stats). No React, no I/O.
- `apps/api`         Fastify + SQLite. Data pipeline in `apps/api/data/`. Serves `apps/web/dist` in production.
- `apps/web`         React + TS + Vite + Tailwind PWA. Matches the design exactly.

## Functional scope (all must work end to end)
1. F1 Placement test (60-100 words, 3 per band, Know / Don't know, retake from Settings).
2. F2 Knowledge map: all words in rank order, bands of 100, 4 statuses, overall % known, tap tile -> word,
   Bands and Compact view modes, current-band marker, renders < 1 s.
3. F3 Word card: word, IPA, audio (speechSynthesis US/UK), POS, definition, 2-3 highlighted examples,
   rank, band, status, I know it / Start learning / Review now / Reset.
4. F4 Daily session: due reviews first (cap 100), then N new words (3-20, default 5); summary screen
   with confetti, words learned, reviews, accuracy, streak; "Learn more" extra batch once per day.
5. F5 Review: flip card (word or cloze front), grades Again/Hard/Good/Easy with interval labels,
   SM-2 behind `schedule(card, grade, now)`.
6. F6 Progress: current/best streak, words-known line, reviews due today/tomorrow, 14-day review bars,
   counts per status.
7. Search (prefix over lemma and forms), recent searches, Band detail with filters (All/Unknown/Learning/Known).
8. Settings: daily new words, theme System/Light/Dark, voice US/UK, reminder time (stored), export/import JSON,
   reset all, About and credits (every data source, CC BY-SA attribution).
9. Offline: app shell + words cached; reviews and actions done offline are queued and synced
   (last-write-wins on `updatedAt`) when back online. Installable PWA.

## Non-functional
- Words JSON < 2 MB gzipped; map drawn with plain divs or canvas (no per-tile React components).
- First load < 3 s on 4G; mobile-first 390 px layout, desktop shows the design in a centered phone column.
- Accessible: labels, focus rings, reduced-motion respected, tap targets >= 44 px.
- Light and dark themes use the design tokens verbatim.

## Quality bar (definition of done)
- `npm run build` and `npm test` green at the repo root; `npm run test:e2e` green.
- Playwright e2e covers: placement, session (new + review + again requeue), map -> band -> word, search,
  progress, settings (theme, daily N, export/import, reset), offline queue + sync.
- No screen deviates from the design: spacing, radii, fonts, colours, copy, animations.
- Code follows `.devlens/rules.md` (class-based domain, Manager services, no inline comments, enums not magic strings).
- Data: every word has >= 1 definition and >= 1 example; gaps in `apps/api/data/missing.csv` under 5%.
