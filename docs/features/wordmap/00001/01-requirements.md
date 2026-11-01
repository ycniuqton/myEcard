# WordMap v00001 — Adaptive placement (changes only)

Replaces the F1 placement test of 00000-init. Everything else is unchanged.

## Problem
A learner at about rank 800 would study known words for weeks: the old test only marked a band known on a perfect 3/3,
and new words start at the lowest unknown rank.

## Requirements
1. Adaptive search over the 29 bands (bisection starting at band 15), about 8-10 probes, under 3 minutes.
2. Each probe shows 4 real words from the band plus 1 pseudoword, shuffled. Buttons: I know it / Don't know.
3. Pseudowords (about 80, pronounceable, verified absent from NGSL and the Tatoeba vocabulary) estimate the
   false-alarm rate f = falseAlarms / pseudoShown. Band score is corrected: s = (h - f) / (1 - f), clamped 0..1.
   f is capped at 0.8; with fewer than 2 pseudowords shown f = 0.
4. Band decision: s >= 0.75 knows the band (search goes higher); s <= 0.40 does not (search goes lower);
   between the two the boundary is found and the search stops. Max 9 probes.
5. Result estimate: estimatedRank = frontier*100 + clamp(next probed band score)*100 where frontier is the highest
   band with s >= 0.75 (0 if none). Result screen shows "Your level is about rank N" and "X% of the map known".
6. A slider (rank 0 to 2809, step 50, default estimatedRank) lets the user adjust before accepting.
7. Accept marks every word with rank <= level - 100 (min 0) as Known (assumed). Words the user explicitly tapped
   "I know it" for in probes are also Known. Everything else stays Unknown. New words then start from the lowest
   Unknown rank (about the level).
8. Assumed check reviews must not pile up: due = today + 30 + (rank mod 30) days, deterministic spread.
9. "Finish now" is allowed after 3 probes using the current estimate. Retake from Settings clears assumed words
   and keeps genuinely learned ones. Pseudowords are never stored as progress.
10. Works offline (pseudowords ship in the app), result is saved through the API.

## Revision 2 (estimator; supersedes items 2, 4, 5 and the 9-probe cap)
The binary band rule marked everything below the level known for a learner who knows only about 80% of every band.
- Probe = 6 real words + 1 pseudoword (about 50 items for 7-8 probes, still under 3 minutes). Max 8 probes.
- Bisection first (band known when corrected score >= 0.90), then 2 refinement probes at the unprobed bands
  nearest frontier+2 and frontier-2. "Finish now" after 3 probes stays.
- Corrected scores are fitted to a monotone non-increasing curve (pool-adjacent-violators, weight = real words shown),
  linear between probed bands, flat beyond both ends.
- percentKnown = sum(p(band) * wordsInBand) / total words ("About X% of the map known").
- Level = highest band whose fitted curve is >= 0.90, times 100, rounded to the slider step. Slider default = level;
  the "words will be marked known" preview uses the level (rank <= level - 100, plus tapped words).
- Result copy: words above the level stay unknown; tap I know it when one is met.
