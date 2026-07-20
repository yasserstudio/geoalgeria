#!/usr/bin/env node
// One-time v2 cutover: transform a package's committed data into the canonical
// @geoalgeria/schema v2 shape, regenerating data JSON + CSV + GeoJSON + metadata.
// This is the source-of-truth transform for packages whose upstream source is dead
// or blocked; each generator (scripts/fetch.mjs) is updated to emit v2 directly
// during the P3 refresher rework (see packages/schema/MIGRATING.md). The exemplar
// @geoalgeria/pharmacies was migrated at the generator level and is NOT handled here.
//
// Guarded against double-runs (skips a package already at schema_version 2.0.0).
// Usage: node scripts/migrate-to-v2.mjs [pkg ...]   (no arg = all configured)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMetadata, toCSV, toGeoJSON } from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TODAY = "2026-07-18"; // cutover date (scripts can't call Date.now deterministically here)

// --- shared helpers ---------------------------------------------------------
/** commune_code (int|str) → 4-digit ONS string ("1607", "0105"), or null. */
const padC = (c) => (c == null || c === "" ? null : String(c).replace(/\D/g, "").padStart(4, "0"));
/** drop undefined keys so records stay tidy. */
const clean = (o) => { const x = {}; for (const k in o) if (o[k] !== undefined) x[k] = o[k]; return x; };
/** build a refs object of non-empty string ids, or undefined if none. */
const refs = (o) => { const r = {}; for (const k in o) if (o[k] != null && o[k] !== "") r[k] = String(o[k]); return Object.keys(r).length ? r : undefined; };
/** atomic lat/lng: both finite → exact point; otherwise ungeocoded (both null, approximate).
 *  Guards against half-coordinate source records (one axis set, the other null). */
const geoExact = (r, method) => {
  const has = Number.isFinite(r.lat) && Number.isFinite(r.lng);
  return { lat: has ? r.lat : null, lng: has ? r.lng : null, geo_precision: has ? "exact" : "approximate", geo_method: method };
};
/** frequency table of a field's values. */
const count = (rows, key) => { const o = {}; for (const r of rows) { const v = r[key]; if (v != null) o[v] = (o[v] || 0) + 1; } return o; };
const named = (rows) => rows.filter((r) => r.name).length;
const LINKAGE = "Commune/wilaya linkage is derived by nearest-centroid join against the geoalgeria commune set; wilaya is effectively exact, commune is best-effort.";

// canonical leading columns for CSV; domain extras are appended in first-seen order.
const BASE_COLS = ["id", "name", "name_fr", "name_ar", "wilaya_code", "commune_code", "commune", "commune_ar", "lat", "lng", "geo_precision", "geo_method", "source", "refs"];
function colsFor(rows) {
  const base = BASE_COLS.filter((c) => rows.some((r) => c in r));
  const extra = [];
  for (const r of rows) for (const k in r) if (!base.includes(k) && !extra.includes(k)) extra.push(k);
  return [...base, ...extra];
}

// shared tourisme maps (OSM point files share a shape; thermal springs differ).
const tourOsm = (r) => clean({
  id: String(r.id), name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
  wilaya_code: r.wilaya_code, commune_code: null, commune: null,
  lat: r.lat, lng: r.lng, geo_precision: "exact", geo_method: "osm",
  source: "osm", refs: refs({ osm: r.osm_id }),
  type: r.type, category: r.category,
});
const tourThermal = (r) => clean({
  id: String(r.id), name: r.name,
  wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune_name,
  lat: r.lat, lng: r.lng, geo_precision: "exact", geo_method: "asal",
  source: "asal",
  type: r.type, temperature_c: r.temperature_c, debit_l_s: r.debit_l_s, altitude_m: r.altitude_m, minerality: r.minerality,
});

// --- per-package migrations -------------------------------------------------
const MIGRATIONS = {
  mosquees: {
    file: "mosquees.json",
    map: (r) => {
      const isArea = typeof r.osm_id === "string" && /^(way|relation)\//.test(r.osm_id);
      const method = r.osm_id ? "osm_" + r.osm_id.split("/")[0] : "wikidata";
      return clean({
        id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
        lat: r.lat, lng: r.lng,
        geo_precision: isArea ? "approximate" : "exact",
        geo_method: method,
        source: r.source,
        refs: refs({ wikidata: r.wikidata, osm: r.osm_id }),
        denomination: r.denomination,
      });
    },
    meta: {
      sources: [
        { key: "wikidata", name: "Wikidata — mosques in Algeria", url: "https://www.wikidata.org", license: "CC0-1.0", retrieved: TODAY },
        { key: "osm", name: "OpenStreetMap — mosques in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: TODAY },
      ],
      license: "CC0-1.0 AND ODbL-1.0",
      estimatedUniverse: 18449,
      coverageNote: "Mosques compiled from Wikidata + OpenStreetMap, against the ~18449 counted by the Ministry of Religious Affairs (MARW). A community-maintained composite, not an official registry.",
      titles: { en: "Algeria mosques", fr: "Mosquées d'Algérie", ar: "مساجد الجزائر" },
      stats: (rows) => ({ named: named(rows), by_source: count(rows, "source"), linkage_note: LINKAGE }),
    },
  },

  ecoles: {
    file: "ecoles.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      lat: r.lat, lng: r.lng,
      geo_precision: r.geo_precision === "osm_node" ? "exact" : "approximate",
      geo_method: r.geo_precision,
      source: r.source, refs: refs({ osm: r.osm_id }),
      cycle: r.cycle, cycle_label_fr: r.cycle_label_fr, cycle_label_ar: r.cycle_label_ar,
      kind: r.kind, kind_label_fr: r.kind_label_fr, kind_label_ar: r.kind_label_ar,
      isced_levels: r.isced_levels, sector: r.sector, address: r.address,
    }),
    meta: {
      sources: [{ key: "osm", name: "OpenStreetMap — schools & kindergartens in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: TODAY }],
      license: "ODbL-1.0",
      estimatedUniverse: 28000,
      coverageNote: "Schools compiled from OpenStreetMap, against the ~28000 establishments in Algeria's national school network (Ministry of National Education, approximate). A community-maintained extract, coverage partial and uneven by wilaya.",
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
      lat: r.lat, lng: r.lng,
      geo_precision: "exact", geo_method: "source_point",
      source: "patrimoine",
      refs: refs({ patrimoine: r.node_id_ar ?? r.node_id_fr }),
      type: r.type, category: r.category, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
      has_virtual_tour: r.has_virtual_tour, url: r.url, slug: r.slug,
    }),
    meta: {
      sources: [{ key: "patrimoine", name: "Cartes du Patrimoine Culturel Algérien (Ministry of Culture)", url: "https://cartes.patrimoineculturelalgerien.org", license: "Factual public cultural listing (Ministry of Culture)", retrieved: TODAY }],
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
      lat: r.lat, lng: r.lng,
      geo_precision: "exact", geo_method: "operator_point",
      source: "djezzy",
      refs: refs({ djezzy: r.code }),
      type: r.type, category: r.category, address: r.address, hours: r.hours, code_ouverture: r.code_ouverture,
    }),
    meta: {
      sources: [{ key: "djezzy", name: "Djezzy — Optimum Telecom Algérie (nos-boutiques)", url: "https://www.djezzy.dz", license: "Data © Optimum Telecom Algérie (Djezzy); redistributed for reference", retrieved: TODAY }],
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
      lat: r.lat, lng: r.lng,
      geo_precision: "exact", geo_method: "operator_api",
      source: "ooredoo",
      refs: refs({ ooredoo: r.ooredoo_id }),
      type: r.type, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
      address: r.address, operator_wilaya: r.operator_wilaya,
    }),
    meta: {
      sources: [{ key: "ooredoo", name: "Ooredoo Algérie — retail network (trouvez-nous JSON API)", url: "https://www.ooredoo.dz/fr/particuliers/trouvez-nous", license: "Data © Ooredoo Algérie; redistributed for reference", retrieved: TODAY }],
      license: "Data © Ooredoo Algérie; redistributed for reference",
      estimatedUniverse: null,
      coverageNote: "Ooredoo retail network (Espaces Ooredoo, City Shops, Espaces Services) via the public API — every record has a real operator coordinate. A few points carry inaccurate source coords, so their derived wilaya/commune may be off; operator_wilaya preserves the operator's declared wilaya.",
      titles: { en: "Ooredoo stores (Algeria)", fr: "Boutiques Ooredoo", ar: "متاجر أوريدو" },
      stats: (rows) => ({ by_type: count(rows, "type") }),
    },
  },

  sante: {
    file: "sante.json",
    map: (r) => {
      const gp = r.geo_precision;
      const has = Number.isFinite(r.lat) && Number.isFinite(r.lng);
      return clean({
        id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
        lat: has ? r.lat : null, lng: has ? r.lng : null,
        geo_precision: gp === "osm_point" || gp === "wikidata_point" ? "exact" : "approximate",
        geo_method: gp,
        source: "msp",
        refs: refs({ wikidata: r.wikidata, osm: r.osm_id, msp: r.msp_id }),
        type: r.type, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
        sector: r.sector, slug: r.slug,
      });
    },
    meta: {
      sources: [
        { key: "msp", name: "Ministry of Health (sante.gov.dz) — health-establishment registry", url: "https://sante.gov.dz", license: "Official public registry (Ministry of Health)", retrieved: TODAY },
        { key: "osm", name: "OpenStreetMap — geocoding", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: TODAY },
        { key: "wikidata", name: "Wikidata — geocoding", url: "https://www.wikidata.org", license: "CC0-1.0", retrieved: TODAY },
      ],
      license: "Official registry (Ministry of Health); geocoding ODbL/CC0",
      estimatedUniverse: null,
      coverageNote: "Public health establishments (EPH/EPSP/EHS/CHU) from the Ministry of Health registry. Coordinates layered on via OSM/Wikidata; where no point was found the commune centroid is used (approximate) and 95 remain ungeocoded.",
      titles: { en: "Algeria public health establishments", fr: "Établissements de santé publique d'Algérie", ar: "المؤسسات الصحية العمومية الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_sector: count(rows, "sector"), by_geo_method: count(rows, "geo_method"), bilingual: rows.filter((r) => r.name_ar && r.name_fr).length, linkage_note: LINKAGE }),
    },
  },

  ferroviaire: {
    file: "stations.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      lat: r.lat, lng: r.lng,
      geo_precision: "exact",
      geo_method: r.osm_id ? "osm_" + r.osm_id.split("/")[0] : "wikidata",
      source: r.source,
      refs: refs({ wikidata: r.wikidata, osm: r.osm_id }),
      type: r.type, line: r.line, operator: r.operator, network: r.network,
    }),
    meta: {
      sources: [
        { key: "wikidata", name: "Wikidata — rail & urban transit stations in Algeria", url: "https://www.wikidata.org", license: "CC0-1.0", retrieved: TODAY },
        { key: "osm", name: "OpenStreetMap — rail & urban transit stations in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: TODAY },
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
      lat: r.lat, lng: r.lng,
      geo_precision: r.geo_precision === "exact" ? "exact" : "approximate",
      geo_method: r.geo_precision,
      source: "sogral",
      refs: refs({ sogral: r.sogral_code }),
      official_name: r.official_name, address: r.address,
      surface_total_m2: r.surface_total_m2, surface_built_m2: r.surface_built_m2,
    }),
    meta: {
      sources: [{ key: "sogral", name: "SOGRAL — Société de Gestion des Gares Routières d'Algérie", url: "https://live.sogral.com", license: "Data © SOGRAL; redistributed for reference", retrieved: TODAY }],
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
      lat: r.lat, lng: r.lng,
      geo_precision: "exact", geo_method: "source_point",
      source: "anac",
      refs: refs({ icao: r.icao, iata: r.iata }),
      icao: r.icao, iata: r.iata, address: r.address, phone: r.phone, website: r.website,
    }),
    meta: {
      sources: [{ key: "anac", name: "ANAC — Autorité Nationale de l'Aviation Civile", url: "https://www.anac.dz", license: "Factual public listing (ANAC)", retrieved: TODAY }],
      license: "Factual public listing (ANAC)",
      estimatedUniverse: null,
      coverageNote: "Airports from the National Civil Aviation Authority (ANAC). Wilaya-level only (no commune linkage).",
      titles: { en: "Algeria airports", fr: "Aéroports d'Algérie", ar: "مطارات الجزائر" },
      stats: (rows) => ({ with_iata: rows.filter((r) => r.iata).length }),
    },
  },

  agriculture: {
    file: "agriculture.json",
    map: (r) => clean({
      id: r.id, name: r.name, name_fr: r.name_fr, name_ar: r.name_ar,
      wilaya_code: r.wilaya_code, commune_code: padC(r.commune_code), commune: r.commune,
      lat: r.lat, lng: r.lng,
      geo_precision: "approximate", geo_method: r.geo_precision,
      source: "madr",
      refs: refs({ wikidata: r.wikidata, osm: r.osm_id }),
      type: r.type, type_label_fr: r.type_label_fr, type_label_ar: r.type_label_ar,
      sector: r.sector, abbreviation: r.abbreviation, address: r.address, phone: r.phone, fax: r.fax, slug: r.slug,
    }),
    meta: {
      sources: [{ key: "madr", name: "Ministry of Agriculture, Rural Development and Fisheries (MADR)", url: "https://madr.gov.dz", license: "Factual public institutional listing (MADR)", retrieved: TODAY }],
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
      lat: r.lat, lng: r.lng,
      geo_precision: "approximate", geo_method: r.geo_precision,
      source: "mip",
      operateur: r.operateur, role: r.role, nature: r.nature,
      nature_label_fr: r.nature_label_fr, nature_label_ar: r.nature_label_ar, slug: r.slug,
    }),
    meta: {
      sources: [{ key: "mip", name: "Ministère de l'Industrie Pharmaceutique (MIP) — approved manufacturers register", url: "https://www.miph.gov.dz", license: "Factual public register (MIP)", retrieved: TODAY }],
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
      lat: r.lat, lng: r.lng,
      geo_precision: "exact", geo_method: "sig_mjs",
      source: "mjs",
      type: r.type_code, type_label_fr: r.type_fr, type_label_ar: r.type_ar,
      daira: r.daira, address: r.address, capacity: r.capacity, year: r.year,
      operational: r.operational, pmr: r.pmr, surface_built_m2: r.surface_built_m2, surface_land_m2: r.surface_land_m2,
    }),
    meta: {
      sources: [{ key: "mjs", name: "Ministry of Youth and Sports — SIG", url: "https://sig.mjs.gov.dz", license: "Factual public listing (Ministry of Youth and Sports)", retrieved: TODAY }],
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
      lat: r.lat, lng: r.lng,
      geo_precision: "exact", geo_method: "sig_mjs",
      source: "mjs",
      type: r.type_code, type_label_fr: r.type_fr,
      daira: r.daira, address: r.address, capacity: r.capacity, year: r.year,
      operational: r.operational, pmr: r.pmr, surface_built_m2: r.surface_built_m2, surface_land_m2: r.surface_land_m2,
    }),
    meta: {
      sources: [{ key: "mjs", name: "Ministry of Youth and Sports — SIG", url: "https://sig.mjs.gov.dz", license: "Factual public listing (Ministry of Youth and Sports)", retrieved: TODAY }],
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
      lat: r.lat, lng: r.lng,
      geo_precision: r.geo_precision === "campus" ? "exact" : "approximate",
      geo_method: r.geo_precision,
      source: "mesrs",
      type: r.type, type_label_fr: r.type_fr, sector: r.sector,
      supervisory_ministry: r.supervisory_ministry, website: r.website,
    }),
    meta: {
      sources: [{ key: "mesrs", name: "Ministry of Higher Education and Scientific Research (MESRS)", url: "https://www.mesrs.dz", license: "Factual public listing (MESRS)", retrieved: TODAY }],
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
      lat: Number.isFinite(r.lat) ? r.lat : null, lng: Number.isFinite(r.lng) ? r.lng : null,
      geo_precision: Number.isFinite(r.lat) ? "exact" : "approximate",
      geo_method: "takwin",
      source: "mfep",
      type: r.type, type_label: r.type_label, abreviation: r.abreviation, code: r.code, secteur: r.secteur,
      adresse: r.adresse, adresse_fr: r.adresse_fr, telephone: r.telephone, fax: r.fax, email: r.email,
      site_web: r.site_web, facebook: r.facebook, capacite: r.capacite, capacite_reelle: r.capacite_reelle,
      surface_m2: r.surface_m2, internat: r.internat, capacite_internat: r.capacite_internat, vocations: r.vocations,
    }),
    meta: {
      sources: [{ key: "mfep", name: "Ministry of Vocational Training and Education (MFEP) — takwin.dz", url: "https://takwin.dz", license: "Factual public listing (MFEP)", retrieved: TODAY }],
      license: "Factual public listing (MFEP)",
      estimatedUniverse: null,
      coverageNote: "Vocational-training establishments (CFPA, INSFP, DFEP) from the MFEP takwin.dz portal; 1375 of 1932 are geocoded.",
      titles: { en: "Algeria vocational-training establishments", fr: "Établissements de formation professionnelle d'Algérie", ar: "مؤسسات التكوين المهني الجزائرية" },
      stats: (rows) => ({ by_type: count(rows, "type"), by_secteur: count(rows, "secteur") }),
    },
  },

  poste: {
    files: [
      { file: "postoffices.json", map: (r) => clean({
        id: String(r.id), name: r.name, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: r.commune_code || null,
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
      sources: [{ key: "baridimap", name: "Algérie Poste — baridimap.poste.dz", url: "https://baridimap.poste.dz", license: "Data © Algérie Poste; redistributed for reference", retrieved: TODAY }],
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
        type: r.type, code: r.code, address: r.address, phone: r.phone, fax: r.fax, email: r.email, manager: r.manager,
      }) },
    ],
    meta: {
      sources: [{ key: "anem", name: "ANEM — National Employment Agency (anem.dz)", url: "https://www.anem.dz", license: "Factual public listing (ANEM)", retrieved: TODAY }],
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
        id: r.id, name: r.name, name_ar: r.name_ar,
        wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune ?? null,
        ...geoExact(r, "mobilis"),
        source: "mobilis",
        type: r.type, code: r.code, address: r.address, address_ar: r.address_ar,
      }) },
      { file: "pdv.json", geojson: false, map: (r) => clean({
        id: r.id, name: r.name,
        wilaya_code: r.wilaya_code, commune_code: null, commune: r.commune ?? null,
        lat: null, lng: null,
        geo_precision: "approximate", geo_method: "ungeocoded",
        source: "mobilis",
        type: r.type, code: r.code, address: r.address,
      }) },
    ],
    meta: {
      sources: [{ key: "mobilis", name: "Mobilis — ATM Mobilis (mobilis.dz)", url: "https://www.mobilis.dz", license: "Data © ATM Mobilis; redistributed for reference", retrieved: TODAY }],
      license: "Data © ATM Mobilis; redistributed for reference",
      estimatedUniverse: null,
      coverageNote: "Mobilis retail network — commercial agencies (geocoded) and points of sale (PDV, listed but not geocoded).",
      titles: { en: "Mobilis stores (Algeria)", fr: "Points de vente Mobilis", ar: "نقاط بيع موبيليس" },
      stats: (rows) => ({ by_type: count(rows, "type") }),
    },
  },

  tourisme: {
    files: [
      { file: "attractions.json", map: tourOsm },
      { file: "historic.json", map: tourOsm },
      { file: "lodging.json", map: tourOsm },
      { file: "parks.json", map: tourOsm },
      { file: "thermal-springs.json", map: tourThermal },
    ],
    meta: {
      sources: [
        { key: "osm", name: "OpenStreetMap — attractions, historic sites, lodging & parks in Algeria", url: "https://www.openstreetmap.org", license: "ODbL 1.0 (© OpenStreetMap contributors)", retrieved: TODAY },
        { key: "asal", name: "ASAL Geoportail — thermal springs", url: "https://www.asal.dz", license: "Factual public listing (ASAL)", retrieved: TODAY },
      ],
      license: "ODbL-1.0 AND factual public listing (ASAL)",
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
        wilaya_code: String(r.wilaya_code).padStart(2, "0"), commune_code: null, commune: null,
        lat: null, lng: null, geo_precision: "approximate", geo_method: "ungeocoded",
        source: "boa",
        acronym: r.acronym, bank_code: r.bank_code, type: r.type, ownership: r.ownership,
        ownership_country: r.ownership_country, parent_company: r.parent_company,
        swift_bic: r.swift_bic, website: r.website, hq_address: r.hq_address, hq_city: r.hq_city,
        year_established: r.year_established,
      }) },
      { file: "institutions.json", geojson: false, map: (r) => clean({
        id: r.id, name: r.name_fr, name_fr: r.name_fr, name_ar: r.name_ar,
        wilaya_code: String(r.wilaya_code).padStart(2, "0"), commune_code: null, commune: null,
        lat: null, lng: null, geo_precision: "approximate", geo_method: "ungeocoded",
        source: "boa",
        acronym: r.acronym, bank_code: r.bank_code, type: r.type, ownership: r.ownership,
        ownership_country: r.ownership_country, parent_company: r.parent_company,
        swift_bic: r.swift_bic, website: r.website, hq_address: r.hq_address, hq_city: r.hq_city,
        year_established: r.year_established,
      }) },
      { file: "branches.json", map: (r) => clean({
        id: r.id, name: r.name,
        wilaya_code: String(r.wilaya_code).padStart(2, "0"), commune_code: null, commune: null,
        ...geoExact(r, "bank_locator"),
        source: "bank_locator",
        bank_id: r.bank_id, address: r.address, phone: r.phone,
      }) },
    ],
    meta: {
      sources: [
        { key: "boa", name: "Banque d'Algérie — liste des banques et établissements financiers agréés (JO n° 9, 6 février 2026)", url: "https://www.bank-of-algeria.dz/banques-commerciales/", license: "Factual public regulatory listing (Banque d'Algérie)", retrieved: TODAY, evidence_type: "official" },
        { key: "bank_locator", name: "Each licensed bank's own branch locator (site/API/KML)", license: "Data © respective banks; redistributed for reference", retrieved: TODAY, evidence_type: "official" },
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
    map: (r) => clean({
      id: r.id,
      wilaya_code: String(r.wilaya_code).padStart(2, "0"), commune_code: null, commune: null,
      lat: null, lng: null, geo_precision: "approximate", geo_method: "ungeocoded",
      source: "wikipedia",
      operator: r.operator, network: r.network, line: r.line,
      terminus1: r.terminus1, terminus2: r.terminus2, stops: r.stops,
      communes_served: r.communes_served, stations_served: r.stations_served,
      source_url: r.source,
    }),
    meta: {
      sources: [{ key: "wikipedia", name: "French Wikipedia — Lignes de bus ETUSA de 1 à 99", url: "https://fr.wikipedia.org/wiki/Lignes_de_bus_ETUSA_de_1_à_99", license: "CC BY-SA 4.0", retrieved: TODAY, evidence_type: "crowdsourced" }],
      license: "Line data from Wikipedia (CC BY-SA 4.0) — attribution + share-alike. Operator: ETUSA. See README.",
      estimatedUniverse: 122,
      coverageNote: "50 of ETUSA's ~122 passenger lines (fr.wikipedia 'Lignes de bus ETUSA de 1 à 99'). Line-level attributes only; per-stop and per-line geometry deferred (OSM route=bus coverage tagged ETUSA is currently thin). No coordinates exist for this dataset — lat/lng are null and geo_precision reflects that honestly.",
      titles: { en: "Algeria urban bus lines", fr: "Lignes de bus urbaines d'Algérie", ar: "خطوط الحافلات الحضرية في الجزائر" },
      stats: (rows) => ({
        operators: [...new Set(rows.map((r) => r.operator))],
        by_operator: count(rows, "operator"),
        with_stop_count: rows.filter((r) => r.stops != null).length,
      }),
    },
  },

  livraison: {
    file: "stopdesks.json",
    map: (r) => clean({
      id: r.id, name: r.name,
      wilaya_code: String(r.wilaya_code).padStart(2, "0"), commune_code: null, commune: r.commune,
      ...geoExact(r, "carrier_relay"),
      source: (r.sources && r.sources[0]) || "carrier_relay",
      operator: r.operator, address: r.address, sources: r.sources,
    }),
    meta: {
      sources: [
        { key: "yalidine", name: "Yalidine Express — nos-agences", url: "https://yalidine-express.com.dz/nos-agences/", license: "Data © Yalidine Express; redistributed for reference", retrieved: TODAY, evidence_type: "official" },
        { key: "guepex", name: "Guepex — public agences feed", url: "https://www.guepex.dz/public/data/agences.json", license: "Data © Guepex; redistributed for reference", retrieved: TODAY, evidence_type: "official" },
        { key: "anderson", name: "Anderson Logistics — agency directory", url: "https://anderson-ecommerce.com/", license: "Data © Anderson Logistics; redistributed for reference", retrieved: TODAY, evidence_type: "official" },
        { key: "noest", name: "Noest Express — bureaux directory", url: "https://noest-dz.com/", license: "Data © Noest Express; redistributed for reference", retrieved: TODAY, evidence_type: "official" },
        { key: "maystro", name: "Maystro Delivery — coverage page", url: "https://maystro-delivery.com/Coverage.html", license: "Data © Maystro Delivery; redistributed for reference", retrieved: TODAY, evidence_type: "official" },
      ],
      license: "Stop-desk data © the respective carriers; carrier registry compiled by GeoAlgeria. Redistributed for reference. See README.",
      estimatedUniverse: null,
      coverageNote: "Geocoded stop-desks from the openly-published Yalidine/Guepex federated relay plus Anderson, Noest and Maystro's own agency lists — 411 points across 9 carriers. Most Algerian COD carriers (90+) don't publish an open agency list; see carriers.json for the full registry and coverage.json for per-carrier presence.",
      titles: { en: "Algeria delivery stop-desks", fr: "Points relais de livraison d'Algérie", ar: "نقاط استلام التوصيل في الجزائر" },
      stats: (rows) => {
        const dataDir = join(ROOT, "packages", "livraison", "data");
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
};

// --- runner -----------------------------------------------------------------
function migrate(pkg) {
  const cfg = MIGRATIONS[pkg];
  if (!cfg) { console.error(`  no migration config for ${pkg}`); return false; }
  const dir = join(ROOT, "packages", pkg, "data");

  const oldMeta = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"));
  if (oldMeta.schema_version === "2.0.0") { console.log(`  ${pkg}: already v2 — skipped`); return true; }

  const specs = cfg.files || [{ file: cfg.file, map: cfg.map }];
  mkdirSync(join(dir, "csv"), { recursive: true });
  mkdirSync(join(dir, "geojson"), { recursive: true });

  const all = [];
  const entities = [];
  for (const s of specs) {
    const base = s.file.replace(/\.json$/, "");
    const rows = JSON.parse(readFileSync(join(dir, s.file), "utf-8")).map(s.map);
    rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    writeFileSync(join(dir, s.file), JSON.stringify(rows, null, 2) + "\n");
    writeFileSync(join(dir, "csv", `${base}.csv`), toCSV(rows, colsFor(rows)));
    if (s.geojson !== false) writeFileSync(join(dir, "geojson", `${base}.geojson`), JSON.stringify(toGeoJSON(rows), null, 2) + "\n");
    entities.push({ file: s.file, count: rows.length });
    all.push(...rows);
  }

  const preserved = {};
  for (const k of cfg.meta.preserve || []) if (oldMeta[k] != null) preserved[k] = oldMeta[k];

  const metadata = {
    ...buildMetadata({
      package: `@geoalgeria/${pkg}`,
      records: all,
      sources: cfg.meta.sources,
      license: cfg.meta.license,
      updated: TODAY,
      estimatedUniverse: cfg.meta.estimatedUniverse,
      coverageNote: cfg.meta.coverageNote,
      titles: cfg.meta.titles,
      entities: specs.length > 1 ? entities : undefined,
    }),
    ...(cfg.meta.stats ? cfg.meta.stats(all) : {}),
    ...preserved,
  };
  writeFileSync(join(dir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
  console.log(`  ${pkg}: ${all.length} records → v2 (${metadata.geocoded_pct}% geocoded, ${metadata.wilayas_covered} wilayas${specs.length > 1 ? `, ${specs.length} files` : ""})`);
  return true;
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MIGRATIONS);
let ok = true;
for (const p of targets) ok = migrate(p) && ok;
process.exit(ok ? 0 : 1);
