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
