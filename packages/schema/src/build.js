// Builders for the canonical metadata.json, the repo catalog (index.json), and a
// schema.org/DCAT Dataset descriptor per package. Pure — the caller stamps dates.

import { SCHEMA_VERSION, LIFECYCLE } from "./constants.js";
import { bbox } from "./emit.js";

/** num/den as a percentage, 1 decimal place (0 when den is falsy). */
const pct = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);

/**
 * Canonical evidence_type for a source key. Community maps (OSM/Wikidata) are
 * crowdsourced; explicitly computed geometry is derived; every other key is a
 * named government registry or first-party operator feed → official.
 * @param {string} key
 * @returns {"official"|"crowdsourced"|"derived"}
 */
export function evidenceForSourceKey(key) {
  const k = String(key || "").toLowerCase();
  if (k === "osm" || k === "openstreetmap" || k === "wikidata") return "crowdsourced";
  if (k === "derived" || k === "computed" || k === "centroid" || k === "estimate") return "derived";
  return "official";
}

/**
 * Build canonical DatasetMetadata from records + provenance.
 * Computes counts, precision breakdown, honest coverage, wilayas_covered and bbox.
 * @param {{
 *   package: string, records: object[], sources: object[], license: string, updated: string,
 *   estimatedUniverse?: number|null, coverageNote?: string,
 *   titles?: {fr?:string, ar?:string, en?:string}, entities?: {file:string,count:number}[]
 * }} input
 * @returns {object}
 */
export function buildMetadata(input) {
  const {
    package: pkg,
    records,
    sources,
    license,
    updated,
    estimatedUniverse = null,
    coverageNote,
    titles = {},
    entities,
  } = input;

  const geocoded = records.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  const precision = { exact: 0, approximate: 0 };
  for (const r of geocoded)
    if (Object.prototype.hasOwnProperty.call(precision, r.geo_precision)) precision[r.geo_precision]++;
  const wilayas = new Set(records.map((r) => r.wilaya_code).filter(Boolean));

  // Lifecycle rollup — only emitted when at least one record declares a lifecycle.
  const lifecycle = Object.fromEntries(LIFECYCLE.map((k) => [k, 0]));
  let anyLifecycle = false;
  for (const r of records)
    if (r.lifecycle != null && Object.prototype.hasOwnProperty.call(lifecycle, r.lifecycle)) {
      lifecycle[r.lifecycle]++;
      anyLifecycle = true;
    }

  return {
    package: pkg,
    schema_version: SCHEMA_VERSION,
    ...(titles.fr ? { title_fr: titles.fr } : {}),
    ...(titles.ar ? { title_ar: titles.ar } : {}),
    ...(titles.en ? { title_en: titles.en } : {}),
    record_count: records.length,
    geocoded_count: geocoded.length,
    geocoded_pct: pct(geocoded.length, records.length),
    precision,
    ...(anyLifecycle ? { lifecycle } : {}),
    estimated_universe: estimatedUniverse,
    coverage_pct: estimatedUniverse ? pct(records.length, estimatedUniverse) : null,
    ...(coverageNote ? { coverage_note: coverageNote } : {}),
    wilayas_covered: wilayas.size,
    bbox: bbox(records),
    ...(entities ? { entities } : {}),
    sources,
    license,
    updated,
  };
}

/**
 * Build the repo catalog (index.json) from every package's metadata.
 * @param {object[]} metadatas
 * @param {{ generated?: string }} [opts]
 * @returns {object}
 */
export function buildManifest(metadatas, opts = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    ...(opts.generated ? { generated: opts.generated } : {}),
    datasets: metadatas.map((m) => ({
      package: m.package,
      ...(m.title_en || m.title_fr ? { title: m.title_en || m.title_fr } : {}),
      record_count: m.record_count,
      geocoded_pct: m.geocoded_pct,
      coverage_pct: m.coverage_pct ?? null,
      wilayas_covered: m.wilayas_covered,
      bbox: m.bbox ?? null,
      license: m.license,
      updated: m.updated,
    })),
  };
}

/**
 * Build a schema.org/DCAT Dataset descriptor (JSON-LD) for discovery
 * (Google Dataset Search, AI answer engines).
 * @param {object} meta
 * @param {{ homepage?: string }} [opts]
 * @returns {object}
 */
export function buildDcat(meta, opts = {}) {
  const homepage = opts.homepage || "https://geoalgeria.com";
  const geo = meta.bbox
    ? {
        spatialCoverage: {
          "@type": "Place",
          name: "Algeria",
          geo: {
            "@type": "GeoShape",
            // schema.org box = "minLat minLng maxLat maxLng"
            box: `${meta.bbox[1]} ${meta.bbox[0]} ${meta.bbox[3]} ${meta.bbox[2]}`,
          },
        },
      }
    : { spatialCoverage: { "@type": "Place", name: "Algeria" } };

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: meta.title_en || meta.title_fr || meta.package,
    ...(meta.title_fr && meta.title_fr !== meta.title_en ? { alternateName: meta.title_fr } : {}),
    identifier: meta.package,
    license: meta.sources && meta.sources[0] ? meta.sources[0].license : meta.license,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Yasser's Studio", url: "https://yasser.studio" },
    ...geo,
    variableMeasured: `${meta.record_count} records, ${meta.wilayas_covered} wilayas`,
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `https://cdn.jsdelivr.net/npm/${meta.package}/data/`,
      },
    ],
    dateModified: meta.updated,
    url: homepage,
    ...(meta.sources ? { citation: meta.sources.map((s) => s.name) } : {}),
  };
}
