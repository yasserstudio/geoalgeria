#!/usr/bin/env node
/**
 * Build Algeria's schools dataset from OpenStreetMap and emit JSON, CSV, and
 * GeoJSON to ../data. The raw source pull is captured to sources/ecoles/.
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
 * point-in-polygon for the wilaya, then nearest-centroid join within that wilaya
 * for the commune (wilaya effectively exact; commune best-effort).
 *
 * Usage: node scripts/fetch.mjs            # live pull
 *        node scripts/fetch.mjs --cache    # rebuild from sources/ecoles/osm.json
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";
import { MIGRATIONS, writePackageV2, resolveDates, carryOverIds, readCommitted, readRetiredIds } from "../../../scripts/lib/v2-transforms.mjs";
import { attachCommune, loadCommunes } from "../../../scripts/lib/build-utils.mjs";
import { writeCapture, readCapture } from "../../../scripts/lib/source-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
// The coverage denominator lives with the rest of the package metadata in
// scripts/lib/v2-transforms.mjs (MIGRATIONS.ecoles.meta.estimatedUniverse):
// 29,702 institutions per the Ministry of National Education's own aggregate.
// Sanity floor: a truncated upstream response parses fine and would otherwise be
// silently accepted as the whole dataset. Algeria has ~11.6k schools in OSM;
// reject anything grossly below that and fall through to the next endpoint.
const OSM_MIN = 4000;
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const MAX_BYTES = 128 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DEG = Math.PI / 180;
const M_PER_DEG = 111_320;

// OSM occasionally replaces a building way with a relation at the same place.
// Those are representation migrations, not new schools: keep the public id and
// the richer descriptive fields we already published while updating refs.osm to
// the current primitive. Keep this list explicit so coordinate coincidence can
// never merge unrelated nearby schools.
const OSM_REF_MIGRATIONS = new Map([
  ["relation/9109456", {
    previousRef: "way/655239149",
    id: "16-01241",
    published: {
      name: null, name_fr: null, name_ar: null,
      cycle: "autre", cycle_label_fr: "École (cycle non précisé)", cycle_label_ar: "مدرسة (المستوى غير محدّد)",
      kind: "regular", kind_label_fr: "École ordinaire", kind_label_ar: "مدرسة عادية",
      isced_levels: null, sector: null, address: null,
    },
  }],
  ["relation/5553815", {
    previousRef: "way/374162879",
    id: "44-00236",
    published: {
      name: "Ecole Primaire 1er November", name_fr: "Ecole Primaire 1er November", name_ar: "المدرسة الإبتدائية 1 نوفمبر 1954",
      cycle: "primaire", cycle_label_fr: "École primaire", cycle_label_ar: "مدرسة ابتدائية",
      kind: "regular", kind_label_fr: "École ordinaire", kind_label_ar: "مدرسة عادية",
      isced_levels: null, sector: null, address: null,
    },
  }],
  ["relation/5553817", {
    previousRef: "way/374162880",
    id: "44-00237",
    published: {
      name: "Ecole primaire Snouci Abdelkader", name_fr: "Ecole primaire Snouci Abdelkader", name_ar: null,
      cycle: "primaire", cycle_label_fr: "École primaire", cycle_label_ar: "مدرسة ابتدائية",
      kind: "regular", kind_label_fr: "École ordinaire", kind_label_ar: "مدرسة عادية",
      isced_levels: null, sector: null, address: "44000",
    },
  }],
  ["relation/5548568", {
    previousRef: "way/458573013",
    id: "44-00246",
    published: {
      name: "Lycée Malek Ben Nabi", name_fr: "Lycée Malek Ben Nabi", name_ar: "ثانوية مالك ابن نبي",
      cycle: "secondaire", cycle_label_fr: "Lycée", cycle_label_ar: "ثانوية",
      kind: "regular", kind_label_fr: "École ordinaire", kind_label_ar: "مدرسة عادية",
      isced_levels: null, sector: null, address: "Rue du 24 Fevrier, Aïn Defla 44000",
    },
  }],
]);

const canonicalOsmRef = (ref) => OSM_REF_MIGRATIONS.get(ref)?.previousRef || ref;
const PRESERVED_OSM_FIELDS = [
  "name", "name_fr", "name_ar",
  "cycle", "cycle_label_fr", "cycle_label_ar",
  "kind", "kind_label_fr", "kind_label_ar",
  "isced_levels", "sector", "address",
];

function preservePublishedOsmMigrations(rows, committed) {
  const committedByRef = new Map(
    committed.filter((r) => r.refs?.osm).map((r) => [r.refs.osm, r]),
  );
  for (const row of rows) {
    const migration = OSM_REF_MIGRATIONS.get(row.refs?.osm);
    if (!migration) continue;
    const published = committedByRef.get(migration.previousRef) || migration.published;
    for (const field of PRESERVED_OSM_FIELDS) row[field] = published[field];
    row.id = migration.id;
  }
}

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
          // Elements are an unordered set; sort the capture (type then id) so
          // mirror-to-mirror ordering drift never shows up in the git diff. Use
          // that same order for this run: exact-coordinate de-duplication keeps
          // the first equally rich primitive, so returning the unsorted response
          // would make a way/relation migration depend on the Overpass mirror.
          const elements = [...json.elements].sort(
            (a, b) => a.type.localeCompare(b.type) || a.id - b.id,
          );
          writeCapture(
            "ecoles",
            "osm",
            {
              ...json,
              elements,
            },
            { url: ep, records: json.elements.length },
          );
          return elements;
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

// --- main ------------------------------------------------------------------
async function main() {
  // Offline replay: rebuild from the committed capture (sources/ecoles/osm.json)
  // with no network — a dead upstream never blocks re-emission.
  const OFFLINE = process.argv.includes("--cache");
  const osmRaw = OFFLINE ? readCapture("ecoles", "osm").elements : await fetchOSM();
  let rows = normOSM(osmRaw);
  console.log(`  OSM: ${rows.length} geocoded schools`);

  const communes = loadCommunes();
  console.log(`  ${communes.length} commune centroids loaded`);
  attachCommune(rows, communes);

  rows = rows.filter((r) => r.wilaya_code); // drop anything that failed the commune join (should be none)
  assignIds(rows);

  // Emit v2 via the shared writer. Carry ids over by the stable OSM id so the root
  // commune fix (dataset/algeria.json) shows up as corrected wilaya/commune, not as
  // a re-sequencing of every id in the re-scoped wilayas. The cycle/kind notes are
  // preserved from the committed metadata (meta.preserve).
  const cfg = MIGRATIONS.ecoles;
  const { updated, retrieved } = resolveDates(OUT_DIR, OFFLINE);
  const v2 = rows.map(cfg.map);
  const committed = readCommitted(OUT_DIR, "ecoles.json");
  // Normalize both sides of known OSM primitive migrations for id carry-over.
  // A synthetic committed row also makes this deterministic when rebuilding on
  // top of an already-regenerated worktree rather than the last release.
  const migratedRefs = new Set([...OSM_REF_MIGRATIONS.values()].map((m) => m.previousRef));
  const carryCommitted = committed.filter((r) => !migratedRefs.has(canonicalOsmRef(r.refs?.osm)));
  for (const [currentRef, migration] of OSM_REF_MIGRATIONS) {
    carryCommitted.push({ id: migration.id, refs: { osm: currentRef } });
  }
  const retiredIds = readRetiredIds(OUT_DIR);
  carryOverIds(
    v2,
    carryCommitted,
    (r) => (r.refs?.osm ? `osm:${canonicalOsmRef(r.refs.osm)}` : null),
    "ecoles",
    retiredIds,
  );
  preservePublishedOsmMigrations(v2, committed);
  let oldMeta = {};
  try { oldMeta = JSON.parse(readFileSync(join(OUT_DIR, "metadata.json"), "utf-8")); } catch {}
  const { records, metadata } = writePackageV2({
    pkg: "ecoles",
    dir: OUT_DIR,
    files: [{ file: "ecoles.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
    oldMeta,
    retiredIds,
  });
  console.log(`Wrote ${records.length} schools → v2 (${metadata.named} named, ${metadata.wilayas_covered} wilayas).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
