# Raw data sources and licenses

| File | Source | License |
| --- | --- | --- |
| NGSL_12_stats.csv | https://www.newgeneralservicelist.com/s/NGSL_12_stats.csv (NGSL 1.2, 2,809 lemmas, SFI rank) | CC BY-SA 4.0, Browne, Culligan and Phillips |
| NGSL_12_lemmatized_for_teaching.csv | https://www.newgeneralservicelist.com/s/NGSL_12_lemmatized_for_teaching.csv (headword + inflected forms) | CC BY-SA 4.0 |
| NGSL-Spoken_12_stats.csv | https://www.newgeneralservicelist.com/s/NGSL-Spoken_12_stats.csv (721 spoken lemmas) | CC BY-SA 4.0 |
| eng_sentences.tsv.bz2 | https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2 | CC BY 2.0 FR (Tatoeba contributors) |
| manual-fixes.json | Written for WordMap to fill gaps | CC BY-SA 4.0 (same as content output) |
| seed.txt | Hand-written prototype seed (legacy, no longer read by the pipeline) | project |

Definitions and IPA come from https://api.dictionaryapi.dev (Wiktionary data, CC BY-SA 3.0) and are cached in `data/cache/dictionaryapi`.

The decompressed Tatoeba TSV lives in `data/extracted/` (untrusted data: parsed as text only, never executed).
A dropped-in `data/raw/ngsl.csv` (`lemma,rank[,sfi[,freq]]`) overrides the bundled NGSL list.

## Extension source decision (WordMap v00002, ranks 2810..10000)

| File | Source | License |
| --- | --- | --- |
| NGSL_31k_frequencies.csv | Derived (lemma, wordlist tag, SFI, U per million; file order kept) from https://www.newgeneralservicelist.com/s/NGSLwithSFI-31K.xlsx ("NGSL 1.2 plus stats and frequencies to 31k"), sheet "SFI adj", 31,240 lemmas | CC BY-SA 4.0, Browne, Culligan and Phillips (Brent Culligan is the workbook author) |

Decision: use the NGSL 1.2 31k frequency file as the extension source.

- The download page https://www.newgeneralservicelist.com/new-general-service-list states that the list "is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License" and offers the 31k workbook on the same page as the core CSVs; the site home page says the lists are "free to use, including commercially".
- The workbook contains no README, licence text or usage restriction (only author metadata); its page description says "for research purposes", which is a description and not a restriction. No file-level terms differ from the page-level CC BY-SA 4.0 statement.
- Residual risk (recorded): the page does not repeat the licence next to the 31k link itself. Permission beyond the licence is available from the authors (http://www.charlie-browne.com). If the owner wants a stricter position, switch the reader to another open list (OpenFrequencyListReader is wired as the configured fallback; ExtensionSourceResolver skips any source whose licence is not in the redistributable set or whose file is missing).
- The workbook also carries NAWL and supplementary tags (same authors, same licence); only the lemma order is used, tags are not shipped.
- Attribution text (credits.json): "Browne, Culligan and Phillips, New General Service List 1.2 (frequencies to 31k)"; derived word file stays CC BY-SA 4.0.

The raw .xlsx and its unzipped XML live in `data/extracted/ngsl31k/` (untrusted data: read as text only, never executed).
