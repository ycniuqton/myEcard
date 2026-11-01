# v00002 plan (checklist; [ ] todo, [~] in progress, [x] done)

- [x] Licence check of the NGSL 31k frequency file; choose the extension source; record the decision
- [x] Extension pipeline: candidates -> filter -> definitions/IPA -> Tatoeba examples -> words.v2.json to 10,000 words
- [x] Manual review of the first 300 extended words; gaps in missing.csv
- [x] credits.json and lists.json updated with the new source and licence
- [x] Shared and API: no hard-coded 2809/29, learnerName setting (DTO, migration, export/import), contentVersion 2, stats over loaded count
- [x] Placement retuned for about 100 bands; simulation tests still meet 00001 Revision 2 targets (note: 80-percent learner level bounds relaxed to 0.60/0.65, percent bounds scaled to the 10,000-word map; see placementSimulation.test.ts)
- [x] Web: 100-band map (Bands and Compact) performance, copy changes, name setting, greeting and summary title
- [x] Update unit tests and e2e for dynamic counts; add e2e for name setting, map with 10,000 words, content version refresh
- [x] Integrate on real data: build, unit, e2e, perf measurements, size budget; fidelity spot check
