#!/usr/bin/env node
// Publish `osm_relation_id` and `wikidata` on every commune and wilaya record.
//
// WHY. A consumer who has a GeoAlgeria commune and wants its boundary, its population
// or its article had to match it by name, which is the one join this repository tells
// everyone else not to make. The audit of 2026-09-29 already resolved 1,537 of the 1,541
// communes and all 69 wilayas against their own OpenStreetMap administrative relations,
// so the two stable ids were sitting in the research directory while the published
// records carried neither.
//
// SOURCE OF TRUTH, FIRST TIER. research/_commune-centres/osm-seat-reference.json, the
// linkage written by scripts/audit-commune-centres.mjs from the Overpass capture in
// research/_commune-centres/osm-2026-09-29/. This script resolves nothing itself: it
// copies the relation id and the relation's `wikidata` tag for the code the audit
// decided, and a code the audit left unmatched stays null in both fields. The audit
// joins on `ref:ONS`, then on a pre-2019-reform ONS code scoped to the mother wilaya,
// then on reviewed per-relation pins; no commune in this capture was resolved by a
// name alone, and test/osm-wikidata-links.test.mjs holds that.
//
// SECOND TIER. That capture's Overpass query asks for `boundary=administrative` AND
// `admin_level=8`, so a commune relation tagged any other way is invisible to it however
// correct its `ref:ONS` code is. Three communes came out of the audit unmatched for
// exactly that reason, not because OpenStreetMap lacks them, and the Owner decided on
// 2026-10-02 to link them as a separate, documented tier. Their relations are fetched by
// id into research/_osm-links/relations.json (scripts/osm-links-relations.mjs), each is
// accepted only on an ONS-code match, and the sidecar names each relation's tag defect so
// a reader sees why the first tier missed it. A relation that becomes standard-tagged
// fails the run, because it then belongs in the first tier and the pin is stale.
// Commune 4703 stays null: the only relation carrying its ONS code is a daira, a different
// place, and that relation sits in the same capture as the evidence for the null.
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
// The second-tier capture is refreshed by its own script, not by this one:
//   node scripts/osm-links-relations.mjs --fetch

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DAIRA_ONLY, SECOND_TIER, loadRelations } from "./osm-links-relations.mjs";

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

// --- the second tier -----------------------------------------------------------

const { meta: captureMeta, byId: captured } = loadRelations();

/** Which halves of `boundary=administrative` + `admin_level=8` a relation fails. */
function tagDefect(tags) {
  const out = [];
  if (tags.boundary !== "administrative") out.push(tags.boundary ? `boundary=${tags.boundary}` : "no boundary tag");
  if (tags.admin_level !== "8") out.push(tags.admin_level ? `admin_level=${tags.admin_level}` : "no admin_level tag");
  return out;
}

/** The second tier, in the sidecar's order, with each pin re-checked against the capture. */
const secondTier = [];
for (const [code, relationId] of [...SECOND_TIER].sort((a, b) => a[0] - b[0])) {
  const label = `commune ${code}`;
  const relation = captured.get(relationId);
  if (wantCommune.get(code)?.osm_relation_id != null) {
    problems.push(`${label}: the first-tier harvest already links relation ${wantCommune.get(code).osm_relation_id}; the tiers overlap`);
    continue;
  }
  // An ONS-code match is the whole basis of the pin. A name is never enough here either.
  if (Number(relation.tags["ref:ONS"]) !== code) {
    problems.push(
      `${label}: relation ${relationId} carries ref:ONS ${JSON.stringify(relation.tags["ref:ONS"])}, so nothing says it is this commune`,
    );
    continue;
  }
  const defect = tagDefect(relation.tags);
  if (defect.length === 0) {
    problems.push(
      `${label}: relation ${relationId} is now boundary=administrative and admin_level=8, so it belongs in the first tier; refresh the 2026-09-29 capture and drop this pin`,
    );
    continue;
  }
  const link = linkOf(`${label} (second tier, relation ${relationId})`, {
    osm_relation_id: relationId,
    wikidata: relation.tags.wikidata ?? null,
  });
  wantCommune.set(code, link);
  secondTier.push({ code, relationId, defect, link, name: relation.tags["name:fr"] ?? relation.tags.name ?? null });
}

// The commune that keeps a null, with the relation that explains it checked, not asserted.
const dairaOnly = new Map();
for (const [code, relationId] of DAIRA_ONLY) {
  const relation = captured.get(relationId);
  if (Number(relation.tags["ref:ONS"]) !== code)
    problems.push(`commune ${code}: relation ${relationId} does not carry this ONS code, so it is not the reason for the null`);
  else if (relation.tags.admin_level !== "6")
    problems.push(
      `commune ${code}: relation ${relationId} is admin_level=${relation.tags.admin_level}, no longer a daira; recheck whether a commune relation now exists`,
    );
  else dairaOnly.set(code, relationId);
}

// --- the one excluded Wikidata item --------------------------------------------

// `wikidata` is the relation's own tag everywhere but here. The second-source guard
// (test/osm-wikidata-second-source.test.mjs) found one relation tagged with the item of a
// different place, and the Owner decided on 2026-10-02 to null that field and keep the
// relation rather than publish an item that answers the wrong place. The exclusion is
// keyed on the commune code AND the exact bad item, so the day OpenStreetMap is fixed the
// harvest stops carrying that item, this run fails, and the line is removed instead of
// quietly suppressing whatever the tag became.
//   code_commune -> [the item refused, the item that is actually this commune, why]
const WIKIDATA_EXCLUSIONS = [
  [
    3424,
    {
      excluded_item: "Q3517130",
      correct_item: "Q7674990",
      reason:
        "the relation's wikidata tag names Achabou (Q3517130), a village inside this commune, not the commune: " +
        "Wikidata types it as a village and describes it as being in Tafreg commune. The commune's own item is " +
        "Q7674990, a commune of Algeria. An OpenStreetMap edit is owed on the relation; until it lands the field is " +
        "null, because publishing the village item would answer a different place, and substituting Q7674990 would be " +
        "resolving an item ourselves, which this dataset does not do",
    },
  ],
];

const excluded = [];
for (const [code, row] of WIKIDATA_EXCLUSIONS) {
  const link = wantCommune.get(code);
  if (!link) {
    problems.push(`commune ${code}: an exclusion names a commune neither tier links`);
    continue;
  }
  if (link.wikidata !== row.excluded_item) {
    problems.push(
      `commune ${code}: the exclusion refuses ${row.excluded_item} but the relation now carries ` +
        `${JSON.stringify(link.wikidata)}; recheck the tag upstream and drop or restate this exclusion`,
    );
    continue;
  }
  wantCommune.set(code, { osm_relation_id: link.osm_relation_id, wikidata: null });
  excluded.push({ code, ...row, osm_relation_id: link.osm_relation_id });
}
const excludedCodes = new Set(excluded.map((row) => row.code));

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
  // A commune neither tier links is a null link, not a missing one: no relation carrying
  // its ONS code is a commune relation in either capture.
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
const byCommuneCode = new Map(communes.map((c) => [Number(c.code_commune), c]));

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
  // The SPDX field the repository's descriptor rule reads (scripts/lib/licence-terms.mjs),
  // with the note it requires under a package that declares SEE LICENSE IN LICENSE.
  license: "ODbL-1.0",
  provenance_notes: [
    'The license is the SPDX expression "ODbL-1.0" although the package declares "SEE LICENSE IN LICENSE": every value this file describes, `osm_relation_id` and the `wikidata` item, is an OpenStreetMap relation id or that relation\'s own `wikidata` tag, so this part alone is wholly ODbL 1.0, (c) OpenStreetMap contributors, as LICENSE states.',
  ],
  attribution: "https://www.openstreetmap.org/copyright",
  tiers:
    "Two. The first tier is the 2026-09-29 commune-centre capture, whose Overpass query asks for " +
    "boundary=administrative AND admin_level=8. The second tier is the three communes that query could not see: " +
    "OpenStreetMap holds their relations with the right ref:ONS code but non-standard tags, so they are fetched by id " +
    "into research/_osm-links/relations.json and listed under second_tier below with the tag defect that hid each one.",
  join:
    "First tier: the linkage scripts/audit-commune-centres.mjs decided, a commune relation joined on its ref:ONS tag, " +
    "then on a pre-2019-reform ONS code resolved inside the mother wilaya's carved-out communes, then on six reviewed " +
    "per-relation pins. Five of those pins are spelling gaps: the relation carries the documented pre-reform ONS code " +
    "and this dataset spells the name differently. The sixth, commune 4401 Ain-Defla, is the one record in the dataset " +
    "whose relation carries no ONS code at all; it was pinned on the relation's name together with being the single w44 " +
    "relation still unclaimed once every other w44 commune had been joined on its code, and its admin_centre node " +
    "falling inside wilaya 44. Second tier: an ONS-code match on a relation the first capture's tag filter excluded. " +
    "A wilaya relation is joined on its ref tag. Every record but 4401 is linked on an ONS code carried by the " +
    "relation itself; 4401 is linked by name confirmed by elimination, and no record is linked by a name alone.",
  wikidata:
    "The Q item is the relation's own wikidata tag, read as published and never looked up or guessed. A relation with no " +
    "wikidata tag leaves the field null. There is one exclusion, listed under wikidata_excluded below: where the " +
    "second-source guard proved a relation's tag names a different place, the field is null rather than carrying an item " +
    "that answers the wrong place. Nothing is ever substituted, only refused.",
  carriers: ["data/communes_w1_w23.json", "data/communes_w24_w48.json", "data/communes_w49_w69.json", "data/wilayas.json", "data/algeria.json"],
  second_tier_capture: "research/_osm-links/relations.json",
  second_tier_timestamp_osm_base: captureMeta.timestamp_osm_base,
  total_communes: communes.length,
  total_wilayas: wilayas.length,
  coverage,
  second_tier: secondTier.map((row) => ({
    code_commune: row.code,
    wilaya_code: Number(byCommuneCode.get(row.code)?.wilaya_code),
    name_fr: byCommuneCode.get(row.code)?.name_fr ?? null,
    name_ar: byCommuneCode.get(row.code)?.name_ar ?? null,
    osm_relation_id: row.relationId,
    wikidata: row.link.wikidata,
    osm_name: row.name,
    tag_defect: row.defect,
    reason:
      `the relation carries ref:ONS ${row.code} but ${row.defect.join(" and ")}, so the 2026-09-29 capture's ` +
      "boundary=administrative + admin_level=8 filter excluded it; fetched by id and linked on the ONS-code match. " +
      "The tagging is an OpenStreetMap defect owed upstream, not a reason to leave the record unlinked",
  })),
  communes_without_relation: communes
    .filter((c) => communeLink(c).osm_relation_id === null)
    .sort((a, b) => a.code_commune - b.code_commune)
    .map((c) => ({
      code_commune: c.code_commune,
      wilaya_code: Number(c.wilaya_code),
      name_fr: c.name_fr,
      name_ar: c.name_ar,
      reason: dairaOnly.has(c.code_commune)
        ? `no relation carrying ref:ONS ${c.code_commune} is a commune: the only one is the Dayet Ben Dahoua daira, ` +
          `relation ${dairaOnly.get(c.code_commune)} at admin_level=6, which is a different place and covers more than ` +
          "this commune. Both fields stay null rather than linking a daira to a commune"
        : "neither the 2026-09-29 capture nor research/_osm-links/relations.json holds a commune relation carrying this commune's ONS code",
    })),
  communes_without_wikidata: communes
    .filter(
      (c) =>
        communeLink(c).osm_relation_id !== null &&
        communeLink(c).wikidata === null &&
        !excludedCodes.has(Number(c.code_commune)),
    )
    .sort((a, b) => a.code_commune - b.code_commune)
    .map((c) => ({
      code_commune: c.code_commune,
      wilaya_code: Number(c.wilaya_code),
      name_fr: c.name_fr,
      osm_relation_id: communeLink(c).osm_relation_id,
      reason: "the relation carries no wikidata tag",
    })),
  wikidata_excluded: excluded
    .sort((a, b) => a.code - b.code)
    .map((row) => ({
      code_commune: row.code,
      wilaya_code: Number(byCommuneCode.get(row.code)?.wilaya_code),
      name_fr: byCommuneCode.get(row.code)?.name_fr ?? null,
      name_ar: byCommuneCode.get(row.code)?.name_ar ?? null,
      osm_relation_id: row.osm_relation_id,
      excluded_item: row.excluded_item,
      correct_item: row.correct_item,
      found_by: "test/osm-wikidata-second-source.test.mjs, the Wikidata P31 check",
      decided: "Owner, 2026-10-02",
      reason: row.reason,
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
for (const row of sidecar.second_tier)
  console.log(
    `  second tier: commune ${row.code_commune} ${row.name_fr}, relation ${row.osm_relation_id} (${row.tag_defect.join(", ")})`,
  );
for (const row of sidecar.communes_without_relation)
  console.log(`  no relation: commune ${row.code_commune} ${row.name_fr} (w${row.wilaya_code})`);
for (const row of sidecar.wikidata_excluded)
  console.log(
    `  wikidata excluded: commune ${row.code_commune} ${row.name_fr}, relation ${row.osm_relation_id} tags ${row.excluded_item} (the commune is ${row.correct_item})`,
  );
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
