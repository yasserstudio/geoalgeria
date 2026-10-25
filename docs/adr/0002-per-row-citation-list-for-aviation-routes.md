# 0002. Per-row citation list for aviation routes

- Status: Accepted (Owner, 2026-10-25)
- Context: batch 2026-15, ticket #295 on the private tracker

## Context

A Route in `@geoalgeria/aviation` carries one `source`, a url a reader can open. One
string was enough while one report covered a whole row, and it stopped being enough as
soon as two reports covered different fields of it.

Air Algerie's own statement of 24 October 2026 announced five new lines out of Algiers,
with their launch dates. It is the best evidence that those ten legs exist and when they
start, and it carries no flight number, no day name and no airport for Tripoli. Making it
the `source` on those rows, which is what commit `20c11388` did, cited the strongest
evidence for the route and silently dropped the reports behind each row's `flight` and
`days`. The provenance survived only as a comment in the generator, which ships to nobody.

The same split is everywhere in the collection. It was being resolved by moving the
citation to whichever source covered the field at issue, or by not moving it and
explaining why in a comment. Both answers lose a citation a reader would want.

## Decision

1. **`source` is unchanged**, in meaning and in value: the primary citation, one url, on
   every row. Nothing a consumer reads today changes, which is what makes this additive.
2. **Every row also carries `sources`**: every link behind the row, as plain url strings,
   ordered, never empty, no url twice.
3. **Entry 0 is `source`**, the same url. Asserted by the generator, the builder,
   `validate-packages.mjs` and `test/aviation-route-sources.test.mjs`, so the two fields
   can never disagree.

A richer entry was built during the work, each citation an object carrying `publisher`,
`supports` (which of the row's claims it backed) and a publication `date`. All three were
dropped before release (Owner, 2026-10-25) in favour of plain urls: the list's job is to
let a reader open every document behind a row, and the extra fields cost reading and
upkeep without serving that. Many of the sources carry no readable byline, so the date was
often absent or guessed, and a wrong date is worse than none. `metadata.routes_as_of`
remains the freshness signal. Any of the three can return later as an additive field, by
amending this ADR first. Until then a citation is a string, and
`test/aviation-route-sources.test.mjs` rejects an object so the shape cannot creep back.

## Consequences

- Shipped in `@geoalgeria/aviation` 2.9.0, a minor: a new field, no row added, removed or
  changed otherwise, and 157 nonstop legs and 20 planned ones as before.
- JSON and the GeoJSON `properties` carry the list as it is. The CSV is a flat table, so
  the `sources` column holds the urls space-separated, the same encoding the `days` column
  uses: a url carries no space, so the cell splits cleanly on one.
- `metadata.routes_as_of` stays at 2026-10-09. This is provenance, not a re-check of the
  schedule, and dating the network from a citation pass would be a false claim.
- A consumer reading `source` is unaffected. A consumer showing provenance renders the
  list as links.
- The Source rights scan reads any `sources` array as `metadata.sources[]`, a list of
  registry keys. A route citation is a bare url with no key, since it cites a published
  report rather than declaring an upstream; the scan tells the two shapes apart rather than
  demanding a key the citation cannot have.
- The pattern is aviation's for now. Any other dataset wanting per-row citations adopts
  this shape rather than inventing a second one.
