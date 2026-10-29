#!/usr/bin/env node
/**
 * Fetch Algeria post offices + ATMs from Algérie Poste (baridimap.poste.dz)
 * and emit JSON, CSV, and GeoJSON to ../data.
 *
 * Source API (public, unauthenticated):
 *   https://baridimap-api.poste.dz/api/postoffices
 *   https://baridimap-api.poste.dz/api/atms
 *
 * Usage: node scripts/fetch.mjs            # live pull
 *        node scripts/fetch.mjs --cache    # offline replay, see REPLAY below
 *
 * REPLAY. Every other `--cache` in this repo replays a raw capture under
 * sources/<pkg>/, and this package has none: BaridiMap is geo-blocked from
 * outside Algeria, so the only pulls that ever ran produced no committed
 * capture. The rows this package already ships are therefore the replay's own
 * input, exactly as scripts/apply-overrides.mjs treats them. They are already
 * v2 records, so the MIGRATIONS map is NOT applied a second time (it reads the
 * raw provider field names), and the dates come from the committed metadata
 * (resolveDates with offline=true) so a replay never stamps a `retrieved` no
 * request was made on. A replay with nothing excluded is byte-identical to what
 * it read, which is what makes it safe to use to apply a removal.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  MIGRATIONS,
  writePackageV2,
  resolveDates,
  readCommitted,
  readRetiredIds,
} from "../../../scripts/lib/v2-transforms.mjs";
import {
  canonicalCommuneForCode,
  normalizeProviderCommune,
} from "../../../scripts/lib/commune-index.mjs";
import { reconcileCurrentWilayaByCommune } from "../../../scripts/lib/current-wilaya-by-commune.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Canonical output for this package, plus the byte-identical mirror inside the
// geoalgeria dataset (dataset/data/poste). validateMirror only *detects* drift,
// it never re-syncs, so this run must write both trees itself to keep the
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

// Military locations. Owner decision of 2026-10-29: the project publishes no
// military location anywhere, so these upstream records never become published
// ones, however BaridiMap keeps listing them. Keyed on the operator's own id,
// which is the published id too, so the exclusion holds across every refresh.
// An office whose ADDRESS merely names the ANP or the gendarmerie is not one of
// these, nor is one whose name happens to be a person's ("404 AHCENE ASKRI");
// only a service point sited inside a military facility is listed here.
//
// A published id is a join key: the ids dropped here are reserved forever in
// data/retired-ids.json, so no later record can be handed one. They forward
// nowhere, because the records are removed and not merged into anything.
const MILITARY_IDS = {
  // Inside the Ain Naadja central military hospital.
  "postoffices.json": new Set(["2532"]),
  // Inside the naval school, Mostaganem (13519), and inside the army's family rest
  // centre (Centre de Repos Familial, CRF) at Sidi Fredj, Staoueli (13104).
  "atms.json": new Set(["13519", "13104"]),
};

// ATMs BaridiMap lists with no coordinate, placed at their host post office's own
// BaridiMap point (the operator's published location, Owner rule of 2026-10-25).
// The ATM is the office's: same postal code, and the same name or the office's
// second machine ("BARAKI 2" beside ATM 1512 "BARAKI", which BaridiMap puts 20 m
// from office 748). The point is the office building's, not a survey of the
// machine, so `geo_method` says so. An ATM that gains its own coordinate upstream
// keeps it; a key whose ATM or office is gone stops the build.
const ATM_HOST_OFFICE = {
  1513: 748, // BARAKI 2 -> BARAKI, 16027
  1772: 234, // AHMER EL AIN, 42005
  2335: 206, // AIN TAYA, 16019
};
const placeAtHostOffice = (atms, offices) => {
  const officeById = new Map(offices.map((o) => [String(o.id), o]));
  const atmById = new Map(atms.map((a) => [String(a.id), a]));
  for (const [atmId, officeId] of Object.entries(ATM_HOST_OFFICE)) {
    const atm = atmById.get(atmId), office = officeById.get(String(officeId));
    if (!atm || !office || office.lat == null) throw new Error(`poste: ATM_HOST_OFFICE ${atmId} -> ${officeId}: ATM or office missing`);
    if (atm.postal_code !== office.postal_code) throw new Error(`poste: ATM_HOST_OFFICE ${atmId}: postal code ${atm.postal_code} is not office ${officeId}'s ${office.postal_code}`);
    if (atm.lat != null) continue;
    Object.assign(atm, { lat: office.lat, lng: office.lng, geo_precision: office.geo_precision, geo_method: "baridimap_host_office" });
  }
};

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clean = (v) => (v === undefined ? null : v);
const padWilayaCode = (value) =>
  value == null || value === "" ? null : String(value).padStart(2, "0");

async function getJSON(path) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const body = await res.json();
  const rows = Array.isArray(body) ? body : body?.data;
  if (!Array.isArray(rows)) throw new Error(`${path} -> unexpected response shape`);
  return rows;
}

// --- normalizers ----------------------------------------------------------
export function normPostOffice(o) {
  const c = o.commune || {};
  const w = c.wilaya || {};
  const communeCodes = normalizeProviderCommune({
    wilayaCode: w.id,
    commune: c.name_fr,
    communeAr: c.name_ar,
    sourceCode: c.code,
  });
  const currentCommune = canonicalCommuneForCode(communeCodes.commune_code);
  const sourceWilayaCode = padWilayaCode(w.id);
  const currentWilayaCode = padWilayaCode(
    currentCommune?.wilaya_code ?? sourceWilayaCode,
  );
  return {
    id: o.id,
    name: o.nom ?? null,
    name_ar: o.intitule_ar ?? null,
    class: o.classe ?? null,
    postal_code: o.cp ?? null,
    postal_code_old: o.cp_old ?? null,
    address: o.adresse ?? null,
    ...communeCodes,
    ...(Number(currentWilayaCode) !== Number(sourceWilayaCode)
      ? { source_wilaya_code: sourceWilayaCode }
      : {}),
    commune_fr: c.name_fr ?? null,
    commune_ar: c.name_ar ?? null,
    wilaya_code: currentWilayaCode,
    wilaya_fr: w.name_fr ?? null,
    wilaya_ar: w.name_ar ?? null,
    lat: num(o.gps?.lat),
    lng: num(o.gps?.lng),
  };
}

export function normAtm(a) {
  const record = {
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
  return { ...record, ...reconcileCurrentWilayaByCommune(record) };
}

// --- main ------------------------------------------------------------------
async function main() {
  const OFFLINE = process.argv.includes("--cache");
  const cfg = MIGRATIONS.poste;
  const mapOf = (f) => cfg.files.find((s) => s.file === f).map;

  // Military locations leave the package before anything else sees them, and each
  // id they leave behind joins the reserved set, on a live run and on a replay
  // alike, so the ledger states the same thing whichever one applied the removal.
  const retiredIds = readRetiredIds(OUT_DIR);
  const withoutMilitary = (rows, file) => {
    const drop = MILITARY_IDS[file];
    const kept = [];
    for (const r of rows) {
      if (drop.has(String(r.id))) retiredIds.add(String(r.id));
      else kept.push(r);
    }
    if (kept.length !== rows.length) {
      console.log(`  military: ${rows.length - kept.length} ${file} record(s) excluded`);
    }
    return kept;
  };

  // v2 rows for each file. A live run maps the raw provider payload; a replay
  // reads the committed records, which are v2 already.
  let offices;
  let atms;
  if (OFFLINE) {
    console.log("Replaying the committed records (no network)…");
    offices = withoutMilitary(readCommitted(OUT_DIR, "postoffices.json"), "postoffices.json");
    atms = withoutMilitary(readCommitted(OUT_DIR, "atms.json"), "atms.json");
  } else {
    console.log("Fetching post offices…");
    offices = withoutMilitary(
      (await getJSON("/postoffices")).map(normPostOffice).map(mapOf("postoffices.json")),
      "postoffices.json",
    );
    console.log("Fetching ATMs…");
    atms = withoutMilitary(
      (await getJSON("/atms")).map(normAtm).map(mapOf("atms.json")),
      "atms.json",
    );
  }
  placeAtHostOffice(atms, offices);
  console.log(`  ${offices.length} post offices`);
  console.log(`  ${atms.length} ATMs`);

  // Emit v2 via the shared writer to BOTH the package tree and the dataset
  // mirror, so the two stay byte-identical. A live run stamps its own date; a
  // replay reuses the committed one, because it asked the upstream nothing.
  // Fresh rows per destination: writePackageV2 sorts/demotes in place.
  const { updated, retrieved } = resolveDates(OUT_DIR, OFFLINE);
  for (const dir of [OUT_DIR, MIRROR_DIR]) {
    writePackageV2({
      pkg: "poste",
      dir,
      files: [
        { file: "postoffices.json", rows: structuredClone(offices) },
        { file: "atms.json", rows: structuredClone(atms) },
      ],
      meta: cfg.meta,
      updated,
      retrieved,
      retiredIds,
    });
  }
  console.log(`Wrote ${offices.length} post offices + ${atms.length} ATMs → v2 (package + dataset mirror).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
