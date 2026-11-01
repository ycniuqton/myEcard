# v00004 design

## Data
- `Word.vi?: string` (shared DTO). The content file keeps its name `words.v2.json` (schema generation); only the
  `contentVersion` value moves to "3" (`PipelineLimits.ContentVersion` is split from the file-name schema).
- Reviewed or written meanings live in `apps/api/data/raw/vi-meanings.json` ({ wordId: "meaning" }) and win over
  Wiktionary-derived ones, which are cached in `apps/api/data/cache/vi-wiktionary.json`.

## Build flow
```
npm run build:words
  └─ existing pipeline builds WordRecord[] (definitions, examples)
       └─ ViManager.apply(words)
            ├─ ViOverrideSource (vi-meanings.json) → wins
            ├─ ViWiktionarySource [async, network, cached] → used when no override
            │    └─ ViGlossPicker takes glosses of the first POS that matches the word's primary POS
            └─ none found → gap "vi" in missing.csv
       └─ Exporter writes words.v2.json (contentVersion "3")
```

## Web
```
open card / word detail
  └─ MeaningLanguageStore (Settings, browser localStorage per device, not synced to the account)
       ├─ Both AND word.vi → VietnameseLine above the English definitions
       └─ English OR no vi → English only (unchanged)
```
- New class-based pieces: `MeaningLanguageStore`, `VietnameseLine` component and `useMeaningLanguage` hook.
- Word index search also matches `vi` (accent-insensitive), so a Vietnamese query finds words.

## Compatibility
- Old clients ignore the unknown `vi` field. A changed `contentVersion` makes clients refresh their cached list.
