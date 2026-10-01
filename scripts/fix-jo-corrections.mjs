#!/usr/bin/env node
// Apply the JORA name corrections and the OpenStreetMap coordinate repairs of
// scripts/lib/jo-2026-corrections.mjs to every flagship carrier at once, so no
// format is left saying something the others no longer say. Public ids
// (code_commune, daira id, e-commerce id, SQL row id) never move.
//
// Usage:
//   node scripts/fix-jo-corrections.mjs            # dry-run report
//   node scripts/fix-jo-corrections.mjs --check    # exit 1 if a carrier drifts
//   node scripts/fix-jo-corrections.mjs --write
//   node scripts/fix-jo-corrections.mjs --write --target /path/algeria.json

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  communeDairaCorrections,
  communeNameCorrections,
  coordinateCorrections,
  wilayaNameCorrections,
} from "./lib/jo-2026-corrections.mjs";
import { isWilayaSqlRow } from "./lib/full-sql-rows.mjs";
import { supersededCommunePoints } from "./lib/commune-corrections.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "packages", "dataset");
const DATA = join(PKG, "data");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const targets = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--target") targets.push(process.argv[++i]);
}

// ---------------------------------------------------------------------------
// Index the corrections. `from` is asserted everywhere, so a carrier that has
// already drifted fails loudly instead of being silently rewritten.
// ---------------------------------------------------------------------------
/** code_commune -> { name_fr?: {from,to}, name_ar?: {from,to} } */
const communeNames = new Map();
for (const c of communeNameCorrections) {
  const entry = communeNames.get(c.code_commune) ?? {};
  entry[c.field] = { from: c.from, formerNames: [c.from, ...(c.former_names ?? [])], to: c.to };
  entry.wilaya_code = c.wilaya_code;
  communeNames.set(c.code_commune, entry);
}
/** code_commune -> { from:[lat,lng], to:[lat,lng] } */
const communeCoords = new Map(coordinateCorrections.map((c) => [c.code_commune, c]));

// A LATER LEDGER CAN SUPERSEDE ONE OF THOSE REPAIRS, and then this script must leave the
// coordinate alone instead of reading it as drift. El Euch (3427) is the first case: the
// JORA repair of version 2.1.0 took it off a placeholder onto its relation's centroid,
// and the coordinate review of 2026-10-01 then moved it 9.7 km onto its own admin_centre
// node on three independent Votes (research/_commune-centres/corrections-2026-10-01b.json).
// Both repairs are real and they are in order; the ledger's value is the current one, so
// it is accepted here and never rewritten. The ledgers are read rather than a code being
// pinned, so the next such case needs no edit.
/** code_commune -> [lat, lng] a commune-centre ledger has since moved it to. */
const supersededCoords = supersededCommunePoints(new Set(communeCoords.keys()));

/** Is this carrier already at the value a later ledger moved the commune to? */
function atSupersededPoint(code, lat, lng) {
  const later = supersededCoords.get(Number(code));
  return Boolean(later) && Number(lat) === later[0] && Number(lng) === later[1];
}
/** code_commune -> { from, to } for a commune filed under the wrong daira. */
const communeDairas = new Map(communeDairaCorrections.map((c) => [c.code_commune, c]));
/** wilaya code -> { from, to } */
const wilayaNames = new Map(
  wilayaNameCorrections.map((c) => [c.code, { from: c.from, formerNames: [c.from, ...(c.former_names ?? [])], to: c.to }]),
);

const splitPaths = [
  join(DATA, "communes_w1_w23.json"),
  join(DATA, "communes_w24_w48.json"),
  join(DATA, "communes_w49_w69.json"),
];
/** The pre-correction commune table: every carrier without a commune code is
 *  addressed by the (wilaya, old French name) pair, which is unique. */
const before = splitPaths.flatMap((path) => JSON.parse(readFileSync(path, "utf8")));
const oldNameOf = new Map(before.map((row) => [row.code_commune, row.name_fr]));

/** A daira is named after its seat commune, so a renamed seat renames it. */
const dairaRenames = new Map(); // "wilaya|oldName" -> newName
for (const entry of communeNames.values()) {
  if (!entry.name_fr) continue;
  for (const name of entry.name_fr.formerNames) dairaRenames.set(`${entry.wilaya_code}|${name}`, entry.name_fr.to);
}
const dairaRename = (wilaya, name) => dairaRenames.get(`${Number(wilaya)}|${name}`) ?? name;

/** The daira a commune belongs to after the renames and the moves. */
function dairaFor(code, wilaya, name, where) {
  const renamed = dairaRename(wilaya, name);
  const move = communeDairas.get(Number(code));
  if (!move) return renamed;
  expect(renamed, [move.from, move.to], `${where} ${code} daira`);
  return move.to;
}

// ---------------------------------------------------------------------------
// Output queue, written atomically only once every carrier has been built.
// ---------------------------------------------------------------------------
const outputs = [];
const queueJson = (path, value) => outputs.push([path, `${JSON.stringify(value, null, 2)}\n`]);
const queueText = (path, value) => outputs.push([path, value]);

function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/** A carrier may already hold the corrected value (the atlas GeoJSON, for one,
 *  already says "M'Sila"), so both readings are accepted and anything else is a
 *  drift this script must not paper over. */
function expect(actual, allowed, where) {
  if (!allowed.includes(actual)) {
    throw new Error(`${where}: expected one of ${JSON.stringify(allowed)}, found ${JSON.stringify(actual)}`);
  }
}

/** Apply the name + coordinate corrections to one commune-shaped object. */
function patchCommune(row, keys, where) {
  const code = Number(row[keys.code]);
  const names = communeNames.get(code);
  if (names) {
    for (const field of ["name_fr", "name_ar"]) {
      if (!names[field] || !keys[field]) continue;
      expect(row[keys[field]], [...names[field].formerNames, names[field].to], `${where} ${code} ${field}`);
      row[keys[field]] = names[field].to;
    }
  }
  const coords = communeCoords.get(code);
  if (coords && keys.lat) {
    if (!atSupersededPoint(code, row[keys.lat], row[keys.lng])) {
      expect(row[keys.lat], [coords.from[0], coords.to[0]], `${where} ${code} latitude`);
      expect(row[keys.lng], [coords.from[1], coords.to[1]], `${where} ${code} longitude`);
      row[keys.lat] = coords.to[0];
      row[keys.lng] = coords.to[1];
    }
  }
  if (keys.daira && row[keys.daira]) {
    row[keys.daira] = dairaFor(code, row[keys.wilaya], row[keys.daira], where);
  }
}

/** communes.geojson keeps its point in `geometry`, not in the properties. */
const GEOJSON_KEYS = {
  code: "code_commune",
  wilaya: "wilaya_code",
  name_fr: "name_fr",
  name_ar: "name_ar",
  daira: "daira",
};

const COMMUNE_KEYS = {
  code: "code_commune",
  wilaya: "wilaya_code",
  name_fr: "name_fr",
  name_ar: "name_ar",
  daira: "daira",
  lat: "latitude",
  lng: "longitude",
};

// --- the three split commune files -----------------------------------------
for (const path of splitPaths) {
  const rows = JSON.parse(readFileSync(path, "utf8"));
  for (const row of rows) patchCommune(row, COMMUNE_KEYS, basename(path));
  queueJson(path, rows);
}

// --- wilayas.json: names, plus the nested lists the reform wilayas carry -----
const wilayasPath = join(DATA, "wilayas.json");
const wilayasDoc = JSON.parse(readFileSync(wilayasPath, "utf8"));
/** wilaya -> { oldFr -> {name_fr,name_ar} }, for the nested commune/daira lists. */
const nestedByWilaya = new Map();
for (const entry of communeNames.values()) {
  const w = entry.wilaya_code;
  if (!nestedByWilaya.has(w)) nestedByWilaya.set(w, { fr: new Map(), ar: new Map() });
  const bucket = nestedByWilaya.get(w);
  for (const name of entry.name_fr?.formerNames ?? []) bucket.fr.set(name, entry.name_fr.to);
  for (const name of entry.name_ar?.formerNames ?? []) bucket.ar.set(name, entry.name_ar.to);
}
function patchNestedNames(node, wilaya) {
  const bucket = nestedByWilaya.get(Number(wilaya));
  if (!bucket) return;
  if (node.name_fr && bucket.fr.has(node.name_fr)) node.name_fr = bucket.fr.get(node.name_fr);
  if (node.name_ar && bucket.ar.has(node.name_ar)) node.name_ar = bucket.ar.get(node.name_ar);
}
for (const wilaya of wilayasDoc.wilayas) {
  const rename = wilayaNames.get(wilaya.code);
  if (rename) {
    expect(wilaya.name_fr, [...rename.formerNames, rename.to], `wilayas.json ${wilaya.code} name_fr`);
    wilaya.name_fr = rename.to;
    if (wilaya.name_en === rename.from) wilaya.name_en = rename.to;
  }
  for (const commune of wilaya.communes ?? []) patchNestedNames(commune, wilaya.code);
  for (const daira of wilaya.dairas ?? []) {
    patchNestedNames(daira, wilaya.code);
    const bucket = nestedByWilaya.get(Number(wilaya.code));
    if (bucket && Array.isArray(daira.communes)) {
      daira.communes = daira.communes.map((name) =>
        typeof name === "string" ? bucket.ar.get(name) ?? name : name,
      );
    }
  }
}
queueJson(wilayasPath, wilayasDoc);

// --- dairas.json ------------------------------------------------------------
const dairasPath = join(DATA, "dairas.json");
const dairas = JSON.parse(readFileSync(dairasPath, "utf8"));
for (const daira of dairas) daira.name_fr = dairaRename(daira.wilaya_code, daira.name_fr);
// A moved commune changes two dairas' counts; recount those from the patched
// split files rather than adjusting by one, so a re-run stays idempotent.
const patchedCommunes = splitPaths.flatMap((path) =>
  JSON.parse(outputs.find(([p]) => p === path)[1]),
);
for (const move of communeDairaCorrections) {
  for (const name of [move.from, move.to]) {
    const count = patchedCommunes.filter(
      (c) => c.wilaya_code === move.wilaya_code && c.daira === name,
    ).length;
    const at = dairas.findIndex((d) => d.wilaya_code === move.wilaya_code && d.name_fr === name);
    if (at === -1) {
      // The only row that can be missing is one an earlier run already removed
      // for holding nothing, which is what the recount is about to say again.
      if (count) throw new Error(`dairas.json: no daira ${name} in wilaya ${move.wilaya_code}`);
      continue;
    }
    // A move that empties a daira has not produced a daira with zero communes;
    // it has exposed a row that should not exist. El Alia (5513) was the only
    // commune filed under an "Ouargla" daira of wilaya 55, and wilaya 55 has no
    // such daira. Ids never move, so the removal leaves a gap rather than
    // renumbering the rows after it.
    if (count) dairas[at].commune_count = count;
    else dairas.splice(at, 1);
  }
}
queueJson(dairasPath, dairas);

// --- algeria.json (and any --target copy of it) -----------------------------
function patchUnified(doc, label) {
  for (const wilaya of doc) {
    const rename = wilayaNames.get(Number(wilaya.code));
    if (rename) {
      expect(wilaya.name_fr, [...rename.formerNames, rename.to], `${label} ${wilaya.code} name_fr`);
      wilaya.name_fr = rename.to;
    }
    // A reform wilaya names its mother in prose, so a renamed mother renames it.
    const mother = wilayaNameCorrections.find((c) => c.from === wilaya.parent_wilaya);
    if (mother) wilaya.parent_wilaya = mother.to;
    for (const commune of wilaya.communes ?? []) patchCommune(commune, COMMUNE_KEYS, label);
  }
}
const unifiedPath = join(DATA, "algeria.json");
const unified = JSON.parse(readFileSync(unifiedPath, "utf8"));
patchUnified(unified, "algeria.json");
queueJson(unifiedPath, unified);

// --- ecommerce/communes.json ------------------------------------------------
const ecommercePath = join(DATA, "ecommerce", "communes.json");
const ecommerce = JSON.parse(readFileSync(ecommercePath, "utf8"));
/** "wilaya|oldFrenchName" -> code_commune, for the carriers without a code. */
const codeByOldName = new Map(
  before.map((row) => [`${row.wilaya_code}|${row.name_fr}`, row.code_commune]),
);
const codeForOldName = (wilaya, name) => codeByOldName.get(`${Number(wilaya)}|${name}`);
/** "wilaya|name" -> code for every name a commune is or was known by: every
 *  Former name as well as the current one. */
const codeByAnyName = new Map(codeByOldName);
for (const [code, entry] of communeNames) {
  if (!entry.name_fr) continue;
  for (const name of [...entry.name_fr.formerNames, entry.name_fr.to]) {
    codeByAnyName.set(`${entry.wilaya_code}|${name}`, code);
  }
}

for (const row of ecommerce) {
  const code = codeForOldName(row.wilaya_code, row.commune_name_fr);
  if (code == null) throw new Error(`ecommerce/communes.json: unknown commune ${row.id}`);
  patchCommune(
    Object.assign(row, { code_commune: code }),
    {
      code: "code_commune",
      wilaya: "wilaya_code",
      name_fr: "commune_name_fr",
      name_ar: "commune_name_ar",
      daira: "daira_name_fr",
    },
    "ecommerce/communes.json",
  );
  delete row.code_commune;
  const rename = wilayaNames.get(Number(row.wilaya_code));
  if (rename) {
    expect(row.wilaya_name_fr, [...rename.formerNames, rename.to], `ecommerce/communes.json ${row.id} wilaya_name_fr`);
    row.wilaya_name_fr = rename.to;
  }
}
queueJson(ecommercePath, ecommerce);

// --- geojson ----------------------------------------------------------------
const communesGeoPath = join(DATA, "geojson", "communes.geojson");
const communesGeo = JSON.parse(readFileSync(communesGeoPath, "utf8"));
patchCommunePoints(communesGeo, "communes.geojson", { strict: true });
queueJson(communesGeoPath, communesGeo);

const wilayasGeoPath = join(DATA, "geojson", "wilayas.geojson");
const wilayasGeo = JSON.parse(readFileSync(wilayasGeoPath, "utf8"));
patchWilayaPoints(wilayasGeo, "wilayas.geojson");
queueJson(wilayasGeoPath, wilayasGeo);

// The repo-root atlas GeoJSON (README map, release bundle) labels each wilaya
// "name_fr — name_ar". Its labels were zipped alphabetically against numeric
// codes, so wilayas 60-69 each carried another wilaya's name over the right
// point; a dozen older rows had also lost their accents. Rebuild every label
// from algeria.json, which the coordinate check below proves is the same row.
const atlasPath = join(PKG, "algeria.geojson");
const atlas = JSON.parse(readFileSync(atlasPath, "utf8"));
const unifiedByCode = new Map(unified.map((wilaya) => [Number(wilaya.code), wilaya]));
for (const feature of atlas.features) {
  const wilaya = unifiedByCode.get(Number(feature.properties.code));
  if (!wilaya) throw new Error(`algeria.geojson: unknown wilaya ${feature.properties.code}`);
  const [lng, lat] = feature.geometry.coordinates;
  if (lng !== wilaya.longitude || lat !== wilaya.latitude) {
    throw new Error(`algeria.geojson ${wilaya.code}: point disagrees with algeria.json`);
  }
  feature.properties.name = `${wilaya.name_fr} \u2014 ${wilaya.name_ar}`;
  feature.properties.postal_code = wilaya.postal_code;
}
queueJson(atlasPath, atlas);

// --- CSV --------------------------------------------------------------------
function patchCsv(path, width, patch) {
  const original = readFileSync(path, "utf8");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.trimEnd().split(/\r?\n/);
  const rows = lines.slice(1).map((line) => line.split(","));
  for (const [index, fields] of rows.entries()) {
    if (fields.length !== width) {
      throw new Error(`${basename(path)} row ${index + 2}: expected ${width} fields, found ${fields.length}`);
    }
    patch(fields);
  }
  queueText(path, `${[lines[0], ...rows.map((row) => row.join(","))].join(newline)}${newline}`);
}

// name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
patchCsv(join(DATA, "csv", "communes.csv"), 8, (f) => {
  const code = Number(f[7]);
  const names = communeNames.get(code);
  if (names?.name_fr) {
    expect(f[0], [...names.name_fr.formerNames, names.name_fr.to], `csv/communes.csv ${code} name_fr`);
    f[0] = names.name_fr.to;
  }
  if (names?.name_ar) {
    expect(f[1], [...names.name_ar.formerNames, names.name_ar.to], `csv/communes.csv ${code} name_ar`);
    f[1] = names.name_ar.to;
  }
  f[3] = dairaFor(code, f[2], f[3], "csv/communes.csv");
  const coords = communeCoords.get(code);
  if (coords) {
    f[5] = String(coords.to[0]);
    f[6] = String(coords.to[1]);
  }
});

// code,name_fr,name_ar,phone_code,postal_code,latitude,longitude,created,capital_commune_code
patchCsv(join(DATA, "csv", "wilayas.csv"), 9, (f) => {
  const rename = wilayaNames.get(Number(f[0]));
  if (!rename) return;
  expect(f[1], [...rename.formerNames, rename.to], `csv/wilayas.csv ${f[0]} name_fr`);
  f[1] = rename.to;
});

// id,commune_name_fr,commune_name_ar,daira_name_fr,wilaya_code,wilaya_name_fr,wilaya_name_ar,postal_code
patchCsv(join(DATA, "ecommerce", "communes.csv"), 8, (f) => {
  const code = codeForOldName(f[4], f[1]);
  if (code == null) throw new Error(`ecommerce/communes.csv: unknown commune ${f[1]}`);
  const names = communeNames.get(code);
  if (names?.name_fr) f[1] = names.name_fr.to;
  if (names?.name_ar) {
    expect(f[2], [...names.name_ar.formerNames, names.name_ar.to], `ecommerce/communes.csv ${code} name_ar`);
    f[2] = names.name_ar.to;
  }
  f[3] = dairaFor(code, f[4], f[3], "ecommerce/communes.csv");
  const rename = wilayaNames.get(Number(f[4]));
  if (rename) {
    expect(f[5], [...rename.formerNames, rename.to], `ecommerce/communes.csv ${f[0]} wilaya_name_fr`);
    f[5] = rename.to;
  }
});

// --- SQL --------------------------------------------------------------------
/** Split one `  (…),` VALUES row into its fields, honouring '' escaping. */
function splitSqlRow(body) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quoted) {
      if (ch === "'" && body[i + 1] === "'") { current += "''"; i++; continue; }
      if (ch === "'") { quoted = false; current += ch; continue; }
      current += ch;
      continue;
    }
    if (ch === "'") { quoted = true; current += ch; continue; }
    if (ch === ",") { fields.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}
const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;

function patchSql(path, patch) {
  const original = readFileSync(path, "utf8");
  const lines = original.split("\n");
  const out = lines.map((line) => {
    const match = /^(\s*\()(.*?)(\)[,;]?)$/.exec(line);
    if (!match) return line;
    const fields = splitSqlRow(match[2]);
    const patched = patch(fields, line);
    return patched ? `${match[1]}${fields.join(", ")}${match[3]}` : line;
  });
  queueText(path, out.join("\n"));
}


patchSql(join(DATA, "sql", "full.sql"), (f) => {
  if (isWilayaSqlRow(f)) {
    const rename = wilayaNames.get(Number(f[0]));
    if (!rename) return false;
    expect(f[1], [sqlQuote(rename.from), sqlQuote(rename.to)], `sql/full.sql wilaya ${f[0]}`);
    f[1] = sqlQuote(rename.to);
    return true;
  }
  if (f.length !== 9) return false;
  const code = Number(f[8]);
  const names = communeNames.get(code);
  const coords = communeCoords.get(code);
  const daira = dairaFor(code, f[3], f[4].slice(1, -1).replace(/''/g, "'"), "sql/full.sql");
  let changed = false;
  if (names?.name_fr) {
    expect(f[1], [sqlQuote(names.name_fr.from), sqlQuote(names.name_fr.to)], `sql/full.sql commune ${code} name_fr`);
    f[1] = sqlQuote(names.name_fr.to);
    changed = true;
  }
  if (names?.name_ar) {
    expect(f[2], [sqlQuote(names.name_ar.from), sqlQuote(names.name_ar.to)], `sql/full.sql commune ${code} name_ar`);
    f[2] = sqlQuote(names.name_ar.to);
    changed = true;
  }
  if (sqlQuote(daira) !== f[4]) { f[4] = sqlQuote(daira); changed = true; }
  if (coords) {
    f[6] = String(coords.to[0]);
    f[7] = String(coords.to[1]);
    changed = true;
  }
  return changed;
});

// ecommerce: (id, 'commune_fr', 'commune_ar', 'daira', wilaya, 'wilaya_fr', 'wilaya_ar', 'postal')
patchSql(join(DATA, "ecommerce", "communes.sql"), (f) => {
  if (f.length !== 8) return false;
  const unquote = (value) => value.slice(1, -1).replace(/''/g, "'");
  const code = codeForOldName(f[4], unquote(f[1]));
  if (code == null) return false;
  const names = communeNames.get(code);
  let changed = false;
  if (names?.name_fr) { f[1] = sqlQuote(names.name_fr.to); changed = true; }
  if (names?.name_ar) {
    expect(f[2], [sqlQuote(names.name_ar.from), sqlQuote(names.name_ar.to)], `ecommerce/communes.sql ${code} name_ar`);
    f[2] = sqlQuote(names.name_ar.to);
    changed = true;
  }
  const daira = dairaFor(code, f[4], unquote(f[3]), "ecommerce/communes.sql");
  if (sqlQuote(daira) !== f[3]) { f[3] = sqlQuote(daira); changed = true; }
  const rename = wilayaNames.get(Number(f[4]));
  if (rename) {
    expect(f[5], [sqlQuote(rename.from), sqlQuote(rename.to)], `ecommerce/communes.sql ${f[0]} wilaya_name_fr`);
    f[5] = sqlQuote(rename.to);
    changed = true;
  }
  return changed;
});

// --- delivery zones ---------------------------------------------------------
// Community-maintained carrier tables that denormalize the wilaya name. Their
// rows for wilayas 59-69 had been zipped alphabetically against numeric codes,
// the same slip the atlas GeoJSON carried, so rebuild every label from its code.
const wilayaNameByCode = new Map(
  wilayasDoc.wilayas.map((wilaya) => [Number(wilaya.code), wilaya.name_fr]),
);
for (const provider of ["yalidine", "zr_express", "maystro"]) {
  const path = join(DATA, "delivery", `${provider}.json`);
  const doc = JSON.parse(readFileSync(path, "utf8"));
  for (const zone of doc.zones) {
    const name = wilayaNameByCode.get(Number(zone.wilaya_code));
    if (!name) throw new Error(`delivery/${provider}.json: unknown wilaya ${zone.wilaya_code}`);
    zone.wilaya_name_fr = name;
  }
  queueJson(path, doc);
}

// --- the two flat CSVs beside the JSON --------------------------------------
// code,name_ar,name_fr,name_en,created,mother_wilaya_code,law,communes_count,…,capital_commune_code
patchCsv(join(DATA, "wilayas.csv"), 12, (f) => {
  const rename = wilayaNames.get(Number(f[0]));
  if (!rename) return;
  expect(f[2], [...rename.formerNames, rename.to], `wilayas.csv ${f[0]} name_fr`);
  f[2] = rename.to;
  if (f[3] === rename.from) f[3] = rename.to;
});

// wilaya_code,wilaya_name_fr,commune_name_ar,commune_name_fr
patchCsv(join(DATA, "communes_new_wilayas.csv"), 4, (f) => {
  const wilaya = Number(f[0]);
  const name = wilayaNameByCode.get(wilaya);
  if (!name) throw new Error(`communes_new_wilayas.csv: unknown wilaya ${wilaya}`);
  f[1] = name;
  const bucket = nestedByWilaya.get(wilaya);
  if (!bucket) return;
  if (bucket.ar.has(f[2])) f[2] = bucket.ar.get(f[2]);
  if (bucket.fr.has(f[3])) f[3] = bucket.fr.get(f[3]);
});

// --- --target: another copy of the flagship data (the web app's fork) --------
// The app keeps its own carriers, in its own formatting, with repairs of its
// own. Each is recognised by shape and only the corrected fields are touched.

/** Write a target back in the formatting it was read in. */
function queueLike(path, original, value) {
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const indent = /^[[{]\r?\n([ \t]+)/.exec(original)?.[1] ?? "";
  const body = JSON.stringify(value, null, indent).replace(/\n/g, eol);
  queueText(path, `${body}${/\r?\n$/.test(original) ? eol : ""}`);
}

/** Commune points carry no code, so each is placed by any name the commune is
 *  or was known by. `strict` (this repo's own carrier) refuses a point it
 *  cannot place; a --target fork may hold communes of its own, so there the
 *  corrected points are cross-checked against its algeria.json instead. */
function patchCommunePoints(doc, label, { strict = false } = {}) {
  for (const feature of doc.features) {
    const props = feature.properties;
    const code = codeByAnyName.get(`${Number(props.wilaya_code)}|${props.name_fr}`);
    if (code == null) {
      if (strict) throw new Error(`${label}: unknown commune ${props.name_fr}`);
      continue;
    }
    patchCommune(Object.assign(props, { code_commune: code }), GEOJSON_KEYS, label);
    delete props.code_commune;
    const coords = communeCoords.get(code);
    if (coords && !atSupersededPoint(code, feature.geometry.coordinates[1], feature.geometry.coordinates[0])) {
      expect(feature.geometry.coordinates[0], [coords.from[1], coords.to[1]], `${label} ${code} lng`);
      expect(feature.geometry.coordinates[1], [coords.from[0], coords.to[0]], `${label} ${code} lat`);
      feature.geometry.coordinates = [coords.to[1], coords.to[0]];
    }
  }
}

function patchWilayaPoints(doc, label) {
  for (const feature of doc.features) {
    const rename = wilayaNames.get(Number(feature.properties.code));
    if (!rename) continue;
    expect(feature.properties.name_fr, [...rename.formerNames, rename.to], `${label} ${feature.properties.code} name_fr`);
    feature.properties.name_fr = rename.to;
  }
}

function isCommunePoints(doc) {
  const props = doc.features[0]?.properties ?? {};
  return "wilaya_code" in props && "name_fr" in props;
}

function patchTarget(path) {
  const original = readFileSync(path, "utf8");
  const doc = JSON.parse(original);
  const label = basename(path);
  if (Array.isArray(doc)) {
    patchUnified(doc, label);
  } else if (doc.type === "FeatureCollection") {
    const props = doc.features[0]?.properties ?? {};
    if (isCommunePoints(doc)) patchCommunePoints(doc, label);
    else if ("code" in props && "name_fr" in props) patchWilayaPoints(doc, label);
    else if ("code" in props && !("name_fr" in props)) {
      // Boundaries carry only the wilaya code: nothing a name correction touches.
    } else throw new Error(`${label}: unrecognised carrier shape`);
  } else {
    throw new Error(`${label}: unrecognised carrier shape`);
  }
  queueLike(path, original, doc);
  return { label, doc };
}

/** A commune points carrier has no codes, so a commune spelled some way no
 *  correction knows would be skipped silently. Each corrected commune's name
 *  in the coded algeria.json target must therefore also name a point. */
function checkPointsAgainstUnified(patched) {
  const points = patched.filter(({ doc }) => doc.type === "FeatureCollection" && isCommunePoints(doc));
  if (!points.length) return;
  const unified = patched.find(({ doc }) => Array.isArray(doc));
  if (!unified) {
    throw new Error(`${points[0].label}: pass the algeria.json it must agree with as another --target`);
  }
  const byCode = new Map(unified.doc.flatMap((wilaya) => wilaya.communes ?? []).map((c) => [c.code_commune, c]));
  const corrected = new Set([...communeNames.keys(), ...communeCoords.keys(), ...communeDairas.keys()]);
  for (const { label, doc } of points) {
    const named = new Set(doc.features.map((f) => `${Number(f.properties.wilaya_code)}|${f.properties.name_fr}`));
    for (const code of corrected) {
      const commune = byCode.get(code);
      if (!commune) continue;
      if (!named.has(`${commune.wilaya_code}|${commune.name_fr}`)) {
        throw new Error(
          `${label}: no point for commune ${code} "${commune.name_fr}" (wilaya ${commune.wilaya_code}); it is spelled some way no correction knows`,
        );
      }
    }
  }
}

const patchedTargets = targets.map(patchTarget);
checkPointsAgainstUnified(patchedTargets);

// ---------------------------------------------------------------------------
let changed = 0;
for (const [path, content] of outputs) {
  if (readFileSync(path, "utf8") === content) continue;
  changed++;
  console.log(`${WRITE ? "patched" : "would patch"} ${path.replace(`${ROOT}/`, "")}`);
  if (WRITE) writeAtomic(path, content);
}
console.log(`${changed} carrier(s) ${WRITE ? "updated" : "need an update"}`);
if (CHECK && changed) process.exit(1);
