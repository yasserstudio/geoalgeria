# Algérie Télécom agency research

## National collection: all 58 source wilayas

The target is every wilaya in the operator's selector. GeoAlgeria's 69-wilaya
geography is reconciled separately; the operator currently lists 58.

1. Open the official agency locator in your working browser.
2. Paste the contents of `collect-in-browser.js` into DevTools Console once.
3. The helper selects the next wilaya. Leave commune unselected, complete the
   site's CAPTCHA and click Search. After each successful wilaya-wide response,
   it saves progress and selects the next pending wilaya. Failed searches remain
   pending; it never submits a search or solves a CAPTCHA itself.
4. At 58/58 it downloads `algerie-telecom-wilayas.json`. To save partial progress,
   run `atAgencyCollection.download()`. `atAgencyCollection.status()` lists the
   remaining codes; `atAgencyCollection.stop()` removes the collection listeners.
5. Import that single file with `node import-agencies.mjs <downloaded-file>`.

The helper stores response bodies only in this site's localStorage, never cookies,
request bodies or CAPTCHA tokens. Reloading and pasting it again resumes saved
wilayas. Saved response dates are retained, not restamped on resume. This helper
has not yet been exercised in a connected live browser here; access was blocked.

For national discovery while official captures are pending, run
`node collect-osm.mjs`. It queries OpenStreetMap for ACTEL and Algérie Télécom
features and writes `osm/raw.json` plus `osm/candidates.json`. These are
community candidates with raw tags and boundary checks; they are never promoted
to operator records without an official match.

The importer accepts one envelope or an array, validates the entire batch before
writing, and rejects duplicate scopes. `review/national-status.json` lists completed
wilaya-wide captures and every pending code. Commune-only searches do not complete
a wilaya. Current real coverage remains **1/58**, Chlef; the other 57 are pending.

## Captured evidence

First capture: user-supplied Chlef wilaya-wide response, received 2026-09-09.
It contains 11 source IDs (175–185): five commercial agencies and six points of
presence. All coordinates parse and fall within Chlef's wilaya polygon, with no
identical coordinate pairs. These checks do not independently verify addresses
or entrances. Each row's `date` is `2024-10-30 15:09:40`; its exact meaning is
unconfirmed and it is preserved separately from the receipt date.

Obtain the JSON **response body** of `trouver_mon-agence-search` after completing
the normal locator form and CAPTCHA. Do not export a HAR, cookies, headers or
CAPTCHA tokens. Wrap that response in:

```json
{
  "retrieved_at": "YYYY-MM-DD",
  "source_wilaya": 43,
  "source_commune": "exact commune selection label/value",
  "response": { "resultat": "ok", "content": [] }
}
```

Replace `response` with the real body and use the actual retrieval date. The
empty array above only illustrates the envelope; it is not captured evidence.
For a wilaya-wide response, set `source_commune` to `""`; the response must also
explicitly contain `"commune": ""`. The Chlef capture confirms this mode.

Run from this directory:

```sh
node import-agencies.mjs /path/to/response-envelope.json
```

The importer validates the response, stores an owner-supplied source receipt via
the shared source store, and writes a scoped `review/` artifact. It has no
network collection or public package path. Reimporting the same scope replaces
its latest capture; git history is the archive. Retain the exact source commune
selection, not a guessed canonical code. The slash-separated `commune` values
on agency rows describe served communes, not a physical commune assignment.
Individual imports make no nationwide
completeness claim.

Valid numeric operator coordinates retain `exact` / `operator_point`. Decimal
commas are supported. Geographic conflicts and shared coordinates are flagged
without guessing replacements or merging agencies. Wilaya checks use simplified
display polygons, so discrepancies are review leads. Source codes 1–58 remain
separate from containing GeoAlgeria polygons. Candidate IDs identify rows within
a receipt; `source_id` separately preserves the operator's ID. Duplicate source
IDs are rejected, while the scope filename distinguishes wilaya-wide searches
from commune searches. Names, phone numbers and opening hours are not invented.
