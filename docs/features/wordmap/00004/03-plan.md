# v00004 plan (checklist; [ ] todo, [~] in progress, [x] done)

- [x] Docs 01/02/03 (this folder)
- [x] Fetch Wiktionary Vietnamese translations for all 10,000 lemmas and measure coverage (5,287 words had one, 52.7% after picking glosses)
- [x] Fill gaps with written Vietnamese meanings into data/raw/vi-meanings.json (4,734 written in 8 batches)
- [x] Review pass: all 2,200 remaining core words and 3,066 extended words re-checked against pos and English definition (Wiktionary glosses were wrong for common words); final file has an override for all 10,000 words
- [x] Pipeline: ViManager + sources, `npm run build:vi` writes `vi`, contentVersion "3", missing.csv gap "vi" (kept separate from build:words; run build:vi after build:words)
- [x] Shared DTO `vi`
- [x] Web: VietnameseLine on card and word detail, Settings toggle (stored in the browser, not synced), search by Vietnamese
- [x] Credits entry for Vietnamese sources (CreditsCatalog, written to credits.json by build:vi)
- [x] Unit tests (ViSource/ViManager/content, WordIndex search, MeaningLanguageStore) and e2e (3 specs in specs-large/03-vietnamese)
- [x] Unit, API, e2e suites green (shared 89, api 143, web 115, e2e 58); gzip 1.74 MB under the 1.95 MB limit
- [x] README note
- [ ] Deploy: owner commits and pushes (Devlens commit guard); Vercel rebuilds and clients refresh the word list because contentVersion is now "3"
