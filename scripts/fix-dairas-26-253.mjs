#!/usr/bin/env node
// Bring the daira table and every commune's daira linkage in line with the
// annex of decret executif n 26-253 (JORA n 52 of 21 July 2026), read from
// research/_dairas/decree-26-253.json through scripts/lib/decree-26-253.mjs.
//
// Only the 21 wilayas the annex tabulates are touched; the other 48 keep the
// 91-306 list this dataset already holds. Daira ids never move: a seat the
// annex keeps keeps its id, a seat it renames keeps its id, a seat it drops is
// retired into data/retired-ids.json and a seat it creates takes a fresh id.
// Any add or removal the reviewed plan in the lib does not name aborts the run.
//
// Usage:
//   node scripts/fix-dairas-26-253.mjs            # dry-run report
//   node scripts/fix-dairas-26-253.mjs --check    # exit 1 if a carrier drifts
//   node scripts/fix-dairas-26-253.mjs --write

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ANNEXED_WILAYAS,
  CITATION,
  DAIRA_RENAMES,
  DAIRA_ROWS_ADDED,
  DAIRA_ROWS_RETIRED,
  membershipFromExtract,
  readExtract,
} from "./lib/decree-26-253.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");

const ANNEXED = new Set(ANNEXED_WILAYAS);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const outputs = [];
const queueJson = (path, value) => outputs.push([path, `${JSON.stringify(value, null, 2)}\n`]);
const queueText = (path, value) => outputs.push([path, value]);

function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

// --- what the annex says ----------------------------------------------------
const splitPaths = [
  join(DATA, "communes_w1_w23.json"),
  join(DATA, "communes_w24_w48.json"),
  join(DATA, "communes_w49_w69.json"),
];
const communes = splitPaths.flatMap((path) => readJson(path));

/** Every carrier addresses a commune by code where it has one, and by
 *  (wilaya, name) where it does not. */
const codeByName = new Map(
  communes.map((row) => [`${row.wilaya_code}|${row.name_fr}`, row.code_commune]),
);
const codeFor = (wilaya, name) => codeByName.get(`${Number(wilaya)}|${name}`);

/** The daira of a commune after the annex, or its current value untouched. */
function dairaFor(code, current) {
  const seat = seatOf.get(Number(code));
  return seat ?? current;
}

// --- the daira table --------------------------------------------------------
const dairasPath = join(DATA, "dairas.json");
const dairas = readJson(dairasPath);
const rename = new Map(DAIRA_RENAMES.map((r) => [`${r.wilaya_code}|${r.from}`, r.to]));
for (const row of dairas) {
  const to = rename.get(`${row.wilaya_code}|${row.name_fr}`);
  if (to) row.name_fr = to;
}
for (const { wilaya_code, from } of DAIRA_RENAMES) {
  if (!dairas.some((d) => d.wilaya_code === wilaya_code && d.name_fr === rename.get(`${wilaya_code}|${from}`))) {
    throw new Error(`dairas.json: wilaya ${wilaya_code} has no daira "${from}" to rename`);
  }
}

const { seatOf, seats, members } = membershipFromExtract(readExtract(), communes, dairas);

const countByWilayaDaira = new Map();
for (const commune of communes) {
  if (!ANNEXED.has(commune.wilaya_code)) continue;
  const key = `${commune.wilaya_code}|${dairaFor(commune.code_commune, commune.daira)}`;
  countByWilayaDaira.set(key, (countByWilayaDaira.get(key) ?? 0) + 1);
}

const added = new Map(DAIRA_ROWS_ADDED.map((r) => [`${r.wilaya_code}|${r.name_fr}`, r]));
const retired = new Map(DAIRA_ROWS_RETIRED.map((r) => [`${r.wilaya_code}|${r.name_fr}`, r]));
const live = new Set(
  dairas.filter((d) => ANNEXED.has(d.wilaya_code)).map((d) => `${d.wilaya_code}|${d.name_fr}`),
);
const wanted = new Set(
  [...seats].flatMap(([wilaya, names]) => names.map((name) => `${wilaya}|${name}`)),
);

const unreviewedAdds = [...wanted].filter((key) => !live.has(key) && !added.has(key));
if (unreviewedAdds.length) {
  throw new Error(`the annex creates daira(s) the plan does not name: ${unreviewedAdds.join(", ")}`);
}
const unreviewedRemovals = [...live].filter((key) => !wanted.has(key) && !retired.has(key));
if (unreviewedRemovals.length) {
  throw new Error(`the annex drops daira(s) the plan does not name: ${unreviewedRemovals.join(", ")}`);
}
// The plan must not name a daira the annex keeps. Both directions are checked
// against the annex rather than against the current table, so a re-run of an
// applied plan says the same thing as the first run.
const stale = [...added.keys(), ...retired.keys()].filter(
  (key) => added.has(key) !== wanted.has(key),
);
if (stale.length) {
  throw new Error(`the plan disagrees with the annex about: ${stale.join(", ")}`);
}
const rowById = new Map(dairas.map((d) => [d.id, d]));
for (const row of DAIRA_ROWS_ADDED) {
  const held = rowById.get(row.id);
  if (held && !(held.wilaya_code === row.wilaya_code && held.name_fr === row.name_fr)) {
    throw new Error(`daira id ${row.id} is already in use by ${held.wilaya_code} "${held.name_fr}"`);
  }
}
for (const row of DAIRA_ROWS_RETIRED) {
  const held = rowById.get(row.id);
  if (held && !(held.wilaya_code === row.wilaya_code && held.name_fr === row.name_fr)) {
    throw new Error(`daira id ${row.id} is not ${row.wilaya_code} "${row.name_fr}"`);
  }
}

const nextTable = dairas.filter((d) => !ANNEXED.has(d.wilaya_code) || wanted.has(`${d.wilaya_code}|${d.name_fr}`));
for (const row of nextTable) {
  if (!ANNEXED.has(row.wilaya_code)) continue;
  row.commune_count = countByWilayaDaira.get(`${row.wilaya_code}|${row.name_fr}`) ?? 0;
}
// A new row joins its wilaya's own run of rows, in name order within that run.
// The table as a whole is left in the order it already has: it is not sorted to
// one rule, and reshuffling it would bury the change in churn.
for (const row of DAIRA_ROWS_ADDED) {
  if (rowById.has(row.id)) continue; // an earlier run already added it
  const block = nextTable
    .map((held, index) => ({ held, index }))
    .filter(({ held }) => held.wilaya_code === row.wilaya_code);
  if (!block.length) throw new Error(`dairas.json: wilaya ${row.wilaya_code} has no rows to join`);
  const after = block.find(({ held }) => held.name_fr.localeCompare(row.name_fr, "fr") > 0);
  const at = after ? after.index : block[block.length - 1].index + 1;
  nextTable.splice(at, 0, {
    id: row.id,
    wilaya_code: row.wilaya_code,
    name_fr: row.name_fr,
    commune_count: countByWilayaDaira.get(`${row.wilaya_code}|${row.name_fr}`) ?? 0,
  });
}
for (const row of nextTable) {
  if (row.commune_count < 1) throw new Error(`daira ${row.id} "${row.name_fr}" would hold no commune`);
}
queueJson(dairasPath, nextTable);

const dairasByWilaya = new Map();
for (const row of nextTable) {
  dairasByWilaya.set(row.wilaya_code, (dairasByWilaya.get(row.wilaya_code) ?? 0) + 1);
}
const totalDairas = nextTable.length;

// --- the retired-id ledger --------------------------------------------------
// Sorted as strings, which is what scripts/validate-packages.mjs compares.
const ledgerPath = join(DATA, "retired-ids.json");
const ledger = readJson(ledgerPath);
for (const row of DAIRA_ROWS_RETIRED) {
  const id = String(row.id);
  if (!ledger.ids.includes(id)) ledger.ids.push(id);
  ledger.reasons[id] ??= `wilaya ${row.wilaya_code} daira "${row.name_fr}", dropped by decree 26-253: ${row.note}`;
}
ledger.ids.sort();
if (ledger.ids.some((id) => nextTable.some((row) => String(row.id) === id))) {
  throw new Error("retired-ids.json: a retired daira id is live again");
}
queueJson(ledgerPath, ledger);

// --- the commune carriers ---------------------------------------------------
for (const path of splitPaths) {
  const rows = readJson(path);
  for (const row of rows) row.daira = dairaFor(row.code_commune, row.daira);
  queueJson(path, rows);
}

const unifiedPath = join(DATA, "algeria.json");
const unified = readJson(unifiedPath);
for (const wilaya of unified) {
  for (const commune of wilaya.communes ?? []) {
    commune.daira = dairaFor(commune.code_commune, commune.daira);
  }
}
queueJson(unifiedPath, unified);

const geoPath = join(DATA, "geojson", "communes.geojson");
const geo = readJson(geoPath);
for (const feature of geo.features) {
  const props = feature.properties;
  const code = codeFor(props.wilaya_code, props.name_fr);
  if (code == null) throw new Error(`communes.geojson: unknown commune ${props.name_fr}`);
  props.daira = dairaFor(code, props.daira);
}
queueJson(geoPath, geo);

const ecommercePath = join(DATA, "ecommerce", "communes.json");
const ecommerce = readJson(ecommercePath);
for (const row of ecommerce) {
  const code = codeFor(row.wilaya_code, row.commune_name_fr);
  if (code == null) throw new Error(`ecommerce/communes.json: unknown commune ${row.id}`);
  row.daira_name_fr = dairaFor(code, row.daira_name_fr);
}
queueJson(ecommercePath, ecommerce);

// --- wilayas.json: counts, the nested lists, and the citation ---------------
const wilayasPath = join(DATA, "wilayas.json");
const wilayasDoc = readJson(wilayasPath);
const arabicName = new Map(communes.map((row) => [`${row.wilaya_code}|${row.name_fr}`, row.name_ar]));
const arabicByCode = new Map(communes.map((row) => [row.code_commune, row.name_ar]));
for (const [index, wilaya] of wilayasDoc.wilayas.entries()) {
  if (!ANNEXED.has(wilaya.code)) continue;
  wilaya.dairas_count = dairasByWilaya.get(wilaya.code) ?? 0;
  if (Array.isArray(wilaya.dairas)) {
    // The nested list of a reform wilaya restates the membership in Arabic; it
    // came from press and Wikipedia readings, and the annex now settles it.
    wilaya.dairas = (seats.get(wilaya.code) ?? []).map((seat) => ({
      name_ar: arabicName.get(`${wilaya.code}|${seat}`) ?? seat,
      name_fr: seat,
      communes: (members.get(`${wilaya.code}|${seat}`) ?? []).map((code) => arabicByCode.get(code)),
    }));
  }
  if (wilaya.code < 59) continue;
  // A reform wilaya cites where its daira count comes from; the annex replaces
  // the press and encyclopaedia readings. Keep the key beside dairas_count.
  const rebuilt = {};
  for (const [key, value] of Object.entries(wilaya)) {
    rebuilt[key] = value;
    if (key === "dairas_count") rebuilt.dairas_source = CITATION;
  }
  rebuilt.dairas_source = CITATION;
  wilayasDoc.wilayas[index] = rebuilt;
}
wilayasDoc.metadata.total_dairas = totalDairas;
if (!wilayasDoc.metadata.sources.includes(CITATION)) wilayasDoc.metadata.sources.push(CITATION);
queueJson(wilayasPath, wilayasDoc);

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
  f[3] = dairaFor(Number(f[7]), f[3]);
});

// id,commune_name_fr,commune_name_ar,daira_name_fr,wilaya_code,wilaya_name_fr,wilaya_name_ar,postal_code
patchCsv(join(DATA, "ecommerce", "communes.csv"), 8, (f) => {
  const code = codeFor(f[4], f[1]);
  if (code == null) throw new Error(`ecommerce/communes.csv: unknown commune ${f[1]}`);
  f[3] = dairaFor(code, f[3]);
});

// code,…,communes_count,dairas_count,post_reform_communes,post_reform_dairas
// A wilaya that predates the 2026 reform states its pre-reform figures in
// communes_count/dairas_count and its post-reform ones in the two post_reform
// columns; a reform wilaya has only ever had the one, in dairas_count.
patchCsv(join(DATA, "wilayas.csv"), 11, (f) => {
  const code = Number(f[0]);
  if (!ANNEXED.has(code)) return;
  f[code >= 59 ? 8 : 10] = String(dairasByWilaya.get(code) ?? 0);
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
const sqlUnquote = (value) => value.slice(1, -1).replace(/''/g, "'");

function patchSql(path, patch, header) {
  const original = readFileSync(path, "utf8");
  const lines = original.split("\n").map((line) => header?.(line) ?? line);
  const out = lines.map((line) => {
    const match = /^(\s*\()(.*?)(\)[,;]?)$/.exec(line);
    if (!match) return line;
    const fields = splitSqlRow(match[2]);
    return patch(fields) ? `${match[1]}${fields.join(", ")}${match[3]}` : line;
  });
  queueText(path, out.join("\n"));
}

// communes: (id, 'name_fr', 'name_ar', wilaya, 'daira', 'postal', lat, lng, code_commune)
patchSql(
  join(DATA, "sql", "full.sql"),
  (f) => {
    if (f.length !== 9) return false;
    const daira = sqlQuote(dairaFor(Number(f[8]), sqlUnquote(f[4])));
    if (daira === f[4]) return false;
    f[4] = daira;
    return true;
  },
  (line) =>
    line.replace(
      /^(-- \d+ wilayas, \d+ communes, )\d+( dairas)/,
      (_, head, tail) => `${head}${totalDairas}${tail}`,
    ),
);

// ecommerce: (id, 'commune_fr', 'commune_ar', 'daira', wilaya, 'wilaya_fr', 'wilaya_ar', 'postal')
patchSql(join(DATA, "ecommerce", "communes.sql"), (f) => {
  if (f.length !== 8) return false;
  const code = codeFor(f[4], sqlUnquote(f[1]));
  if (code == null) return false;
  const daira = sqlQuote(dairaFor(code, sqlUnquote(f[3])));
  if (daira === f[3]) return false;
  f[3] = daira;
  return true;
});

// ---------------------------------------------------------------------------
let changed = 0;
for (const [path, content] of outputs) {
  if (readFileSync(path, "utf8") === content) continue;
  changed++;
  console.log(`${WRITE ? "patched" : "would patch"} ${path.replace(`${ROOT}/`, "")}`);
  if (WRITE) writeAtomic(path, content);
}
console.log(`${totalDairas} dairas; ${changed} carrier(s) ${WRITE ? "updated" : "need an update"}`);
if (CHECK && changed) process.exit(1);
