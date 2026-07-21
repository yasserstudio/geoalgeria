#!/usr/bin/env node
/**
 * Fetch Algeria post offices + ATMs from Algérie Poste (baridimap.poste.dz)
 * and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source API (public, unauthenticated):
 *   https://baridimap-api.poste.dz/api/postoffices
 *   https://baridimap-api.poste.dz/api/atms
 *
 * Usage: node scripts/fetch.mjs
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS, writePackageV2 } from "../../../scripts/lib/v2-transforms.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Canonical output for this package, plus the byte-identical mirror inside the
// geoalgeria dataset (dataset/data/poste). validateMirror only *detects* drift —
// it never re-syncs — so this run must write both trees itself to keep the
// guarantee the README makes ("the mirror never drifts").
const OUT_DIR = join(__dirname, "..", "data");
const MIRROR_DIR = join(__dirname, "..", "..", "dataset", "data", "poste");
const API = "https://baridimap-api.poste.dz/api";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (geoalgeria-poste dataset builder)",
  Origin: "https://baridimap.poste.dz",
  Referer: "https://baridimap.poste.dz/",
  Accept: "application/json",
};

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clean = (v) => (v === undefined ? null : v);

async function getJSON(path) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const body = await res.json();
  const rows = Array.isArray(body) ? body : body?.data;
  if (!Array.isArray(rows)) throw new Error(`${path} -> unexpected response shape`);
  return rows;
}

// --- normalizers ----------------------------------------------------------
function normPostOffice(o) {
  const c = o.commune || {};
  const w = c.wilaya || {};
  return {
    id: o.id,
    name: o.nom ?? null,
    name_ar: o.intitule_ar ?? null,
    class: o.classe ?? null,
    postal_code: o.cp ?? null,
    postal_code_old: o.cp_old ?? null,
    address: o.adresse ?? null,
    commune_code: c.code ?? null,
    commune_fr: c.name_fr ?? null,
    commune_ar: c.name_ar ?? null,
    wilaya_code: w.id ?? null,
    wilaya_fr: w.name_fr ?? null,
    wilaya_ar: w.name_ar ?? null,
    lat: num(o.gps?.lat),
    lng: num(o.gps?.lng),
  };
}

function normAtm(a) {
  return {
    id: clean(a.atm_id),
    name: a.name ?? null,
    status: clean(a.status),
    postal_code: a.cp ?? null,
    postal_code_old: a.cp_old ?? null,
    address: a.adresse ?? null,
    commune_fr: a.commune_fr ?? null,
    commune_ar: a.commune_ar ?? null,
    wilaya_code: a.wilaya_id ?? null,
    wilaya_fr: a.wilaya_fr ?? null,
    wilaya_ar: a.wilaya_ar ?? null,
    lat: num(a.latitude),
    lng: num(a.longitude),
  };
}

// --- main ------------------------------------------------------------------
async function main() {
  console.log("Fetching post offices…");
  const offices = (await getJSON("/postoffices")).map(normPostOffice);
  console.log(`  ${offices.length} post offices`);

  console.log("Fetching ATMs…");
  const atms = (await getJSON("/atms")).map(normAtm);
  console.log(`  ${atms.length} ATMs`);

  // Emit v2 via the shared writer (live-only source, so stamp the run's date) to
  // BOTH the package tree and the dataset mirror, so the two stay byte-identical.
  // Fresh rows per destination — writePackageV2 sorts/demotes in place.
  const cfg = MIGRATIONS.poste;
  const mapOf = (f) => cfg.files.find((s) => s.file === f).map;
  const today = new Date().toISOString().slice(0, 10);
  for (const dir of [OUT_DIR, MIRROR_DIR]) {
    writePackageV2({
      pkg: "poste",
      dir,
      files: [
        { file: "postoffices.json", rows: offices.map(mapOf("postoffices.json")) },
        { file: "atms.json", rows: atms.map(mapOf("atms.json")) },
      ],
      meta: cfg.meta,
      updated: today,
      retrieved: today,
    });
  }
  console.log(`Wrote ${offices.length} post offices + ${atms.length} ATMs → v2 (package + dataset mirror).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
