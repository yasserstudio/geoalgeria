// Transform SOGRAL raw agencies (live.sogral.com/api/live/agencies) into a clean,
// documented local dataset. High-confidence fields are promoted to named keys;
// uncertain operational metrics / amenity flags are grouped and preserved verbatim.
// Local research artifact only — not a published package.
import { readFileSync, writeFileSync } from "node:fs";

const IN = "/Volumes/Work/algeria/geoalgeria-data/research/gares-routieres/sogral-agencies-raw.json";
const OUT = "/Volumes/Work/algeria/geoalgeria-data/research/gares-routieres/sogral-stations-clean.json";

const raw = JSON.parse(readFileSync(IN, "utf8"));

const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : null);
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
// "13000M²" / "8000 M²" / "17000 M²" -> 13000
const surface = (v) => {
  const s = str(v);
  if (!s) return null;
  const m = s.replace(/\s/g, "").match(/(\d[\d.,]*)/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};
const isoDate = (v) => {
  const s = str(v);
  return s ? s.slice(0, 10) : null; // "1994-08-16T00:00:00" -> "1994-08-16"
};
const validCoord = (la, ln) =>
  la != null && ln != null && la >= 18 && la <= 38 && ln >= -9 && ln <= 12;

// Numeric operational metrics (labels partially known: quais/guichets/boutiques/
// bureaux/taxi bays/daily departures/daily passengers). Kept raw, documented in SOURCE.md.
const METRIC_KEYS = ["P11","P12","P13","P14","P15","P16","P17","P18","P19","P20","P21","P22","P25"];
// Boolean amenity/facility flags (exact per-index labels unconfirmed). Kept raw.
const FLAG_KEYS = Array.from({ length: 20 }, (_, i) => "P" + (28 + i)); // P28..P47 range (contacts P46/P47 excluded below)
const CONTACT_KEYS = new Set(["P46", "P47"]);

const clean = raw.map((r) => {
  const la = num(r.P26), ln = num(r.P27);
  const coordsOk = validCoord(la, ln);
  const flags = [];
  if (la == null && ln == null) flags.push("coords_missing");
  else if (!coordsOk) flags.push("coords_invalid");

  const metrics = {};
  for (const k of METRIC_KEYS) if (num(r[k]) != null) metrics[k] = r[k];
  // guard against dirty negatives
  for (const k of Object.keys(metrics)) if (metrics[k] < 0) flags.push(`${k}_negative`);

  const amenities = {};
  for (const k of FLAG_KEYS) if (!CONTACT_KEYS.has(k) && r[k] === true) amenities[k] = true;

  return {
    id: num(r.P1),
    sogral_code: str(r.P84),                 // 213-000{wilaya}{commune}
    name: str(r.P2) || str(r.P90),           // station display name (distinguishes multi-station cities)
    city: str(r.P90),                        // city name (uppercase); not unique
    official_name: str(r.P3),                // official gare name
    address: str(r.P4),
    wilaya_code: r.P8 != null ? String(r.P8).padStart(2, "0") : null, // SOGRAL legacy 48-wilaya code
    wilaya_name: str(r.P91),                 // parent wilaya, accented
    lat: coordsOk ? la : null,
    lng: coordsOk ? ln : null,
    geo_precision: coordsOk ? "exact" : null, // exact lat/lng from SOGRAL
    surface_total_m2: surface(r.P9),
    surface_built_m2: surface(r.P10),
    dates: { p23: isoDate(r.P23), p24: isoDate(r.P24) }, // creation / commissioning (order inconsistent)
    metrics,                                  // SOGRAL operational counts (see SOURCE.md dictionary)
    amenities,                                // boolean facility flags (labels TBD)
    contacts: {
      administrative: str(r.P46),
      emergency: str(r.P47),
    },
    data_flags: flags,
    source: "https://live.sogral.com/api/live/agencies",
  };
}).sort((a, b) => (a.wilaya_code || "").localeCompare(b.wilaya_code || "") || (a.id - b.id));

writeFileSync(OUT, JSON.stringify(clean, null, 2) + "\n");

// summary
const wil = new Set(clean.map((r) => r.wilaya_code));
const withCoords = clean.filter((r) => r.lat != null).length;
const flagged = clean.filter((r) => r.data_flags.length);
console.log(`wrote ${clean.length} clean stations -> ${OUT}`);
console.log(`wilayas covered: ${wil.size} | with valid coords: ${withCoords}/${clean.length}`);
console.log(`surface_total present: ${clean.filter(r=>r.surface_total_m2!=null).length} | built: ${clean.filter(r=>r.surface_built_m2!=null).length}`);
console.log(`flagged records (${flagged.length}):`);
for (const r of flagged) console.log(`  ${r.name} (w${r.wilaya_code}): ${r.data_flags.join(", ")}`);
console.log("\nsample record (Alger):");
console.log(JSON.stringify(clean.find((r) => r.city === "ALGER"), null, 2));
