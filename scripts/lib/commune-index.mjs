// Canonical commune-code lookups shared by derived-package maintenance and
// generators that receive provider-native commune labels/codes.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readCapture } from "./source-store.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATASET = join(ROOT, "packages", "dataset", "data");
const COMMUNE_FILES = [
  "communes_w1_w23.json",
  "communes_w24_w48.json",
  "communes_w49_w69.json",
];

export function latinNameKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[’'`-]/g, " ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

export function arabicNameKey(value) {
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

export const padCommuneCode = (value) =>
  value == null || value === "" ? null : String(value).replace(/\D/g, "").padStart(4, "0");

export const canonicalCommunes = COMMUNE_FILES.flatMap((file) =>
  JSON.parse(readFileSync(join(DATASET, file), "utf8")),
);
if (canonicalCommunes.length !== 1541) {
  throw new Error(`Canonical commune index expected 1541 rows; found ${canonicalCommunes.length}`);
}

function uniqueIndex(rows, keyOf, label) {
  const index = new Map();
  const ambiguous = new Set();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    if (index.has(key)) {
      index.delete(key);
      ambiguous.add(key);
    } else if (!ambiguous.has(key)) {
      index.set(key, row);
    }
  }
  if (label === "canonical French" && ambiguous.size) {
    throw new Error(`${label} commune index has ${ambiguous.size} ambiguous key(s)`);
  }
  return index;
}

const currentFrench = uniqueIndex(
  canonicalCommunes,
  (row) => `${Number(row.wilaya_code)}|${latinNameKey(row.name_fr)}`,
  "canonical French",
);
const currentArabic = uniqueIndex(
  canonicalCommunes,
  (row) => `${Number(row.wilaya_code)}|${arabicNameKey(row.name_ar)}`,
  "canonical Arabic",
);

const wilayasDoc = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf8"));
const wilayas = wilayasDoc.wilayas ?? wilayasDoc;
const officialScopeByCurrentWilaya = new Map(
  wilayas.map((wilaya) => [
    Number(wilaya.code),
    Number(wilaya.code) <= 58 ? Number(wilaya.code) : Number(wilaya.mother_wilaya_code),
  ]),
);

const official = readCapture("dataset", "ons-code-geo-2021");
const officialFrench = uniqueIndex(
  official,
  (row) => `${Number(row.wilaya_code)}|${latinNameKey(row.name_fr)}`,
  "ONS French",
);
const officialArabic = uniqueIndex(
  official,
  (row) => `${Number(row.wilaya_code)}|${arabicNameKey(row.name_ar)}`,
  "ONS Arabic",
);
const officialCodes = new Set(official.map((row) => padCommuneCode(row.code_commune)));

export const canonicalCommuneCodes = new Set(
  canonicalCommunes.map((row) => padCommuneCode(row.code_commune)),
);
if (canonicalCommuneCodes.size !== 1541) {
  throw new Error(`Canonical commune index expected 1541 unique codes; found ${canonicalCommuneCodes.size}`);
}

const currentByCode = new Map(
  canonicalCommunes.map((row) => [padCommuneCode(row.code_commune), row]),
);

export function canonicalCommuneForCode(code) {
  return currentByCode.get(padCommuneCode(code)) ?? null;
}

export function canonicalCommuneForCurrentLabel(wilayaCode, commune, communeAr = null) {
  const scope = Number(wilayaCode);
  return (
    currentFrench.get(`${scope}|${latinNameKey(commune)}`) ??
    currentArabic.get(`${scope}|${arabicNameKey(communeAr)}`) ??
    null
  );
}

/** Resolve a package's canonical current-wilaya + commune label join. */
export function canonicalCodeForCurrentCommune(wilayaCode, commune, communeAr = null) {
  const record = canonicalCommuneForCurrentLabel(wilayaCode, commune, communeAr);
  return record ? padCommuneCode(record.code_commune) : null;
}

/**
 * Normalize an Algérie Poste commune link while retaining its provider-native
 * value when it differs. French is deliberately authoritative before Arabic:
 * two current BaridiMap rows have their Arabic commune labels swapped.
 */
export function normalizeProviderCommune({ wilayaCode, commune, communeAr, sourceCode }) {
  const raw = padCommuneCode(sourceCode);
  let canonical = canonicalCodeForCurrentCommune(wilayaCode, commune, communeAr);

  if (!canonical) {
    const scope = officialScopeByCurrentWilaya.get(Number(wilayaCode));
    const byFrench = officialFrench.get(`${scope}|${latinNameKey(commune)}`);
    const byArabic = officialArabic.get(`${scope}|${arabicNameKey(communeAr)}`);
    canonical = padCommuneCode((byFrench ?? byArabic)?.code_commune);
  }
  if (!canonical && raw && officialCodes.has(raw)) canonical = raw;
  if (!canonical) {
    throw new Error(
      `Cannot resolve provider commune ${JSON.stringify({ wilayaCode, commune, communeAr, sourceCode })}`,
    );
  }

  return {
    commune_code: canonical,
    ...(raw && raw !== canonical ? { source_commune_code: raw } : {}),
  };
}
