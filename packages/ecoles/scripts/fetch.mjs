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
// True only for actual Arabic *letters* — excludes combining marks/punctuation,
// so a Latin string carrying a stray harakat (e.g. "ُÉcole") is not "Arabic".
const isArabic = (s) => typeof s === "string" && /[ء-يٱ-ۓۺ-ۿ]/.test(s);
// Clean a raw OSM name: collapse whitespace, drop stray leading combining marks
// (a common mis-tag), and reject strings with no letter at all.
const LEAD_MARKS = /^[̀-ͯؐ-ًؚ-ٰٟۖ-ۭ]+/;
const cleanName = (v) => {
  if (typeof v !== "string") return null;
  const x = v.replace(/\s+/g, " ").trim().replace(LEAD_MARKS, "").trim();
  // require ≥2 chars and at least one letter (rejects a lone "ب", "-", "12")
  return x.length >= 2 && /[A-Za-zء-يٱ-ۿ]/.test(x) ? x : null;
};
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

// Establishment kind — WHAT the "école" is, orthogonal to its cycle. Most
// records are "regular"; the rest are special-purpose places OSM files under
// amenity=school but that aren't part of the K-12 ladder. The non-regular kinds
// carry cycle "autre" (langues/coranique/conduite/formation) or keep their
// cycle (special).
const KIND_LABELS = {
  regular: { fr: "École ordinaire", ar: "مدرسة عادية" },
  langues: { fr: "École / institut de langues", ar: "مدرسة أو معهد لغات" },
  coranique: { fr: "École coranique", ar: "مدرسة قرآنية" },
  conduite: { fr: "Auto-école", ar: "مدرسة تعليم السياقة" },
  formation: { fr: "Centre de formation", ar: "مركز تكوين" },
  special: { fr: "École spécialisée (besoins spécifiques)", ar: "مدرسة للتربية الخاصة" },
};
const NON_K12_KINDS = new Set(["langues", "coranique", "conduite", "formation"]);

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

// Names, normalized and joined — the match form both classifiers work over.
function nameHay(t) {
  return normalizeName(
    [
      t.name, t["name:fr"], t["name:ar"], t["name:en"], t["name:ber"], t["name:kab"],
      t.official_name, t["official_name:fr"], t["official_name:ar"], t.alt_name,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

// Classify the establishment kind from the FR+AR name. Order: most-specific
// special-purpose kinds first; everything else is "regular".
function classifyKind(t, amenity) {
  const hay = nameHay(t);
  // Driving schools. "السياقة" = driving.
  if (/auto[- ]?ecole|driving school|تعليم السياقة|مدرسة السياقة|السياقة/.test(hay)) return "conduite";
  // Quranic schools — precise forms only (قرآنية→قرانية, القرآن→القران, coranique,
  // تحفيظ); avoid bare قران, a substring of the surname المقراني / El Mokrani.
  if (/coraniqu|قرانية|القران|قرءان|تحفيظ/.test(hay)) return "coranique";
  // Vocational / training centres (belong to @geoalgeria/formation-professionnelle).
  if (/\bformation\b|de formation|\bcfpa\b|\binsfp\b|تكوين/.test(hay)) return "formation";
  // Language institutes.
  if (/\blangues?\b|\blanguages?\b|لغات|انجليزية|français langue|\bfle\b|berlitz|linguistic|معهد.{0,6}لغ/.test(hay)) return "langues";
  // Special-needs / adapted schools (kept as real schools — they keep a cycle).
  if (/sourd|aveugle|handicap|besoins spec|inadapt|autist|deaf|blind|الصم|المكفوفين|المعاقين|ذوي الاحتياجات|تربية خاصة/.test(hay)) return "special";
  return "regular";
}

// Classify the school cycle from amenity, kind, isced:level, and the FR+AR name.
function classifyCycle(t, amenity, kind) {
  if (amenity === "kindergarten") return "prescolaire";
  // Non-K12 kinds don't map to a school cycle.
  if (NON_K12_KINDS.has(kind)) return "autre";
  const hay = nameHay(t);

  // Explicit cycle words win, most-specific first. (hay is accent-folded, so
  // French patterns are written without diacritics.)
  if (/maternelle|presco|prescol|kindergarten|nursery|روضة|رياض اطفال|تحضير/.test(hay)) return "prescolaire";
  if (/lycee|secondaire|secondary school|high school|technicum|ثانوي/.test(hay)) return "secondaire";
  if (/\bc\.?\s?e\.?\s?m\b|college|enseignement moyen|moyenne|middle school|متوسط|اكمالي/.test(hay)) return "moyen";
  // Higher-ed strays that occasionally carry amenity=school. Use the
  // definite/teh-marbuta forms (جامعة "university", العليا "higher") so bare
  // substrings in surnames/toponyms (e.g. عليان, or جامع "mosque") don't leak in.
  if (/universit|superieur|جامعة|العليا|professionnelle/.test(hay)) return "autre";
  // "ابتداي" not "ابتدائ": normalizeName runs Unicode NFD, which decomposes the
  // hamza-carrier ئ into ي + combining hamza; the mark is then stripped, so
  // "ابتدائية" normalizes to "ابتدايية". Match the folded stem (both forms, defensively).
  if (/primaire|primary school|ابتدائ|ابتداي/.test(hay)) return "primaire";

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

// A single-line address from OSM addr:* tags, or null when none are present.
function parseAddress(t) {
  const line1 = [str(t["addr:housenumber"]), str(t["addr:street"]) || str(t["addr:place"])]
    .filter(Boolean)
    .join(" ");
  const line2 = [str(t["addr:city"]), str(t["addr:postcode"])].filter(Boolean).join(" ");
  const parts = [line1, line2].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

// Normalize OSM isced:level into a sorted ";"-joined level list ("0-1" → "0;1",
// "primary" → "1", "1;2;3" → "1;2;3"), or null. ISCED 0–3 = pré/primaire/moyen/
// secondaire; higher levels are kept as-is up to 8.
const ISCED_WORDS = { kindergarten: 0, preschool: 0, primary: 1, elementary: 1, middle: 2, lower_secondary: 2, secondary: 3, upper_secondary: 3 };
function parseIscedLevels(t) {
  const raw = str(t["isced:level"]);
  if (!raw) return null;
  const low = raw.toLowerCase();
  const levels = new Set();
  for (const [word, lvl] of Object.entries(ISCED_WORDS)) if (low.includes(word)) levels.add(lvl);
  const range = low.match(/(\d+)\s*-\s*(\d+)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) levels.add(i);
  } else {
    for (const n of low.match(/\d+/g) || []) levels.add(Number(n));
  }
  const out = [...levels].filter((n) => n >= 0 && n <= 8).sort((a, b) => a - b);
  return out.length ? out.join(";") : null;
}

function normOSM(elements) {
  const rows = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!inAlgeria(lat, lng)) continue;
    const t = el.tags || {};
    const amenity = t.amenity;
    const rawName = cleanName(t.name);
    const tagFr = cleanName(t["name:fr"]);
    const tagAr = cleanName(t["name:ar"]);
    // Route strictly by script so name_ar is always Arabic and name_fr always
    // Latin, even when OSM mis-tags them (a Latin string in name:ar, or vice
    // versa). Prefer the dedicated tag, then the raw name, then a mis-tagged one.
    const nameAr = (tagAr && isArabic(tagAr)) ? tagAr
      : (rawName && isArabic(rawName)) ? rawName
      : (tagFr && isArabic(tagFr)) ? tagFr
      : null;
    const nameFr = (tagFr && !isArabic(tagFr)) ? tagFr
      : (rawName && !isArabic(rawName)) ? rawName
      : (tagAr && !isArabic(tagAr)) ? tagAr
      : null;
    const kind = classifyKind(t, amenity);
    const cycle = classifyCycle(t, amenity, kind);
    rows.push({
      source: "osm",
      osm_id: `${el.type}/${el.id}`,
      name: rawName || nameFr || nameAr,
      name_ar: nameAr,
      name_fr: nameFr,
      cycle,
      cycle_label_fr: CYCLE_LABELS[cycle].fr,
      cycle_label_ar: CYCLE_LABELS[cycle].ar,
      kind,
      kind_label_fr: KIND_LABELS[kind].fr,
      kind_label_ar: KIND_LABELS[kind].ar,
      isced_levels: parseIscedLevels(t),
      sector: classifySector(t),
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      // node = surveyed point; way/relation = building centroid from `out center`.
      geo_precision: el.type === "node" ? "osm_node" : "osm_centroid",
      address: parseAddress(t),
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

  // Second pass: collapse records at the exact same point (a school mapped twice
  // — e.g. a node and a building, or two spellings — that the name pass missed
  // because the names differ or one is unnamed). Keep the richest record.
  const richness = (r) => (r.name ? 1 : 0) + (r.name_ar ? 1 : 0) + (r.name_fr ? 1 : 0);
  const byPoint = new Map();
  const order = [];
  for (const r of kept) {
    const pk = `${r.lat},${r.lng}`;
    const prev = byPoint.get(pk);
    if (!prev) { byPoint.set(pk, r); order.push(pk); }
    else if (richness(r) > richness(prev)) byPoint.set(pk, r);
  }
  const deduped = order.map((pk) => byPoint.get(pk));
  const removed = kept.length - deduped.length;
  if (removed) console.log(`  OSM coord de-dup: ${removed} exact-coincident record(s)`);
  return deduped;
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
    "cycle", "cycle_label_fr", "cycle_label_ar", "kind", "kind_label_fr", "kind_label_ar",
    "isced_levels", "sector",
    "wilaya", "wilaya_ar", "wilaya_code", "commune", "commune_code", "address",
    "lat", "lng", "geo_precision",
  ];
  rows.sort((a, b) => a.id.localeCompare(b.id));

  const CYCLES = ["primaire", "moyen", "secondaire", "prescolaire", "autre"];
  const KINDS = ["regular", "langues", "coranique", "conduite", "formation", "special"];
  const by_cycle = Object.fromEntries(CYCLES.map((c) => [c, rows.filter((r) => r.cycle === c).length]));
  const by_kind = Object.fromEntries(KINDS.map((k) => [k, rows.filter((r) => r.kind === k).length]));
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
    by_kind,
    by_sector,
    with_address: rows.filter((r) => r.address).length,
    with_isced: rows.filter((r) => r.isced_levels).length,
    wilayas_covered: new Set(rows.map((r) => r.wilaya_code).filter(Boolean)).size,
    ecoles_geocoded: rows.filter((r) => r.lat != null).length,
    official_total: OFFICIAL_TOTAL,
    coverage_note:
      `${rows.length} schools compiled from OpenStreetMap, against the ~${OFFICIAL_TOTAL} establishments in Algeria's national school network (primaire + moyen + secondaire, Ministry of National Education, approximate). A community-maintained extract, not an official registry — coverage is partial and uneven by wilaya.`,
    cycle_note:
      "Cycle is inferred from isced:level and the French/Arabic name (CEM→moyen, lycée→secondaire, maternelle/روضة→préscolaire); a bare \"école\"/\"مدرسة\" with no cycle word is classified primaire per Algerian convention, and anything unresolved is \"autre\".",
    kind_note:
      "Kind is the establishment type, orthogonal to cycle: most are \"regular\"; \"langues\"/\"coranique\"/\"conduite\"/\"formation\" are special-purpose places OSM files under amenity=school but that sit outside the K-12 ladder (they carry cycle \"autre\"); \"special\" are adapted/special-needs schools (which keep a cycle).",
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
  console.log(
    `  kinds: ` + KINDS.filter((k) => by_kind[k]).map((k) => `${by_kind[k]} ${k}`).join(", ") +
      ` | ${metadata.with_address} with address, ${metadata.with_isced} with isced_levels.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
