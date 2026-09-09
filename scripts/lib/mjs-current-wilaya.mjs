import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadBoundaries, pointInGeometry } from "../../packages/schema/index.js";
import {
  canonicalCommunes,
  latinNameKey,
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

const code = (value) =>
  value == null || value === "" ? null : String(value).padStart(2, "0");

/**
 * Reconcile an MJS record only when its unique canonical commune, the
 * pre-reform mother-wilaya code, and polygon containment all agree.
 */
export function reconcileMjsCurrentWilaya(record) {
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

  const matches = (communesByName.get(latinNameKey(record.commune)) ?? [])
    .filter((commune) => code(commune.wilaya_code) === currentWilaya);
  if (matches.length !== 1) {
    return unchanged();
  }
  const commune = matches[0];

  return {
    wilaya_code: currentWilaya,
    source_wilaya_code: sourceWilaya,
    commune_code: padCommuneCode(commune.code_commune),
  };
}
