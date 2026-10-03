#!/usr/bin/env node
// What Wikidata says about every Q item the published commune and wilaya records carry,
// as a committed snapshot: an independent second source for the two link fields.
//
// WHY. test/osm-wikidata-links.test.mjs holds the published values against the harvest
// the generator itself reads, so it proves nobody hand-edited a record and nothing more:
// if the harvest named the wrong relation, both sides would carry the wrong relation and
// agree. ADR 0001 is explicit that one source is never enough and that a source our value
// was copied from proves nothing. This file is the other source, from another endpoint
// and another database, and test/osm-wikidata-second-source.test.mjs reads it.
//
// TWO PROPERTIES, EACH ANSWERING A DIFFERENT QUESTION.
//   P402  Wikidata's own OpenStreetMap relation id for the item. Where Wikidata has one,
//         it is an independent statement about the same pairing, so it must name the
//         relation published here. 971 of the items carry none: a silence is not a
//         negative, so those rows simply have nothing to check against.
//   P31   instance of. A commune item must be a commune of Algeria (Q2989398) and a
//         wilaya item a province of Algeria (Q240601). This is what catches a relation
//         tagged with the item of some other place, which no relation-id check can see.
//
// THE Q-IDS ARE NOT OURS TO CHOOSE. They are each relation's own `wikidata` tag, read as
// published. This file therefore says "what Wikidata holds about the item OpenStreetMap
// names", never the result of a name search of our own.
//
// LICENCE. Wikidata statements are CC0 1.0. Nothing from this file is published in the
// package: it is a guard, not a carrier.
//
// USAGE
//   node scripts/osm-links-wikidata.mjs            # report the committed snapshot
//   node scripts/osm-links-wikidata.mjs --fetch    # refresh it in place, then review the diff

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const DIR = join(ROOT, "research", "_osm-links");
export const WIKIDATA_LINK_REFERENCE = join(DIR, "wikidata-link-reference.json");

const ENDPOINT = "https://query.wikidata.org/sparql";
const LICENCE = "CC0 1.0 Universal (Wikidata statements)";
const UA = "geoalgeria-data/1.0 (https://github.com/yasserstudio/geoalgeria)";
// The endpoint rejects a very long query; 250 items per request keeps the URL well inside
// its limit and the whole pull inside a minute.
const BATCH = 250;

const CLASSES = { commune: "Q2989398", wilaya: "Q240601" };

const readJson = (...parts) => JSON.parse(readFileSync(join(...parts), "utf-8"));

/** Every published record carrying a Wikidata item, communes first, each by its code. */
export function publishedItems() {
  const communes = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"].flatMap((f) =>
    readJson(DATA, f),
  );
  const wilayas = readJson(DATA, "wilayas.json").wilayas;
  return [
    ...communes
      .filter((c) => c.wikidata)
      .map((c) => ({ kind: "commune", code: Number(c.code_commune), name_fr: c.name_fr, wikidata: c.wikidata })),
    ...wilayas
      .filter((w) => w.wikidata)
      .map((w) => ({ kind: "wilaya", code: Number(w.code), name_fr: w.name_fr, wikidata: w.wikidata })),
  ].sort((a, b) => a.kind.localeCompare(b.kind) || a.code - b.code);
}

/** The committed snapshot as `{ meta, byQ: Map<qid, item> }`. */
export function loadWikidataLinkReference(path = WIKIDATA_LINK_REFERENCE) {
  const doc = JSON.parse(readFileSync(path, "utf-8"));
  if (doc.items.length !== doc.count) throw new Error(`the snapshot says ${doc.count} rows, carries ${doc.items.length}`);
  return { meta: doc, byQ: new Map(doc.items.map((i) => [i.wikidata, i])) };
}

/** P402 and P31 for one batch of Q-ids, as `Map<qid, {p402:Set, p31:Set}>`. */
async function properties(qids) {
  const query = `SELECT ?item ?p402 ?p31 WHERE { VALUES ?item { ${qids
    .map((q) => `wd:${q}`)
    .join(" ")} } OPTIONAL { ?item wdt:P402 ?p402 } OPTIONAL { ?item wdt:P31 ?p31 } }`;
  const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status} ${res.statusText}`);
  const out = new Map();
  for (const b of (await res.json()).results.bindings) {
    const qid = b.item.value.split("/").pop();
    if (!out.has(qid)) out.set(qid, { p402: new Set(), p31: new Set() });
    // P402 is a string property upstream; a value that is not a plain relation id is
    // dropped rather than coerced, so a malformed statement cannot read as a match.
    if (b.p402 && /^[1-9][0-9]*$/.test(b.p402.value)) out.get(qid).p402.add(Number(b.p402.value));
    if (b.p31) out.get(qid).p31.add(b.p31.value.split("/").pop());
  }
  return out;
}

async function refresh() {
  const wanted = publishedItems();
  const seen = new Map();
  for (let i = 0; i < wanted.length; i += BATCH) {
    const slice = wanted.slice(i, i + BATCH);
    for (const [qid, props] of await properties(slice.map((s) => s.wikidata))) seen.set(qid, props);
    process.stderr.write(`  ${Math.min(i + BATCH, wanted.length)}/${wanted.length}\n`);
  }
  const missing = wanted.filter((w) => !seen.has(w.wikidata));
  if (missing.length)
    throw new Error(
      `Wikidata returned nothing for ${missing.length} item(s), starting with ${missing[0].wikidata} ` +
        `(${missing[0].kind} ${missing[0].code}); nothing written, because a gap would read as a pass`,
    );

  const today = new Date().toISOString().slice(0, 10);
  const doc = {
    generated: today,
    source:
      "Wikidata properties P402 (OpenStreetMap relation ID) and P31 (instance of) of every Q item the published " +
      "commune and wilaya records carry, read over the public SPARQL endpoint",
    endpoint: ENDPOINT,
    query_date: today,
    licence: LICENCE,
    note:
      "An independent second source for osm_relation_id and wikidata, not a carrier: nothing here is published in the " +
      "package. The Q-ids are not chosen here, they are each OpenStreetMap relation's own wikidata tag, so a row says " +
      "what Wikidata holds about the item OpenStreetMap names for that record. An item with no P402 has an empty list; " +
      "a silence is not a negative. Refresh in place with `node scripts/osm-links-wikidata.mjs --fetch` and review the " +
      "diff; test/osm-wikidata-second-source.test.mjs reads this file and never queries live.",
    classes: CLASSES,
    requested: wanted.length,
    count: wanted.length,
    items: wanted.map((w) => ({
      kind: w.kind,
      code: w.code,
      name_fr: w.name_fr,
      wikidata: w.wikidata,
      p402: [...seen.get(w.wikidata).p402].sort((a, b) => a - b),
      p31: [...seen.get(w.wikidata).p31].sort(),
    })),
  };
  mkdirSync(DIR, { recursive: true });
  const tmp = `${WIKIDATA_LINK_REFERENCE}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, WIKIDATA_LINK_REFERENCE);
  const withP402 = doc.items.filter((i) => i.p402.length > 0).length;
  console.log(`wikidata-link-reference.json: ${doc.count} items, ${withP402} with a P402 statement to check against (${today})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--fetch")) await refresh();
  else {
    const { meta, byQ } = loadWikidataLinkReference();
    const withP402 = [...byQ.values()].filter((i) => i.p402.length > 0).length;
    console.log(`wikidata-link-reference.json: ${byQ.size} items, ${withP402} with P402, queried ${meta.query_date}, ${meta.licence}`);
  }
}
