#!/usr/bin/env node
// The OpenStreetMap relations behind `osm_relation_id` that the 2026-09-29 commune-centre
// capture does not hold, as a committed capture of its own.
//
// WHY A SECOND CAPTURE. research/_commune-centres/osm-2026-09-29/ was fetched with an
// Overpass query that asks for `boundary=administrative` AND `admin_level=8`, so a commune
// relation that is tagged in any other way is invisible to it however correct its
// `ref:ONS` code is. That filter, not OpenStreetMap, is why four communes came out of the
// audit with no relation. The Owner decided on 2026-10-02 to link the three OpenStreetMap
// does hold as a documented second tier and to keep the fourth null, so both the links and
// the null need evidence that a reader can re-fetch. This file is that evidence.
//
// WHAT IS CAPTURED, AND WHY EACH ID IS HERE. Relations are fetched by id, which is the
// whole point: a filtered query is what hid them. Nothing here is a name search.
//
//   SECOND_TIER         the three mis-tagged relations the published records now link to
//   DAIRA_ONLY          the only relation carrying commune 4703's ONS code, a daira, which
//                       is why that commune keeps a null rather than a wrong link
//   WIKIDATA_DUPLICATES the relations Wikidata's P402 names instead of ours for three
//                       communes, with our own alongside them, so
//                       test/osm-wikidata-second-source.test.mjs can prove the pair is a
//                       duplicate of one commune rather than two different places
//
// USAGE
//   node scripts/osm-links-relations.mjs            # report the committed capture
//   node scripts/osm-links-relations.mjs --fetch    # refresh it in place, then review the diff

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "research", "_osm-links");
export const RELATIONS = join(DIR, "relations.json");
const QUERY_FILE = join(DIR, "relations.overpassql");

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const LICENCE = "ODbL 1.0, (c) OpenStreetMap contributors";

// `boundary` and `type` are kept here although the commune-centre capture drops them:
// there the query guaranteed their values, here they are the defect being documented.
const KEEP_TAGS = ["type", "boundary", "admin_level", "ref", "ref:ONS", "wikidata", "name", "name:fr", "name:ar"];

/** code_commune -> the relation the published record links to. */
export const SECOND_TIER = new Map([
  [630, 4069543], // Souk Oufella
  [1634, 540555], // Bir Touta
  [2110, 6407308], // Collo
]);

/** code_commune -> the daira relation that carries its ONS code, the reason for the null. */
export const DAIRA_ONLY = new Map([[4703, 6823963]]);

/** code_commune -> [the relation we publish, the one Wikidata's P402 names instead]. */
export const WIKIDATA_DUPLICATES = new Map([
  [1347, [6666559, 2758654]], // Bouhlou
  [2240, [6662010, 2887283]], // Sidi Yacoub
  [3818, [6534589, 2806124]], // Sidi Abed
]);

/** Every relation id this capture holds, sorted, so the query is derived and not retyped. */
export function capturedIds() {
  const ids = new Set([...SECOND_TIER.values(), ...DAIRA_ONLY.values(), ...[...WIKIDATA_DUPLICATES.values()].flat()]);
  return [...ids].sort((a, b) => a - b);
}

export const query = () => `[out:json][timeout:180];
rel(id:${capturedIds().join(",")});
out tags;
`;

/** The committed capture as `{ meta, byId: Map<id, {id, tags}> }`. */
export function loadRelations(path = RELATIONS) {
  const doc = JSON.parse(readFileSync(path, "utf-8"));
  if (!doc.timestamp_osm_base) throw new Error("the relation capture carries no timestamp_osm_base");
  const byId = new Map(doc.relations.map((r) => [r.id, r]));
  for (const id of capturedIds())
    if (!byId.has(id)) throw new Error(`relation ${id} is declared in scripts/osm-links-relations.mjs but absent from the capture; run --fetch`);
  return { meta: doc, byId };
}

async function refresh() {
  const body = `data=${encodeURIComponent(query())}`;
  let raw = null;
  let lastError = null;
  // Overpass answers an id lookup in a moment but rate-limits per slot and returns HTML
  // when its dispatcher is busy, so a retry in minutes is the honest shape here.
  for (let attempt = 1; attempt <= 4 && raw === null; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = JSON.parse(await res.text());
    } catch (error) {
      lastError = error;
      console.error(`Overpass attempt ${attempt} failed: ${error.message}`);
      if (attempt < 4) await new Promise((r) => setTimeout(r, attempt * 30_000));
    }
  }
  if (raw === null) throw lastError;

  const relations = [];
  for (const el of raw.elements) {
    if (el.type !== "relation") continue;
    const tags = {};
    for (const key of KEEP_TAGS) if (el.tags?.[key] != null) tags[key] = el.tags[key];
    relations.push({ id: el.id, tags });
  }
  relations.sort((a, b) => a.id - b.id);
  const missing = capturedIds().filter((id) => !relations.some((r) => r.id === id));
  if (missing.length) throw new Error(`Overpass returned no relation for ${missing.join(", ")}; nothing written`);

  const doc = {
    generated: new Date().toISOString().slice(0, 10),
    source: "OpenStreetMap administrative relations fetched by id, via Overpass",
    endpoint: ENDPOINT,
    query: "research/_osm-links/relations.overpassql",
    generator: "scripts/osm-links-relations.mjs --fetch",
    timestamp_osm_base: raw.osm3s.timestamp_osm_base,
    licence: LICENCE,
    note:
      "Relations the 2026-09-29 commune-centre capture does not hold, fetched by id because that capture's query " +
      "filters on boundary=administrative AND admin_level=8. Three are the second-tier links of communes 630, 1634 " +
      "and 2110; one is the daira relation that carries commune 4703's ONS code and is the reason that commune keeps " +
      "a null; six are the duplicate pairs behind the Wikidata P402 exceptions for communes 1347, 2240 and 3818. " +
      "Which ids are captured and why is declared in scripts/osm-links-relations.mjs; refresh in place with " +
      "`node scripts/osm-links-relations.mjs --fetch` and review the diff.",
    count: relations.length,
    relations,
  };
  mkdirSync(DIR, { recursive: true });
  writeFileSync(QUERY_FILE, query());
  const tmp = `${RELATIONS}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, RELATIONS);
  console.log(`relations.json: ${relations.length} relations, timestamp_osm_base ${doc.timestamp_osm_base}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--fetch")) await refresh();
  else {
    const { meta, byId } = loadRelations();
    console.log(`relations.json: ${byId.size} relations, timestamp_osm_base ${meta.timestamp_osm_base}, ${meta.licence}`);
    for (const [code, id] of SECOND_TIER) console.log(`  second tier: commune ${code} -> relation ${id} (${byId.get(id).tags.wikidata ?? "no wikidata tag"})`);
    for (const [code, id] of DAIRA_ONLY) console.log(`  null kept: commune ${code}, only relation ${id} (admin_level=${byId.get(id).tags.admin_level}) carries its code`);
  }
}
