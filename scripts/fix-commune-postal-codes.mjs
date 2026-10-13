#!/usr/bin/env node
// Correct the flagship dataset's commune postal codes from the poste package, in
// every carrier that holds one.
//
// WHY. The dataset's `postal_code` values outside the wilaya chef-lieux turned
// out to be largely wrong: Akbou shipped as 06009 where Algérie Poste's own
// locator (and every public directory) says 06001; Bab Ezzouar shipped as
// 16030, which is actually Bologhine's code. The chef-lieux (Adrar 01000,
// Alger Centre 16000, Setif 19000...) were right, which is how the sequence
// survived review: the visible anchors held while the long tail drifted.
//
// SOURCE OF TRUTH. packages/poste/data/postoffices.json - 3,908 offices from
// baridimap.poste.dz (Algérie Poste's official locator), each carrying the
// office's postal code. In Algeria the postal code IS the office code: the
// code directories cite for a commune is the code of its principal office
// (verified externally for Akbou 06001, Bab Ezzouar 16024, Reggane 01004;
// the live API re-checked 2026-08-07, byte-identical to our capture).
//
// RULE, per commune:
//   1. Collect the commune's offices: join by (wilaya, folded name), and only
//      when that misses, by baridimap's commune code - accepted solely when
//      the code's wilaya matches and neither side name-claims elsewhere
//      (baridimap's commune codes drift from ours on a few rows; a code join
//      that contradicts a name join is drift, not signal).
//   2. If the CURRENT code is among the commune's real office codes, keep it:
//      it is verified-current, and stability beats churn.
//   3. Else the canonical code is the principal office's: the office NAMED
//      like the commune (with or without a trailing RP), else the best class
//      (HC > CE > R1 > R2 > R3 > R4), ties to the lowest code. "Named like the
//      commune" reads both our name_fr and the name the capture files the group
//      under, spacing-blind, and accepts a wilaya or locality prefix, because a
//      transliteration difference used to make that test miss and hand the answer
//      to the tie-break: see principalOffice below.
//   4. A commune with no resolvable office loses its code (null): the page
//      copy has an honest no-postal-code variant, and keeping a fabricated
//      value is worse than admitting the gap.
//
// CARRIERS. Every file in packages/dataset that holds a commune postal code, not
// only the four JSON tables. The 2026-08-07 run wrote only those four, so the
// GeoJSON, the two CSVs, the two SQL dumps and the ecommerce JSON kept their
// pre-repair values and 187 communes read a different code depending on which
// format a consumer installed (private tracker #246). The carriers are the same
// eight test/lib/commune-postal-carriers.mjs reads, and
// test/commune-postal-carriers.test.mjs fails while one of them disagrees with
// algeria.json, so a carrier this script forgets cannot ship.
//
// IT INVENTS NOTHING. Every carrier is built in full before anything is written,
// and a row must hold either the value algeria.json has (its `from`) or the value
// this run derives (its `to`); anything else aborts the run with the row named
// rather than being overwritten. That is the contract of
// scripts/fix-commune-centres.mjs, carried over to a mapping that is derived per
// run instead of read from a hand ledger. The one set of third values this
// repository has already published is recorded row by row, with what each of those
// codes actually is, in scripts/lib/commune-postal-drift.mjs; nothing else passes.
//
// USAGE
//   node scripts/fix-commune-postal-codes.mjs               # dry-run report
//   node scripts/fix-commune-postal-codes.mjs --check       # exit 1 if a carrier drifts
//   node scripts/fix-commune-postal-codes.mjs --write       # patch every carrier
//   node scripts/fix-commune-postal-codes.mjs --write \
//        --target /path/algeria.json --target /path/communes.geojson
//      # patch arbitrary JSON carriers (the app repo's committed copies) with the
//      # SAME mapping, and write nothing else, so every surface agrees.

import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join, resolve } from "node:path";

import { filledFromNull, supersededByCode } from "./lib/commune-postal-drift.mjs";
import { isWilayaSqlRow } from "./lib/full-sql-rows.mjs";
import { splitSqlRow, sqlQuote, sqlUnquote } from "./lib/sql-rows.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const POSTE = join(ROOT, "packages/poste/data/postoffices.json");
const DATASET = join(ROOT, "packages/dataset/data");

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");
const targets = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--target") targets.push(process.argv[++i]);
}

/** Accent-fold + uppercase + collapse separators, for name joins. */
function fold(s) {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/['’-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Spacing-blind variant, the tier between the exact name join and the code
 * join: "Sidi M'hamed Benali" vs baridimap's "SIDI M'HAMED BEN ALI" differ
 * only in where the spaces fall, and falling through to the code join there
 * is dangerous precisely when the commune code is one of the dataset's known
 * duplicated rows (two communes sharing a code would both inherit the same
 * office group, colliding their postal codes).
 */
const tight = (s) => fold(s).replace(/ /g, "");

/** Office class rank; the principal office of a commune has the best class. */
const CLASS_RANK = { HC: 0, CE: 1, R1: 2, R2: 3, R3: 4, R4: 5 };
const rank = (c) => CLASS_RANK[c] ?? 9;

// ---------------------------------------------------------------------------
// Group the offices per baridimap commune.
// ---------------------------------------------------------------------------
const offices = JSON.parse(readFileSync(POSTE, "utf-8"));
/** key "w|FOLDEDNAME" -> group; also byCode "0101" -> group */
const byName = new Map();
const byTight = new Map();
const byCode = new Map();
for (const o of offices) {
  if (!o.postal_code) continue;
  const w = Number(o.wilaya_code);
  const nameKey = `${w}|${fold(o.commune)}`;
  const codeKey = String(o.commune_code).padStart(4, "0");
  let g = byName.get(nameKey);
  if (!g) {
    g = { wilaya: w, folded: fold(o.commune), offices: [] };
    byName.set(nameKey, g);
    byTight.set(`${w}|${tight(o.commune)}`, g);
  }
  g.offices.push({ code: o.postal_code, cls: o.class, name: fold(o.name) });
  if (!byCode.has(codeKey)) byCode.set(codeKey, g);
}

// ---------------------------------------------------------------------------
// Build the per-commune answer from the dataset's own commune list, so every
// carrier is patched with one consistent value.
// ---------------------------------------------------------------------------
const algeria = JSON.parse(readFileSync(join(DATASET, "algeria.json"), "utf-8"));
const wilayasArr = Array.isArray(algeria) ? algeria : algeria.wilayas;

/** folded commune names per wilaya, to veto cross-commune code joins */
const namesPerWilaya = new Map();
for (const w of wilayasArr) {
  const set = new Set();
  // Spacing-blind, matching the join tiers: the veto must recognise a name
  // however the spaces fall, or a spacing variant slips past it.
  for (const c of w.communes) set.add(tight(c.name_fr));
  namesPerWilaya.set(Number(w.code), set);
}

function groupFor(wilayaCode, commune) {
  const foldedName = fold(commune.name_fr);
  const named =
    byName.get(`${wilayaCode}|${foldedName}`) ??
    byTight.get(`${wilayaCode}|${tight(commune.name_fr)}`);
  if (named) return named;
  const codeKey = String(commune.code_commune ?? "").padStart(4, "0");
  const coded = byCode.get(codeKey);
  if (!coded) return null;
  // Guards: same wilaya, and the coded group's own name must not belong to a
  // DIFFERENT commune of this wilaya (that group is theirs, reachable by the
  // name join; lending it here would be the code drift we're defending against).
  if (coded.wilaya !== wilayaCode) return null;
  const codedTight = tight(coded.folded);
  if (codedTight !== tight(commune.name_fr) && namesPerWilaya.get(wilayaCode)?.has(codedTight)) {
    return null;
  }
  return coded;
}

/** Best class first, then the lowest code: rule 3's tie-break. */
const bestFirst = (offices) =>
  [...offices].sort((a, b) => rank(a.cls) - rank(b.cls) || a.code.localeCompare(b.code))[0].code;

/**
 * Rule 3's "named like the commune", which is the step that must not fall through
 * to the class tie-break on a spelling difference.
 *
 * TWO NAMES, NOT ONE. A commune is matched against our `name_fr` AND against the
 * name the capture files its office group under, because the two transliterate
 * differently often enough to decide the answer: we write Abelsa and Algérie Poste
 * writes ABALESSA, we write Mohamed Belouzdad and it writes BELOUIZDAD. The group's
 * own name is not a second opinion about the commune, it is the label on the rows
 * being read, so an office named after it is the eponymous office by construction.
 *
 * SPACING-BLIND, AND A TRAILING MATCH. The office names carry a locality or wilaya
 * prefix (ALGER MOHAMED BELOUIZDAD, THAMEUR SIDI MHAMED, BOUIRA TAGHZOUT) and move
 * apostrophes and hyphens around, so the comparison drops the separators and
 * accepts a name that ENDS with the commune's. Trailing and not leading, because
 * Algérie Poste prefixes rather than suffixes: OUED KEBRIT is the office of OUED
 * KEBERIT, so a leading match would hand a commune called Oued its first office in
 * every wilaya.
 *
 * WHAT KEEPS THAT SAFE IS THE GROUP, NOT THE DIRECTION. A trailing match is a
 * substring match, so OUED EL KHMIS does end with KHMIS. It cannot reach a commune
 * called Khmis because only the offices of that commune's OWN group are ever
 * offered here: the group is resolved first, by name or by Algérie Poste's own
 * commune code, and this function never looks outside it. The limitation that
 * remains is inside a group: where one commune's group holds an office whose name
 * merely ends with the commune's name, this rule prefers it to a better-class
 * office. The tiers keep that narrow, an exact name beats a prefixed one, and
 * test/commune-postal-eponymous.test.mjs states every commune where the published
 * code is not the eponymous office, so a new one is visible.
 *
 * NOT THE LOOSE KEY. @geoalgeria/normalize's Loose key is the Arabic tier (alef
 * maqsura with yaa, taa marbuta with haa) over the Conservative fold, so it closes
 * none of these three: it keeps "abelsa" apart from "abalessa", and it tokenizes at
 * the apostrophe, which keeps "sidi m hamed" apart from "sidi mhamed". The folding
 * this rule needs is the spacing-blind `tight` helper above, already used by the
 * join tiers, so the script folds one way throughout.
 */
function principalOffice(group, nameFr) {
  const wanted = [tight(nameFr), tight(group.folded)].filter(Boolean);
  const matching = (test) => group.offices.filter((o) => wanted.some((want) => test(tight(o.name), want)));
  const tiers = [
    matching((name, want) => name === want),
    matching((name, want) => name === `${want}RP`),
    matching((name, want) => name.endsWith(want)),
    matching((name, want) => name.endsWith(`${want}RP`)),
  ];
  for (const tier of tiers) if (tier.length) return bestFirst(tier);
  return null;
}

function canonical(group, nameFr, current) {
  const codes = group.offices.map((o) => o.code);
  if (current && codes.includes(current)) return current;
  return principalOffice(group, nameFr) ?? bestFirst(group.offices);
}

/** code_commune -> the superseded value this repository already published. */
const superseded = supersededByCode();
/** The communes this release gives a first code to, for which a blank is a `from`. */
const filled = filledFromNull();

/** One commune's answer: what the table says now (`from`) and what this run derives (`to`). */
const byCommuneCode = new Map();
const byWilayaName = new Map();
const report = { kept: 0, replaced: 0, filled: 0, nulled: 0, samples: [] };
for (const w of wilayasArr) {
  const wc = Number(w.code);
  for (const c of w.communes) {
    const foldedName = fold(c.name_fr);
    const g = groupFor(wc, c);
    const current = c.postal_code || null;
    let next;
    if (!g) {
      next = null;
      if (current) report.nulled++;
    } else {
      next = canonical(g, c.name_fr, current);
      if (!current) report.filled++;
      else if (next === current) report.kept++;
      else {
        report.replaced++;
        if (report.samples.length < 12) report.samples.push(`${wc} ${c.name_fr}: ${current} -> ${next}`);
      }
    }
    const entry = { code: c.code_commune, wilaya: wc, name_fr: c.name_fr, from: current, to: next };
    const nameKey = `${wc}|${foldedName}`;
    if (byWilayaName.has(nameKey)) throw new Error(`two communes share (wilaya, folded name) ${nameKey}`);
    byWilayaName.set(nameKey, entry);
    if (entry.code == null) throw new Error(`${c.name_fr} (wilaya ${wc}) has no code_commune`);
    if (byCommuneCode.has(entry.code)) throw new Error(`two communes share code_commune ${entry.code}`);
    byCommuneCode.set(entry.code, entry);
  }
}

console.log(
  `mapping: ${report.kept} kept, ${report.replaced} replaced, ` +
    `${report.filled} filled, ${report.nulled} nulled (no resolvable office)`,
);
for (const s of report.samples) console.log(`  ${s}`);

// Pins: externally-verified answers this run must reproduce, or it aborts.
const PINS = [
  [6, "Akbou", "06001"],
  [16, "Bab Ezzouar", "16024"],
  [16, "Alger Centre", "16000"],
  [1, "Reggane", "01004"],
  [1, "Adrar", "01000"],
  [19, "Setif", "19000"],
];
for (const [w, name, want] of PINS) {
  const got = byWilayaName.get(`${w}|${fold(name)}`)?.to;
  if (got !== want) {
    console.error(`PIN FAILED: ${name} expected ${want}, got ${got}`);
    process.exit(1);
  }
}
console.log("pins ok (Akbou 06001, Bab Ezzouar 16024, Reggane 01004, chef-lieux kept)");

// ---------------------------------------------------------------------------
// Apply the mapping to the carriers. Nothing is written until every carrier has
// been built and no row has been refused.
// ---------------------------------------------------------------------------
const outputs = [];
const problems = [];
const coverage = new Map();
let changed = 0;

/**
 * With --target, only a target is an output. The branch at the bottom of this file
 * already reads the repository's own carriers without queueing them, so this gate
 * is belt and braces: it is what stops a writer added later, outside that branch,
 * from reaching packages/dataset/data behind --target's back, which is the defect
 * scripts/fix-jo-corrections.mjs shipped (private tracker #247).
 */
const targetPaths = new Set(targets.map((path) => resolve(path)));
const queued = (path) => targets.length === 0 || targetPaths.has(resolve(path));
const queueJson = (path, value) => {
  if (queued(path)) outputs.push([path, `${JSON.stringify(value, null, 2)}\n`]);
};
const queueText = (path, value) => {
  if (queued(path)) outputs.push([path, value]);
};

/**
 * Write every carrier: all the temporary files first, then all the renames.
 *
 * WHY TWO PASSES. A rename is atomic per file, so a one-file-at-a-time loop still
 * leaves the set half-written if the run dies in the middle of it, and a half-written
 * set is the disagreement this whole repair is about. Staging every carrier first
 * shortens the window to the renames alone, and a disk-full or permission error,
 * which is the failure that actually happens here, is then raised before any carrier
 * has moved. The temporary files carry the pid, so two runs cannot collide, and the
 * finally clause removes the ones this run staged and did not rename rather than
 * leaving them beside the data.
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

/** What each carrier matched, so a carrier that stopped carrying a commune fails. */
function saw(where, code) {
  let seen = coverage.get(where);
  if (!seen) coverage.set(where, (seen = new Set()));
  if (seen.has(code)) problems.push(`${where}: commune ${code} appears more than once`);
  seen.add(code);
}

/**
 * The value one row must end up holding, boxed, or null when it stays as it is.
 * `code` is null for a carrier that publishes no commune code; those rows are
 * addressed by (wilaya_code, name_fr), unique across all 1,541.
 */
function resolved(where, { code, wilaya_code: wilaya, name_fr: nameFr, postal_code: postal }) {
  const entry = code == null ? byWilayaName.get(`${Number(wilaya)}|${fold(nameFr)}`) : byCommuneCode.get(Number(code));
  if (!entry) {
    problems.push(`${where}: ${nameFr} (wilaya ${wilaya}) matches no commune of algeria.json`);
    return null;
  }
  saw(where, entry.code);
  if (postal === entry.to) return null;
  // Three readings are a `from`: the value the table carries, the value a mirror of
  // this repository published before the repair, and, for the communes this release
  // gives a first code to, nothing at all. The last one is why an un-repaired fork
  // can be patched: once the table holds the derived code its `from` and its `to`
  // are the same value, so a blank is neither, and every blank the release fills
  // would abort the run instead of being filled. A blank on any OTHER commune still
  // aborts it.
  const blankIsFrom = postal === null && filled.has(entry.code);
  if (postal === entry.from || blankIsFrom || (superseded.has(entry.code) && postal === superseded.get(entry.code))) {
    changed++;
    return { next: entry.to };
  }
  problems.push(
    `${where}: ${entry.name_fr} (${entry.code}) holds ${JSON.stringify(postal)}, which is neither the ` +
      `${JSON.stringify(entry.from)} algeria.json carries nor the ${JSON.stringify(entry.to)} this run derives`,
  );
  return null;
}

// --- JSON carriers ----------------------------------------------------------
/** Every commune row of a JSON doc, in any of the shapes this repo and its fork ship. */
function communeRows(parsed) {
  if (parsed?.type === "FeatureCollection") {
    // A feature with no properties is not a commune point, and reading its postal
    // code off `undefined` is a TypeError with no file in it. Say what the file is
    // instead, the same way an unknown object shape does below.
    if (!parsed.features?.every((f) => f?.properties && typeof f.properties === "object")) return null;
    return parsed.features.map((f) => ({ row: f.properties }));
  }
  const arr = Array.isArray(parsed) ? parsed : parsed.wilayas ?? parsed.communes;
  if (!Array.isArray(arr)) return null;
  if (arr[0]?.communes) return arr.flatMap((w) => w.communes.map((c) => ({ row: c, wilaya_code: w.code })));
  return arr.map((c) => ({ row: c }));
}

/** The dataset JSON tables, the commune GeoJSON, and any --target copy of either. */
function patchJson(path, { label = basename(path) } = {}) {
  const parsed = JSON.parse(readFileSync(path, "utf-8"));
  const rows = communeRows(parsed);
  if (!rows) throw new Error(`${label}: unrecognised commune carrier shape`);
  for (const { row, wilaya_code: wilaya } of rows) {
    const box = resolved(label, {
      code: row.code_commune ?? null,
      wilaya_code: row.wilaya_code ?? wilaya,
      name_fr: row.name_fr,
      postal_code: row.postal_code ?? null,
    });
    if (box) row.postal_code = box.next;
  }
  queueJson(path, parsed);
}

/** ecommerce/communes.json: its own field names, and no commune code. */
function patchEcommerceJson(path) {
  const label = "ecommerce/communes.json";
  const rows = JSON.parse(readFileSync(path, "utf-8"));
  for (const row of rows) {
    const box = resolved(label, {
      code: null,
      wilaya_code: row.wilaya_code,
      name_fr: row.commune_name_fr,
      postal_code: row.postal_code ?? null,
    });
    if (box) row.postal_code = box.next;
  }
  queueJson(path, rows);
}

// --- CSV --------------------------------------------------------------------
/** Patch a CSV whose fields never contain a comma, keeping its line endings. */
function patchCsv(path, width, patch) {
  const original = readFileSync(path, "utf-8");
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

/** An absent postal code is an empty CSV field; a present one is never quoted. */
const csvCode = (field) => (field === "" ? null : field);

// --- SQL --------------------------------------------------------------------
function patchSql(path, patch) {
  const original = readFileSync(path, "utf-8");
  const out = original.split("\n").map((line) => {
    const match = /^(\s*\()(.*?)(\)[,;]?)$/.exec(line);
    if (!match) return line;
    const fields = splitSqlRow(match[2]);
    return patch(fields) ? `${match[1]}${fields.join(", ")}${match[3]}` : line;
  });
  queueText(path, out.join("\n"));
}

/** An absent postal code is the NULL literal, a present one a quoted string. */
const sqlCode = (field) => (field === "NULL" ? null : sqlUnquote(field));
const sqlLiteral = (value) => (value === null ? "NULL" : sqlQuote(value));

// ---------------------------------------------------------------------------
// The carriers, read and written each in its own shape.
// ---------------------------------------------------------------------------
const SPLIT_FILES = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];

if (targets.length) {
  // A fork keeps its carriers in its own formatting; only the JSON shapes are
  // recognised here, which is what the app repository commits.
  for (const path of targets) patchJson(path);
} else {
  for (const file of [...SPLIT_FILES, "algeria.json"]) patchJson(join(DATASET, file));
  patchJson(join(DATASET, "geojson", "communes.geojson"), { label: "geojson/communes.geojson" });
  patchEcommerceJson(join(DATASET, "ecommerce", "communes.json"));

  // name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
  patchCsv(join(DATASET, "csv", "communes.csv"), 8, (f) => {
    const box = resolved("csv/communes.csv", {
      code: Number(f[7]),
      wilaya_code: Number(f[2]),
      name_fr: f[0],
      postal_code: csvCode(f[4]),
    });
    if (box) f[4] = box.next ?? "";
  });

  // id,commune_name_fr,commune_name_ar,daira_name_fr,wilaya_code,wilaya_name_fr,wilaya_name_ar,postal_code
  patchCsv(join(DATASET, "ecommerce", "communes.csv"), 8, (f) => {
    const box = resolved("ecommerce/communes.csv", {
      code: null,
      wilaya_code: Number(f[4]),
      name_fr: f[1],
      postal_code: csvCode(f[7]),
    });
    if (box) f[7] = box.next ?? "";
  });

  // communes: (id, 'name_fr', 'name_ar', wilaya_code, 'daira', 'postal'|NULL, lat, lng, code_commune)
  // The wilaya rows of the same file print nine fields too and carry a postal code
  // of their own (their chef-lieu's), so they are recognised and left alone.
  patchSql(join(DATASET, "sql", "full.sql"), (f) => {
    if (f.length !== 9 || isWilayaSqlRow(f)) return false;
    const box = resolved("sql/full.sql", {
      code: Number(f[8]),
      wilaya_code: Number(f[3]),
      name_fr: sqlUnquote(f[1]),
      postal_code: sqlCode(f[5]),
    });
    if (!box) return false;
    f[5] = sqlLiteral(box.next);
    return true;
  });

  // ecommerce: (id, 'commune_fr', 'commune_ar', 'daira', wilaya_code, 'wilaya_fr', 'wilaya_ar', 'postal'|NULL)
  patchSql(join(DATASET, "ecommerce", "communes.sql"), (f) => {
    if (f.length !== 8) return false;
    const box = resolved("ecommerce/communes.sql", {
      code: null,
      wilaya_code: Number(f[4]),
      name_fr: sqlUnquote(f[1]),
      postal_code: sqlCode(f[7]),
    });
    if (!box) return false;
    f[7] = sqlLiteral(box.next);
    return true;
  });

}

// Every carrier must have matched every commune, or one file keeps a stale code
// while the report reads clean. This holds a --target as well as this repository's
// own carriers: a fork that stopped carrying a commune is the same defect, and
// while the check sat inside the branch above it could not see one.
const total = byCommuneCode.size;
for (const [where, seen] of coverage) {
  // The three split files hold one wilaya range each, so between them they see all
  // 1,541 and individually they do not; they are checked as a group below.
  if (SPLIT_FILES.includes(where)) continue;
  if (seen.size !== total) problems.push(`${where} matched ${seen.size} of ${total} communes`);
}
if (!targets.length) {
  const splitSeen = SPLIT_FILES.reduce((n, file) => n + (coverage.get(file)?.size ?? 0), 0);
  if (splitSeen !== total) problems.push(`the three split files together matched ${splitSeen} of ${total} communes`);
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
    console.error("✗ a carrier does not carry the derived postal codes; run with --write");
    process.exit(1);
  }
  console.log("✓ every carrier carries the derived postal codes");
} else if (WRITE) {
  writeAll(outputs);
  console.log(`✓ wrote ${outputs.length} carrier(s)`);
} else {
  console.log("dry run; pass --write to patch the carriers");
}
