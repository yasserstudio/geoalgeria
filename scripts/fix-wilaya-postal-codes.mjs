#!/usr/bin/env node
// Give every wilaya the postal code of its chef-lieu commune, in every carrier.
//
// WHY. Wilayas 1 to 48 publish their chef-lieu's code (Adrar 01000 is the Adrar
// commune's code, Laghouat 03000 is Laghouat's), and the 21 wilayas created in 2019
// and 2026 published a synthetic `NN000` built from their own number instead: 49000,
// 59000, 69000. No Algérie Poste office holds any of those 21 codes, and each
// wilaya's own chef-lieu contradicts it, most visibly for the 2026 eleven, whose
// chef-lieu kept the code of its pre-reform wilaya: wilaya 59 Aflou published 59000
// while commune 319 Aflou publishes 03001, a real office (private tracker #293,
// found by the #246 carrier work).
//
// THE RULE, one line: a wilaya's postal code is its chef-lieu commune's. It is the
// rule 1 to 48 already follow, so this run is a correction of 21 rows and not a new
// convention, and the Owner decided it on 2026-10-21 over the alternative of nulling
// the 21: a code a consumer can post a letter with beats no code and beats a code
// the postal service never issued.
//
// DERIVED FROM ONE SOURCE, VALIDATED AGAINST ANOTHER. The answer comes from the
// dataset's own tables: `capital_commune_code` on the wilaya, then that commune's
// `postal_code`. It is then checked against packages/poste/data/postoffices.json,
// Algérie Poste's own office register, by a DIFFERENT join: the derived code must be
// held by a real office in that same wilaya, and the old `NN000` value must be held
// by no office anywhere. scripts/fix-commune-postal-codes.mjs reached the commune
// codes by a commune-name/commune-code join; this check reads the office's postal
// code and wilaya, so a mistake in that join cannot confirm itself here.
//
// CARRIERS. Five files hold a wilaya postal code, and a run that patches four of them
// is the format-dependent disagreement #246 was about:
//   packages/dataset/data/algeria.json          wilaya objects
//   packages/dataset/data/csv/wilayas.csv       field 5
//   packages/dataset/data/geojson/wilayas.geojson  feature properties
//   packages/dataset/algeria.geojson            the package-root boundary collection
//   packages/dataset/data/sql/full.sql          the wilaya rows, field 5
// test/wilaya-postal-carriers.test.mjs fails while any of them disagrees with the
// chef-lieu, so a carrier this script forgets cannot ship.
//
// IT INVENTS NOTHING. Every carrier is built in full before anything is written, and
// a row must hold either the value algeria.json carries (its `from`) or the value
// this run derives (its `to`); anything else aborts with the row named. That is the
// contract of scripts/fix-commune-postal-codes.mjs, carried over.
//
// USAGE
//   node scripts/fix-wilaya-postal-codes.mjs            # dry-run report
//   node scripts/fix-wilaya-postal-codes.mjs --check    # exit 1 if a carrier drifts
//   node scripts/fix-wilaya-postal-codes.mjs --write    # patch every carrier
//   node scripts/fix-wilaya-postal-codes.mjs --write \
//        --target /path/algeria.json --target /path/wilayas.geojson
//      # patch arbitrary JSON carriers (the app repository's committed copies) with
//      # the SAME mapping, and write nothing else, so every surface agrees.

import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "node:path";

import { isWilayaSqlRow } from "./lib/full-sql-rows.mjs";
import { splitSqlRow, sqlQuote, sqlUnquote } from "./lib/sql-rows.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const POSTE = join(ROOT, "packages/poste/data/postoffices.json");
const PACKAGE = join(ROOT, "packages/dataset");
const DATASET = join(PACKAGE, "data");

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");
const targets = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--target") targets.push(process.argv[++i]);
}

/** Accent-fold + uppercase + collapse separators, for name comparisons. */
const fold = (s) =>
  (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/['’-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Spacing-blind variant: Algérie Poste moves the spaces around (BOUSAADA). */
const tight = (s) => fold(s).replace(/ /g, "");

/** An absent postal code is one value, however a carrier spells it. */
const code = (value) => (value === undefined || value === null || value === "" || value === "NULL" ? null : String(value));

// ---------------------------------------------------------------------------
// Derive: the chef-lieu's code, per wilaya.
// ---------------------------------------------------------------------------
const algeria = JSON.parse(readFileSync(join(DATASET, "algeria.json"), "utf-8"));
const wilayas = Array.isArray(algeria) ? algeria : algeria.wilayas;

/** code_commune -> { commune, wilaya } over every commune of every wilaya. */
const communes = new Map();
for (const w of wilayas) {
  for (const c of w.communes) {
    if (communes.has(c.code_commune)) throw new Error(`two communes share code_commune ${c.code_commune}`);
    communes.set(c.code_commune, { commune: c, wilaya: Number(w.code) });
  }
}

/** wilaya code -> { name_fr, capital, capitalName, from, to }. */
const mapping = new Map();
const report = { kept: 0, replaced: 0 };
for (const w of wilayas) {
  const wc = Number(w.code);
  const seat = communes.get(w.capital_commune_code);
  if (!seat) throw new Error(`wilaya ${wc}: capital_commune_code ${w.capital_commune_code} is no commune of algeria.json`);
  // The chef-lieu is a commune OF this wilaya; a seat that sits in another one is a
  // membership defect and its postal code would import the wrong wilaya's sequence.
  if (seat.wilaya !== wc)
    throw new Error(`wilaya ${wc}: chef-lieu ${w.capital_commune_code} belongs to wilaya ${seat.wilaya}`);
  const from = code(w.postal_code);
  const to = code(seat.commune.postal_code);
  if (to === null) throw new Error(`wilaya ${wc}: chef-lieu ${seat.commune.name_fr} carries no postal code`);
  mapping.set(wc, { name_fr: w.name_fr, capital: w.capital_commune_code, capitalName: seat.commune.name_fr, from, to });
  if (from === to) report.kept++;
  else report.replaced++;
}

console.log(`mapping: ${report.kept} already agree, ${report.replaced} to correct`);
for (const [wc, m] of mapping) if (m.from !== m.to) console.log(`  ${wc} ${m.name_fr}: ${m.from} -> ${m.to} (${m.capitalName})`);

// ---------------------------------------------------------------------------
// Validate against Algérie Poste's register, by a different join.
// ---------------------------------------------------------------------------
const offices = JSON.parse(readFileSync(POSTE, "utf-8"));
/** postal code -> the offices that hold it. */
const byCode = new Map();
for (const o of offices) {
  if (!o.postal_code) continue;
  const key = String(o.postal_code);
  if (!byCode.has(key)) byCode.set(key, []);
  byCode.get(key).push(o);
}

/**
 * The four chef-lieux whose office is spelled far enough from our name that a
 * spacing-blind comparison cannot reach it. All four are transliteration, not
 * doubt: Algérie Poste writes EL MEGHAIER for El-M'ghaier, AIN OUSSERA for Aïn
 * Ouessara, and drops the initial A of our Ain Salah and Ain Guezzam, which are the
 * In Salah and In Guezzam its offices and the wilaya names both use. In each case
 * the office is the only holder of the code and sits in the right wilaya. They are
 * named here rather than loosening the comparison, because a vowel-blind fold would
 * start matching unrelated names.
 */
const SPELLING = new Map([
  [53, "IN SALAH"],
  [54, "IN GUEZZAM"],
  [57, "EL MEGHAIER"],
  [65, "AIN OUSSERA"],
]);

const invalid = [];
for (const [wc, m] of mapping) {
  const holders = byCode.get(m.to) ?? [];
  const here = holders.filter((o) => Number(o.wilaya_code) === wc);
  if (!here.length) {
    invalid.push(`wilaya ${wc} ${m.name_fr}: no Algérie Poste office in the wilaya holds ${m.to}`);
    continue;
  }
  const want = tight(m.capitalName);
  const spelling = SPELLING.get(wc);
  const named = here.some(
    (o) => tight(o.commune) === want || tight(o.name).endsWith(want) || (spelling && tight(o.commune) === tight(spelling)),
  );
  if (!named)
    invalid.push(
      `wilaya ${wc} ${m.name_fr}: ${m.to} is held in the wilaya but by no office of ${m.capitalName} ` +
        `(${here.map((o) => `${o.name}/${o.commune}`).join("; ")})`,
    );
  // The value being replaced must be the fabrication the ticket describes, or this
  // run is overwriting something it has not understood.
  if (m.from !== m.to && (byCode.get(m.from) ?? []).length)
    invalid.push(`wilaya ${wc} ${m.name_fr}: ${m.from} is held by a real office, so it is not a synthetic code`);
}
if (invalid.length) {
  for (const problem of invalid) console.error(`✗ ${problem}`);
  console.error(`${invalid.length} derived code(s) the office register does not support; nothing written`);
  process.exit(1);
}
console.log(`validated: every derived code is held by an office of its chef-lieu, in its own wilaya (${mapping.size} wilayas)`);

// Pins: answers this run must reproduce, each checkable outside this repository.
const PINS = [
  [1, "01000"], // Adrar, unchanged: a 1-48 wilaya the rule must leave alone
  [3, "03000"], // Laghouat, the mother wilaya of 59
  [16, "16000"], // Alger
  [49, "49001"], // Timimoun, the first of the 2019 ten
  [59, "03001"], // Aflou: the Owner's worked example, its chef-lieu's real office
  [69, "32003"], // El Abiodh Sidi Cheikh, the last of the 2026 eleven
];
for (const [wc, want] of PINS) {
  const got = mapping.get(wc)?.to;
  if (got !== want) {
    console.error(`PIN FAILED: wilaya ${wc} expected ${want}, got ${got}`);
    process.exit(1);
  }
}
console.log("pins ok (Adrar 01000 kept, Aflou 03001, Timimoun 49001, El Abiodh Sidi Cheikh 32003)");

// ---------------------------------------------------------------------------
// Apply the mapping to the carriers. Nothing is written until every carrier has
// been built and no row has been refused.
// ---------------------------------------------------------------------------
const outputs = [];
const problems = [];
const coverage = new Map();
let changed = 0;

const targetPaths = new Set(targets.map((path) => resolve(path)));
const queued = (path) => targets.length === 0 || targetPaths.has(resolve(path));
const queueJson = (path, value) => {
  if (queued(path)) outputs.push([path, `${JSON.stringify(value, null, 2)}\n`]);
};
const queueText = (path, value) => {
  if (queued(path)) outputs.push([path, value]);
};

/**
 * Write every carrier: all the temporary files first, then all the renames, so a
 * disk-full or permission error is raised before any carrier has moved and the set
 * cannot be left half-written. Same two-pass writer as the commune fix.
 */
function writeAll(queue) {
  const staged = [];
  let renamed = 0;
  try {
    for (const [path, content] of queue) {
      const tmp = `${path}.${process.pid}.tmp`;
      writeFileSync(tmp, content);
      staged.push([tmp, path]);
    }
    for (; renamed < staged.length; renamed++) renameSync(staged[renamed][0], staged[renamed][1]);
  } finally {
    for (let i = renamed; i < staged.length; i++) rmSync(staged[i][0], { force: true });
  }
}

/** What each carrier matched, so a carrier that stopped carrying a wilaya fails. */
function saw(where, wc) {
  let seen = coverage.get(where);
  if (!seen) coverage.set(where, (seen = new Set()));
  if (seen.has(wc)) problems.push(`${where}: wilaya ${wc} appears more than once`);
  seen.add(wc);
}

/** The value one row must end up holding, boxed, or null when it stays as it is. */
function resolved(where, wilayaCode, postal) {
  const wc = Number(wilayaCode);
  const m = mapping.get(wc);
  if (!m) {
    problems.push(`${where}: wilaya ${wilayaCode} matches no wilaya of algeria.json`);
    return null;
  }
  saw(where, wc);
  if (postal === m.to) return null;
  if (postal === m.from) {
    changed++;
    return { next: m.to };
  }
  problems.push(
    `${where}: wilaya ${wc} ${m.name_fr} holds ${JSON.stringify(postal)}, which is neither the ` +
      `${JSON.stringify(m.from)} algeria.json carries nor the ${JSON.stringify(m.to)} this run derives`,
  );
  return null;
}

/** The wilaya rows of a JSON doc, in the shapes this repo and its fork ship. */
function wilayaRows(parsed) {
  if (parsed?.type === "FeatureCollection") {
    if (!parsed.features?.every((f) => f?.properties && typeof f.properties === "object")) return null;
    return parsed.features.map((f) => f.properties);
  }
  const arr = Array.isArray(parsed) ? parsed : parsed.wilayas;
  if (!Array.isArray(arr)) return null;
  return arr;
}

/** algeria.json, the two wilaya GeoJSONs, and any --target copy of either. */
function patchJson(path, { label = basename(path) } = {}) {
  const parsed = JSON.parse(readFileSync(path, "utf-8"));
  const rows = wilayaRows(parsed);
  if (!rows) throw new Error(`${label}: unrecognised wilaya carrier shape`);
  for (const row of rows) {
    const box = resolved(label, row.code, code(row.postal_code));
    if (box) row.postal_code = box.next;
  }
  queueJson(path, parsed);
}

if (targets.length) {
  // A fork keeps its carriers in its own formatting; only the JSON shapes are
  // recognised here, which is what the app repository commits.
  for (const path of targets) patchJson(path);
} else {
  patchJson(join(DATASET, "algeria.json"));
  patchJson(join(DATASET, "geojson", "wilayas.geojson"), { label: "geojson/wilayas.geojson" });
  patchJson(join(PACKAGE, "algeria.geojson"), { label: "algeria.geojson" });

  // code,name_fr,name_ar,phone_code,postal_code,latitude,longitude,created,capital_commune_code
  const csvPath = join(DATASET, "csv", "wilayas.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const newline = csvText.includes("\r\n") ? "\r\n" : "\n";
  const csvLines = csvText.trimEnd().split(/\r?\n/);
  const csvRows = csvLines.slice(1).map((line) => line.split(","));
  for (const [index, fields] of csvRows.entries()) {
    if (fields.length !== 9) throw new Error(`csv/wilayas.csv row ${index + 2}: expected 9 fields, found ${fields.length}`);
    const box = resolved("csv/wilayas.csv", Number(fields[0]), code(fields[4]));
    if (box) fields[4] = box.next ?? "";
  }
  queueText(csvPath, `${[csvLines[0], ...csvRows.map((row) => row.join(","))].join(newline)}${newline}`);

  // wilayas: (code, 'name_fr', 'name_ar', 'phone'|NULL, 'postal'|NULL, lat, lng, 'created', capital)
  // The commune rows of the same file print nine fields too, so the wilaya rows are
  // recognised by their `created` literal rather than by their field count
  // (scripts/lib/full-sql-rows.mjs, which exists because that confusion once wrote a
  // daira name into wilaya 3's postal code).
  const sqlPath = join(DATASET, "sql", "full.sql");
  const sqlText = readFileSync(sqlPath, "utf-8");
  const sqlOut = sqlText.split("\n").map((line) => {
    const match = /^(\s*\()(.*?)(\)[,;]?)$/.exec(line);
    if (!match) return line;
    const fields = splitSqlRow(match[2]);
    if (!isWilayaSqlRow(fields)) return line;
    const box = resolved("sql/full.sql", Number(fields[0]), fields[4] === "NULL" ? null : sqlUnquote(fields[4]));
    if (!box) return line;
    fields[4] = box.next === null ? "NULL" : sqlQuote(box.next);
    return `${match[1]}${fields.join(", ")}${match[3]}`;
  });
  queueText(sqlPath, sqlOut.join("\n"));
}

// Every carrier must have matched every wilaya, or one file keeps a stale code while
// the report reads clean.
for (const [where, seen] of coverage) {
  if (seen.size !== mapping.size) problems.push(`${where} matched ${seen.size} of ${mapping.size} wilayas`);
}

// ---------------------------------------------------------------------------
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error(`${problems.length} problem(s); nothing written`);
  process.exit(1);
}

const drifted = outputs.filter(([path, content]) => readFileSync(path, "utf-8") !== content);
console.log(`${changed} postal code(s) to write across ${drifted.length} of ${outputs.length} carrier(s)`);
for (const [path] of drifted) console.log(`  ${basename(dirname(path))}/${basename(path)}`);

if (CHECK) {
  if (drifted.length) {
    console.error("✗ a carrier does not carry the chef-lieu postal codes; run with --write");
    process.exit(1);
  }
  console.log("✓ every carrier carries the chef-lieu postal codes");
} else if (WRITE) {
  writeAll(outputs);
  console.log(`✓ wrote ${outputs.length} carrier(s)`);
} else {
  console.log("dry run; pass --write to patch the carriers");
}
