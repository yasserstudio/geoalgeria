#!/usr/bin/env node
// Correct the flagship dataset's commune postal codes from the poste package.
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
//      (HC > CE > R1 > R2 > R3 > R4), ties to the lowest code.
//   4. A commune with no resolvable office loses its code (null): the page
//      copy has an honest no-postal-code variant, and keeping a fabricated
//      value is worse than admitting the gap.
//
// USAGE
//   node scripts/fix-commune-postal-codes.mjs               # dry-run report
//   node scripts/fix-commune-postal-codes.mjs --write       # patch dataset pkg
//   node scripts/fix-commune-postal-codes.mjs --write \
//        --target /path/algeria.json --target /path/communes.geojson
//      # patch arbitrary carriers (the app repo's committed copies) with the
//      # SAME mapping, so every surface agrees.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const POSTE = join(ROOT, "packages/poste/data/postoffices.json");
const DATASET = join(ROOT, "packages/dataset/data");

const WRITE = process.argv.includes("--write");
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
// Build the (wilaya, folded name) -> postal_code mapping from the dataset's
// own commune list, so every carrier is patched with one consistent answer.
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

function canonical(group, foldedName, current) {
  const codes = group.offices.map((o) => o.code);
  if (current && codes.includes(current)) return current;
  const principal =
    group.offices.find((o) => o.name === foldedName) ??
    group.offices.find((o) => o.name === `${foldedName} RP`);
  if (principal) return principal.code;
  return [...group.offices].sort(
    (a, b) => rank(a.cls) - rank(b.cls) || a.code.localeCompare(b.code),
  )[0].code;
}

const mapping = new Map(); // "w|FOLDED" -> code | null
const report = { kept: 0, replaced: 0, filled: 0, nulled: 0, samples: [] };
for (const w of wilayasArr) {
  const wc = Number(w.code);
  for (const c of w.communes) {
    const foldedName = fold(c.name_fr);
    const key = `${wc}|${foldedName}`;
    const g = groupFor(wc, c);
    const current = c.postal_code || null;
    let next;
    if (!g) {
      next = null;
      if (current) report.nulled++;
    } else {
      next = canonical(g, foldedName, current);
      if (!current) report.filled++;
      else if (next === current) report.kept++;
      else {
        report.replaced++;
        if (report.samples.length < 12)
          report.samples.push(`${wc} ${c.name_fr}: ${current} -> ${next}`);
      }
    }
    mapping.set(key, next);
  }
}

// ---------------------------------------------------------------------------
// Apply the mapping to a carrier file (dataset json, flat list, or geojson).
// ---------------------------------------------------------------------------
function patchCommune(rec, wilayaCode) {
  const key = `${Number(wilayaCode)}|${fold(rec.name_fr)}`;
  if (!mapping.has(key)) return { miss: rec.name_fr };
  const next = mapping.get(key);
  const prev = rec.postal_code ?? null;
  if (next === prev) return { same: true };
  rec.postal_code = next;
  return { changed: true };
}

function applyTo(path) {
  const doc = JSON.parse(readFileSync(path, "utf-8"));
  let changed = 0;
  const misses = [];
  const visit = (rec, w) => {
    const r = patchCommune(rec, w);
    if (r.changed) changed++;
    if (r.miss) misses.push(`${w}|${r.miss}`);
  };
  if (doc?.type === "FeatureCollection") {
    for (const f of doc.features) visit(f.properties, f.properties.wilaya_code);
  } else {
    const arr = Array.isArray(doc) ? doc : doc.wilayas;
    if (arr[0]?.communes) {
      for (const w of arr) for (const c of w.communes) visit(c, w.code);
    } else {
      for (const c of arr) visit(c, c.wilaya_code);
    }
  }
  if (WRITE) writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(
    `${WRITE ? "patched" : "would patch"} ${basename(path)}: ${changed} commune(s)` +
      (misses.length ? `; UNMATCHED in target: ${misses.join(", ")}` : ""),
  );
  return misses.length;
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
  const got = mapping.get(`${w}|${fold(name)}`);
  if (got !== want) {
    console.error(`PIN FAILED: ${name} expected ${want}, got ${got}`);
    process.exit(1);
  }
}
console.log("pins ok (Akbou 06001, Bab Ezzouar 16024, Reggane 01004, chef-lieux kept)");

const files = targets.length
  ? targets
  : [
      join(DATASET, "algeria.json"),
      join(DATASET, "communes_w1_w23.json"),
      join(DATASET, "communes_w24_w48.json"),
      join(DATASET, "communes_w49_w69.json"),
    ];
let totalMisses = 0;
for (const f of files) totalMisses += applyTo(f);
if (totalMisses) {
  console.error("Some target rows had no mapping entry; investigate before shipping.");
  process.exitCode = 2;
}
