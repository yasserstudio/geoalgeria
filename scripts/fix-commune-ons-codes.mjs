#!/usr/bin/env node
// Reconcile the flagship dataset's commune codes with the official ONS 2021
// Code Geographique National (CGN).
//
// The current dataset inherited duplicated and null `code_commune` values from
// an older merge. ONS defines the code as a unique four-digit WWCC value: the
// 2021 wilaya code followed by the commune ordinal. The 2025 reform promoted
// eleven delegated wilayas without renumbering their communes, so communes in
// current wilayas 59-69 are matched inside their `mother_wilaya_code` scope.
//
// Usage:
//   node scripts/fix-commune-ons-codes.mjs --extract /path/code_geo_2021.pdf
//   node scripts/fix-commune-ons-codes.mjs
//   node scripts/fix-commune-ons-codes.mjs --check
//   node scripts/fix-commune-ons-codes.mjs --write
//   node scripts/fix-commune-ons-codes.mjs --write --target /path/algeria.json
//
// `--extract` requires pdftotext and stores only the four fields consumed by
// the build. The committed capture, not the PDF, is the offline build input.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readCapture, writeCapture } from "./lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DATASET = join(ROOT, "packages/dataset/data");
const SOURCE_URL = "https://www.ons.dz/IMG/pdf/code_geo_2021.pdf";
const SOURCE_NAME = "ons-code-geo-2021";
const COMMUNE_FILES = [
  join(DATASET, "communes_w1_w23.json"),
  join(DATASET, "communes_w24_w48.json"),
  join(DATASET, "communes_w49_w69.json"),
];

const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");
if (WRITE && CHECK) throw new Error("Choose either --write or --check");
const extractAt = process.argv.indexOf("--extract");
const extractPath = extractAt >= 0 ? process.argv[extractAt + 1] : null;
const targets = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === "--target") targets.push(process.argv[++i]);
}
if (extractAt >= 0 && !extractPath) throw new Error("--extract requires a PDF path");

function fold(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[’'`-]/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ONS and the dataset disagree often on separator placement (BENI K SILA vs
// BENI KSILA, M SIRDA vs MSIRDA). Separators carry no administrative meaning.
const nameKey = (value) => fold(value).replace(/ /g, "");

function arabicKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u063a\u0641-\u064a]/g, "");
}

function extractOfficialRows(pdfPath) {
  let text;
  try {
    text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
      encoding: "utf8",
      maxBuffer: 20_000_000,
    });
  } catch (error) {
    throw new Error(`Could not extract ${pdfPath} with pdftotext: ${error.message}`);
  }

  const rows = [];
  const rowPattern = /^\s*([A-Z][A-Z0-9 .\u0027\u2019()-]*?[A-Z0-9])\s+(\d{2})\s+(\d{2})\s+(.+?)\s*$/;
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(rowPattern);
    if (!match) continue;
    const wilayaCode = Number(match[2]);
    const communeOrdinal = Number(match[3]);
    rows.push({
      name_fr: match[1].trim(),
      name_ar: match[4].replace(/[\u202a-\u202e\u2066-\u2069]/g, "").trim(),
      wilaya_code: wilayaCode,
      commune_ordinal: communeOrdinal,
      code_commune: Number(`${match[2]}${match[3]}`),
    });
  }
  validateOfficialRows(rows);
  return rows;
}

function validateOfficialRows(rows) {
  if (rows.length !== 1541) {
    throw new Error(`ONS capture must contain 1541 communes; extracted ${rows.length}`);
  }
  const codes = new Set(rows.map((row) => row.code_commune));
  const wilayas = new Set(rows.map((row) => row.wilaya_code));
  if (codes.size !== 1541) throw new Error(`ONS capture has ${1541 - codes.size} duplicate code(s)`);
  if (wilayas.size !== 58) throw new Error(`ONS capture must cover 58 wilayas; found ${wilayas.size}`);
  for (const row of rows) {
    const want = row.wilaya_code * 100 + row.commune_ordinal;
    if (row.code_commune !== want) {
      throw new Error(`Invalid ONS code for ${row.name_fr}: expected ${want}, got ${row.code_commune}`);
    }
    if (!nameKey(row.name_fr) || !arabicKey(row.name_ar)) {
      throw new Error(`ONS row ${row.code_commune} is missing a usable name`);
    }
  }
}

if (extractPath) {
  const rows = extractOfficialRows(extractPath);
  const path = writeCapture("dataset", SOURCE_NAME, rows, {
    url: SOURCE_URL,
    retrieved: "2026-08-21",
    records: rows.length,
    note: "Projection extracted with pdftotext: French and Arabic names, 2021 wilaya code, commune ordinal, and WWCC code.",
  });
  console.log(`captured ${rows.length} official ONS rows in ${path}`);
}

const officialRows = readCapture("dataset", SOURCE_NAME);
validateOfficialRows(officialRows);

const wilayasDoc = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf8"));
const wilayas = wilayasDoc.wilayas ?? wilayasDoc;
const officialScopeByWilaya = new Map(
  wilayas.map((wilaya) => [
    Number(wilaya.code),
    Number(wilaya.code) <= 58 ? Number(wilaya.code) : Number(wilaya.mother_wilaya_code),
  ]),
);
if ([...officialScopeByWilaya.values()].some((code) => !Number.isInteger(code))) {
  throw new Error("Every current wilaya must resolve to a 2021 ONS wilaya scope");
}

const officialByName = new Map();
const officialByArabic = new Map();
for (const row of officialRows) {
  const key = `${row.wilaya_code}|${nameKey(row.name_fr)}`;
  if (officialByName.has(key)) throw new Error(`Ambiguous normalized ONS name: ${key}`);
  officialByName.set(key, row);
  const arabic = `${row.wilaya_code}|${arabicKey(row.name_ar)}`;
  if (officialByArabic.has(arabic)) throw new Error(`Ambiguous normalized ONS Arabic name: ${arabic}`);
  officialByArabic.set(arabic, row);
}

// Deliberate spelling equivalences only. Additions require a human-readable,
// one-to-one source comparison; this script never falls back to fuzzy matching.
const NAME_ALIASES = new Map([
  ["2|OULEDBENABDELKADER", "OULEDBENAEK"],
  ["2|OUMDROU", "OUMELDROU"],
  ["3|HASSIDELAA", "HASSIDALAA"],
  ["4|HANCHIRTOUMGHANI", "HENCHIRTOUMGHANI"],
  ["5|BOULHILAT", "BOULHILET"],
  ["5|KSARBELLEZMA", "KSARBELEZMA"],
  ["5|OULEDFADEL", "OULEDFADHEL"],
  ["5|OULEDSELLEM", "OULEDSELLAM"],
  ["6|FENAIAILMATEN", "IFELAINILMATHEN"],
  ["6|LEFLAYE", "LEFLAY"],
  ["10|HANIF", "AHNIF"],
  ["11|ABELSA", "ABALESSA"],
  ["11|AINAMGUEL", "INAMGUEL"],
  ["11|TAMANRASSET", "TAMENGHASSET"],
  ["12|ELMALABIOD", "ELMAELBIODH"],
  ["13|FELLAOUCENE", "FILAOUCENE"],
  ["13|SEBBAACHIOUKH", "SEBAACHIOUKH"],
  ["14|DJILLALIBENAMAR", "DJILALIBENAMAR"],
  ["14|SIDIABDERRAHMANE", "SIDIABDERAHMANE"],
  ["15|AITBOUADDOU", "AITBOUADOU"],
  ["15|LARBAANATHIRATHEN", "LARBAENATHIRATHENE"],
  ["15|MAATKAS", "MAATKA"],
  ["15|SOUAMA", "SOUAMAA"],
  ["16|DELYIBRAHIM", "DELYBRAHIM"],
  ["16|HERRAOUA", "HARAOUA"],
  ["16|KHRAISSIA", "KHRAICIA"],
  ["16|LESEUCALYPTUS", "EUCALYPTUS"],
  ["16|MAALMA", "MAHELMA"],
  ["17|BENYAGOUB", "BENIYAGOUB"],
  ["17|TAADMIT", "TADMIT"],
  ["18|ERRAGUENESOUISSI", "ERRAGUENE"],
  ["19|BAZERSAKRA", "BAZERSAKHRA"],
  ["19|BELLAA", "BELAA"],
  ["19|BENIOUSSINE", "BENIHOCINE"],
  ["19|GUELTAZERKA", "GUELTAZERGA"],
  ["19|KASRELABTAL", "KSARELABTAL"],
  ["19|MAOUAKLANE", "MAOKLANE"],
  ["19|OULEDADDOUANE", "OULEDADOUANE"],
  ["20|AINSEKHOUNA", "AINSKHOUNA"],
  ["21|KHENAGMAOUNE", "KHENAKMAYOUN"],
  ["21|OULEDHABBABA", "OULEDHEBABA"],
  ["22|BEDRABINEELMOKRANI", "BADREDINEELMOKRANI"],
  ["25|BENBADIS", "IBNBADIS"],
  ["25|MESSAOUDBOUDJERIOU", "MESSAOUDBOUJERIOU"],
  ["25|OULEDRAHMOUN", "OULEDRAHMOUNE"],
  ["26|SEDRAYA", "SEDRAIA"],
  ["26|TLETATEDDOUAIR", "TLATETEDDOUAIR"],
  ["27|BENABDELMALEKRAMDANE", "ABDELMALEKRAMDANE"],
  ["27|HASSIANE", "ELHASSIANE"],
  ["27|OULEDMAALAH", "OULEDMAALLAH"],
  ["28|OULEDMADHI", "OULEDMAHDI"],
  ["29|ELGUEITENA", "ELGUETNA"],
  ["34|BORDJGHEDIR", "BORDJGHDIR"],
  ["34|GHAILASA", "GHILASSA"],
  ["38|BORDJELEMIRABDELKADER", "BORDJEMIRAEK"],
  ["38|OULEDBESSAM", "OULEDBESSEM"],
  ["38|TAMELLAHET", "TAMELLAHT"],
  ["39|BENGUECHA", "BENGHECHA"],
  ["39|MIHOUANSA", "MIHOUENSA"],
  ["43|DERRAHIBOUSSELAH", "DERADJIBOUSSELAH"],
  ["43|OULEDKHALOUF", "OULEDKHELOUF"],
  ["43|TELEGHMA", "TELERGHMA"],
  ["44|BENALLAL", "BENALLEL"],
  ["44|BIROULDKHELIFA", "BIROULEDKHELIFA"],
  ["46|SIDIOURIACHE", "SIDIOURRACH"],
  ["48|DARBENABDELAH", "DARBENABDELLAH"],
  ["48|HAMRI", "ELHAMRI"],
  ["48|OULEDAICHE", "OULEDAICH"],
  ["53|AINSALAH", "INSALAH"],
  ["53|FOGGARETEZZOUA", "FOGGARETEZZAOUIA"],
  ["54|AINGUEZZAM", "INGUEZZAM"],
  ["55|BLIDETAMOR", "BLIDATAMEUR"],
  ["59|HADJMECHRI", "HADJMECHERI"],
  ["64|ZMALETELEMIRABDELKADE", "ZMALETELEMIRAEK"],
  ["65|BOUIRALAHDAB", "BOUIRALAHDEB"],
  ["67|CHELALETELADHAOURA", "CHELLALETELADHAOURA"],
  ["67|OULEDEMAARAF", "OULEDMAAREF"],
  ["69|LABIODHSIDICHEIKH", "ELABIODHSIDICHEIKH"],
]);

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

const communes = COMMUNE_FILES.flatMap((path) => JSON.parse(readFileSync(path, "utf8")));
if (communes.length !== 1541) throw new Error(`Dataset must contain 1541 communes; found ${communes.length}`);

const mapping = new Map();
const usedOfficialCodes = new Set();
const unmatched = [];
const scopeMismatches = [];
for (const commune of communes) {
  const currentWilaya = Number(commune.wilaya_code);
  const scope = officialScopeByWilaya.get(currentWilaya);
  const dataKey = `${currentWilaya}|${nameKey(commune.name_fr)}`;
  const sourceScope = scope;
  const officialName = NAME_ALIASES.get(dataKey) ?? nameKey(commune.name_fr);
  const byFrench = officialByName.get(`${sourceScope}|${officialName}`);
  const byArabic = officialByArabic.get(`${sourceScope}|${arabicKey(commune.name_ar)}`);
  if (byFrench && byArabic && byFrench.code_commune !== byArabic.code_commune) {
    throw new Error(`French/Arabic ONS match conflict for ${dataKey}`);
  }
  const official = byFrench ?? byArabic;
  if (official && sourceScope !== scope) {
    scopeMismatches.push(`${dataKey}: current scope ${scope}, ONS scope ${sourceScope}`);
  }
  if (!official) {
    unmatched.push({ commune, dataKey, scope: sourceScope });
    continue;
  }
  if (usedOfficialCodes.has(official.code_commune)) {
    throw new Error(`ONS code ${official.code_commune} matched more than one dataset commune`);
  }
  usedOfficialCodes.add(official.code_commune);
  mapping.set(dataKey, official.code_commune);
}

if (unmatched.length || mapping.size !== 1541 || usedOfficialCodes.size !== 1541) {
  console.error(`matched ${mapping.size}/1541 communes; unmatched ${unmatched.length}`);
  for (const item of unmatched) {
    const candidates = officialRows
      .filter((row) => row.wilaya_code === item.scope && !usedOfficialCodes.has(row.code_commune))
      .map((row) => ({
        row,
        frenchDistance: editDistance(nameKey(item.commune.name_fr), nameKey(row.name_fr)),
        arabicDistance: editDistance(arabicKey(item.commune.name_ar), arabicKey(row.name_ar)),
      }))
      .sort(
        (a, b) =>
          a.frenchDistance + a.arabicDistance - (b.frenchDistance + b.arabicDistance) ||
          a.frenchDistance - b.frenchDistance,
      )
      .slice(0, 2);
    console.error(`  ${item.dataKey} (ONS scope ${item.scope})`);
    for (const candidate of candidates) {
      console.error(
        `    -> ${candidate.row.name_fr} [${candidate.row.code_commune}; fr ${candidate.frenchDistance}, ar ${candidate.arabicDistance}]`,
      );
    }
  }
  process.exit(2);
}
for (const mismatch of scopeMismatches) console.warn(`scope mismatch: ${mismatch}`);

function codeFor(commune, wilayaCode = commune.wilaya_code) {
  const key = `${Number(wilayaCode)}|${nameKey(commune.name_fr)}`;
  const code = mapping.get(key);
  if (!code) throw new Error(`No reconciled ONS code for ${key}`);
  return code;
}

function patchJson(path) {
  const doc = JSON.parse(readFileSync(path, "utf8"));
  let changed = 0;
  const patch = (commune, wilayaCode) => {
    const next = codeFor(commune, wilayaCode);
    if (commune.code_commune !== next) {
      commune.code_commune = next;
      changed++;
    }
  };
  if (Array.isArray(doc) && doc[0]?.communes) {
    for (const wilaya of doc) for (const commune of wilaya.communes) patch(commune, wilaya.code);
  } else if (Array.isArray(doc)) {
    for (const commune of doc) patch(commune, commune.wilaya_code);
  } else {
    throw new Error(`Unsupported JSON carrier: ${path}`);
  }
  if (WRITE) writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`${WRITE ? "patched" : "would patch"} ${basename(path)}: ${changed}`);
  return changed;
}

function patchCsv(path) {
  const original = readFileSync(path, "utf8");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.trimEnd().split(/\r?\n/);
  if (lines[0] !== "name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune") {
    throw new Error(`Unexpected communes CSV header in ${path}`);
  }
  if (lines.length !== 1542) throw new Error(`Expected 1541 CSV rows in ${path}`);
  let changed = 0;
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(",");
    if (fields.length !== 8) throw new Error(`Unexpected CSV shape at ${path}:${i + 1}`);
    const next = codeFor({ name_fr: fields[0] }, Number(fields[2]));
    if (fields[7] !== String(next)) {
      fields[7] = String(next);
      lines[i] = fields.join(",");
      changed++;
    }
  }
  if (WRITE) writeFileSync(path, `${lines.join(newline)}${newline}`);
  console.log(`${WRITE ? "patched" : "would patch"} ${basename(path)}: ${changed}`);
  return changed;
}

function patchSql(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith("INSERT INTO communes "));
  if (start < 0) throw new Error(`Communes INSERT not found in ${path}`);
  let changed = 0;
  let rowCount = 0;
  const seen = new Set();
  for (let i = start + 1; i < lines.length; i++) {
    const match = lines[i].match(
      /^(\s*\((\d+), '((?:''|[^'])*)', '(?:''|[^'])*', (\d+), .*, )(?:NULL|\d+)(\)(?:,|;))$/,
    );
    if (!match) continue;
    const sqlName = match[3].replace(/''/g, "'");
    const key = `${Number(match[4])}|${nameKey(sqlName)}`;
    const next = mapping.get(key);
    if (!next) throw new Error(`SQL commune ${key} does not resolve to the canonical ONS crosswalk at ${path}:${i + 1}`);
    if (seen.has(key)) throw new Error(`Duplicate SQL commune ${key} at ${path}:${i + 1}`);
    seen.add(key);
    const patched = `${match[1]}${next}${match[5]}`;
    if (patched !== lines[i]) {
      lines[i] = patched;
      changed++;
    }
    rowCount++;
  }
  if (rowCount !== 1541 || seen.size !== 1541) {
    throw new Error(`Expected 1541 distinct SQL commune rows; found ${rowCount}/${seen.size}`);
  }
  if (WRITE) writeFileSync(path, lines.join("\n"));
  console.log(`${WRITE ? "patched" : "would patch"} ${basename(path)}: ${changed}`);
  return changed;
}

const jsonTargets = targets.length
  ? targets
  : [...COMMUNE_FILES, join(DATASET, "algeria.json")];
let pendingChanges = 0;
for (const path of jsonTargets) pendingChanges += patchJson(path);
if (!targets.length) {
  pendingChanges += patchCsv(join(DATASET, "csv/communes.csv"));
  pendingChanges += patchSql(join(DATASET, "sql/full.sql"));
}

console.log("ONS reconciliation complete: 1541 unique, non-null commune codes");
if (CHECK && pendingChanges) {
  console.error(`ONS reconciliation is stale: ${pendingChanges} field(s) need an update`);
  process.exit(1);
}
