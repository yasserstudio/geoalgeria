// Runtime validation of the v2 contract. Pure, zero-dependency.
// validateRecords enforces the canonical GeoRecord shape; validateMetadata the
// canonical DatasetMetadata shape. Errors block a release; warnings are advisory.

import { GEO_PRECISION, DZ_BBOX } from "./constants.js";
import { pointInWilaya } from "./geo.js";

const WCODE_RE = /^(0[1-9]|[1-5]\d|6[0-9])$/; // "01".."69"
const isNonEmptyStr = (v) => typeof v === "string" && v.trim() !== "";

/**
 * Validate an array of GeoRecords against the v2 contract.
 * @param {object[]} records
 * @param {{ requireName?: boolean, boundaries?: Map<string, object> }} [opts]
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateRecords(records, opts = {}) {
  const errors = [],
    warnings = [];
  if (!Array.isArray(records)) return { errors: ["records is not an array"], warnings };
  if (records.length === 0) return { errors: ["records is empty"], warnings };

  const at = (i) => `[#${i}${records[i] && records[i].id ? ` ${records[i].id}` : ""}]`;
  const err = (i, msg) => errors.push(`${at(i)} ${msg}`);
  const warn = (i, msg) => warnings.push(`${at(i)} ${msg}`);

  const seen = new Set();
  records.forEach((r, i) => {
    // id — non-empty string, globally unique
    if (!isNonEmptyStr(r.id)) err(i, "missing/invalid id");
    else if (seen.has(r.id)) err(i, `duplicate id "${r.id}"`);
    else seen.add(r.id);

    // wilaya_code — zero-padded string "01".."69"
    const wcodeOk = typeof r.wilaya_code === "string" && WCODE_RE.test(r.wilaya_code);
    if (!wcodeOk)
      err(i, `wilaya_code must be a zero-padded string "01".."69" (got ${JSON.stringify(r.wilaya_code)})`);

    // commune_code — numeric string or null; prefix should match wilaya_code
    if (r.commune_code != null) {
      if (typeof r.commune_code !== "string" || !/^\d+$/.test(r.commune_code))
        err(i, `commune_code must be a numeric string or null (got ${JSON.stringify(r.commune_code)})`);
      else if (wcodeOk && !r.commune_code.startsWith(r.wilaya_code))
        warn(i, `commune_code "${r.commune_code}" does not start with wilaya_code "${r.wilaya_code}"`);
    }

    // coordinates — both finite or both null
    const hasLat = Number.isFinite(r.lat),
      hasLng = Number.isFinite(r.lng);
    if (hasLat !== hasLng) err(i, "lat and lng must both be set or both null");
    if (hasLat && hasLng) {
      if (
        r.lat < DZ_BBOX.minLat ||
        r.lat > DZ_BBOX.maxLat ||
        r.lng < DZ_BBOX.minLng ||
        r.lng > DZ_BBOX.maxLng
      )
        err(i, `coordinate (lng=${r.lng}, lat=${r.lat}) is outside Algeria — likely a lat/lng swap or sign error`);
      else if (opts.boundaries && wcodeOk && !pointInWilaya(r.lng, r.lat, r.wilaya_code, opts.boundaries))
        err(i, `coordinate falls outside the wilaya ${r.wilaya_code} boundary`);
    }

    // geo_precision — from the fixed vocabulary
    if (!GEO_PRECISION.includes(r.geo_precision))
      err(i, `geo_precision must be one of ${GEO_PRECISION.join("|")} (got ${JSON.stringify(r.geo_precision)})`);

    // name — at least one, when required
    if (
      opts.requireName &&
      !isNonEmptyStr(r.name) &&
      !isNonEmptyStr(r.name_fr) &&
      !isNonEmptyStr(r.name_ar)
    )
      err(i, "no name / name_fr / name_ar");

    // refs — plain object of strings
    if (r.refs != null) {
      if (typeof r.refs !== "object" || Array.isArray(r.refs)) err(i, "refs must be an object");
      else
        for (const [k, v] of Object.entries(r.refs))
          if (v != null && typeof v !== "string") warn(i, `refs.${k} should be a string`);
    }
  });

  return { errors, warnings };
}

/**
 * Validate the canonical DatasetMetadata shape.
 * (Cross-checks against the actual data — record_count etc. — live in the repo validator.)
 * @param {object} meta
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateMetadata(meta) {
  const errors = [],
    warnings = [];
  const reqType = (k, type) => {
    if (meta[k] == null) errors.push(`metadata.${k} is missing`);
    else if (typeof meta[k] !== type) errors.push(`metadata.${k} must be a ${type}`);
  };
  reqType("package", "string");
  reqType("schema_version", "string");
  reqType("record_count", "number");
  reqType("geocoded_count", "number");
  reqType("wilayas_covered", "number");
  reqType("license", "string");
  reqType("updated", "string");

  if (!Array.isArray(meta.sources) || meta.sources.length === 0)
    errors.push("metadata.sources must be a non-empty array");
  else
    meta.sources.forEach((s, i) => {
      if (!s || typeof s.key !== "string") errors.push(`metadata.sources[${i}].key is missing`);
      if (!s || typeof s.license !== "string") errors.push(`metadata.sources[${i}].license is missing`);
    });

  if (
    typeof meta.geocoded_count === "number" &&
    typeof meta.record_count === "number" &&
    meta.geocoded_count > meta.record_count
  )
    errors.push("metadata.geocoded_count exceeds record_count");

  if (meta.estimated_universe != null && typeof meta.estimated_universe === "number" &&
      typeof meta.record_count === "number" && meta.record_count > meta.estimated_universe)
    warnings.push("metadata.record_count exceeds estimated_universe — revisit the estimate");

  return { errors, warnings };
}
