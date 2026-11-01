# v00002 design (changes only)

## Content pipeline additions (apps/api/data/scripts/pipeline)
```
build-words                                                         [manual run]
  └─ NgslImporter -> ranks 1..2809 (unchanged)
  └─ ExtensionSourceResolver (checks licence, picks source)         new
       └─ CandidateReader base -> Ngsl31kReader | OpenFrequencyListReader   (selected by config)
            └─ CandidateFilter (lemmatise, dedupe vs NGSL forms, drop propn/num/abbr/offensive)
                 └─ DefinitionManager + ExampleManager (existing) per candidate
                      ├─ has definition AND example -> accepted, next rank
                      └─ missing either           -> skipped (logged), next candidate until 10,000
  └─ Exporter -> apps/api/content/words.v2.json {contentVersion:"2", words}, lists.json, credits.json
```
Reuse the disk cache; the NGSL core definitions are not refetched.

## Shared and API
- Remove every hard-coded 2809 and 29. Bands derive from `ceil(rank / BAND_SIZE)` and the loaded word count.
- `Settings` DTO gains `learnerName?: string` (<= 40 chars, trimmed). SQLite migration adds `learner_name` to `settings`.
  Export/import snapshot includes it.
- ContentManager reads `words.v2.json` (version from the file); `/health` and `/content/words` report contentVersion "2".
- StatsManager percentages use the loaded word count.

## Placement retune (PlacementConfig)
START_BAND ~20, bisection over all bands, MAX_PROBES 10 (still 6 real + 1 pseudo per probe, 2 refinement probes).
`PlacementWord = Pick<Word, 'id' | 'lemma' | 'rank' | 'band'>` so the engine does not depend on full word content.

## Web
```
App start                                                          [trigger]
  └─ OfflineStore.wordCache keyed by contentVersion
       ├─ cached version == manifest version -> use cache
       └─ differs -> [async] fetch /content/words (1.9 MB gz) -> replace cache -> store re-indexes
```
- Map Bands view: 100 cards of 10x10 plain divs; render through the existing delegated-click grid; avoid per-tile components
  and keep one DOM write per status change. If 10,000 tiles are slow, virtualise by band (render tiles only for cards in/near the viewport).
- Settings: new row "Your name" (text input, 40 chars), data-testid `settings-name`.
- Copy changes: TodayCopy (greeting, "of the map known"), SessionCopy (summary title), CreditsCopy if sources are listed statically.
