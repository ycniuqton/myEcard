# v00001 design (changes only)

## Shared (packages/shared/src/domain/placement)
```
AdaptivePlacementEngine            pure, deterministic with injected rng
  start(words, rng)               -> PlacementState {lo, hi, probes[], falseAlarms, pseudoShown}
  nextProbe(state)                -> Probe {band, items: ProbeItem[]}   items = 4 real + 1 pseudo, shuffled
  record(state, probe, answers)   -> PlacementState (updates lo/hi/stop reason)
  isFinished(state)               -> boolean (boundary found | lo>hi | 9 probes)
  estimate(state)                 -> {estimatedRank, percentKnown, falseAlarmRate}
  knownIdsForLevel(words, level, tappedKnownIds) -> string[]
  assumedDue(rank, today)         -> ISO date (today + 30 + rank mod 30)
PseudowordBank                    list + accessor, enum-free constant class
```
Old PlacementEngine stays only for helpers still used (groupByBand, nextNewWords); sampling and stop rule move.

## API
```
POST /api/placement   body PlacementSubmission {level: number, tappedKnownIds: string[], probes: ProbeResult[]}
  └─ PlacementManager: knownIdsForLevel -> assumed-known rows (due spread), review logs mode=placement
       └─ settings.placementDone=true -> {knownCount, state}
```
`level` is trusted from the client (user may have adjusted it); validated 0..wordCount.

## Web flow
```
Start placement                                              [user action]
  └─ engine.start -> probe 1 at band 15
       ├─ answers 5 items -> engine.record -> not finished -> next probe (bisect)
       └─ finished or "Finish now" (>=3 probes) -> result screen
            └─ slider adjusts level -> Accept -> POST /placement -> Today
```
Probe screen: one card per item (word, speaker button, two buttons) with a progress dots row (probes done / max 9).
Pseudowords look identical to real words (no hint). Result screen: level, % known, slider, Accept, Retake.

## Revision 2 (estimator)
```
Placement start                                                        [user action]
  └─ bisection over bands (probe = 6 real + 1 pseudo), start band 15
       ├─ corrected score >= 0.90 → lo = band+1
       └─ corrected score <  0.90 → hi = band-1
            └─ lo > hi → RefinementPlanner picks 2 free bands nearest frontier+2, frontier-2 (frontier = lo-1)
                 └─ 2 refinement probes → stop (Refined) | 8 probes → stop (MaxProbes)
estimate(state)
  └─ f = false-alarm rate; score(band) = (h/n - f) / (1 - f) clamped 0..1
       └─ KnowledgeCurve.fit (PAV, weight = realShown) → valueAt(band): linear between probes, flat beyond ends
            ├─ percentKnown = round(sum p(band)*size(band) / total * 100), plus expectedKnown
            └─ estimatedRank = level = highest band with p >= 0.90, *100, rounded to SLIDER_STEP, capped at maxRank
```
New classes: KnowledgeCurve, RefinementPlanner, PlacementEstimator. PlacementState gains topBand and refine;
PlacementEstimate gains expectedKnown (estimatedRank now means the level, percentKnown comes from the curve).
Web: PlacementRun.preview().percent = estimate.percentKnown (does not move with the slider); knownCount uses the level.
Limits (30-seed simulation): about 6 words per probe gives a noisy curve, so an 80% learner gets 54-92% (mean 75)
and a small share of runs a level above 1500; placementSimulation.test.ts holds the asserted bounds.
