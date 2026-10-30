import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadBoundaries, pointInGeometry } from "../../packages/schema/index.js";
import {
  arabicNameKey,
  canonicalCommunes,
  canonicalCommuneForCode,
  canonicalCommuneForOfficialArabicLabel,
  canonicalCommuneForOfficialFrenchLabel,
  latinNameKey,
  nameHistory,
  padCommuneCode,
} from "./commune-index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATASET = join(ROOT, "packages", "dataset", "data");
const wilayasDoc = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf8"));
const wilayas = wilayasDoc.wilayas ?? wilayasDoc;
const motherByWilaya = new Map(
  wilayas.map((wilaya) => [
    String(wilaya.code).padStart(2, "0"),
    String(wilaya.mother_wilaya_code ?? wilaya.code).padStart(2, "0"),
  ]),
);
const boundaries = loadBoundaries(
  JSON.parse(
    readFileSync(join(DATASET, "geojson", "wilaya-boundaries.geojson"), "utf8"),
  ),
);

const communesByName = new Map();
for (const commune of canonicalCommunes) {
  const key = latinNameKey(commune.name_fr);
  if (!key) continue;
  const matches = communesByName.get(key) ?? [];
  matches.push(commune);
  communesByName.set(key, matches);
}

// The spellings a commune carried before a JORA correction renamed it
// (packages/dataset/data/name-history.json), keyed by its CURRENT wilaya. A
// source that has not caught up with the 2026-09-24 renames still writes
// "BOUIHI" for El Bouihi or "AZIL ABEDELKADER" for Abdelkader Azil; without this
// index those labels match no current name, and a record the reform moved to a
// new wilaya fell back to its mother wilaya on the next rebuild (14 sports
// facilities, #306). A former spelling two communes of one wilaya share is
// ambiguous and is not indexed for either.
function formerLabelIndex(field, keyOf) {
  const index = new Map();
  for (const entry of nameHistory.communes) {
    for (const name of entry[field] ?? []) {
      const key = `${String(entry.wilaya_code).padStart(2, "0")}|${keyOf(name)}`;
      if (!keyOf(name)) continue;
      const codes = index.get(key) ?? new Set();
      codes.add(padCommuneCode(entry.code_commune));
      index.set(key, codes);
    }
  }
  return index;
}
const formerFrench = formerLabelIndex("former_names_fr", latinNameKey);
const formerArabic = formerLabelIndex("former_names_ar", arabicNameKey);
const formerCommune = (wilayaCode, communeFr, communeAr) => {
  for (const [index, key] of [
    [formerFrench, communeFr ? latinNameKey(communeFr) : null],
    [formerArabic, communeAr ? arabicNameKey(communeAr) : null],
  ]) {
    const codes = key ? index.get(`${wilayaCode}|${key}`) : null;
    if (codes?.size === 1) return canonicalCommuneForCode([...codes][0]);
  }
  return null;
};

const code = (value) =>
  value == null || value === "" ? null : String(value).padStart(2, "0");

/**
 * Reconcile a record only when its unique canonical commune, the pre-reform
 * mother-wilaya code, and polygon containment all agree.
 */
export function reconcileCurrentWilayaByCommune(record) {
  const publishedWilaya = code(record.wilaya_code);
  const sourceWilaya = code(record.source_wilaya_code ?? record.wilaya_code);
  const unchanged = () => ({
    wilaya_code: publishedWilaya,
    ...(record.source_wilaya_code != null ? { source_wilaya_code: sourceWilaya } : {}),
    commune_code: record.commune_code ?? null,
  });
  if (
    !publishedWilaya ||
    !sourceWilaya ||
    !Number.isFinite(record.lat) ||
    !Number.isFinite(record.lng)
  ) {
    return unchanged();
  }

  const containing = [...boundaries]
    .filter(([, geometry]) => pointInGeometry(record.lng, record.lat, geometry))
    .map(([wilayaCode]) => wilayaCode);
  const currentWilaya = containing.length === 1 ? containing[0] : null;
  if (
    !currentWilaya ||
    Number(currentWilaya) <= 58 ||
    motherByWilaya.get(currentWilaya) !== sourceWilaya ||
    (publishedWilaya !== sourceWilaya && publishedWilaya !== currentWilaya)
  ) {
    return unchanged();
  }

  const matches = (
    communesByName.get(latinNameKey(record.commune ?? record.commune_fr)) ?? []
  )
    .filter((commune) => code(commune.wilaya_code) === currentWilaya);
  const historical = canonicalCommuneForOfficialFrenchLabel(
    sourceWilaya,
    record.commune ?? record.commune_fr,
  ) ?? canonicalCommuneForOfficialArabicLabel(sourceWilaya, record.commune_ar);
  // Last, and only where no current name matched at all: a former JORA spelling
  // of a commune of the current wilaya. Two current matches stay ambiguous.
  const former = matches.length === 0
    ? formerCommune(currentWilaya, record.commune ?? record.commune_fr, record.commune_ar)
    : null;
  const commune = matches.length === 1
    ? matches[0]
    : historical && code(historical.wilaya_code) === currentWilaya
      ? historical
      : former && code(former.wilaya_code) === currentWilaya
        ? former
        : null;
  if (!commune) {
    return unchanged();
  }

  return {
    wilaya_code: currentWilaya,
    source_wilaya_code: sourceWilaya,
    commune_code: padCommuneCode(commune.code_commune),
  };
}
