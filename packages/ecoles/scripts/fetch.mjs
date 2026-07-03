#!/usr/bin/env node
/**
 * Build Algeria's schools dataset from OpenStreetMap and emit JSON, CSV, and
 * GeoJSON to ../data. The raw source pull is cached under research/ecoles/.
 *
 * Source:
 *   - OpenStreetMap (ODbL): amenity=school + amenity=kindergarten in Algeria.
 *     Wikidata carries only ~17 geocoded Algerian schools, so — unlike mosquees
 *     — there is no Wikidata base; OSM is the sole source, with honest coverage
 *     framing (~11.6k mapped against the ~28k of the national school network).
 *
 * Cycle: Algeria's school system is primaire (école primaire) → moyen (CEM,
 * collège d'enseignement moyen) → secondaire (lycée), plus préscolaire
 * (maternelle / روضة). Each record is classified from `isced:level` and the
 * French + Arabic name. A CEM always carries متوسطة/collège and a lycée always
 * carries ثانوية/lycée; a bare "école"/"مدرسة" with no cycle word is, by
 * Algerian convention, a primary school (المدرسة الابتدائية) — classified
 * `primaire` at lowest priority. Anything still unresolved is `autre`.
 *
 * Sector: "private" when `operator:type=private` or the name carries privé/خاص;
 * "public" when `operator:type` says so; otherwise null (unknown — most schools
 * are public, but this leaves it honest rather than assumed).
 *
 * OSM carries no commune/wilaya codes, so administrative linkage is attached by
 * nearest-centroid join against the flagship geoalgeria commune set (wilaya
 * effectively exact; commune best-effort).
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const RESEARCH_DIR = join(REPO_ROOT, "research", "ecoles");
// Approximate size of the national school network (primaire + moyen +
// secondaire) per the Ministry of National Education, for honest coverage
// framing. Deliberately round — it is a reference order-of-magnitude, not a
// claim of an exact registry.
const OFFICIAL_TOTAL = 28000;
// Sanity floor: a truncated upstream response parses fine and would otherwise be
// silently accepted as the whole dataset. Algeria has ~11.6k schools in OSM;
// reject anything grossly below that and fall through to the next endpoint.
const OSM_MIN = 4000;
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const MAX_BYTES = 128 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEG = Math.PI / 180;
const M_PER_DEG = 111_320;

// --- generic HTTP ----------------------------------------------------------
const MAX_REDIRECTS = 5;
// Only follow https + same-host redirects (SSRF guard); cap depth so a redirect
// loop can't recurse unbounded.
function safeRedirect(location, fromUrl) {
  const next = new URL(location, fromUrl);
  if (next.protocol !== "https:" || next.hostname !== new URL(fromUrl).hostname) {
    throw new Error(`refusing cross-host/insecure redirect to ${next.href}`);
  }
  return next.href;
}

function httpRequest(url, { method = "GET", headers = {}, body = null, depth = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, { method, headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        if (depth >= MAX_REDIRECTS) return reject(new Error(`${url} -> too many redirects`));
        try {
          return resolve(httpRequest(safeRedirect(res.headers.location, url), { method, headers, body, depth: depth + 1 }));
        } catch (e) {
          return reject(e);
        }
      }
      res.setEncoding("utf8");
      let data = "";
      res.on("data", (c) => {
        data += c;
        if (data.length > MAX_BYTES) {
          res.destroy();
          reject(new Error(`${url} -> response exceeds ${MAX_BYTES} bytes`));
        }
      });
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(300_000, () => req.destroy(new Error(`${url} -> timed out`)));
    if (body) req.write(body);
    req.end();
  });
}

// --- OpenStreetMap (sole source) -------------------------------------------
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const OSM_QUERY = `[out:json][timeout:300];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  node["amenity"="school"](area.dz);
  way["amenity"="school"](area.dz);
  relation["amenity"="school"](area.dz);
  node["amenity"="kindergarten"](area.dz);
  way["amenity"="kindergarten"](area.dz);
  relation["amenity"="kindergarten"](area.dz);
);
out center tags;`;

async function fetchOSM() {
  const body = "data=" + encodeURIComponent(OSM_QUERY);
  for (const ep of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Querying Overpass: ${ep} (attempt ${attempt + 1})…`);
        const { status, body: out } = await httpRequest(ep, {
          method: "POST",
          headers: {
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(body),
            Accept: "application/json",
          },
          body,
        });
        if (status !== 200) {
          console.warn(`  HTTP ${status}; trying next…`);
          await sleep(4000 + attempt * 5000);
          continue;
        }
        const json = JSON.parse(out);
        if (Array.isArray(json.elements) && json.elements.length >= OSM_MIN) {
          mkdirSync(RESEARCH_DIR, { recursive: true });
          writeFileSync(join(RESEARCH_DIR, "osm-raw.json"), JSON.stringify(json) + "\n");
          return json.elements;
        }
        console.warn(`  only ${json.elements?.length ?? 0} elements (< ${OSM_MIN}); treating as partial, trying next…`);
      } catch (e) {
        console.warn(`  err: ${e.message}; trying next…`);
        await sleep(4000 + attempt * 5000);
      }
    }
  }
  throw new Error("Overpass unavailable on every endpoint — OSM is the sole source, so aborting rather than writing a partial dataset");
}

// --- helpers ---------------------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null);
const isArabic = (s) => typeof s === "string" && /[؀-ۿ]/.test(s);
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// Canonical labels per cycle.
const CYCLE_LABELS = {
  primaire: { fr: "École primaire", ar: "مدرسة ابتدائية" },
  moyen: { fr: "Collège d'enseignement moyen (CEM)", ar: "متوسطة" },
  secondaire: { fr: "Lycée", ar: "ثانوية" },
  prescolaire: { fr: "Préscolaire / maternelle", ar: "روضة / تعليم تحضيري" },
  autre: { fr: "École (cycle non précisé)", ar: "مدرسة (المستوى غير محدّد)" },
};

// Fold Latin diacritics (é→e) via NFD so ASCII word boundaries match accented
// French ("École" → "ecole"); é is not a \w char, so `\bécole\b` never fires.
const stripLatinAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
// Fold Arabic hamza/alef/ya/tatweel variants and all combining marks so name
// matching is robust (إبتدائية / الابتدائية / ابتدائيّة reduce to one stem).
function normalizeArabic(s) {
  return s
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ى/g, "ي") // alef maqsura ى → ي
    .replace(/ـ/g, "") // tatweel ـ
    .replace(/[ؐ-ًؚ-ٰٟ]/g, ""); // harakat, hamza above/below, superscript alef
}
// Lower-case + strip Latin accents + fold Arabic — the canonical match form.
const normalizeName = (s) => normalizeArabic(stripLatinAccents(s.toLowerCase()));

// Classify the school cycle from amenity, isced:level, and the FR+AR name.
function classifyCycle(t, amenity) {
  if (amenity === "kindergarten") return "prescolaire";
  const hay = normalizeName(
    [
      t.name, t["name:fr"], t["name:ar"], t["name:en"], t["name:ber"], t["name:kab"],
      t.official_name, t["official_name:fr"], t["official_name:ar"], t.alt_name,
    ]
      .filter(Boolean)
      .join(" "),
  );

  // Explicit cycle words win, most-specific first. (hay is accent-folded, so
  // French patterns are written without diacritics.)
  if (/maternelle|presco|prescol|kindergarten|nursery|روضة|رياض اطفال|تحضير/.test(hay)) return "prescolaire";
  if (/lycee|secondaire|secondary school|high school|technicum|ثانوي/.test(hay)) return "secondaire";
  if (/\bc\.?\s?e\.?\s?m\b|college|enseignement moyen|moyenne|middle school|متوسط|اكمالي/.test(hay)) return "moyen";
  // Higher-ed / vocational strays that occasionally carry amenity=school. Use
  // the definite/teh-marbuta forms (جامعة "university", العليا "higher") so bare
  // substrings in surnames/toponyms (e.g. عليان, or جامع "mosque") don't leak in.
  if (/universit|superieur|جامعة|العليا|التكوين المهني|professionnelle/.test(hay)) return "autre";
  if (/primaire|primary school|ابتدائ/.test(hay)) return "primaire";

  // isced:level is authoritative when present (values like "1", "1;2", "0;1;2;3").
  const isced = str(t["isced:level"]);
  if (isced) {
    if (/(^|[^0-9])0([^0-9]|$)/.test(isced)) return "prescolaire";
    if (/(^|[^0-9])1([^0-9]|$)/.test(isced)) return "primaire";
    if (/(^|[^0-9])2([^0-9]|$)/.test(isced)) return "moyen";
    if (/(^|[^0-9])3([^0-9]|$)/.test(isced)) return "secondaire";
  }

  // Algerian convention: a bare "école" / "مدرسة" with no cycle qualifier is a
  // primary school; CEM and lycées always name themselves. Lowest priority.
  // (hay is accent-folded + Arabic-normalized, so "école"→"ecole" and مدرسة
  // matches all its hamza/alef variants.)
  if (/\becole\b|مدرسة|groupe scolaire|مجموعة مدرسية/.test(hay)) return "primaire";

  return "autre";
}

// Ownership sector. Only asserted from an explicit signal; null when unknown.
function classifySector(t) {
  const op = (t["operator:type"] || "").toLowerCase();
  if (/private/.test(op)) return "private";
  if (/public|government|state/.test(op)) return "public";
  const hay = normalizeName(
    [t.name, t["name:fr"], t["name:ar"], t.operator, t["operator:ar"]].filter(Boolean).join(" "),
  );
  if (/\bprivee?\b|private|الخاص|خاصة/.test(hay)) return "private";
  return null;
}

function normOSM(elements) {
  const rows = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!inAlgeria(lat, lng)) continue;
    const t = el.tags || {};
    const amenity = t.amenity;
    const rawName = str(t.name);
    const nameAr = str(t["name:ar"]) || (isArabic(rawName) ? rawName : null);
    const nameFr = str(t["name:fr"]) || (rawName && !isArabic(rawName) ? rawName : null);
    const cycle = classifyCycle(t, amenity);
    rows.push({
      source: "osm",
      osm_id: `${el.type}/${el.id}`,
      name: rawName || nameFr || nameAr,
      name_ar: nameAr,
      name_fr: nameFr,
      cycle,
      cycle_label_fr: CYCLE_LABELS[cycle].fr,
      cycle_label_ar: CYCLE_LABELS[cycle].ar,
      sector: classifySector(t),
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      // node = surveyed point; way/relation = building centroid from `out center`.
      geo_precision: el.type === "node" ? "osm_node" : "osm_centroid",
    });
  }
  // Conservative internal de-dup: identical non-empty name within ~40 m (the
  // same school mapped as both a node and a building outline).
  const kept = [];
  let dropped = 0;
  for (const r of rows) {
    if (!r.name) { kept.push(r); continue; }
    const key = r.name.trim().toLowerCase();
    const cosLat = Math.cos(r.lat * DEG);
    const dup = kept.some((k) => {
      if (!k.name || k.name.trim().toLowerCase() !== key) return false;
      const dx = (k.lng - r.lng) * cosLat * M_PER_DEG;
      const dy = (k.lat - r.lat) * M_PER_DEG;
      return dx * dx + dy * dy <= 40 * 40;
    });
    if (dup) dropped++;
    else kept.push(r);
  }
  if (dropped) console.log(`  OSM internal de-dup: ${dropped} same-name-within-40m record(s)`);
  return kept;
}

// --- commune centroids + wilaya names (flagship geoalgeria) ----------------
function loadCommunes() {
  const wilayas = JSON.parse(
    readFileSync(join(REPO_ROOT, "packages", "dataset", "data", "algeria.json"), "utf-8"),
  );
  const communes = [];
  for (const w of wilayas) {
    for (const c of w.communes || []) {
      if (Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
        communes.push({
          wilaya_code: c.wilaya_code,
          wilaya_fr: w.name_fr,
          wilaya_ar: w.name_ar,
          commune_fr: c.name_fr,
          code_commune: c.code_commune,
          lat: c.latitude,
          lng: c.longitude,
        });
      }
    }
  }
  if (!communes.length) throw new Error("no commune centroids loaded — check packages/dataset/data/algeria.json");
  return communes;
}

function attachCommune(rows, communes) {
  for (const r of rows) {
    let best = null;
    let bestD = Infinity;
    const cosLat = Math.cos(r.lat * DEG);
    for (const c of communes) {
      const dx = (c.lng - r.lng) * cosLat;
      const dy = c.lat - r.lat;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c; }
    }
    r.wilaya_code = wcode(best.wilaya_code);
    r.wilaya = best.wilaya_fr;
    r.wilaya_ar = best.wilaya_ar;
    r.commune = best.commune_fr;
    r.commune_code = best.code_commune;
  }
}

// Stable id `{wilaya_code}-{seq}`, seq ordered by osm_id so re-fetches are
// deterministic and ids stay put even if cycle logic is later refined.
function assignIds(rows) {
  const byWilaya = new Map();
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    if (!byWilaya.has(w)) byWilaya.set(w, []);
    byWilaya.get(w).push(r);
  }
  for (const [w, list] of byWilaya) {
    list.sort((a, b) => a.osm_id.localeCompare(b.osm_id));
    list.forEach((r, i) => {
      r.id = `${w}-${String(i + 1).padStart(5, "0")}`;
    });
  }
}

// --- writers ---------------------------------------------------------------
function toCSV(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}
function toGeoJSON(rows) {
  return {
    type: "FeatureCollection",
    features: rows
      .filter((r) => r.lat != null && r.lng != null)
      .map((r) => {
        const { lat, lng, ...props } = r;
        return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: props };
      }),
  };
}
const writeJSON = (p, obj) => writeFileSync(join(OUT_DIR, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(OUT_DIR, p), txt);

// --- main ------------------------------------------------------------------
async function main() {
  const osmRaw = await fetchOSM();
  let rows = normOSM(osmRaw);
  console.log(`  OSM: ${rows.length} geocoded schools`);

  const communes = loadCommunes();
  console.log(`  ${communes.length} commune centroids loaded`);
  attachCommune(rows, communes);

  rows = rows.filter((r) => r.wilaya_code); // drop anything that failed the commune join (should be none)
  assignIds(rows);

  // field order: id first, coords last (geo_precision after so CSV reads well)
  const cols = [
    "id", "source", "osm_id", "name", "name_ar", "name_fr",
    "cycle", "cycle_label_fr", "cycle_label_ar", "sector",
    "wilaya", "wilaya_ar", "wilaya_code", "commune", "commune_code",
    "lat", "lng", "geo_precision",
  ];
  rows.sort((a, b) => a.id.localeCompare(b.id));

  const CYCLES = ["primaire", "moyen", "secondaire", "prescolaire", "autre"];
  const by_cycle = Object.fromEntries(CYCLES.map((c) => [c, rows.filter((r) => r.cycle === c).length]));
  const named = rows.filter((r) => r.name).length;
  const by_sector = {
    public: rows.filter((r) => r.sector === "public").length,
    private: rows.filter((r) => r.sector === "private").length,
    unknown: rows.filter((r) => r.sector == null).length,
  };
  const metadata = {
    source: "OpenStreetMap (ODbL) — schools (amenity=school) and kindergartens (amenity=kindergarten) in Algeria",
    origin: "https://www.openstreetmap.org",
    license:
      "OpenStreetMap data is © OpenStreetMap contributors, ODbL 1.0. See README for attribution.",
    ecoles: rows.length,
    named,
    by_cycle,
    by_sector,
    wilayas_covered: new Set(rows.map((r) => r.wilaya_code).filter(Boolean)).size,
    ecoles_geocoded: rows.filter((r) => r.lat != null).length,
    official_total: OFFICIAL_TOTAL,
    coverage_note:
      `${rows.length} schools compiled from OpenStreetMap, against the ~${OFFICIAL_TOTAL} establishments in Algeria's national school network (primaire + moyen + secondaire, Ministry of National Education, approximate). A community-maintained extract, not an official registry — coverage is partial and uneven by wilaya.`,
    cycle_note:
      "Cycle is inferred from isced:level and the French/Arabic name (CEM→moyen, lycée→secondaire, maternelle/روضة→préscolaire); a bare \"école\"/\"مدرسة\" with no cycle word is classified primaire per Algerian convention, and anything unresolved is \"autre\".",
    linkage_note:
      "Commune/wilaya linkage is derived by nearest-centroid join against the geoalgeria commune set; wilaya is effectively exact, commune is best-effort.",
    generated_at: new Date().toISOString().slice(0, 10),
  };

  mkdirSync(join(OUT_DIR, "csv"), { recursive: true });
  mkdirSync(join(OUT_DIR, "geojson"), { recursive: true });
  writeJSON("ecoles.json", rows);
  writeText("csv/ecoles.csv", toCSV(rows, cols));
  writeJSON("geojson/ecoles.geojson", toGeoJSON(rows));
  writeJSON("metadata.json", metadata);
  console.log(
    `Wrote ${rows.length} schools (${named} named, ${metadata.wilayas_covered} wilayas) — ` +
      CYCLES.map((c) => `${by_cycle[c]} ${c}`).join(", ") + ".",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
