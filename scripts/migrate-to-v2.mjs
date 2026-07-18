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
};

// --- runner -----------------------------------------------------------------
function migrate(pkg) {
  const cfg = MIGRATIONS[pkg];
  if (!cfg) { console.error(`  no migration config for ${pkg}`); return false; }
  const dir = join(ROOT, "packages", pkg, "data");
  const base = cfg.file.replace(/\.json$/, "");

  const oldMeta = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"));
  if (oldMeta.schema_version === "2.0.0") { console.log(`  ${pkg}: already v2 — skipped`); return true; }

  const rows = JSON.parse(readFileSync(join(dir, cfg.file), "utf-8")).map(cfg.map);
  rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const preserved = {};
  for (const k of cfg.meta.preserve || []) if (oldMeta[k] != null) preserved[k] = oldMeta[k];

  const metadata = {
    ...buildMetadata({
      package: `@geoalgeria/${pkg}`,
      records: rows,
      sources: cfg.meta.sources,
      license: cfg.meta.license,
      updated: TODAY,
      estimatedUniverse: cfg.meta.estimatedUniverse,
      coverageNote: cfg.meta.coverageNote,
      titles: cfg.meta.titles,
    }),
    ...(cfg.meta.stats ? cfg.meta.stats(rows) : {}),
    ...preserved,
  };

  const cols = colsFor(rows);
  mkdirSync(join(dir, "csv"), { recursive: true });
  mkdirSync(join(dir, "geojson"), { recursive: true });
  writeFileSync(join(dir, cfg.file), JSON.stringify(rows, null, 2) + "\n");
  writeFileSync(join(dir, "csv", `${base}.csv`), toCSV(rows, cols));
  writeFileSync(join(dir, "geojson", `${base}.geojson`), JSON.stringify(toGeoJSON(rows), null, 2) + "\n");
  writeFileSync(join(dir, "metadata.json"), JSON.stringify(metadata, null, 2) + "\n");
  console.log(`  ${pkg}: ${rows.length} records → v2 (${metadata.geocoded_pct}% geocoded, ${metadata.wilayas_covered} wilayas)`);
  return true;
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MIGRATIONS);
let ok = true;
for (const p of targets) ok = migrate(p) && ok;
process.exit(ok ? 0 : 1);
