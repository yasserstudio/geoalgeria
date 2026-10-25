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
`days`: the 21 August sale-inventory report, the 26 September programme report, the
15 August China report, the 1 October Tripoli reports. The provenance survived only as a
comment in the generator, which ships to nobody.

The same split is everywhere in the collection and was being resolved by moving the
citation to whichever source covered the field at issue, or by not moving it and
explaining why in a comment. Both answers lose a citation a reader would want.

## Decision

1. **`source` is unchanged**, in meaning and in value: the primary citation, one url, on
   every row. Nothing a consumer reads today changes, which is what makes this additive.
2. **Every row also carries `sources`**, an ordered list of citations, never empty.
3. **Entry 0 is `source`**, the same url. Asserted by the generator, the builder,
   `validate-packages.mjs` and `test/aviation-route-sources.test.mjs`, so the two fields
   can never disagree.
4. **An entry is `{ url, publisher, date, supports }`**:
   - `publisher` in plain English ("Lyon Airport", "AeroRoutes", "Air Algerie statement,
     via Algerie360"), because a reader judges a citation by who published it. A host with
     no publisher name fails the build;
   - `date` is the publication date, `YYYY-MM-DD`, read from the url where the publisher
     puts one there and listed per source otherwise, off the page's own byline. It is
     `null` where no byline could be read: usually because there is none, an airline's or
     an airport's destination page being a living document that dating would invent a fact
     about, and in five cases because the host refuses an automated fetch. Never dated from
     what a report says rather than from how it is bylined, which is how the sale-inventory
     report came to be stamped with the day sales opened;
   - `supports` names what the citation backs, from the closed set `route`, `status`,
     `dates`, `flight`, `days`. Closed so a consumer can switch on it.
5. **Entry 0's `supports` defaults to the fields the row ships** (always `route`; `status`
   where there is a state to claim, `unclear` being the absence of one; `flight` and `days`
   where the row carries them). That is the rule the collection already followed, that a
   row's `source` covers its fields. A row whose provenance splits states `supports`
   explicitly and names the covering report as a second entry.
6. **A row's `flight` and `days` must each be backed** by an entry whose `supports` says
   so. Gated in CI, so a field and its provenance cannot drift apart again.
7. **A suspension notice leads the list** with `status` alone, and the citation the row
   arrived with stays behind it with the rest of its claims. A notice that a route is not
   flying says nothing about its flight number.
8. **The 24 October 2026 statement is an extra entry**, not a `source`, on the ten legs it
   announces, supporting `route` and `dates`. The ten rows keep the report that covers
   their fields as `source`. Every one stays `planned`: a statement that a line opens is an
   announcement, and a leg leaves `plannedRoutes()` only on a dated report that the
   aircraft flew.

## Consequences

- Shipped in `@geoalgeria/aviation` 2.9.0, a minor: a new field, no row added, removed or
  changed otherwise, and 157 nonstop legs and 20 planned ones as before.
- JSON and the GeoJSON `properties` carry the list as it is. The CSV is a flat table, so
  the `sources` column carries the JSON array as a string, next to `source`.
- `metadata.routes_as_of` stays at 2026-10-09. This is provenance, not a re-check of the
  schedule, and dating the network from a citation pass would be a false claim.
- A consumer reading `source` is unaffected. A consumer showing provenance can render every
  citation with its publisher and date and say which claim each one backs.
- The Source rights scan reads any `sources` array as `metadata.sources[]`, a list of
  registry keys. A citation has a url, a publisher and a `supports` list and no key, since
  it cites a published report rather than declaring an upstream; the scan now tells the two
  shapes apart rather than demanding a key the citation cannot have.
- The pattern is aviation's for now. Any other dataset wanting per-row citations adopts
  this entry shape rather than inventing a second one.
