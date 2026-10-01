#!/usr/bin/env node
// The Wikidata P625 coordinate of every commune item OpenStreetMap's admin_level=8
// relations point at, as a committed snapshot.
//
// WHY A SNAPSHOT AND NOT A LIVE QUERY. Rule 8 of
// docs/adr/0001-coordinate-review-by-independent-votes.md: the review engine reads
// committed snapshots only, so a decision can be replayed offline, the tests can
// re-derive it, and drift in an upstream source shows up as a reviewable diff on this
// file instead of as a different answer on the next run. `--fetch` refreshes it in
// place; nothing else in the repository talks to Wikidata.
//
// THE Q-IDS ARE NOT OURS TO CHOOSE. They come from `wikidata` in
// osm-seat-reference.json, which harvested them off the commune relations themselves,
// so this file is "what Wikidata says about the item OpenStreetMap names", not a
// name search of our own. A commune whose relation carries no item has no row here.
//
// LICENCE. Wikidata statements are CC0 1.0, so a coordinate taken from here may be
// published; `licence` in the file says so and the correction ledger repeats it per row.
//
// USAGE
//   node scripts/review/wikidata-reference.mjs            # report the committed file
//   node scripts/review/wikidata-reference.mjs --fetch    # refresh it in place

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(ROOT, "research", "_commune-centres");
export const WIKIDATA_REFERENCE = join(DIR, "wikidata-reference.json");

const ENDPOINT = "https://query.wikidata.org/sparql";
const LICENCE = "CC0 1.0 Universal (Wikidata statements)";
// The endpoint rejects a very long query and throttles a fast one; 300 items per
// request keeps the URL well inside its limit and the whole pull inside a minute.
const BATCH = 300;
const UA = "geoalgeria-data/1.0 (https://github.com/yasserstudio/geoalgeria)";

/** 6 decimals is this repository's coordinate resolution (packages/schema round6). */
const round6 = (n) => Math.round(n * 1e6) / 1e6;

/** The committed snapshot, as `{ meta, byCommune: Map<code, {wikidata, point}> }`. */
export function loadWikidataReference(path = WIKIDATA_REFERENCE) {
  const doc = JSON.parse(readFileSync(path, "utf-8"));
  if (doc.communes.length !== doc.count) {
    throw new Error(`wikidata-reference.json says ${doc.count} rows, carries ${doc.communes.length}`);
  }
  return {
    meta: { generated: doc.generated, query_date: doc.query_date, licence: doc.licence, endpoint: doc.endpoint },
    byCommune: new Map(doc.communes.map((c) => [c.code_commune, c])),
  };
}

/** P625 for one batch of Q-ids, as `Map<qid, [lng, lat]>`. The first value wins: an
 *  item with two coordinate statements is ambiguous and this takes neither side. */
async function p625(qids) {
  const query = `SELECT ?item ?coord WHERE { VALUES ?item { ${qids.map((q) => `wd:${q}`).join(" ")} } ?item wdt:P625 ?coord }`;
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } });
  if (!res.ok) throw new Error(`Wikidata ${res.status} ${res.statusText}`);
  const out = new Map();
  for (const b of (await res.json()).results.bindings) {
    const qid = b.item.value.split("/").pop();
    const m = b.coord.value.match(/^Point\((-?[\d.]+) (-?[\d.]+)\)$/);
    if (m && !out.has(qid)) out.set(qid, [round6(Number(m[1])), round6(Number(m[2]))]);
  }
  return out;
}

async function refresh() {
  const seats = JSON.parse(readFileSync(join(DIR, "osm-seat-reference.json"), "utf-8"));
  const wanted = seats.communes
    .filter((c) => c.wikidata)
    .map((c) => ({ code_commune: c.code_commune, wilaya_code: c.wilaya_code, name_fr: c.name_fr, wikidata: c.wikidata }))
    .sort((a, b) => a.code_commune - b.code_commune);

  const points = new Map();
  for (let i = 0; i < wanted.length; i += BATCH) {
    const slice = wanted.slice(i, i + BATCH);
    for (const [qid, point] of await p625(slice.map((c) => c.wikidata))) points.set(qid, point);
    process.stderr.write(`  ${Math.min(i + BATCH, wanted.length)}/${wanted.length}\n`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const communes = wanted
    .filter((c) => points.has(c.wikidata))
    .map((c) => ({ ...c, point: points.get(c.wikidata) }));
  const doc = {
    generated: today,
    source:
      "Wikidata property P625 (coordinate location) of the commune items the OpenStreetMap admin_level=8 relations carry, read over the public SPARQL endpoint",
    endpoint: ENDPOINT,
    query_date: today,
    licence: LICENCE,
    note:
      "The Q-ids are not chosen here: they are `wikidata` in osm-seat-reference.json, harvested off the commune relations themselves, so a row says what Wikidata holds about the item OpenStreetMap names for that commune. A commune whose relation carries no item, or whose item carries no P625, has no row. Coordinates are [lng, lat] rounded to 6 decimals. Refresh in place with `node scripts/review/wikidata-reference.mjs --fetch` and review the diff; the review engine never queries live.",
    requested: wanted.length,
    count: communes.length,
    communes,
  };
  const tmp = `${WIKIDATA_REFERENCE}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, WIKIDATA_REFERENCE);
  console.log(`wikidata-reference.json: ${communes.length} of ${wanted.length} commune items carry P625 (${today})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--fetch")) await refresh();
  else {
    const { meta, byCommune } = loadWikidataReference();
    console.log(`wikidata-reference.json: ${byCommune.size} commune coordinates, queried ${meta.query_date}, ${meta.licence}`);
  }
}
