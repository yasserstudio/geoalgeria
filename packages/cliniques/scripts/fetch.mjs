#!/usr/bin/env node
/**
 * Build Algeria's clinics & proximity-care dataset from OpenStreetMap and emit
 * JSON, CSV and GeoJSON to ../data. The raw pull is captured to sources/cliniques/.
 *
 * Source:
 *   - OpenStreetMap (ODbL): amenity/healthcare=clinic, healthcare=centre, and
 *     amenity/healthcare=hospital in Algeria.
 *
 * Why hospitals are pulled but not shipped: Algerian mappers routinely file a
 * polyclinique or a salle de soins under amenity=hospital (and name it مستشفى),
 * so the hospital selectors are the only way to reach those clinic-class records.
 * The hospitals themselves are the REGISTRY tier and belong to @geoalgeria/sante
 * (CHU/EPH/EHS/EPSP from the Ministry of Health), so every record that classifies
 * as one is dropped here with a logged count. The two packages must not be summed.
 *
 * Classification runs over the normalized FR+AR name (Latin accents folded,
 * Arabic hamza/alef variants folded). Order is deliberate:
 *   1. hard registry markers (CHU, EPH, EHS, "établissement public hospitalier")
 *      exclude unconditionally: nothing outranks a named registry establishment.
 *   2. paramedical schools and cabinets are out of scope.
 *   3. the facility types (polyclinique / salle de soins / centre de santé) are
 *      matched BEFORE the bare "hôpital"/مستشفى word, because that word is used
 *      colloquially for proximity facilities: 10 records name themselves both
 *      ("Polyclinique des consultations spécialisées" with name:ar مستشفى بودغن,
 *      "المستشفى الجواري متعدد الخدمات" with name:fr Polyclinique). An explicit
 *      polyclinique/مستوصف/centre de santé word settles what the place is.
 *   4. the bare hôpital word then excludes, so a mother-child hospital
 *      (مستشفى الأمومة والتوليد) is dropped as registry tier before `maternite`
 *      can claim it.
 *   5. the EPSP administrative entity is excluded LAST, so a facility that merely
 *      names its parent EPSP ("Polyclinique EPSP", "قاعة العلاج ... (EPSP)")
 *      keeps its own type and stays.
 *
 * Sector: "public" when operator:type says so, or when the type is polyclinique
 * or salle de soins (both are public structures by definition in the Algerian
 * system); "private" on operator:type=private or a privé/خاصة/مصحة name;
 * otherwise null. Most cliniques are private in practice, but the map does not
 * say so, so this stays unasserted rather than assumed.
 *
 * Commune/wilaya linkage uses the shared boundary-safe attachCommune (wilaya by
 * point-in-polygon, commune by nearest centroid WITHIN that wilaya), so the join
 * can never cross a wilaya boundary.
 *
 * Usage: node scripts/fetch.mjs            # live pull
 *        node scripts/fetch.mjs --cache    # rebuild from sources/cliniques/osm.json
 */

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import https from "node:https";
import { MIGRATIONS, writePackageV2, resolveDates, carryOverIds, readCommitted } from "../../../scripts/lib/v2-transforms.mjs";
import { writeCapture, readCapture } from "../../../scripts/lib/source-store.mjs";
import { attachCommune } from "../../../scripts/lib/build-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
// Sanity floor: a truncated upstream response parses fine and would otherwise be
// silently accepted as the whole dataset. The August 2026 pull held ~2,900
// clinic+hospital elements; reject anything grossly below that and fall through
// to the next endpoint.
const OSM_MIN = 2000;
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
  node["amenity"="clinic"](area.dz);
  way["amenity"="clinic"](area.dz);
  relation["amenity"="clinic"](area.dz);
  node["healthcare"="clinic"](area.dz);
  way["healthcare"="clinic"](area.dz);
  relation["healthcare"="clinic"](area.dz);
  node["healthcare"="centre"](area.dz);
  way["healthcare"="centre"](area.dz);
  relation["healthcare"="centre"](area.dz);
  node["amenity"="hospital"](area.dz);
  way["amenity"="hospital"](area.dz);
  relation["amenity"="hospital"](area.dz);
  node["healthcare"="hospital"](area.dz);
  way["healthcare"="hospital"](area.dz);
  relation["healthcare"="hospital"](area.dz);
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
          // Mirrors drift; log what this one was built from so a surprising count
          // can be traced to a stale mirror rather than to real OSM change.
          console.log(`  timestamp_osm_base: ${json.osm3s?.timestamp_osm_base ?? "unknown"}`);
          // Elements are an unordered set; sort the capture (type then id) so
          // mirror-to-mirror ordering drift never shows up in the git diff.
          writeCapture(
            "cliniques",
            "osm",
            {
              ...json,
              elements: [...json.elements].sort(
                (a, b) => a.type.localeCompare(b.type) || a.id - b.id,
              ),
            },
            { url: ep, records: json.elements.length },
          );
          return json.elements;
        }
        console.warn(`  only ${json.elements?.length ?? 0} elements (< ${OSM_MIN}); treating as partial, trying next…`);
      } catch (e) {
        console.warn(`  err: ${e.message}; trying next…`);
        await sleep(4000 + attempt * 5000);
      }
    }
  }
  throw new Error("Overpass unavailable on every endpoint, OSM is the sole source, so aborting rather than writing a partial dataset");
}

// --- helpers ---------------------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
// True only for actual Arabic *letters*, excludes combining marks/punctuation,
// so a Latin string carrying a stray harakat (e.g. "ُClinique") is not "Arabic".
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

// Canonical labels per type.
export const TYPE_LABELS = {
  polyclinique: { fr: "Polyclinique", ar: "عيادة متعددة الخدمات" },
  salle_de_soins: { fr: "Salle de soins / dispensaire", ar: "قاعة علاج / مستوصف" },
  centre_sante: { fr: "Centre de santé", ar: "مركز صحي" },
  maternite: { fr: "Maternité / clinique d'accouchement", ar: "مصحة توليد" },
  clinique: { fr: "Clinique", ar: "عيادة / مصحة" },
};

// Fold Latin diacritics (é→e) via NFD so ASCII word boundaries match accented
// French ("Santé" → "sante"); é is not a \w char, so `\bsanté\b` never fires.
const stripLatinAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
// Fold Arabic hamza/alef/ya/tatweel variants and all combining marks so name
// matching is robust (المؤسسة / الموسسة, مستشفى / مستشفي reduce to one stem).
function normalizeArabic(s) {
  return s
    .replace(/[أإآٱ]/g, "ا") // أ إ آ ٱ → ا
    .replace(/ى/g, "ي") // alef maqsura ى → ي
    .replace(/ـ/g, "") // tatweel ـ
    .replace(/[ؐ-ًؚ-ٰٟ]/g, ""); // harakat, hamza above/below, superscript alef
}
// Lower-case + strip Latin accents + fold Arabic, the canonical match form.
export const normalizeName = (s) => normalizeArabic(stripLatinAccents(s.toLowerCase()));

// Names, normalized and joined, the match form the classifier works over.
export function nameHay(t) {
  return normalizeName(
    [
      t.name, t["name:fr"], t["name:ar"], t["name:en"], t["name:ber"], t["name:kab"],
      t.official_name, t["official_name:fr"], t["official_name:ar"], t.alt_name,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

// The match patterns, named so the classifier below reads as its own decision
// table. NFD runs before matching, so the Arabic forms are written hamza-folded
// (المؤسسة normalizes to الموسسة, مستشفى to مستشفي) and the French without accents.
export const RE = {
  // Teaching hospitals. @geoalgeria/sante owns them.
  chu: /\bchu\b|centre hospitalo|hospitalo.universitaire|centre hospitalier universitaire|المستشفي الجامعي|الاستشفايي الجامعي/,
  // The named registry tiers. Unconditional: nothing outranks an EPH/EHS.
  registry: /\beph\b|\behs\b|etablissement public hospitalier/,
  // The bare word. Checked only after the facility types, because Algerian
  // mappers use it for polycliniques too.
  hopital: /hopital|hospital|مستشفي/,
  // Paramedical training schools: education, not care.
  paramedical: /paramedic|شبه الطبي/,
  // Single-practitioner cabinets. Deliberately narrow (the literal word only):
  // an ambiguous عيادة is kept as a clinique rather than guessed away.
  cabinet: /\bcabinet\b/,
  // The EPSP administrative entity (its facilities stay; see classify()).
  epsp: /\bepsp\b|\be\.p\.s\.p\b|etablissements? publics? de sante|etablissement de sante de proximite|للصحة الجوارية/,
  polyclinique: /polycliniq|polyclinq|policliniq|polcliniq|عيادة متعددة|العيادة المتعددة|متعدد الخدمات|متعددة الخدمات/,
  salle_de_soins: /salles? de soins?|dispensaire|قاعة العلاج|قاعة علاج|قاعات العلاج|مستوصف/,
  centre_sante: /centre de sante|centre de soins?|centre medico|centre de reeducation|\bpmi\b|protection maternelle|urgences? medicale|استعجالات طبية|مركز صحي|المركز الصحي|مركز الصحة/,
  maternite: /maternite|accouchement|mere.{0,3}enfant|امومة/,
};

/**
 * Decide what a record is: `{ type }` to keep it, `{ excluded }` to drop it with
 * a logged reason. See the header for why the order is what it is.
 */
export function classify(t) {
  const hay = nameHay(t);
  const hospitalTagged = t.amenity === "hospital" || t.healthcare === "hospital";
  // An unnamed record tagged as a hospital cannot be told apart from the registry
  // tier, so it is dropped; an unnamed clinic-tagged one is kept (type clinique,
  // name null) because its tag already says what it is.
  if (!hay) return hospitalTagged ? { excluded: "unnamed_hospital" } : { type: "clinique" };
  if (RE.chu.test(hay)) return { excluded: "chu" };
  if (RE.registry.test(hay)) return { excluded: "hopital" };
  if (RE.paramedical.test(hay)) return { excluded: "paramedical" };
  if (RE.cabinet.test(hay)) return { excluded: "cabinet" };
  if (RE.polyclinique.test(hay)) return { type: "polyclinique" };
  if (RE.salle_de_soins.test(hay)) return { type: "salle_de_soins" };
  if (RE.centre_sante.test(hay)) return { type: "centre_sante" };
  if (RE.hopital.test(hay)) return { excluded: "hopital" };
  if (RE.maternite.test(hay)) return { type: "maternite" };
  if (RE.epsp.test(hay)) return { excluded: "epsp_entity" };
  return { type: "clinique" };
}

/** Ownership sector. Only asserted from an explicit signal or from the type. */
export function classifySector(t, type) {
  const op = (t["operator:type"] || "").toLowerCase();
  if (/private/.test(op)) return "private";
  if (/public|government|state/.test(op)) return "public";
  const hay = normalizeName(
    [t.name, t["name:fr"], t["name:ar"], t.operator, t["operator:ar"]].filter(Boolean).join(" "),
  );
  // An explicit privacy word is decisive whatever the type says.
  if (/\bprivee?\b|private|خاصة|خاص/.test(hay)) return "private";
  // Structural, not inferred: a polyclinique and a salle de soins are public
  // structures of the Algerian proximity-care system by definition.
  if (type === "polyclinique" || type === "salle_de_soins") return "public";
  // Weakest signal, so it is checked last: مصحة usually marks a private clinic,
  // but it is also just the word for "clinic" and shows up in the name of public
  // proximity structures (المصحة الجوارية المتعددة الخدمات).
  if (/مصحة/.test(hay)) return "private";
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

function normOSM(elements) {
  // Five selectors over one area: an element matching more than one of them comes
  // back once per match, so collapse by osm type/id before anything else.
  const seen = new Set();
  const rows = [];
  const excluded = {};
  for (const el of elements) {
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!inAlgeria(lat, lng)) continue;
    const t = el.tags || {};
    const verdict = classify(t);
    if (verdict.excluded) {
      excluded[verdict.excluded] = (excluded[verdict.excluded] || 0) + 1;
      continue;
    }
    const type = verdict.type;
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
    rows.push({
      source: "osm",
      osm_id: key,
      name: rawName || nameFr || nameAr,
      name_ar: nameAr,
      name_fr: nameFr,
      type,
      type_label_fr: TYPE_LABELS[type].fr,
      type_label_ar: TYPE_LABELS[type].ar,
      sector: classifySector(t, type),
      speciality: str(t["healthcare:speciality"]),
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      // node = surveyed point; way/relation = building centroid from `out center`.
      geo_precision: el.type === "node" ? "osm_node" : "osm_centroid",
      address: parseAddress(t),
      phone: str(t.phone) || str(t["contact:phone"]),
      opening_hours: str(t.opening_hours),
      emergency: t.emergency === "yes" ? true : null,
    });
  }

  // Conservative internal de-dup: identical non-empty name within ~40 m (the
  // same facility mapped as both a node and a building outline).
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

  // Second pass: collapse records at the exact same point (a facility mapped
  // twice (a node and a building, or two spellings) that the name pass missed
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
  return { rows: deduped, excluded };
}

// Stable id `{wilaya_code}-{seq}`, seq ordered by osm_id so re-fetches are
// deterministic and ids stay put even if the classifier is later refined.
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
  // Offline replay: rebuild from the committed capture (sources/cliniques/osm.json)
  // with no network: a dead upstream never blocks re-emission.
  const OFFLINE = process.argv.includes("--cache");
  const osmRaw = OFFLINE ? readCapture("cliniques", "osm").elements : await fetchOSM();
  console.log(`  OSM: ${osmRaw.length} elements pulled`);
  let { rows, excluded } = normOSM(osmRaw);
  const excludedTotal = Object.values(excluded).reduce((a, b) => a + b, 0);
  console.log(`  excluded ${excludedTotal}: ` + Object.entries(excluded).sort().map(([k, v]) => `${k}=${v}`).join(", "));
  console.log(`  OSM: ${rows.length} care facilities kept`);

  attachCommune(rows);
  rows = rows.filter((r) => r.wilaya_code); // drop anything the commune join could not place
  assignIds(rows);

  // Emit v2 via the shared writer. Carry ids over by the stable OSM id so a later
  // classifier refinement or a commune-table fix shows up as changed fields, not
  // as a re-sequencing of every id in the affected wilayas.
  const cfg = MIGRATIONS.cliniques;
  const { updated, retrieved } = resolveDates(OUT_DIR, OFFLINE);
  const v2 = rows.map(cfg.map);
  carryOverIds(v2, readCommitted(OUT_DIR, "cliniques.json"), (r) => (r.refs?.osm ? `osm:${r.refs.osm}` : null), "cliniques");
  let oldMeta = {};
  try { oldMeta = JSON.parse(readFileSync(join(OUT_DIR, "metadata.json"), "utf-8")); } catch {}
  const { records, metadata } = writePackageV2({
    pkg: "cliniques",
    dir: OUT_DIR,
    files: [{ file: "cliniques.json", rows: v2 }],
    meta: cfg.meta,
    updated,
    retrieved,
    oldMeta,
  });
  console.log(`Wrote ${records.length} care facilities → v2 (${metadata.named} named, ${metadata.wilayas_covered} wilayas).`);
}

// Importable for the classifier tests; only the direct invocation builds.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
