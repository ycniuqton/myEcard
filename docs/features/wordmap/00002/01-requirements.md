# WordMap v00002 — Map extension to about 10,000 words, learner name setting (changes only)

Builds on 00000-init and 00001. Everything not listed here is unchanged.

## Why
A learner at ~61% of NGSL (about 1,700 words known) runs out of new words within weeks. The spec's v2 plans a map
extension past 2,809 words. Owner decisions: target about 10,000 words; take ranks beyond NGSL from the NGSL
31k frequency data if its license allows, otherwise from another open frequency list.

## Requirements
1. Content: ranks 1-2,809 stay exactly as they are (same ids `ngsl:0001`..., same order, so existing progress stays valid).
   Ranks 2,810..~10,000 are added with ids `ext:<rank>` and listIds `["extended"]`; the first 2,809 keep `["ngsl", ...]`.
2. Source and licence: first verify the terms of the NGSL 31k frequency file. If it is CC BY-SA or otherwise
   redistributable with attribution, use it. If not, use another openly licensed frequency list and say which.
   Add the new source and its licence to `credits.json`, the lists to `lists.json`, and keep the About and credits screen correct.
3. Candidate filtering for ranks beyond NGSL: lemmatise, dedupe against NGSL lemmas and all inflected forms,
   drop proper nouns, numerals, contractions, abbreviations, non-English tokens and offensive words, keep alphabetic
   words of 3+ letters. Skip a candidate that cannot get a definition and an example, and take the next one, until
   10,000 total words are reached.
4. Data quality for the new words: every word has >= 1 definition and >= 1 example (Tatoeba, 6-15 words,
   2 examples for extended words, 3 for the NGSL core), IPA when available, forms for highlighting. Hand-review the first
   300 extended words for odd senses; log remaining gaps in `data/missing.csv`.
5. Size budget: `words.v2.json` gzipped <= 1.95 MB. If larger, trim extended words to 1 example before dropping anything else.
   `contentVersion` becomes "2" so clients refresh their cached word list.
6. Bands: nothing may assume 2,809 words or 29 bands. Map, Band detail, Today, Progress, stats, session planner,
   placement and e2e helpers derive counts from the loaded content (about 100 bands).
7. Copy: "% of NGSL known" becomes "% of the map known" and counts are over the whole map ("1,716 / 10,000").
8. Placement: adaptive bisection over about 100 bands. Start band and probe cap are retuned so a test still takes
   about 3-4 minutes (max 10 probes), and the simulation accuracy targets of 00001 Revision 2 still hold.
9. Map screen: Bands view (100 band cards) and Compact view stay smooth; first render under 1 s with 10,000 words
   on a mid-range phone profile; the "current band" auto-scroll still works.
10. Learner name: new optional setting `learnerName`. Greeting becomes "Good afternoon, <name>" (plain "Good afternoon" when empty);
    summary title "Nice work, <name>." (plain "Nice work." when empty). Settings gets a text field; it is saved to the server,
    exported and imported. Remove the hard-coded "Linh".
11. Existing users: progress rows and review logs keep working unchanged; stats percentages recompute over the larger map.

## Out of scope
Chunked or lazy word loading (needed only near 25,000 words), recorded audio, topic lists.
