# WordMap — Product & Technical Spec (v1)

Oct 30, 2026 · @Quincy

## Overview

WordMap is a mobile-first web app (PWA) for learning English vocabulary from a verified, frequency-ranked word list, showing progress as a visual knowledge map. It replaces a paid WordUp subscription for personal use, and is designed so WordUp-level features can be added later without a rewrite.

**Problem.** Few alternatives to WordUp exist. Most flashcard apps (Anki, Quizlet) have no curated word order and no "how much of English do I know" map.

**v1 goals**

- Learn words in order of real-world usefulness, from an open, research-backed list.
- See coverage at a glance: which words are known, learning, or unknown.
- Retain words through spaced repetition, in about 10 minutes a day on a phone.
- Work offline and install on the home screen; wrap as an Android app later with no rewrite.

**Non-goals for v1:** AI chat, social features, leagues, browser extension, payments, multiple user accounts beyond one personal account.

**Working name:** WordMap (placeholder; change freely).

## Word data sources and licensing

The word map is built on the NGSL Project lists: corpus-derived, published by university researchers, and free under CC BY-SA 4.0. The core NGSL 1.2 has 2,809 words and was released in April 2023 ([NGSL 1.2](https://www.newgeneralservicelist.com/new-general-service-list)); it comes from a 273-million-word subsection of the Cambridge English Corpus ([Browne, Korea TESOL](https://mail.koreatesol.org/sites/default/files/TEC-Special-Conf-Section.pdf)).

| Source | Role in app | Size | License |
| --- | --- | --- | --- |
| [NGSL 1.2](https://www.newgeneralservicelist.com/new-general-service-list) | Core map, levels 1–3 | 2,809 words | CC BY-SA 4.0 |
| [NGSL-Spoken 1.2](https://www.newgeneralservicelist.com/ngsl-spoken) | "Spoken" tag and filter | 721 words, up to 90% of unscripted speech | CC BY-SA 4.0 |
| [NAWL, TSL, BSL 1.2](https://newgeneralservicelist.com/blog/ngsl-wordlist-update) | v2 topic lists: academic, TOEIC, business | \~1,000 each | CC BY-SA 4.0 |
| NGSL 1.2 stats and frequencies to 31k (same page as NGSL 1.2) | v2 map extension past 2,809 words | \~31,000 ranks | Check terms on download |
| Wiktionary / Free Dictionary API (dictionaryapi.dev) | Definitions, part of speech, IPA | All words | Wiktionary CC BY-SA; verify API terms |
| Tatoeba | Example sentences | Millions of sentences | CC BY 2.0 FR |
| Browser Web Speech API | Pronunciation audio | All words | Built in, no data shipped |

**License obligations.** CC BY-SA means the app must credit Browne, Culligan and Phillips, and any modified word file you redistribute must stay under CC BY-SA. Your app code is not affected. Add an "About and credits" screen listing every source.

**Avoid bundling:** Oxford 3000/5000, Cambridge English Vocabulary Profile, and COCA lists. They are copyrighted; use them only as reference.

Open question: confirm the license terms on the 31k frequency file before using it for the v2 map extension.

## v1 feature scope

v1 ships six features; everything else waits for v2.

| # | Feature | User story | Acceptance criteria |
| --- | --- | --- | --- |
| F1 | Placement test | As a new user, I mark words I already know so the map starts accurate. | 60–100 words sampled across rank bands; swipe or tap Know / Don't know; finishes in under 3 minutes; can be retaken from Settings. |
| F2 | Knowledge map | As a learner, I see every word as a tile coloured by status. | All 2,809 words in rank order, grouped in bands of 100; four status colours; overall % known shown; tap a tile to open the word; renders under 1 s on a mid-range phone. |
| F3 | Word card | As a learner, I study one word in depth. | Word, IPA, play-audio button, part of speech, short definition, 2–3 example sentences with the word highlighted, rank and band; buttons: I know it / Start learning. |
| F4 | Daily session | As a learner, I do one session a day: reviews first, then new words. | Default 5 new words per day (setting: 3–20); all due reviews shown first; session ends with a summary screen. |
| F5 | Review (spaced repetition) | As a learner, I recall a word and grade myself. | Front shows the word (or a gapped example sentence); reveal shows the card; grades Again / Hard / Good / Easy; SM-2 scheduling (see Learning logic). |
| F6 | Progress | As a learner, I see my streak and growth. | Current and best streak; words known over time (line); reviews due today and tomorrow; counts per status. |

**Also in v1 (small):** search any word, word detail from search, Settings (daily goal, reminder time, theme, export/import data as JSON), About and credits screen, offline support, installable PWA.

## Learning logic

Every word has one of four statuses, and spaced-repetition intervals drive the moves between them.

| Status | Map colour role | How a word gets here |
| --- | --- | --- |
| Unknown | Neutral / empty | Default for every word |
| Learning | Accent (warm) | Tapped Start learning, or graded Again on a known word |
| Known | Primary (cool) | Marked Know in placement or on the word card, or review interval reaches 21 days |
| Mastered | Strong primary | Review interval reaches 90 days |

A word marked known without review (placement or "I know it") gets `assumed = true` and one check review 30 days later. Pass keeps it Known; Again moves it to Learning.

### Placement test

1. Split the ranked list into bands of 100 words (29 bands for NGSL 1.2).
2. Show 3 random words per band, starting from band 1.
3. Band score = known ÷ shown. If a band scores 3/3, mark the whole band Known (assumed). If 0/3 on two bands in a row, stop.
4. Bands with partial scores: mark only the words the user tapped as Known; the rest stay Unknown.
5. Daily new words then start from the lowest-ranked Unknown word.

### Spaced repetition (SM-2, Anki-style)

Each learning card stores `ease` (start 2.5, minimum 1.3), `interval` in days, `reps`, and `due`.

| Grade | Next interval | Ease change |
| --- | --- | --- |
| Again | Re-show in this session, then 1 day; reps = 0 | −0.20 |
| Hard | interval × 1.2 (minimum 1 day) | −0.15 |
| Good | reps 0 → 1 day; reps 1 → 3 days; else interval × ease | 0 |
| Easy | Good interval × 1.3 | +0.15 |

Add ±5% random fuzz to intervals over 3 days so reviews don't bunch on one date. Keep the algorithm behind one function, `schedule(card, grade, now)`, so it can be swapped for FSRS later.

### Daily session

1. Load all cards with `due ≤ today` (cap at 100; carry the rest over).
2. Then show N new words (daily goal, default 5) in rank order, each as a word card, then a first recall.
3. A day counts toward the streak when all due reviews are done or the new-word goal is met.
4. End screen: words learned, reviews done, streak, and a link to the map.

## Data model

Two layers: read-only word content shipped with the app, and per-user progress. Future features (topic lists, challenges, AI chat) only add tables; they never change these.

```ts
// ---- Content (static, versioned JSON, CC BY-SA) ----
type Word = {
  id: string;            // "ngsl:0042" — source-prefixed, stable
  lemma: string;         // "decide"
  rank: number;          // 1..N within the map
  band: number;          // Math.ceil(rank / 100)
  pos: string[];         // ["verb"]
  ipa?: string;
  definitions: { pos: string; text: string }[];
  examples: { text: string; source: "tatoeba" | "wiktionary" | "custom"; sourceId?: string }[];
  forms?: string[];      // ["decides","decided","deciding"] — for highlighting in sentences
  cefr?: "A1"|"A2"|"B1"|"B2"|"C1"|"C2";
  listIds: string[];     // ["ngsl","ngsl-spoken"] — enables topic lists later
  imageUrl?: string;     // v2
};

type WordList = { id: string; name: string; source: string; license: string; wordIds: string[] };

// ---- User progress (IndexedDB, synced later) ----
type UserWord = {
  wordId: string;
  status: "unknown" | "learning" | "known" | "mastered";
  assumed: boolean;      // known without review
  ease: number; interval: number; reps: number; lapses: number;
  due: string | null;    // ISO date
  firstSeenAt?: string; updatedAt: string;
};

type ReviewLog = {        // append-only; powers stats, FSRS later, challenges later
  id: string; wordId: string; at: string;
  mode: "flashcard" | "placement" | "cloze";  // new challenge types = new modes
  grade: "again" | "hard" | "good" | "easy" | "know" | "dont_know";
  msTaken?: number;
};

type Settings = { dailyNew: number; reminderTime?: string; theme: "system"|"light"|"dark"; activeListId: string };
type DayStat  = { date: string; newLearned: number; reviewed: number; goalMet: boolean };
```

Rules: store only non-default `UserWord` rows (missing row = Unknown); every write updates `updatedAt` for sync; `ReviewLog` is never edited.

## Tech stack and architecture

v1 is a local-first PWA: all data lives on the device, so it works offline and needs no server. Cloud sync and Android come later on the same codebase.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | React + TypeScript + Vite | Fast, simple, huge ecosystem; same code wraps to Android |
| Styling | Tailwind CSS + CSS variables for tokens | Matches design tokens from the UI doc; light/dark themes |
| Routing | React Router | Bottom-tab app structure |
| State | Zustand | Small, no boilerplate |
| Local storage | IndexedDB via Dexie.js | Handles thousands of rows; queries by `due` |
| Offline / install | vite-plugin-pwa (Workbox) | Precaches app and word JSON; installable |
| Audio | Web Speech API (`speechSynthesis`), en-US/en-GB voice | Zero data cost; v2 can add recorded audio |
| Charts | Hand-drawn SVG or Recharts | Progress line and streak only |
| Testing | Vitest (scheduler, placement) + Playwright (smoke) | Scheduler logic must be unit-tested |
| Hosting | Vercel, Netlify or Cloudflare Pages | Free static hosting |
| v1.5 sync | Supabase (Postgres + Auth) | Mirror `UserWord` and `ReviewLog`; last-write-wins on `updatedAt` |
| v2 Android | Capacitor | Wraps the same build; adds native notifications |

**App layers:** UI screens → feature hooks (`useSession`, `useMap`, `useWord`) → domain logic (pure functions: `schedule`, `placement`, `stats`) → repository (Dexie) → IndexedDB. Domain logic has no React or storage imports, so it can be tested and reused on a server later.

**Performance budget:** word JSON under 2 MB gzipped; map of 2,809 tiles drawn on a single `<canvas>` or as a CSS grid of plain divs (no per-tile React components); first load under 3 s on 4G.

## Data pipeline

A one-time Node or Python script turns the raw lists into `words.json`, shipped with the app. Re-run it to update content; bump `contentVersion` each time.

1. **Import ranks.** Download NGSL 1.2 "with basic statistics" (CSV/XLSX). Keep lemma, rank and frequency. Save the raw file in `data/raw/` with its license.
2. **Tag lists.** Mark words that also appear in NGSL-Spoken 1.2 with `ngsl-spoken`.
3. **Add definitions and IPA.** For each lemma, fetch from the Free Dictionary API or a Wiktionary dump (kaikki.org extracts). Keep the first 1–2 senses per part of speech; cache responses to disk.
4. **Add examples.** From the Tatoeba English sentence export, pick 3 sentences per word: contains the word or one of its forms, 6–15 words long, prefer sentences whose other words are mostly within NGSL. Store the Tatoeba sentence ID for attribution.
5. **Add forms.** Generate inflections (e.g. with a lemmatizer/inflector library) for highlighting.
6. **Validate.** Every word has ≥1 definition and ≥1 example; log gaps to `data/missing.csv` for manual fill (expect 2–5%).
7. **Export.** Write `public/data/words.v{n}.json` plus `lists.json` and `credits.json`.

**Manual review budget:** about 2–4 hours to fix missing or odd definitions and examples in the first 1,000 words, which users see most.

## Roadmap

Each later phase adds tables and screens on top of v1's data model; nothing in v1 is thrown away.

| Phase | Adds | WordUp equivalent | Builds on |
| --- | --- | --- | --- |
| v1 | Placement, map, word card, daily session, SM-2 reviews, progress, offline PWA | Knowledge Map, daily words, spaced repetition, progress tracking | — |
| v1.5 | Account + cloud sync (Supabase), daily reminder | Multi-device support | `updatedAt` on every row |
| v2 | Map extension past 2,809 words; topic lists (academic, TOEIC, business); new challenge types: cloze, multiple choice, listening, spelling | 25k map, word lists, 9 challenge types | `listIds`, `ReviewLog.mode` |
| v2 | Android app via Capacitor, native notifications | Android app | Same build |
| v3 | AI features via an LLM API: example sentences tuned to your interests, a chat tutor that uses your learning words, writing feedback | Lexi, AI writing coach, Scenarios | `UserWord` status as context |
| v3 | Images per word, idioms and phrasal verbs, browser extension to save words while reading | Pictures, idioms, Chrome extension | `Word.imageUrl`, new list |
| Later | Friends, leagues, certificates | Friends League, certificate | Accounts |

## Build plan

v1 is about 4–5 weeks part-time for one developer, in five milestones.

| Milestone | Scope | Done when |
| --- | --- | --- |
| M1 Data | Pipeline steps 1–7; `words.v1.json` | All 2,809 words have a definition and an example |
| M2 Core logic | `schedule`, `placement`, `stats` + Dexie repository, with unit tests | Tests pass for every grade and edge case |
| M3 Learn flow | Onboarding, placement, daily session, word card, review | A full day's session works offline on a phone |
| M4 Map and progress | Knowledge map, band detail, progress screen, search | Map shows correct colours after placement |
| M5 Polish and ship | PWA install, dark mode, settings, export/import, credits, deploy | Installed on your phone and used for 7 days in a row |

```
wordmap/
├─ data/
│  ├─ raw/              # NGSL CSVs, Tatoeba export + LICENSE files
│  └─ scripts/          # build-words.ts
├─ public/data/         # words.v1.json, lists.json, credits.json
├─ src/
│  ├─ domain/           # schedule.ts, placement.ts, stats.ts (pure, tested)
│  ├─ db/               # dexie.ts, repositories
│  ├─ features/
│  │  ├─ onboarding/    # welcome, placement
│  │  ├─ session/       # daily session, review card
│  │  ├─ map/           # knowledge map, band detail
│  │  ├─ word/          # word card, search
│  │  └─ progress/
│  ├─ ui/               # design-system components from the UI doc
│  ├─ styles/tokens.css # colours, type, spacing
│  └─ app.tsx           # routes + bottom tabs
└─ vite.config.ts       # PWA plugin
```

- [ ] Download NGSL 1.2 and NGSL-Spoken 1.2 files
- [ ] Send the UI design brief to Claude Design and pick a direction
- [ ] Scaffold the Vite + React + TS project
- [ ] Start M1
