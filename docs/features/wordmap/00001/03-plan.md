# v00001 plan (checklist; [ ] todo, [~] in progress, [x] done)

- [x] Pseudoword bank (about 80) verified against NGSL + Tatoeba vocabulary
- [x] AdaptivePlacementEngine + assumedDue in packages/shared with unit tests (bisection, false-alarm correction, stop rules, level 0 and 2809 edges) (note: estimate treats a boundary band as frontier = band-1 plus its score, so a boundary stop without lower probes is not underestimated)
- [x] API: PlacementSubmission DTO, PlacementManager update, spread of assumed due dates, integration tests
- [x] Web: adaptive placement screen, result screen with slider, offline use, retake from Settings
- [x] Update Playwright e2e for the new placement flow (fast path, finish-now, slider, retake)
- [x] Rerun build, unit tests and e2e; verify design fidelity of the new screens
- [x] Revision 2: 6 real + 1 pseudo per probe, bisection then 2 refinement probes, MAX_PROBES 8
- [x] Revision 2: KnowledgeCurve (PAV), PlacementEstimator, RefinementPlanner; percentKnown from the curve, level at p >= 0.90
- [x] Revision 2: deterministic simulation test (placementSimulation.test.ts), unit tests updated
- [x] Revision 2: web result copy and preview, web unit tests and Playwright specs updated
- [x] Revision 2: rerun build, unit tests and e2e


