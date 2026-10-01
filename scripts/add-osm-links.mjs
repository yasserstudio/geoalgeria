#!/usr/bin/env node
// Publish `osm_relation_id` and `wikidata` on every commune and wilaya record.
//
// WHY. A consumer who has a GeoAlgeria commune and wants its boundary, its population
// or its article had to match it by name, which is the one join this repository tells
// everyone else not to make. The audit of 2026-09-29 already resolved all 1,541
// communes and all 69 wilayas against their own OpenStreetMap administrative
// relations, so the two stable ids were sitting in the research directory while the
// published records carried neither.
//
// SOURCE OF TRUTH. research/_commune-centres/osm-seat-reference.json, the linkage
// written by scripts/audit-commune-centres.mjs from the Overpass capture in
// research/_commune-centres/osm-2026-09-29/. This script resolves nothing itself: it
// copies the relation id and the relation's `wikidata` tag for the code the audit
// decided, and a code the audit left unmatched stays null in both fields. The audit
// joins on `ref:ONS`, then on a pre-2019-reform ONS code scoped to the mother wilaya,
// then on reviewed per-relation pins; no commune in this capture was resolved by a
// name alone, and test/osm-wikidata-links.test.mjs holds that.
//
// NOT PAPERED OVER. One OpenStreetMap relation is one place, so two records claiming
// the same relation id or the same Wikidata item is an upstream or linkage defect and
// this script refuses to write it, naming both records. Silently keeping one and
// dropping the other would publish a join that answers two communes for one boundary.
//
// CARRIERS. The records themselves: data/communes_w*.json, data/wilayas.json and
// data/algeria.json at both of its levels. The flat mirrors (data/csv/*,
// data/sql/full.sql, data/geojson/*, data/ecommerce/*) deliberately do not carry the
// two ids in this release; data/README.md says so per file.
//
// USAGE
//   node scripts/add-osm-links.mjs            # dry-run report
//   node scripts/add-osm-links.mjs --write    # patch packages/dataset
//   node scripts/add-osm-links.mjs --check    # fail if any record is stale

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const RESEARCH = join(ROOT, "research", "_commune-centres");

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));
const Q_ITEM = /^Q[1-9][0-9]*$/;

const problems = [];
const outputs = [];

// --- the harvest ---------------------------------------------------------------

const reference = readJson(join(RESEARCH, "osm-seat-reference.json"));
if (!reference.timestamp_osm_base) throw new Error("the seat reference carries no timestamp_osm_base");

/** Both fields for one record, validated as shapes before anything is written. */
function linkOf(label, row) {
  const id = row?.osm_relation_id ?? null;
  const item = row?.wikidata ?? null;
  if (id !== null && !(Number.isSafeInteger(id) && id > 0))
    problems.push(`${label}: the harvest's osm_relation_id ${JSON.stringify(id)} is not a positive integer`);
  if (item !== null && !Q_ITEM.test(item))
    problems.push(`${label}: the harvest's wikidata ${JSON.stringify(item)} is not a Q item`);
  if (item !== null && id === null)
    problems.push(`${label}: the harvest has a Wikidata item with no relation to have read it from`);
  return { osm_relation_id: id, wikidata: item };
}

const wantCommune = new Map();
for (const row of reference.communes)
  wantCommune.set(Number(row.code_commune), linkOf(`commune ${row.code_commune} (${row.name_fr})`, row));
const wantWilaya = new Map();
for (const row of reference.wilayas)
  wantWilaya.set(Number(row.wilaya_code), linkOf(`wilaya ${row.wilaya_code} (${row.name_fr})`, row));

// One relation, one place. A repeat is reported with both holders and nothing is written.
for (const field of ["osm_relation_id", "wikidata"]) {
  const seen = new Map();
  for (const [kind, map] of [
    ["commune", wantCommune],
    ["wilaya", wantWilaya],
  ])
    for (const [code, link] of map) {
      const value = link[field];
      if (value === null) continue;
      const label = `${kind} ${code}`;
      if (seen.has(value))
        problems.push(
          `${field} ${value} is claimed by ${seen.get(value)} and ${label}; one relation is one place, so report it upstream rather than publishing the join twice`,
        );
      else seen.set(value, label);
    }
}

// --- the records ---------------------------------------------------------------

const stale = [];

/** The record with the two fields carried, inserted before `before` or appended. */
function withLink(row, link, before = null) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === before) {
      out.osm_relation_id = link.osm_relation_id;
      out.wikidata = link.wikidata;
    }
    if (key === "osm_relation_id" || key === "wikidata") continue;
    out[key] = value;
  }
  if (!(before && before in row)) {
    out.osm_relation_id = link.osm_relation_id;
    out.wikidata = link.wikidata;
  }
  return out;
}

function verdict(label, row, link) {
  if (row.osm_relation_id === link.osm_relation_id && row.wikidata === link.wikidata) return false;
  if (!("osm_relation_id" in row) || !("wikidata" in row)) stale.push(`${label}: fields absent`);
  else
    stale.push(
      `${label}: reads ${JSON.stringify([row.osm_relation_id, row.wikidata])}, harvest says ${JSON.stringify([
        link.osm_relation_id,
        link.wikidata,
      ])}`,
    );
  return true;
}

/** code -> link for one kind of record, with the lookup failure reported, not guessed. */
function linkFor(kind, code, label) {
  const map = kind === "commune" ? wantCommune : wantWilaya;
  if (map.has(code)) return map.get(code);
  // A commune the audit left unmatched is a null link, not a missing one: OpenStreetMap
  // has no admin_level=8 relation for it in this capture.
  if (kind === "commune") return { osm_relation_id: null, wikidata: null };
  problems.push(`${label}: the harvest has no admin_level=4 relation for this wilaya`);
  return null;
}

/** Patch a list of records in place, returning how many were stale. */
function patchRecords(label, rows, kind, codeOf, nameOf, before = null) {
  let changed = 0;
  const seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const code = Number(codeOf(rows[i]));
    if (seen.has(code)) throw new Error(`${label}: ${kind} ${code} appears more than once`);
    seen.add(code);
    const rowLabel = `${label} ${kind} ${code} (${nameOf(rows[i])})`;
    const link = linkFor(kind, code, rowLabel);
    if (!link) continue;
    if (verdict(rowLabel, rows[i], link)) changed++;
    rows[i] = withLink(rows[i], link, before);
  }
  return { changed, seen: seen.size };
}

const reports = [];

for (const file of ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"]) {
  const path = join(DATA, file);
  const rows = readJson(path);
  const { changed, seen } = patchRecords(
    file,
    rows,
    "commune",
    (c) => c.code_commune,
    (c) => c.name_fr,
  );
  outputs.push([path, `${JSON.stringify(rows, null, 2)}\n`]);
  reports.push({ label: file, changed, seen });
}

{
  const path = join(DATA, "wilayas.json");
  const parsed = readJson(path);
  const { changed, seen } = patchRecords(
    "wilayas.json",
    parsed.wilayas,
    "wilaya",
    (w) => w.code,
    (w) => w.name_fr,
  );
  if (seen !== 69) problems.push(`wilayas.json saw ${seen} of 69 wilayas`);
  outputs.push([path, `${JSON.stringify(parsed, null, 2)}\n`]);
  reports.push({ label: "wilayas.json", changed, seen });
}

{
  const path = join(DATA, "algeria.json");
  const rows = readJson(path);
  // The two ids go before `communes` so a wilaya's own fields stay together above its
  // nested commune list.
  const wilaya = patchRecords(
    "algeria.json",
    rows,
    "wilaya",
    (w) => w.code,
    (w) => w.name_fr,
    "communes",
  );
  if (wilaya.seen !== 69) problems.push(`algeria.json saw ${wilaya.seen} of 69 wilayas`);
  let nested = 0;
  let nestedSeen = 0;
  for (const w of rows) {
    if (!Array.isArray(w.communes)) continue;
    const res = patchRecords(
      `algeria.json wilaya ${w.code}`,
      w.communes,
      "commune",
      (c) => c.code_commune,
      (c) => c.name_fr,
    );
    nested += res.changed;
    nestedSeen += res.seen;
  }
  outputs.push([path, `${JSON.stringify(rows, null, 2)}\n`]);
  reports.push({ label: "algeria.json (wilayas)", changed: wilaya.changed, seen: wilaya.seen });
  reports.push({ label: "algeria.json (nested communes)", changed: nested, seen: nestedSeen });
}

// --- the sidecar ---------------------------------------------------------------

const communes = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"].flatMap((f) =>
  readJson(join(DATA, f)),
);
const wilayas = readJson(join(DATA, "wilayas.json")).wilayas;

/** The link the harvest holds for a shipped record, null fields when it holds none. */
const NO_LINK = { osm_relation_id: null, wikidata: null };
const communeLink = (c) => wantCommune.get(Number(c.code_commune)) ?? NO_LINK;
const wilayaLink = (w) => wantWilaya.get(Number(w.code)) ?? NO_LINK;

const coverage = {
  communes_with_relation: communes.filter((c) => communeLink(c).osm_relation_id !== null).length,
  communes_with_wikidata: communes.filter((c) => communeLink(c).wikidata !== null).length,
  wilayas_with_relation: wilayas.filter((w) => wilayaLink(w).osm_relation_id !== null).length,
  wilayas_with_wikidata: wilayas.filter((w) => wilayaLink(w).wikidata !== null).length,
};

const sidecar = {
  title: "OpenStreetMap relation and Wikidata links for the communes and wilayas",
  source:
    "OpenStreetMap administrative relations (admin_level=8 for communes, admin_level=4 for wilayas) and their tags, via Overpass",
  endpoint: "https://overpass-api.de/api/interpreter",
  capture: "research/_commune-centres/osm-2026-09-29/admin-relations.json",
  linkage: "research/_commune-centres/osm-seat-reference.json",
  generator: "scripts/add-osm-links.mjs",
  generated: reference.generated,
  timestamp_osm_base: reference.timestamp_osm_base,
  licence: "ODbL 1.0, (c) OpenStreetMap contributors",
  attribution: "https://www.openstreetmap.org/copyright",
  join:
    "The linkage is the one scripts/audit-commune-centres.mjs decided: a commune relation is joined on its ref:ONS tag, " +
    "then on a pre-2019-reform ONS code resolved inside the mother wilaya's carved-out communes, then on six reviewed " +
    "per-relation pins; a wilaya relation is joined on its ref tag. No record is linked by a name alone.",
  wikidata:
    "The Q item is the relation's own wikidata tag, read as published and never looked up or guessed. A relation with no " +
    "wikidata tag leaves the field null.",
  carriers: ["data/communes_w1_w23.json", "data/communes_w24_w48.json", "data/communes_w49_w69.json", "data/wilayas.json", "data/algeria.json"],
  total_communes: communes.length,
  total_wilayas: wilayas.length,
  coverage,
  communes_without_relation: communes
    .filter((c) => communeLink(c).osm_relation_id === null)
    .sort((a, b) => a.code_commune - b.code_commune)
    .map((c) => ({
      code_commune: c.code_commune,
      wilaya_code: Number(c.wilaya_code),
      name_fr: c.name_fr,
      name_ar: c.name_ar,
      reason: "the 2026-09-29 Overpass capture holds no admin_level=8 relation carrying this commune's ONS code or name",
    })),
  communes_without_wikidata: communes
    .filter((c) => communeLink(c).osm_relation_id !== null && communeLink(c).wikidata === null)
    .sort((a, b) => a.code_commune - b.code_commune)
    .map((c) => ({
      code_commune: c.code_commune,
      wilaya_code: Number(c.wilaya_code),
      name_fr: c.name_fr,
      osm_relation_id: communeLink(c).osm_relation_id,
      reason: "the relation carries no wikidata tag",
    })),
};

const sidecarPath = join(DATA, "osm-links.metadata.json");
const sidecarText = `${JSON.stringify(sidecar, null, 2)}\n`;
let sidecarStale = false;
try {
  sidecarStale = readFileSync(sidecarPath, "utf-8") !== sidecarText;
} catch {
  sidecarStale = true;
}
outputs.push([sidecarPath, sidecarText]);

// --- report --------------------------------------------------------------------

console.log(
  `OpenStreetMap links: ${coverage.communes_with_relation} of ${communes.length} communes and ` +
    `${coverage.wilayas_with_relation} of ${wilayas.length} wilayas have a relation; ` +
    `${coverage.communes_with_wikidata} and ${coverage.wilayas_with_wikidata} have a Wikidata item ` +
    `(timestamp_osm_base ${reference.timestamp_osm_base})`,
);
for (const r of reports)
  console.log(`  ${WRITE ? "patched" : "would patch"} ${r.label}: ${r.changed} record(s) changed, ${r.seen} seen`);
console.log(`  ${basename(sidecarPath)}: ${sidecarStale ? "would be rewritten" : "up to date"}`);
for (const row of sidecar.communes_without_relation)
  console.log(`  no relation: commune ${row.code_commune} ${row.name_fr} (w${row.wilaya_code})`);
for (const row of sidecar.communes_without_wikidata)
  console.log(`  no wikidata: commune ${row.code_commune} ${row.name_fr}, relation ${row.osm_relation_id}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s); nothing written:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
if (CHECK && (stale.length || sidecarStale)) {
  console.error(`\n${stale.length} record(s) and ${sidecarStale ? 1 : 0} sidecar stale; run with --write:`);
  for (const s of stale.slice(0, 20)) console.error(`  ${s}`);
  if (stale.length > 20) console.error(`  ... and ${stale.length - 20} more`);
  process.exit(1);
}
if (WRITE) for (const [path, content] of outputs) writeFileSync(path, content);
