// The canonical v2 transform + writer, shared by the per-package generators
// (packages/*/scripts/fetch.mjs) and by the one-time cutover (migrate-to-v2.mjs).
//
// One writer, many thin transforms: every dataset shapes its rows to the canonical
// GeoRecord via its `map`, then hands them to writePackageV2, which owns the
// per-file demote/sort/emit + the canonical metadata. This is the P3 rework's core —
// re-running a generator now reproduces the committed v2 data (and its ids) rather
// than reverting the package to v1.
//
// The MIGRATIONS config below is the per-package v1->v2 map + provenance. It was the
// cutover's source of truth; test/migrate-v2-replay.test.mjs replays each map over a
// v1 fixture and asserts it reproduces the committed record byte-for-byte, so a
// generator importing its own slice inherits that guarantee.

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMetadata,
  toCSV,
  toGeoJSON,
  wcode,
  GEO_PRECISION,
  evidenceForSourceKey,
  coordDecimals,
  sharedPoints,
  validateRecords,
  MIN_EXACT_DECIMALS,
  validateReviewLedger,
  applyReviewedOverrides,
} from "../../packages/schema/index.js";

/** Write via a temp sibling + rename so a reader never sees a torn file. Not a
 *  whole-directory transaction — a crash between renames can still leave a mix of
 *  old and new files, but never a truncated one. */
function writeAtomic(path, content) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/** The cutover date. Since c3e1349 it is only the bootstrap fallback in
 *  committedDates()'s catch branch — the date used for a package that has no
 *  committed metadata.json to read a real `updated` from. Live/replay dates come
 *  from resolveDates()/committedDates(), not from this constant. */
export const CUTOVER_DATE = "2026-07-18";
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A package opts into reviewed corrections by adding one committed ledger. */
export function loadReviewLedger(pkg) {
  const path = join(REPO_ROOT, "quality", "overrides", `${pkg}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`writePackageV2 [${pkg}]: cannot read review ledger ${path}: ${error.message}`);
  }
}

// --- shared record helpers --------------------------------------------------
/** commune_code (int|str) → 4-digit ONS string ("1607", "0105"), or null. */
export const padC = (c) => (c == null || c === "" ? null : String(c).replace(/\D/g, "").padStart(4, "0"));
/** drop undefined keys so records stay tidy. */
export const clean = (o) => { const x = {}; for (const k in o) if (o[k] !== undefined) x[k] = o[k]; return x; };
/** build a refs object of non-empty string ids, or undefined if none. */
export const refs = (o) => { const r = {}; for (const k in o) if (o[k] != null && o[k] !== "") r[k] = String(o[k]); return Object.keys(r).length ? r : undefined; };
/** Keep published contact strings only when they contain a dialable digit. */
export const dialableContact = (value) =>
  typeof value === "string" && /\d/.test(value) ? value : null;
/** atomic lat/lng: both finite → a point at the given precision; otherwise ungeocoded —
 *  both null, and a null geo_precision/geo_method (the contract enforces both iffs).
 *  `exact` is demoted to `approximate` when the coordinate is coarser than
 *  MIN_EXACT_DECIMALS — a whole-degree point cannot carry a per-facility claim. */
export const geoAt = (r, precision, method) => {
  const has = Number.isFinite(r.lat) && Number.isFinite(r.lng);
  const p = precision === "exact" && coordDecimals(r.lat, r.lng) < MIN_EXACT_DECIMALS ? "approximate" : precision;
  return { lat: has ? r.lat : null, lng: has ? r.lng : null, geo_precision: has ? p : null, geo_method: has ? method : null };
};
/** the common case: a real per-facility point. */
export const geoExact = (r, method) => geoAt(r, "exact", method);
/** A coordinate carried by more than one record in the same file is not a
 *  *per-facility* point. Mutates in place; returns the count demoted. */
export function demoteSharedPoints(rows) {
  let n = 0;
  for (const i of sharedPoints(rows))
    if (rows[i].geo_precision === "exact") { rows[i].geo_precision = "approximate"; n++; }
  return n;
}
/** the ungeocoded geo quartet, for datasets that carry no coordinates at all. */
export const geoNone = { lat: null, lng: null, geo_precision: null, geo_method: null };
/** Records that already carry the canonical v2 geo fields. `geo_method` is the
 *  decisive signal (v2-only); a few v1 datasets already used "exact" for
 *  geo_precision and would otherwise look migrated. */
export const isV2Shaped = (rows) =>
  rows.length > 0 &&
  rows.every((r) => GEO_PRECISION.includes(r.geo_precision) && "geo_method" in r);
/** frequency table of a field's values. */
export const count = (rows, key) => { const o = {}; for (const r of rows) { const v = r[key]; if (v != null) o[v] = (o[v] || 0) + 1; } return o; };
export const named = (rows) => rows.filter((r) => r.name).length;
export const LINKAGE = "Commune/wilaya linkage is derived by nearest-centroid join against the geoalgeria commune set; wilaya is effectively exact, commune is best-effort.";

// canonical leading columns for CSV; domain extras are appended in first-seen order.
const BASE_COLS = ["id", "name", "name_fr", "name_ar", "wilaya_code", "commune_code", "source_commune_code", "commune", "commune_ar", "lat", "lng", "geo_precision", "geo_method", "source", "refs"];
export function colsFor(rows) {
  const base = BASE_COLS.filter((c) => rows.some((r) => c in r));
  const extra = [];
  for (const r of rows) for (const k in r) if (!base.includes(k) && !extra.includes(k)) extra.push(k);
  return [...base, ...extra];
}

// shared tourisme maps (OSM point files share a shape; thermal springs differ).
// Both take the file's id prefix: the five tourisme files each restart their
// upstream ids at "1", so an unprefixed id collides across the files that
// tourisme.all() merges into one collection.
const tourSource = (r) => {
  const key = r.source === "Wikidata" ? "wikidata" : "osm";
  return { ...geoExact(r, key), source: key };
};
const tourOsm = (prefix) => (r) => clean({
  id: prefix + String(r.id), name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
  wilaya_code: r.wilaya_code, commune_code: null, commune: null,
  ...tourSource(r),
  refs: refs({ osm: r.osm_id, wikidata: r.wikidata, wikipedia: r.wikipedia }),
  type: r.type, category: r.category,
  description: r.description, address: r.address, phone: r.phone, website: r.website,
  stars: r.stars, rooms: r.rooms, heritage: r.heritage, heritage_status: r.heritage_status,
});
const tourThermal = (prefix) => (r) => clean({
  id: prefix + String(r.id), name: r.name,
  wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune_name,
  ...geoExact(r, "asal"),
  source: "asal",
  type: r.type, temperature_c: r.temperature_c, debit_l_s: r.debit_l_s, altitude_m: r.altitude_m, minerality: r.minerality,
});

// telecom 5G presence points share one row shape; only the geo treatment differs
// per operator (Djezzy/Mobilis publish cell sites, Ooredoo covered communes).
const telecom5g = (geo) => (r) =>
  clean({
    id: r.id, name: r.name,
    wilaya_code: wcode(r.wilaya_code), commune_code: null,
    commune: r.commune, commune_ar: r.commune_ar,
    ...geo(r),
    source: r.operator,
    operator: r.operator, technology: r.technology, address: r.address,
  });

// --- per-package migrations -------------------------------------------------
export const MIGRATIONS = {
  mosquees: {
    file: "mosquees.json",
    map: (r) => {
      const isArea = typeof r.osm_id === "string" && /^(way|relation)\//.test(r.osm_id);
      const method = r.osm_id ? "osm_" + r.osm_id.split("/")[0] : "wikidata";
      return clean({
        id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
        ...geoAt(r, isArea ? "approximate" : "exact", method),
        source: r.source,
        refs: refs({ wikidata: r.wikidata, osm: r.osm_id }),
        denomination: r.denomination,
      });
    },
    meta: {
      sources: [
        { key: "wikidata", name: "Wikidata — mosques in Algeria", url: "https://www.wikidata.org", license: "CC0-1.0" },
        { key: "osm", name: "OpenStreetMap — mosques in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)" },
      ],
      license: "CC0-1.0 AND ODbL-1.0",
      estimatedUniverse: 18449,
      coverageNote:
        "Mosques compiled from Wikidata + OpenStreetMap, against the ~18449 counted by the Ministry of Religious Affairs (MARW). A community-maintained composite, not an official registry — the two do not count the same population, which is why the ratio exceeds 100%: OSM tags every amenity=place_of_worship/muslim, including the neighbourhood musallas and prayer rooms the MARW figure (built mosques) excludes. Read it as a comparison against the official count, not as coverage of it.",
      titles: { en: "Algeria mosques", fr: "Mosquées d'Algérie", ar: "مساجد الجزائر" },
      stats: (rows) => ({ named: named(rows), by_source: count(rows, "source"), linkage_note: LINKAGE }),
    },
  },

  ecoles: {
    file: "ecoles.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoAt(r, r.geo_precision === "osm_node" ? "exact" : "approximate", r.geo_precision),
      source: r.source, refs: refs({ osm: r.osm_id }),
      cycle: r.cycle, cycle_label_fr: r.cycle_label_fr, cycle_label_ar: r.cycle_label_ar,
      kind: r.kind, kind_label_fr: r.kind_label_fr, kind_label_ar: r.kind_label_ar,
      isced_levels: r.isced_levels, sector: r.sector, address: r.address,
    }),
    meta: {
      sources: [{ key: "osm", name: "OpenStreetMap — schools & kindergartens in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)" }],
      license: "ODbL-1.0",
      // 29,702 is the Ministry of National Education's own headline aggregate
      // ("Education in numbers" block on education.gov.dz, 2024-2025 school
      // year figures alongside 11,275,424 students; retrieved 2026-08-06).
      // It replaces the earlier ~28,000 order-of-magnitude estimate: same
      // honest-denominator role, now an exact sourced figure.
      estimatedUniverse: 29702,
      coverageNote: "Schools compiled from OpenStreetMap, against the 29,702 educational institutions the Ministry of National Education reports on education.gov.dz (2024-2025 school year). A community-maintained extract, coverage partial and uneven by wilaya.",
      titles: { en: "Algeria schools", fr: "Écoles d'Algérie", ar: "مدارس الجزائر" },
      stats: (rows) => ({ named: named(rows), by_cycle: count(rows, "cycle"), by_kind: count(rows, "kind"), by_sector: count(rows, "sector"), with_address: rows.filter((r) => r.address).length }),
      preserve: ["cycle_note", "kind_note"],
    },
  },

  culture: {
    file: "culture.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoExact(r, "source_point"),
      source: "patrimoine",
      refs: refs({ patrimoine: r.node_id_ar ?? r.node_id_fr }),
      type: r.type, category: r.category, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
      has_virtual_tour: r.has_virtual_tour, url: r.url, slug: r.slug,
    }),
    meta: {
      sources: [{ key: "patrimoine", name: "Cartes du Patrimoine Culturel Algérien (Ministry of Culture)", url: "https://cartes.patrimoineculturelalgerien.org", license: "Factual public cultural listing (Ministry of Culture)", retrieved: "2026-06-28" }],
      license: "Factual public listing (Ministry of Culture); commune linkage from the GeoAlgeria set",
      estimatedUniverse: null,
      coverageNote: "Cultural places from Algeria's official cultural atlas (Ministry of Culture) — protected heritage, museums, theatres, libraries, and cultural establishments. Every place carries a source coordinate; wilaya is exact, commune is best-effort.",
      titles: { en: "Algeria cultural heritage", fr: "Patrimoine culturel d'Algérie", ar: "التراث الثقافي الجزائري" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_category: count(rows, "category"), virtual_tours: rows.filter((r) => r.has_virtual_tour).length, linkage_note: LINKAGE }),
    },
  },

  djezzy: {
    file: "boutiques.json",
    map: (r) => clean({
      id: r.id, name: r.name,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoExact(r, "operator_point"),
      source: "djezzy",
      refs: refs({ djezzy: r.code }),
      type: r.type, category: r.category, address: r.address, hours: r.hours, code_ouverture: r.code_ouverture,
    }),
    meta: {
      sources: [{ key: "djezzy", name: "Djezzy — Optimum Telecom Algérie (nos-boutiques)", url: "https://www.djezzy.dz", license: "Data © Optimum Telecom Algérie (Djezzy); redistributed for reference" }],
      license: "Data © Optimum Telecom Algérie (Djezzy); redistributed for reference",
      estimatedUniverse: null,
      coverageNote: "Djezzy retail boutiques from djezzy.dz/nos-boutiques. Wilaya/commune linkage is best-effort (nearest-centroid).",
      titles: { en: "Djezzy stores (Algeria)", fr: "Boutiques Djezzy", ar: "متاجر جيزي" },
      stats: (rows) => ({ by_type: count(rows, "type"), linkage_note: LINKAGE }),
    },
  },

  ooredoo: {
    file: "stores.json",
    map: (r) => clean({
      id: r.id, name: r.name,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoExact(r, "operator_api"),
      source: "ooredoo",
      refs: refs({ ooredoo: r.ooredoo_id }),
      type: r.type, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
      address: r.address, operator_wilaya: r.operator_wilaya,
    }),
    meta: {
      sources: [{ key: "ooredoo", name: "Ooredoo Algérie — retail network (trouvez-nous JSON API)", url: "https://www.ooredoo.dz/fr/particuliers/trouvez-nous", license: "Data © Ooredoo Algérie; redistributed for reference" }],
      license: "Data © Ooredoo Algérie; redistributed for reference",
      estimatedUniverse: null,
      coverageNote: "Ooredoo retail network (Espaces Ooredoo, City Shops, Espaces Services) via the public API. 567 of the 572 records carry the operator's own coordinate; the other 5 are placed on their commune's point instead (geo_precision approximate, geo_method commune_centroid) because the API coordinate contradicts both the wilaya Ooredoo declares for the store and the store's own name and address. 3 further records keep their operator coordinate but a derived wilaya/commune the wilaya outlines disagree with (the nearest-centroid join filed a near-boundary point one wilaya over). operator_wilaya preserves the operator's declared wilaya on every record.",
      titles: { en: "Ooredoo stores (Algeria)", fr: "Boutiques Ooredoo", ar: "متاجر أوريدو" },
      stats: (rows) => ({ by_type: count(rows, "type") }),
    },
  },

  sante: {
    file: "sante.json",
    map: (r) => {
      const gp = r.geo_precision;
      return clean({
        id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
        ...geoAt(r, gp === "osm_point" || gp === "wikidata_point" ? "exact" : "approximate", gp),
        source: "msp",
        refs: refs({ wikidata: r.wikidata, osm: r.osm_id, msp: r.msp_id }),
        type: r.type, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
        sector: r.sector, slug: r.slug,
      });
    },
    meta: {
      sources: [
        { key: "msp", name: "Ministry of Health (sante.gov.dz) — health-establishment registry", url: "https://sante.gov.dz", license: "Official public registry (Ministry of Health)" },
        { key: "osm", name: "OpenStreetMap — geocoding", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)" },
        { key: "wikidata", name: "Wikidata — geocoding", url: "https://www.wikidata.org", license: "CC0-1.0" },
      ],
      license: "Official registry (Ministry of Health); geocoding ODbL/CC0",
      estimatedUniverse: null,
      coverageNote: "Public health establishments (EPH/EPSP/EHS/CHU) from the Ministry of Health registry. Coordinates layered on via OSM/Wikidata; where no point was found the commune centroid is used (approximate) and 95 remain ungeocoded.",
      titles: { en: "Algeria public health establishments", fr: "Établissements de santé publique d'Algérie", ar: "المؤسسات الصحية العمومية الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_sector: count(rows, "sector"), by_geo_method: count(rows, "geo_method"), bilingual: rows.filter((r) => r.name_ar && r.name_fr).length, linkage_note: LINKAGE }),
    },
  },

  cliniques: {
    file: "cliniques.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoAt(r, r.geo_precision === "osm_node" ? "exact" : "approximate", r.geo_precision),
      source: r.source, refs: refs({ osm: r.osm_id }),
      type: r.type, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
      sector: r.sector, speciality: r.speciality, address: r.address,
      phone: r.phone, opening_hours: r.opening_hours, emergency: r.emergency,
    }),
    meta: {
      sources: [{ key: "osm", name: "OpenStreetMap: clinics & proximity-care facilities in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)" }],
      license: "ODbL-1.0",
      // No denominator: the Ministry of Health publishes counts for the registry
      // tier (EPH/EPSP/EHS/CHU), which this package deliberately excludes, and
      // nothing official enumerates private clinics. A coverage percentage would
      // divide by a universe that does not describe these records.
      estimatedUniverse: null,
      coverageNote:
        "Clinics and proximity-care facilities from OpenStreetMap. A community-maintained extract, NOT an official registry: it mixes the public proximity tier (polycliniques, salles de soins, centres de santé) with private clinics and maternities, and coverage is partial and uneven by wilaya. It complements @geoalgeria/sante, which carries the Ministry of Health registry tier (CHU/EPH/EHS/EPSP) that is excluded here. Every OSM element a @geoalgeria/sante hospital-tier record (CHU/EPH/EHS) references is excluded from this package by construction, so no hospital is published twice under the same OSM element. Elements referenced by a sante EPSP record are kept on purpose: there the reference is a geocoding anchor on the entity's seat and the element is usually one of the facilities that EPSP runs, which is this package's population (entity in sante, facility here). sante's remaining records carry no OSM reference at all, so the same physical establishment can still appear in both packages under different coordinates. The two describe different tiers and must never be summed.",
      titles: { en: "Algeria clinics & care facilities", fr: "Cliniques et structures de soins d'Algérie", ar: "عيادات ومرافق الرعاية الصحية في الجزائر" },
      stats: (rows) => ({
        named: named(rows),
        by_type: count(rows, "type"),
        by_sector: count(rows, "sector"),
        with_phone: rows.filter((r) => r.phone).length,
        with_address: rows.filter((r) => r.address).length,
        linkage_note:
          "wilaya_code is derived by point-in-polygon against the 69 wilaya boundaries; commune is the nearest centroid WITHIN that wilaya, so the join never crosses a wilaya boundary. Wilaya is effectively exact, commune is best-effort.",
      }),
    },
  },

  ferroviaire: {
    file: "stations.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoExact(r, r.osm_id ? "osm_" + r.osm_id.split("/")[0] : "wikidata"),
      source: r.source,
      refs: refs({ wikidata: r.wikidata, osm: r.osm_id }),
      type: r.type, line: r.line, operator: r.operator, network: r.network,
    }),
    meta: {
      sources: [
        { key: "wikidata", name: "Wikidata — rail & urban transit stations in Algeria", url: "https://www.wikidata.org", license: "CC0-1.0", retrieved: "2026-07-01" },
        { key: "osm", name: "OpenStreetMap — rail & urban transit stations in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: "2026-07-01" },
      ],
      license: "CC0-1.0 AND ODbL-1.0",
      estimatedUniverse: null,
      coverageNote: "Rail and urban-transit stations (SNTF, metro, tram) compiled from Wikidata + OpenStreetMap.",
      titles: { en: "Algeria railway & transit stations", fr: "Gares ferroviaires et de transit d'Algérie", ar: "محطات السكك الحديدية والنقل الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_operator: count(rows, "operator"), linkage_note: LINKAGE }),
    },
  },

  "gares-routieres": {
    file: "stations.json",
    map: (r) => clean({
      id: r.id, name: r.name,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoAt(r, r.geo_precision === "exact" ? "exact" : "approximate", r.geo_precision),
      source: "sogral",
      // `sogral` is a TOWN-level place id shared by twin stations (Annaba and
      // Sidi Brahim, the three Constantine gares): never treat it as a station
      // key. `mahatati_agency` is the per-station MAHATATI departure-agency id.
      refs: refs({ sogral: r.sogral_code, mahatati_agency: r.mahatati_agency }),
      official_name: r.official_name, address: r.address,
      surface_total_m2: r.surface_total_m2, surface_built_m2: r.surface_built_m2,
    }),
    meta: {
      sources: [{ key: "sogral", name: "SOGRAL — Société de Gestion des Gares Routières d'Algérie", url: "https://live.sogral.com", license: "Data © SOGRAL; redistributed for reference", retrieved: "2026-07-01" }],
      license: "Data © SOGRAL; redistributed for reference",
      estimatedUniverse: null,
      coverageNote: "SOGRAL-managed intercity bus stations (gares routières) with surface areas, from the SOGRAL live API.",
      titles: { en: "Algeria intercity bus stations", fr: "Gares routières d'Algérie", ar: "المحطات البرية الجزائرية" },
      stats: (rows) => ({ by_geo_method: count(rows, "geo_method"), linkage_note: LINKAGE }),
    },
  },

  aviation: {
    file: "airports.json",
    map: (r) => clean({
      id: r.id, name: r.name,
      wilaya_code: r.wilaya_code, commune_code: null, commune: null,
      ...geoExact(r, "source_point"),
      // Bare passthrough, no `?? "anac"` fallback: aviation is the mosquees/
      // ferroviaire class, where records genuinely originate from different
      // sources, and a default would silently stamp an OurAirports record as
      // ANAC. writePackageV2 now rejects any source key not declared below.
      source: r.source,
      refs: refs({ icao: r.icao, iata: r.iata }),
      icao: r.icao, iata: r.iata, address: r.address, phone: r.phone, website: r.website,
    }),
    meta: {
      sources: [
        { key: "anac", name: "ANAC — Autorité Nationale de l'Aviation Civile", url: "https://www.anac.dz", license: "Factual public listing (ANAC)", evidence_type: "official" },
        // crowdsourced, pinned: OurAirports is volunteer-edited ("create a free
        // account" to add or correct an airport), so it is neither a government
        // register nor a first-party operator feed. Left to infer, it would take
        // evidenceForSourceKey's fail-open `official` default and the package
        // would publicly claim register-tier evidence for all 36 IATA codes and
        // for the three airports whose existence rests on this source alone.
        { key: "ourairports", name: "OurAirports, global airport database (IATA codes, and the three airports ANAC's map omits)", url: "https://ourairports.com/data/", license: "Public domain (OurAirports)", evidence_type: "crowdsourced" },
      ],
      license: "Factual public listing (ANAC); IATA codes and three supplementary airports from OurAirports (public domain)",
      estimatedUniverse: null,
      coverageNote: "Airports from the National Civil Aviation Authority (ANAC), plus Hassi R'Mel (HRM), Mécheria (MZW) and Laghouat (LOO), which ANAC's map omits and which OurAirports supplies. IATA codes are backfilled from OurAirports by ICAO match, each one confirmed by coordinate distance rather than by code alone. Wilaya-level only (no commune linkage).",
      titles: { en: "Algeria airports", fr: "Aéroports d'Algérie", ar: "مطارات الجزائر" },
      // `routes` is the relation file's own count, kept out of entities[] and
      // record_count because those describe places. Injected by the generator,
      // which reads the file build-routes.mjs writes.
      stats: (rows, extra = {}) => ({ with_iata: rows.filter((r) => r.iata).length, by_source: count(rows, "source"), ...extra }),
    },
  },

  agriculture: {
    file: "agriculture.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoAt(r, "approximate", r.geo_precision),
      source: "madr",
      refs: refs({ wikidata: r.wikidata, osm: r.osm_id }),
      type: r.type, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
      sector: r.sector, abbreviation: r.abbreviation, address: r.address, phone: r.phone, fax: r.fax, slug: r.slug,
    }),
    meta: {
      sources: [{ key: "madr", name: "Ministry of Agriculture, Rural Development and Fisheries (MADR)", url: "https://madr.gov.dz", license: "Factual public institutional listing (MADR)", retrieved: "2026-06-30" }],
      license: "Factual public institutional listing (MADR)",
      estimatedUniverse: null,
      coverageNote: "Agricultural institutions (training institutes, research, services) from the MADR — all positions are wilaya- or commune-centroid approximations (no surveyed points).",
      titles: { en: "Algeria agricultural institutions", fr: "Institutions agricoles d'Algérie", ar: "المؤسسات الفلاحية الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_sector: count(rows, "sector"), by_geo_method: count(rows, "geo_method"), linkage_note: LINKAGE }),
    },
  },

  "industrie-pharmaceutique": {
    file: "industrie-pharmaceutique.json",
    map: (r) => clean({
      id: r.id, name: r.name,
      wilaya_code: String(r.wilaya_code).padStart(2, "0"),
      commune_code: padC(r.commune_code), commune: r.commune,
      ...geoAt(r, "approximate", r.geo_precision),
      source: "mip",
      operateur: r.operateur, role: r.role, nature: r.nature,
      nature_label_fr: r.nature_label_fr, nature_label_ar: r.nature_label_ar, slug: r.slug,
    }),
    meta: {
      sources: [{ key: "mip", name: "Ministère de l'Industrie Pharmaceutique (MIP) — approved manufacturers register", url: "https://www.miph.gov.dz", license: "Factual public register (MIP)", retrieved: "2026-07-05" }],
      license: "Factual public register (MIP)",
      estimatedUniverse: null,
      coverageNote: "Approved pharmaceutical & medical-device manufacturers from the MIP register, geocoded to commune/wilaya centroids (approximate).",
      titles: { en: "Algeria pharmaceutical manufacturers", fr: "Industrie pharmaceutique d'Algérie", ar: "الصناعة الصيدلانية الجزائرية" },
      stats: (rows) => ({ by_nature: count(rows, "nature"), by_role: count(rows, "role"), by_geo_method: count(rows, "geo_method"), linkage_note: LINKAGE }),
    },
  },

  jeunesse: {
    file: "institutions.json",
    map: (r) => clean({
      id: String(r.id).padStart(5, "0"),
      name: r.name, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune,
      ...geoExact(r, "sig_mjs"),
      source: "mjs",
      type: r.type_code, type_label_fr: r.type_fr, type_label_ar: r.type_ar,
      daira: r.daira, address: r.address, capacity: r.capacity, year: r.year,
      operational: r.operational, pmr: r.pmr, surface_built_m2: r.surface_built_m2, surface_land_m2: r.surface_land_m2,
    }),
    meta: {
      sources: [{ key: "mjs", name: "Ministry of Youth and Sports — SIG", url: "https://sig.mjs.gov.dz", license: "Factual public listing (Ministry of Youth and Sports)" }],
      license: "Factual public listing (Ministry of Youth and Sports)",
      estimatedUniverse: null,
      coverageNote: "Youth institutions (auberges & maisons de jeunes, camps) from the Ministry of Youth and Sports SIG.",
      titles: { en: "Algeria youth institutions", fr: "Établissements de jeunesse d'Algérie", ar: "مؤسسات الشباب الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), named_ar: rows.filter((r) => r.name_ar).length }),
    },
  },

  sports: {
    file: "facilities.json",
    map: (r) => clean({
      id: String(r.id).padStart(5, "0"),
      name: r.name,
      wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune,
      ...geoExact(r, "sig_mjs"),
      source: "mjs",
      type: r.type_code, type_label_fr: r.type_fr,
      daira: r.daira, address: r.address, capacity: r.capacity, year: r.year,
      operational: r.operational, pmr: r.pmr, surface_built_m2: r.surface_built_m2, surface_land_m2: r.surface_land_m2,
    }),
    meta: {
      sources: [{ key: "mjs", name: "Ministry of Youth and Sports — SIG", url: "https://sig.mjs.gov.dz", license: "Factual public listing (Ministry of Youth and Sports)" }],
      license: "Factual public listing (Ministry of Youth and Sports)",
      estimatedUniverse: null,
      coverageNote: "Sports facilities (stadiums, gyms, fields, pools) from the Ministry of Youth and Sports SIG.",
      titles: { en: "Algeria sports facilities", fr: "Infrastructures sportives d'Algérie", ar: "المنشآت الرياضية الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), named: named(rows) }),
    },
  },

  "enseignement-superieur": {
    file: "institutions.json",
    map: (r) => clean({
      id: String(r.id).padStart(5, "0"),
      name: r.name, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune,
      ...geoAt(r, r.geo_precision === "campus" ? "exact" : "approximate", r.geo_precision),
      source: "mesrs",
      type: r.type, type_label_fr: r.type_fr, sector: r.sector,
      supervisory_ministry: r.supervisory_ministry, website: r.website,
    }),
    meta: {
      sources: [{ key: "mesrs", name: "Ministry of Higher Education and Scientific Research (MESRS)", url: "https://www.mesrs.dz", license: "Factual public listing (MESRS)" }],
      license: "Factual public listing (MESRS)",
      estimatedUniverse: null,
      coverageNote: "Higher-education institutions (universities, schools, research centres) from the MESRS. 61 are campus-precise; the rest are wilaya/commune centroids (approximate).",
      titles: { en: "Algeria higher-education institutions", fr: "Établissements d'enseignement supérieur d'Algérie", ar: "مؤسسات التعليم العالي الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_sector: count(rows, "sector"), by_geo_method: count(rows, "geo_method") }),
    },
  },

  "formation-professionnelle": {
    file: "establishments.json",
    map: (r) => clean({
      id: String(r.id).padStart(5, "0"),
      name: r.name, name_fr: r.name_fr,
      wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune,
      // Per-row placement, not a blanket `exact`: a coordinate the portal supplied
      // stays exact/takwin, while a record the portal left at 0 is placed on its
      // commune's (or wilaya's) flagship centroid and says so. A v1 row carries
      // neither field, so it still maps to exact/takwin as it always did.
      ...geoAt(r, r.geo_precision ?? "exact", r.geo_method ?? "takwin"),
      source: "mfep",
      type: r.type, type_label: r.type_label, abreviation: r.abreviation, code: r.code, secteur: r.secteur,
      adresse: r.adresse, adresse_fr: r.adresse_fr, telephone: r.telephone, fax: r.fax, email: r.email,
      site_web: r.site_web, facebook: r.facebook, capacite: r.capacite, capacite_reelle: r.capacite_reelle,
      surface_m2: r.surface_m2, internat: r.internat, capacite_internat: r.capacite_internat, vocations: r.vocations,
    }),
    meta: {
      sources: [{ key: "mfep", name: "Ministry of Vocational Training and Education (MFEP) — takwin.dz", url: "https://takwin.dz", license: "Factual public listing (MFEP)", retrieved: "2026-06-22" }],
      license: "Factual public listing (MFEP)",
      estimatedUniverse: null,
      coverageNote: "Vocational-training establishments (CFPA, INSFP, DFEP) from the MFEP takwin.dz portal; 1920 of 1932 are geocoded: 1375 on the portal's own point, 510 on their commune's centroid and 35 on their wilaya's, the portal having left those coordinates empty.",
      titles: { en: "Algeria vocational-training establishments", fr: "Établissements de formation professionnelle d'Algérie", ar: "مؤسسات التكوين المهني الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_secteur: count(rows, "secteur") }),
    },
  },

  poste: {
    files: [
      { file: "postoffices.json", map: (r) => clean({
        id: String(r.id), name: r.name, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: r.commune_code || null,
        source_commune_code: r.source_commune_code,
        commune: r.commune_fr, commune_ar: r.commune_ar,
        ...geoExact(r, "baridimap"),
        source: "baridimap",
        class: r.class, postal_code: r.postal_code, postal_code_old: r.postal_code_old, address: r.address,
      }) },
      { file: "atms.json", map: (r) => clean({
        id: String(r.id), name: r.name,
        wilaya_code: r.wilaya_code, commune_code: null,
        commune: r.commune_fr, commune_ar: r.commune_ar,
        ...geoExact(r, "baridimap"),
        source: "baridimap",
        status: r.status, postal_code: r.postal_code, postal_code_old: r.postal_code_old, address: r.address,
      }) },
    ],
    meta: {
      sources: [{ key: "baridimap", name: "Algérie Poste — baridimap.poste.dz", url: "https://baridimap.poste.dz", license: "Data © Algérie Poste; redistributed for reference" }],
      license: "Data © Algérie Poste; redistributed for reference",
      estimatedUniverse: null,
      coverageNote: "Post offices and Baridi Mob ATMs from Algérie Poste's baridimap portal.",
      titles: { en: "Algeria post offices & ATMs", fr: "Bureaux de poste et GAB d'Algérie", ar: "مكاتب البريد والصرافات الآلية الجزائرية" },
      stats: (rows) => ({ distinct_postal_codes: new Set(rows.map((r) => r.postal_code).filter(Boolean)).size }),
    },
  },

  emploi: {
    files: [
      { file: "awem.json", map: (r) => clean({
        id: r.id, name: r.name,
        wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune ?? null,
        ...geoExact(r, "anem"),
        source: "anem",
        type: r.type, code: r.code, address: r.address, phone: r.phone, fax: r.fax, email: r.email, manager: r.manager, communes: r.communes,
      }) },
      { file: "alem.json", map: (r) => clean({
        id: r.id, name: r.name,
        wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune ?? null,
        ...geoExact(r, "anem"),
        source: "anem",
        // `communes` is the comma-string of communes the local agency (ALEM) serves.
        // Every pre-migration ALEM record carried it (v2 decision 2 kept the domain
        // plural as an extra); the cutover dropped it, recovered here.
        type: r.type, code: r.code, address: r.address, phone: r.phone, fax: r.fax, email: r.email, manager: r.manager, communes: r.communes,
      }) },
    ],
    meta: {
      sources: [{ key: "anem", name: "ANEM — National Employment Agency (anem.dz)", url: "https://www.anem.dz", license: "Factual public listing (ANEM)" }],
      license: "Factual public listing (ANEM)",
      estimatedUniverse: null,
      coverageNote: "Employment agencies — regional (AWEM) and local (ALEM) offices of the National Employment Agency (ANEM).",
      titles: { en: "Algeria employment agencies", fr: "Agences pour l'emploi d'Algérie", ar: "وكالات التشغيل الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type") }),
    },
  },

  mobilis: {
    files: [
      { file: "agences.json", map: (r) => clean({
        id: "ag-" + r.id, name: r.name, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune ?? null,
        ...geoAt(r, r.geo_precision ?? "exact", r.geo_method ?? "mobilis"),
        source: "mobilis",
        type: r.type, code: r.code, address: r.address, address_ar: r.address_ar,
      }) },
      { file: "pdv.json", geojson: false, map: (r) => clean({
        id: "pdv-" + r.id, name: r.name,
        wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune ?? null,
        ...geoNone,
        source: "mobilis",
        type: r.type, code: r.code, address: r.address,
      }) },
    ],
    meta: {
      sources: [{ key: "mobilis", name: "Mobilis — ATM Mobilis (mobilis.dz)", url: "https://www.mobilis.dz", license: "Data © ATM Mobilis; redistributed for reference" }],
      license: "Data © ATM Mobilis; redistributed for reference",
      estimatedUniverse: null,
      coverageNote: "Mobilis retail network — commercial agencies (geocoded) and points of sale (PDV, listed but not geocoded).",
      titles: { en: "Mobilis stores (Algeria)", fr: "Points de vente Mobilis", ar: "نقاط بيع موبيليس" },
      stats: (rows) => ({ by_type: count(rows, "type") }),
    },
  },

  tourisme: {
    files: [
      { file: "attractions.json", map: tourOsm("attraction-") },
      { file: "historic.json", map: tourOsm("historic-") },
      { file: "lodging.json", map: tourOsm("lodging-") },
      { file: "parks.json", map: tourOsm("park-") },
      { file: "thermal-springs.json", map: tourThermal("thermal-spring-") },
    ],
    meta: {
      sources: [
        { key: "osm", name: "OpenStreetMap — attractions, historic sites, lodging & parks in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: "2026-06-21" },
        { key: "wikidata", name: "Wikidata — heritage sites, museums & parks in Algeria", url: "https://www.wikidata.org", license: "CC0-1.0", retrieved: "2026-06-21" },
        { key: "asal", name: "ASAL Geoportail — thermal springs", url: "https://www.asal.dz", license: "Factual public listing (ASAL)", retrieved: "2026-06-21" },
      ],
      license: "Attractions, historic sites, lodging and parks from OpenStreetMap (ODbL 1.0, © OpenStreetMap contributors) and Wikidata (CC0); thermal springs are a factual public listing (ASAL). Per-source terms in citation.",
      estimatedUniverse: null,
      coverageNote: "Tourism points — attractions, historic sites, lodging and parks from OpenStreetMap, plus thermal springs from the ASAL Geoportail.",
      titles: { en: "Algeria tourism", fr: "Tourisme en Algérie", ar: "السياحة في الجزائر" },
      stats: (rows) => ({ by_type: count(rows, "type") }),
    },
  },

  banques: {
    files: [
      { file: "banks.json", geojson: false, map: (r) => clean({
        id: r.id, name: r.name_fr, name_fr: r.name_fr, name_ar: r.name_ar,
        wilaya_code: wcode(r.wilaya_code), commune_code: null, commune: null,
        ...geoNone,
        source: "boa",
        acronym: r.acronym, bank_code: r.bank_code, type: r.type, ownership: r.ownership,
        ownership_country: r.ownership_country, parent_company: r.parent_company,
        swift_bic: r.swift_bic, website: r.website, hq_address: r.hq_address, hq_city: r.hq_city,
        year_established: r.year_established,
      }) },
      { file: "institutions.json", geojson: false, map: (r) => clean({
        id: r.id, name: r.name_fr, name_fr: r.name_fr, name_ar: r.name_ar,
        wilaya_code: wcode(r.wilaya_code), commune_code: null, commune: null,
        ...geoNone,
        source: "boa",
        acronym: r.acronym, bank_code: r.bank_code, type: r.type, ownership: r.ownership,
        ownership_country: r.ownership_country, parent_company: r.parent_company,
        swift_bic: r.swift_bic, website: r.website, hq_address: r.hq_address, hq_city: r.hq_city,
        year_established: r.year_established,
      }) },
      { file: "branches.json", map: (r) => clean({
        id: r.id, name: r.name,
        wilaya_code: wcode(r.wilaya_code), commune_code: null, commune: null,
        ...geoExact(r, "bank_locator"),
        source: "bank_locator",
        bank_id: r.bank_id, address: r.address, phone: r.phone,
      }) },
    ],
    meta: {
      sources: [
        { key: "boa", name: "Banque d'Algérie — liste des banques et établissements financiers agréés (JO n° 9, 6 février 2026)", url: "https://www.bank-of-algeria.dz/banques-commerciales/", license: "Factual public regulatory listing (Banque d'Algérie)", retrieved: "2026-06-16", evidence_type: "official" },
        { key: "bank_locator", name: "Each licensed bank's own branch locator (site/API/KML)", license: "Data © respective banks; redistributed for reference", retrieved: "2026-06-16", evidence_type: "official" },
      ],
      license: "Compiled from public regulatory listings and official institution sites/locators; redistributed for reference. See README.",
      estimatedUniverse: null,
      coverageNote: "The Banque d'Algérie agréé roster (21 banks + 8 financial institutions) is complete. Branch locations cover all 21 banks' own locators (1,704 branches); 1,213 carry a geocoded point, the rest are address-only per each bank's published data (see README).",
      titles: { en: "Algeria banks & financial institutions", fr: "Banques et institutions financières d'Algérie", ar: "البنوك والمؤسسات المالية الجزائرية" },
      stats: (rows) => {
        const registry = rows.filter((r) => r.source === "boa");
        const branches = rows.filter((r) => r.source === "bank_locator");
        return {
          banks: registry.filter((r) => r.type === "bank").length,
          institutions: registry.filter((r) => r.type === "financial_institution").length,
          branches: branches.length,
          branches_geocoded: branches.filter((r) => r.lat != null).length,
          banks_with_branches: new Set(branches.map((r) => r.bank_id)).size,
        };
      },
    },
  },

  buses: {
    file: "lines.json",
    geojson: false, // line geometry is emitted separately as shapes.geojson
    map: (r) => clean({
      id: r.id,
      name: r.name ?? (
        r.terminus1 != null && r.terminus2 != null
          ? `Ligne ${r.line} — ${r.terminus1} ↔ ${r.terminus2}`
          : null
      ),
      wilaya_code: wcode(r.wilaya_code), commune_code: null, commune: null,
      ...geoNone,
      source: typeof r.source === "string" && r.source.startsWith("http") ? "wikipedia" : (r.source ?? "wikipedia"),
      operator_id: r.operator_id ?? (r.operator === "ETUSA" ? "etusa" : undefined),
      operator: r.operator, network: r.network, line: r.line,
      terminus1: r.terminus1, terminus1_fr: r.terminus1_fr, terminus1_ar: r.terminus1_ar,
      terminus2: r.terminus2, terminus2_fr: r.terminus2_fr, terminus2_ar: r.terminus2_ar,
      stops: r.stops,
      major_stops: r.major_stops ?? null,
      service_hours: r.service_hours ?? [],
      departure_schedules: r.departure_schedules ?? [],
      route_diagram_url: r.route_diagram_url ?? null,
      communes_served: r.communes_served, stations_served: r.stations_served,
      shape_id: r.shape_id ?? null,
      osm_relation_ids: r.osm_relation_ids ?? [],
      source_refs: r.source_refs ?? [typeof r.source === "string" && r.source.startsWith("http") ? "wikipedia" : (r.source ?? "wikipedia")],
      source_url: r.source_url ?? r.source,
    }),
    meta: {
      sources: [
        { key: "wikipedia", name: "French Wikipedia — Lignes de bus ETUSA de 1 à 99", url: "https://fr.wikipedia.org/wiki/Lignes_de_bus_ETUSA_de_1_à_99", license: "CC BY-SA 4.0", retrieved: "2026-07-01", evidence_type: "crowdsourced" },
        { key: "etus-tiaret", name: "ETUS Tiaret — current Lines", url: "https://www.etus-tiaret.dz/ar/lines", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-02", evidence_type: "official" },
        { key: "etusto", name: "ETUSTO — passenger Lines", url: "http://etusto.dz/espv.html", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-02", evidence_type: "official" },
        { key: "etus-bejaia", name: "ETUS Béjaïa — WordPress REST itineraries and Line maps", url: "https://etusbejaia.dz/wp-json/wp/v2/pages?slug=itineraires-et-plans-des-lignes", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-02", evidence_type: "official" },
        { key: "etus-msila", name: "ETUS M'Sila — official Line pages and diagrams", url: "https://etus-msila.dz/", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-02", evidence_type: "official" },
        { key: "etus-sidi-bel-abbes", name: "ETUS Sidi Bel Abbès — network and timetable pages", url: "https://etus22.dz/Horaires.php", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-02", evidence_type: "official" },
        { key: "etus-setif", name: "ETUS Setif — 2026 Line artwork supplied by project owner", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-02", evidence_type: "official" },
        { key: "etus-ain-defla", name: "ETUS Aïn Defla — 2025 Line artwork and Eid service program supplied by project owner", url: "https://www.facebook.com/ETUS44/", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-03", evidence_type: "official" },
        { key: "etus-annaba", name: "ETUS Annaba — Eid al-Adha 2026 service program supplied by project owner", url: "https://www.facebook.com/100063517660926/", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-03", evidence_type: "official" },
        { key: "etus-tlemcen", name: "ETUS Tlemcen — Eid al-Adha 2026 service program supplied by project owner", url: "https://www.facebook.com/etustlemcen13/", license: "Proprietary factual reference data; no open reuse license", retrieved: "2026-09-03", evidence_type: "official" },
        { key: "osm", name: "OpenStreetMap — reviewed urban bus relations", url: "https://www.openstreetmap.org/copyright", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: "2026-09-01", evidence_type: "crowdsourced" },
      ],
      license: "CC-BY-SA-4.0 AND ODbL-1.0 AND LicenseRef-Operator-Data",
      estimatedUniverse: null,
      coverageNote: "Reviewed urban/suburban release: 73 ETUSA Lines (50 from the retained registry plus 26 whose identity comes from the evidenced OSM operator match alone, chiefly the 6xx/7xx suburban network the registry never listed, including the three suburban runs into Boumerdes and Tipaza), 8 official ETUS Sidi Bel Abbès Lines, 7 current ETUS Tiaret Lines, 5 official ETUS Béjaïa Lines, 5 official ETUSTO Lines, 5 official ETUS Setif Lines, 4 official ETUS M'Sila Lines, 16 official ETUS Aïn Defla Lines across Aïn Defla, Khemis Miliana and El Attaf, 6 official ETUS Annaba Lines (the numbered routes of its 2026 service program; 19 unnumbered services kept as evidence), 10 official ETUS Tlemcen Lines from its 2026 service program, and 1 ETUS Mostaganem Line. Aïn Defla identities come from the Operator's 2025 route artwork and Eid service program; AD-2 has reusable OSM geometry reconciled to that identity, the rest are directory-only. Setif Line identities and Arabic endpoints come from official 2026 Operator artwork; Lines 101, 104 and 106B have reusable OSM geometry reconciled to the announced identities. Lines 105 and 106A remain directory-only because no current public geometry was found. Béjaïa Line identity, endpoints, typed stop counts and service hours come from the Operator API and linked timetable panels; Sidi Bel Abbès identities, endpoints and complete directional departures come from supplied official network/timetable HTML; M'Sila identities, endpoints and stop counts come from official route diagrams. Operator-controlled map geometry remains validation-only. OSM supplies reusable geometry where available. Shapes are available for 61 ETUSA, 1 ETUS Aïn Defla, 7 Tiaret, 3 Tizi Ouzou, 3 Setif and 1 Mostaganem Lines. An OSM-identified Line carries source \"osm\", no published termini, and links every relation its shape was assembled from so a wrong route can be reported or corrected at the origin. Excludes stale Tiaret ref 33 plus unresolved, taxi, non-ETUSA cross/inter-wilaya, unmatched Setif, ETUAD and validation-only geometry.",
      titles: { en: "Algeria urban and suburban bus lines", fr: "Lignes de bus urbaines et suburbaines d'Algérie", ar: "خطوط الحافلات الحضرية وشبه الحضرية في الجزائر" },
      stats: (rows) => {
        const lines = rows.filter((r) => r.line != null);
        return {
        operators: [...new Set(lines.map((r) => r.operator))],
        by_operator: count(lines, "operator"),
        with_stop_count: lines.filter((r) => r.stops != null).length,
        with_major_stop_count: lines.filter((r) => r.major_stops != null).length,
        with_service_hours: lines.filter((r) => r.service_hours?.length > 0).length,
        with_departure_schedules: lines.filter((r) => r.departure_schedules?.length > 0).length,
        };
      },
    },
  },

  livraison: {
    file: "stopdesks.json",
    map: (r) => clean({
      id: r.id, name: r.name,
      wilaya_code: wcode(r.wilaya_code), commune_code: null, commune: r.commune,
      ...geoExact(r, "carrier_relay"),
      source: (r.sources && r.sources[0]) || "carrier_relay",
      operator: r.operator, address: r.address, sources: r.sources,
    }),
    meta: {
      sources: [
        { key: "yalidine", name: "Yalidine Express — nos-agences", url: "https://yalidine-express.com.dz/nos-agences/", license: "Data © Yalidine Express; redistributed for reference", evidence_type: "official" },
        { key: "guepex", name: "Guepex — public agences feed", url: "https://www.guepex.dz/public/data/agences.json", license: "Data © Guepex; redistributed for reference", evidence_type: "official" },
        { key: "anderson", name: "Anderson Logistics — agency directory", url: "https://anderson-ecommerce.com/", license: "Data © Anderson Logistics; redistributed for reference", evidence_type: "official" },
        { key: "noest", name: "Noest Express — bureaux directory", url: "https://noest-dz.com/", license: "Data © Noest Express; redistributed for reference", evidence_type: "official" },
        { key: "maystro", name: "Maystro Delivery — coverage page", url: "https://maystro-delivery.com/Coverage.html", license: "Data © Maystro Delivery; redistributed for reference", evidence_type: "official" },
      ],
      license: "Stop-desk data © the respective carriers; carrier registry compiled by GeoAlgeria. Redistributed for reference. See README.",
      estimatedUniverse: null,
      coverageNote: "Geocoded stop-desks from the openly-published Yalidine/Guepex federated relay plus Anderson, Noest and Maystro's own agency lists — 411 points across 9 carriers. Most Algerian COD carriers (90+) don't publish an open agency list; see carriers.json for the full registry and coverage.json for per-carrier presence.",
      titles: { en: "Algeria delivery stop-desks", fr: "Points relais de livraison d'Algérie", ar: "نقاط استلام التوصيل في الجزائر" },
      stats: (rows) => {
        const dataDir = join(REPO_ROOT, "packages", "livraison", "data");
        const carriers = JSON.parse(readFileSync(join(dataDir, "carriers.json"), "utf-8"));
        const coverage = JSON.parse(readFileSync(join(dataDir, "coverage.json"), "utf-8"));
        return {
          carriers: carriers.length,
          stopdesks: rows.length,
          coverage: coverage.length,
          by_operator: count(rows, "operator"),
        };
      },
    },
  },

  "protection-civile": {
    file: "protection-civile.json",
    map: (r) => clean({
      id: r.id, name: r.name_ar, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      ...geoExact(r, "dgpc_map"),
      source: "dgpc",
      refs: refs({ dgpc: r.objectid, dgpc_wilaya: r.cod_wilaya }),
      statut: r.statut, address: r.address,
      tel: dialableContact(r.tel), fax: dialableContact(r.fax),
    }),
    meta: {
      sources: [
        { key: "dgpc", name: "Direction Générale de la Protection Civile", url: "https://dgpc.dz/dgpc2/", license: "Government content © Direction Générale de la Protection Civile (DGPC); redistributed for reference", evidence_type: "official" },
        { key: "osm", name: "OpenStreetMap contributors — reviewed unit coordinates", url: "https://www.openstreetmap.org/copyright", license: "© OpenStreetMap contributors, ODbL 1.0", evidence_type: "crowdsourced" },
      ],
      // No open licence — official government content, so the prose moves to
      // conditionsOfAccess in the discovery descriptor (buildDcat) rather than a
      // fabricated licence URL.
      license: "DGPC records © Direction Générale de la Protection Civile; redistributed for reference with no stated open licence. Reviewed OpenStreetMap coordinate evidence © OpenStreetMap contributors, ODbL 1.0.",
      estimatedUniverse: 880,
      coverageNote:
        "The complete national Protection Civile (civil protection / fire & rescue) unit network published by the DGPC (dgpc.dz) — 880 units across all wilayas, each with an Arabic name, address, coordinate and status tier, plus telephone/fax fields when the DGPC publishes a dialable value. Every unit carries a real DGPC coordinate; six coarse points have evidence-backed unit coordinates from OpenStreetMap, while unresolved coincident, polygon-centroid, or coarse points remain approximate. The DGPC's own cod_wilaya is pre-2026-reform (\"01\"..\"58\"); wilaya_code here is derived by point-in-polygon against the 69 post-reform wilaya boundaries and cross-checked against the DGPC code, so units in the new wilayas carry their correct code while a border unit misfiled by a simplified outline (geometry and DGPC disagree among pre-reform codes) resolves to the DGPC's official code. The DGPC code is preserved in refs.dgpc_wilaya. Commune is best-effort (Arabic name match, nearest-centroid fallback).",
      titles: { en: "Civil protection units of Algeria", fr: "Unités de la Protection Civile d'Algérie", ar: "وحدات الحماية المدنية الجزائرية" },
      stats: (rows) => ({
        by_statut: count(rows, "statut"),
        with_tel: rows.filter((r) => r.tel).length,
        with_fax: rows.filter((r) => r.fax).length,
        with_address: rows.filter((r) => r.address).length,
        with_commune: rows.filter((r) => r.commune).length,
        linkage_note:
          "wilaya_code is derived by point-in-polygon against the 69 post-reform wilaya boundaries and reconciled with the DGPC's own code: reform remaps into the new 59..69 wilayas keep the geometry code, but where geometry and DGPC disagree among pre-reform codes (a border unit misfiled by a simplified outline) the DGPC's official cod_wilaya wins. The DGPC code is kept in refs.dgpc_wilaya; commune is best-effort (Arabic commune-name match against the geoalgeria commune set, nearest-centroid fallback).",
      }),
    },
  },

  telecom: {
    // Committed v1 data lives under data/coverage/5g/; v2 flattens to the
    // sibling-standard data/<name>.json layout. The union file (sites.json) is
    // dropped: it was a pure concatenation of the three operator files, and v2's
    // entities[] must sum to record_count. `technology` rides in the file name
    // (5g-*) AND on every record, so a future 4G is purely additive.
    files: [
      { file: "5g-djezzy.json", from: "coverage/5g/djezzy.json", map: telecom5g((r) => geoExact(r, "operator_map")) },
      { file: "5g-mobilis.json", from: "coverage/5g/mobilis.json", map: telecom5g((r) => geoExact(r, "operator_map")) },
      // Ooredoo publishes covered communes, not cell sites — points are placed
      // within the commune, so they are approximate by construction.
      { file: "5g-ooredoo.json", from: "coverage/5g/ooredoo.json", map: telecom5g((r) => geoAt(r, "approximate", "operator_commune_point")) },
    ],
    // Cutover replayed the 2026-06-13 operator-map capture; fetch.mjs refreshes
    // pass their own capture date, so this pin only covers the (now dormant)
    // v1→v2 migration path.
    updated: "2026-06-13",
    meta: {
      sources: [
        { key: "djezzy", name: "Djezzy — published 5G coverage map (Optimum Telecom Algérie)", url: "https://www.djezzy5g.dz/map.html", license: "Data © Optimum Telecom Algérie (Djezzy); redistributed for reference", evidence_type: "official" },
        { key: "mobilis", name: "Mobilis — published 5G coverage map (ATM Mobilis)", url: "https://mobilis.dz/map/5g", license: "Data © ATM Mobilis; redistributed for reference", evidence_type: "official" },
        { key: "ooredoo", name: "Ooredoo Algérie — published 5G covered communes", url: "https://www.ooredoo.dz/fr/particuliers/internet/5g", license: "Data © Ooredoo Algérie; redistributed for reference", evidence_type: "official" },
      ],
      // No open licence — operator-published coverage claims, so the prose moves
      // to conditionsOfAccess in the discovery descriptor (buildDcat) rather than
      // a fabricated licence URL.
      license: "Data © respective operators (Djezzy, Mobilis, Ooredoo); redistributed for reference. No open licence.",
      estimatedUniverse: null,
      coverageNote:
        "5G presence points from each operator's published coverage map, as claimed by the operators (not measured RF coverage). Djezzy and Mobilis publish cell-site level points; Ooredoo publishes covered communes, so its points are commune-level and marked approximate. Commune codes are not linked (operators publish free-text names only).",
      titles: { en: "Algeria 5G coverage points", fr: "Points de couverture 5G en Algérie", ar: "نقاط تغطية الجيل الخامس في الجزائر" },
      stats: (rows) => ({
        technologies: [...new Set(rows.map((r) => r.technology))].sort(),
        by_technology: count(rows, "technology"),
        by_operator: count(rows, "operator"),
      }),
    },
  },
};

// --- the canonical writer ---------------------------------------------------
/**
 * Emit a package's v2 data: per-file JSON + CSV + GeoJSON, and the canonical
 * metadata.json. The single funnel every generator's `data/` output goes through,
 * so the format, column order, id sort, shared-point demotion and derived metadata
 * live in exactly one place and cannot drift between packages.
 *
 * @param {{
 *   pkg: string, dir: string, updated: string, retrieved: string,
 *   files: { file: string, rows: object[], geojson?: boolean }[],
 *   meta: { sources: object[], license: string, estimatedUniverse?: number|null,
 *           coverageNote?: string, titles?: object, preserve?: string[],
 *           stats?: (rows: object[]) => object },
 *   oldMeta?: object, reviewLedger?: object|null,
 *   retiredIds?: Set<string>|null,
 * }} input
 * @returns {{ records: object[], metadata: object, review: object }}
 */
export function writePackageV2({
  pkg,
  dir,
  files,
  meta,
  updated,
  retrieved,
  snapshots = {},
  stats = {},
  oldMeta = {},
  reviewLedger = undefined,
  retiredIds = null,
}) {
  const effectiveReviewLedger =
    reviewLedger === undefined ? loadReviewLedger(pkg) : reviewLedger;
  if (effectiveReviewLedger) {
    const { errors } = validateReviewLedger(effectiveReviewLedger);
    if (errors.length) {
      throw new Error(
        `writePackageV2 [${pkg}]: invalid review ledger:\n  ${errors.join("\n  ")}`,
      );
    }
    if (effectiveReviewLedger.dataset !== pkg) {
      throw new Error(
        `writePackageV2 [${pkg}]: review ledger dataset is ${JSON.stringify(effectiveReviewLedger.dataset)}`,
      );
    }
    const ownedFiles = new Set(
      files.filter((file) => file.rows != null).map((file) => file.file),
    );
    const unknownFiles = [
      ...new Set(
        effectiveReviewLedger.decisions
          .map((decision) => decision.file)
          .filter((file) => !ownedFiles.has(file)),
      ),
    ];
    if (unknownFiles.length) {
      throw new Error(
        `writePackageV2 [${pkg}]: review ledger targets file(s) not owned by this writer: ${unknownFiles.join(", ")}`,
      );
    }
  }

  mkdirSync(join(dir, "csv"), { recursive: true });
  mkdirSync(join(dir, "geojson"), { recursive: true });

  // Phase 1 — prepare + validate every file BEFORE writing anything. A schema
  // error (a null-vs-geocoded geo mismatch, an id collision, an `exact` claim on a
  // shared/whole-degree point) aborts the run with the directory untouched, closing
  // the window where an emit could ship data the release gate would only reject later.
  const all = [];
  const entities = [];
  const pending = []; // { path, content } queued for the atomic write phase
  const review = { reviewed: 0, patched: 0, excluded: 0, kept: 0 };
  for (const f of files) {
    // A file this writer does not own. A package can legitimately have more than
    // one generator: aviation's airports come from a live ANAC+OurAirports pull,
    // its routes from a reviewed research dataset, and only the first belongs to
    // this writer. Declaring the second here keeps entities[] complete (the
    // release gate requires every data file to appear) without pretending to
    // emit or validate rows it was never given.
    if (f.rows == null) {
      if (typeof f.count !== "number")
        throw new Error(`writePackageV2 [${pkg}/${f.file}]: no rows and no count — cannot declare it`);
      entities.push({ file: f.file, count: f.count });
      continue;
    }
    const base = f.file.replace(/\.json$/, "");
    const reviewed = effectiveReviewLedger
      ? applyReviewedOverrides(f.rows, effectiveReviewLedger, { file: f.file })
      : {
          records: f.rows,
          stats: { reviewed: 0, patched: 0, excluded: 0, kept: 0 },
        };
    for (const key of Object.keys(review)) review[key] += reviewed.stats[key];
    const rows = reviewed.records;
    demoteSharedPoints(rows);
    // Plain codepoint order — localeCompare() without a locale reads the ambient
    // ICU and can reorder committed JSON between machines.
    rows.sort(f.sortRows ?? ((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0)));
    const { errors } = validateRecords(rows);
    if (errors.length)
      throw new Error(
        `writePackageV2 [${pkg}/${f.file}]: ${errors.length} schema error(s) — refusing to write:\n  ` +
          errors.slice(0, 20).join("\n  ") +
          (errors.length > 20 ? `\n  …(+${errors.length - 20} more)` : ""),
      );
    pending.push({ path: join(dir, f.file), content: JSON.stringify(rows, null, 2) + "\n" });
    pending.push({ path: join(dir, "csv", `${base}.csv`), content: toCSV(rows, colsFor(rows)) });
    if (f.geojson !== false)
      pending.push({ path: join(dir, "geojson", `${base}.geojson`), content: JSON.stringify(toGeoJSON(rows), null, 2) + "\n" });
    entities.push({ file: f.file, count: rows.length });
    all.push(...rows);
  }

  // Every record's `source` must key into metadata.sources[]. Nothing else
  // checks this: validateRecords never inspects `source`, and validate-packages
  // never cross-references records against sources[]. Without it a package can
  // ship records pointing at provenance that isn't there, or silently relabel
  // records under another source's licence, and the release gate stays green.
  // `a+b` is the documented composite form (mosquees/ferroviaire ship
  // "wikidata+osm" for a record corroborated by both).
  const declared = new Set(meta.sources.map((s) => s.key));
  const undeclared = [...new Set(all.flatMap((r) => String(r.source ?? "").split("+")))]
    .filter((k) => !declared.has(k));
  if (undeclared.length)
    throw new Error(
      `writePackageV2 [${pkg}]: record source key(s) ${undeclared.map((k) => JSON.stringify(k)).join(", ")} ` +
        `are not declared in meta.sources[] (declared: ${[...declared].join(", ")}). ` +
        `a record cannot cite provenance the metadata does not carry`,
    );

  const preserved = {};
  for (const k of meta.preserve || []) if (oldMeta[k] != null) preserved[k] = oldMeta[k];

  const metadata = {
    ...buildMetadata({
      package: `@geoalgeria/${pkg}`,
      records: all,
      // Preserve each source's own `retrieved` when it has one (multi-source
      // packages legitimately pull their feeds on different dates); stamp only the
      // sources that carry none with the run's value (real fetch time on a live
      // run, the committed value on an offline replay). Default evidence_type from
      // the canonical helper unless the config pins it.
      // `snapshot`, when the generator captured one, identifies the exact bytes
      // this run read: sha256 + size, and the upstream's last-modified where it
      // publishes one. `retrieved` records when we asked; a live upstream can
      // change between two runs on the same date, so the date alone cannot say
      // what a shipped value was derived from. Optional by design: offline and
      // replay generators have nothing to attest and simply omit it.
      sources: meta.sources.map((s) => {
        // A source with no pinned `retrieved` inherits the run's date; if the
        // caller forgot to pass one, fail the build rather than silently
        // shipping a source entry with no retrieval date at all.
        if (s.retrieved == null && !retrieved)
          throw new Error(`${pkg}: source "${s.key}" has no retrieved date and none was passed to writePackageV2`);
        return {
        ...s,
        retrieved: s.retrieved ?? retrieved,
        evidence_type: s.evidence_type ?? evidenceForSourceKey(s.key),
        ...(snapshots[s.key] ? { snapshot: snapshots[s.key] } : {}),
        };
      }),
      license: meta.license,
      updated,
      estimatedUniverse: meta.estimatedUniverse,
      coverageNote: meta.coverageNote,
      titles: meta.titles,
      entities: files.length > 1 ? entities : undefined,
    }),
    // `stats` carries values the caller computed that this writer cannot: a
    // relation file's count, for instance, which it never sees rows for.
    ...(meta.stats ? meta.stats(all, stats) : {}),
    ...preserved,
  };
  pending.push({ path: join(dir, "metadata.json"), content: JSON.stringify(metadata, null, 2) + "\n" });
  if (retiredIds) {
    const liveIds = new Set(all.map((record) => String(record.id)));
    const overlap = [...retiredIds].filter((id) => liveIds.has(String(id)));
    if (overlap.length) {
      throw new Error(
        `writePackageV2 [${pkg}]: retired id(s) are still live: ${overlap.slice(0, 5).join(", ")}`,
      );
    }
    pending.push({
      path: join(dir, "retired-ids.json"),
      content: retiredIdsContent(retiredIds),
    });
  }

  // Phase 2 — everything validated; now write each file atomically.
  for (const { path, content } of pending) writeAtomic(path, content);
  return { records: all, metadata, review };
}

/**
 * Carry each record's id over from the committed data, keyed by a stable upstream
 * identifier, so regeneration reproduces the SAME public join keys (v2 decision 10/11).
 *
 * Why the join packages need it: their generators derive ids as `{wilaya}-{seq}`, so
 * when the root commune fix (5 rows in dataset/algeria.json) re-scopes ~30 records to
 * the correct wilaya, a naive re-run re-sequences every id in the affected wilayas —
 * churning the ids of records that did not otherwise change. Keying on the source id
 * (refs.osm / refs.patrimoine / refs.msp …) pins every record's id to what it shipped,
 * so the only diff a replay produces is the corrected wilaya_code/commune on the
 * relocated records. A record with no committed match keeps its freshly derived id
 * (a genuinely new record on a live pull).
 *
 * Growth/shrink/reorder are all handled:
 *  - reorder — every record matches a committed key, so every id is pinned back.
 *  - shrink  — a dropped record's key is simply absent; its id retires (a missing
 *    key is expected, never an error). The retired id stays reserved so a live
 *    record can never inherit a join key that used to mean a different place.
 *  - growth  — a genuinely new record keeps its freshly derived id UNLESS that id
 *    lands on a reserved (pinned-or-retired) committed id; then it is re-homed to
 *    the next free {prefix}-{seq} slot in its own id space. Without this, the
 *    sequential assignIds() pass — which runs before carry-over and does not know
 *    which slots carry-over will pin back — can hand a new record the very slot a
 *    carried record returns to, minting a duplicate public id (empirically: a live
 *    ecoles regen produced 20 duplicate-id pairs).
 *
 * Fails loud on a duplicated committed carry key (the key cannot pin an id it does
 * not uniquely identify) and on any residual duplicate id after carry-over.
 *
 * @param {object[]} rows          the v2 records being emitted (mutated in place)
 * @param {object[]} committed     the committed v2 records (empty on a first build)
 * @param {(r: object) => (string|null)} keyOf  stable upstream key, or null to skip
 * @param {string} [pkg]           package name, for error messages
 * @param {Set<string>} retiredIds ids retired by an earlier run; mutated with
 *                                 ids retired by this run
 * @returns {object[]} rows
 */
export function carryOverIds(
  rows,
  committed,
  keyOf,
  pkg = "",
  retiredIds,
) {
  const tag = pkg ? ` [${pkg}]` : "";
  if (!(retiredIds instanceof Set)) {
    throw new Error(
      `carryOverIds${tag}: a persistent retiredIds Set is required`,
    );
  }
  // Index the committed id each carry key shipped under. A duplicated key means
  // the key does not uniquely identify a record, so pinning would be arbitrary —
  // fail the build rather than silently churn the ambiguous records' ids.
  const byKey = new Map();
  const dupKeys = new Set();
  for (const r of committed) {
    const k = keyOf(r);
    if (k == null) continue;
    if (byKey.has(k)) dupKeys.add(k);
    else byKey.set(k, r.id);
  }
  if (dupKeys.size)
    throw new Error(
      `carryOverIds${tag}: committed data has duplicate carry key(s) ` +
        `${[...dupKeys].slice(0, 5).map((k) => JSON.stringify(k)).join(", ")}` +
        `${dupKeys.size > 5 ? ` (+${dupKeys.size - 5} more)` : ""} — the carry key is not ` +
        `unique, so it cannot pin ids; make keyOf discriminate these records`,
    );

  const liveKeys = new Set(rows.map(keyOf).filter((key) => key != null));
  for (const record of committed) {
    const key = keyOf(record);
    if (key != null && !liveKeys.has(key)) retiredIds.add(String(record.id));
  }

  // Every id any committed record ever held, plus ids retired by earlier runs.
  // A record still present is pinned
  // back to it below; a record upstream dropped retires its id. Either way a NEW
  // record must never be handed one of these — reuse would silently repoint a
  // cached public join key at a different place.
  const reserved = new Set([
    ...retiredIds,
    ...committed.map((record) => String(record.id)),
  ]);

  // 1. Pin each still-present record back to the id it shipped under.
  const carried = new Set();
  for (const r of rows) {
    const k = keyOf(r);
    if (k != null && byKey.has(k)) {
      r.id = byKey.get(k);
      carried.add(r);
    }
  }

  // 2. Re-home any new record whose freshly-derived id collides with a reserved
  //    id. Deterministic: keep its prefix, take the smallest {prefix}-{seq} not
  //    already occupied (every reserved id + every live id), matching the width
  //    of its derived suffix.
  const occupied = new Set(reserved);
  for (const r of rows) occupied.add(r.id);
  for (const r of rows) {
    if (carried.has(r) || !reserved.has(r.id)) continue;
    const id = String(r.id);
    const cut = id.lastIndexOf("-");
    const prefix = cut >= 0 ? id.slice(0, cut) : id;
    const width = cut >= 0 ? id.length - cut - 1 : 0;
    let seq = 1;
    let next;
    do {
      next = `${prefix}-${String(seq++).padStart(width, "0")}`;
    } while (occupied.has(next));
    r.id = next;
    occupied.add(next);
  }

  // 3. The final id set must be globally unique — two current records sharing one
  //    upstream key would pin to the same committed id and slip past step 2.
  const ids = new Set();
  for (const r of rows) {
    if (ids.has(r.id))
      throw new Error(
        `carryOverIds${tag}: id ${JSON.stringify(r.id)} is duplicated after carry-over ` +
          `— two records resolve to the same public id`,
      );
    ids.add(r.id);
  }
  return rows;
}

const RETIRED_IDS_NOTE =
  "Ids no record may ever hold again. Keeping them reserved prevents a public join key from silently pointing to a different place after a later refresh.";

function retiredIdsContent(ids) {
  return `${JSON.stringify({
    note: RETIRED_IDS_NOTE,
    ids: [...ids].map(String).sort(),
  }, null, 2)}\n`;
}

/** Read and validate a package's persistent retired-id ledger. */
export function readRetiredIds(dir) {
  const path = join(dir, "retired-ids.json");
  if (!existsSync(path)) return new Set();
  const document = JSON.parse(readFileSync(path, "utf-8"));
  if (
    !Array.isArray(document.ids) ||
    document.ids.some((id) => typeof id !== "string" || !id)
  ) {
    throw new Error(`${path}: expected a non-empty string array at ids`);
  }
  if (new Set(document.ids).size !== document.ids.length) {
    throw new Error(`${path}: duplicate retired id`);
  }
  return new Set(document.ids);
}

/** Persist a ledger for a generator that has not moved to writePackageV2 yet. */
export function writeRetiredIds(dir, ids) {
  writeAtomic(join(dir, "retired-ids.json"), retiredIdsContent(ids));
}

/** Read a package's committed records for carryOverIds, or [] if none exist yet. */
export function readCommitted(dir, file) {
  try {
    return JSON.parse(readFileSync(join(dir, file), "utf-8"));
  } catch {
    return [];
  }
}

/**
 * The `updated`/`retrieved` an offline replay must reuse to reproduce the committed
 * data verbatim: the committed metadata's own values (falling back to the cutover
 * date for a package that has none yet). A live run passes the fetch date instead.
 * @param {string} dir  the package's data/ directory
 */
export function committedDates(dir) {
  try {
    const m = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"));
    // H2: the writer now preserves each source's own `retrieved`, so this only
    // supplies the run-date FALLBACK stamped on sources that carry none. That
    // fallback is a package-level default — the committed `updated` — not an
    // arbitrary first source's date (which would misdate every other source).
    const updated = m.updated || CUTOVER_DATE;
    return { updated, retrieved: updated };
  } catch {
    return { updated: CUTOVER_DATE, retrieved: CUTOVER_DATE };
  }
}

/**
 * The {updated, retrieved} a generator stamps: a live pull uses today's date; an
 * offline `--cache` replay reuses the committed dates so it reproduces them.
 * (H2: these are only the run-date fallback — each source keeps its own retrieved.)
 * @param {string} dir       the package's data/ directory
 * @param {boolean} offline  true on a --cache replay
 */
export function resolveDates(dir, offline) {
  if (offline) return committedDates(dir);
  const today = new Date().toISOString().slice(0, 10);
  return { updated: today, retrieved: today };
}

/**
 * Read a `--cache` raw file, turning a missing file into an actionable message
 * (the raw pull only exists after a live run) instead of a bare ENOENT stack.
 * @param {string} researchDir  the package's research/<pkg>/ directory
 * @param {string} file         the raw file name
 * @param {string} pkg          package name, for the message
 * @returns {string} the file contents (utf-8)
 */
export function readCacheFile(researchDir, file, pkg) {
  try {
    return readFileSync(join(researchDir, file), "utf-8");
  } catch (e) {
    if (e && e.code === "ENOENT")
      throw new Error(
        `--cache: ${file} not found under research/${pkg}/ — run once without --cache to populate it`,
      );
    throw e;
  }
}
