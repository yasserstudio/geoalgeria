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
 *
 * Coverage never travels as a bare percentage. `@geoalgeria/buses` is why: it
 * reports 41% under the title "Algeria urban bus lines", but 122 is *ETUSA's*
 * line count in Algiers, so the figure only means anything next to the sentence
 * that says which universe it divides by. So the catalog emits `coverage` as
 * {pct, of, note} or not at all, and a metadata that states a universe without a
 * note is a build error rather than a bare number in a public file.
 *
 * A ratio over 100% is not coverage and does not travel under that name.
 * `@geoalgeria/mosquees` is why: 20,759 OSM/Wikidata places of worship against
 * the MARW's 18,449 built mosques is 112.5%, which its note explains at length —
 * but a Public API or an answer engine rendering `coverage.pct` drops the
 * sentence and prints "112.5% coverage", a claim the data cannot support. Above
 * 100 the same three fields are emitted as `ratio` instead, so a consumer
 * reaching for `coverage.pct` finds nothing rather than finding a falsehood.
 *
 * @param {object[]} metadatas
 * @param {{ generated?: string, note?: string }} [opts]
 * @returns {object}
 */
export function buildManifest(metadatas, opts = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    ...(opts.generated ? { generated: opts.generated } : {}),
    ...(opts.note ? { note: opts.note } : {}),
    datasets: metadatas.map((m) => {
      if (m.estimated_universe && !m.coverage_note)
        throw new Error(
          `${m.package}: estimated_universe ${m.estimated_universe} without a coverage_note — ` +
            `a coverage percentage that cannot say what it divides by must not be published`,
        );
      return {
        package: m.package,
        // null for the packages that predate the v2 contract — see the catalog note.
        schema_version: m.schema_version ?? null,
        ...(m.title_en || m.title_fr ? { title: m.title_en || m.title_fr } : {}),
        record_count: m.record_count,
        geocoded_count: m.geocoded_count ?? null,
        geocoded_pct: m.geocoded_pct,
        ...(m.precision ? { precision: m.precision } : {}),
        ...(m.estimated_universe
          ? {
              [m.coverage_pct > 100 ? "ratio" : "coverage"]: {
                pct: m.coverage_pct,
                of: m.estimated_universe,
                note: m.coverage_note,
              },
            }
          : {}),
        wilayas_covered: m.wilayas_covered,
        bbox: m.bbox ?? null,
        license: m.license,
        updated: m.updated,
      };
    }),
  };
}

/** Canonical URL for each open licence this repo redistributes under. */
const LICENSE_URLS = {
  "ODbL-1.0": "https://opendatacommons.org/licenses/odbl/1-0/",
  "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "MIT": "https://opensource.org/licenses/MIT",
};

/**
 * Resolve a dataset licence string for the discovery descriptor.
 *  - a raw URL → itself.
 *  - an SPDX id, or an ` AND `-joined expression whose every term is a known
 *    open SPDX id → the canonical URL of its governing term (the share-alike one,
 *    ODbL/CC-BY-SA, since redistributing a database that incorporates it binds
 *    the whole DB to it; else the first term).
 *  - anything else is prose describing operator-© / factual-listing terms with
 *    NO open licence → carried as `prose`, never fabricated into a licence URL.
 * @param {string} license
 * @returns {{ url?: string, prose?: string }}
 */
function licenseInfo(license) {
  if (!license) return {};
  if (/^https?:\/\//.test(license)) return { url: license };
  const terms = license.split(" AND ").map((t) => t.trim());
  if (terms.every((t) => LICENSE_URLS[t])) {
    const governing =
      terms.find((t) => t === "ODbL-1.0") || terms.find((t) => t === "CC-BY-SA-4.0") || terms[0];
    return { url: LICENSE_URLS[governing] };
  }
  return { prose: license };
}

/**
 * Build a schema.org/DCAT Dataset descriptor (JSON-LD) for discovery
 * (Google Dataset Search, AI answer engines).
 *
 * `description` is the dataset's `coverage_note` verbatim. That note is the one
 * place each package says what it does and does not contain ("50 of ETUSA's ~122
 * passenger lines", "1,213 of 1,704 branches carry a point"), and a discovery
 * descriptor that drops it advertises the title's claim without the caveat.
 * Google Dataset Search requires a description, so there is nowhere to hide it.
 *
 * @param {object} meta
 * @param {{ homepage?: string, repo?: string, distributions?: {name:string,format:string,url:string}[] }} [opts]
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

  // The dataset's own licence, not sources[0]'s: a source licence governs the
  // upstream feed, and publishing it here would state the wrong terms for the
  // redistributed dataset. Source terms travel per-source in `citation`.
  // An open licence becomes its canonical URL; an operator-© / factual-listing
  // dataset has no open licence, so its prose moves to `conditionsOfAccess` and
  // the `license` slot is omitted — a wrong licence URL is worse than none.
  const lic = licenseInfo(meta.license);

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: meta.title_en || meta.title_fr || meta.package,
    ...(meta.title_fr && meta.title_fr !== meta.title_en ? { alternateName: meta.title_fr } : {}),
    identifier: meta.package,
    ...(meta.coverage_note ? { description: meta.coverage_note } : {}),
    ...(lic.url ? { license: lic.url } : {}),
    ...(lic.prose ? { conditionsOfAccess: lic.prose } : {}),
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Yasser's Studio", url: "https://yasser.studio" },
    ...geo,
    variableMeasured: `${meta.record_count} records, ${meta.wilayas_covered} wilayas`,
    distribution: (opts.distributions || []).map((d) => ({
      "@type": "DataDownload",
      name: d.name,
      encodingFormat: d.format,
      contentUrl: d.url,
    })),
    dateModified: meta.updated,
    url: homepage,
    ...(opts.repo ? { sameAs: opts.repo } : {}),
    ...(meta.sources
      ? { citation: meta.sources.map((s) => (s.license ? `${s.name} — ${s.license}` : s.name)) }
      : {}),
  };
}
