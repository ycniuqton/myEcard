# WordMap v00004 - Vietnamese meanings (requirements)

Delta on v00000..v00003: everything else is unchanged (accounts, sync, scheduling, map, placement test).

## Problem
The owner learns English from Vietnamese. Definitions are English only (Wiktionary, written for native speakers), so
many cards cannot be understood.

## Goals
- Every word in the 10,000-word map has a short Vietnamese meaning (`vi`), shown first on cards and word detail.
- English definition and example stay visible below it.
- Works offline (the meaning ships inside the word list). No runtime translation service.
- A Settings choice: "Vietnamese + English" (default) or "English only".

## Rules
- Source order: reviewed overrides, then Wiktionary translation tables (kaikki.org, CC BY-SA 3.0), then written
  translations for the gaps.
- A meaning is 1-3 short Vietnamese glosses joined by ", " (for example "đẹp, xinh đẹp"); one string per word.
- When the word has several parts of speech with different meanings, the string leads with the most common one.
- No example translations (out of scope).

## Non-goals
- Other languages (the field is `vi`; other codes can follow the same shape later).
- Machine translation at runtime; per-user editing of meanings.

## Acceptance
- Word content has `vi` for at least 99% of words; the rest are listed in `apps/api/data/missing.csv` with gap `vi`.
- `contentVersion` becomes "3"; clients refresh their cached word list; progress is untouched (ids unchanged).
- Gzip size of the word list stays within the existing budget (limit 1.95 MB).
- Card and word detail show `vi` first when the setting is on, nothing extra when it is off.
- Credits screen lists the Vietnamese sources and licences.
- All unit, API and e2e suites pass.
