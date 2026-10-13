#!/usr/bin/env node
/**
 * Build Algeria's pharmacies dataset from OpenStreetMap and emit JSON, CSV, and
 * GeoJSON to ../data. The raw source pull is cached under research/pharmacies/.
 *
 * Source:
 *   - OpenStreetMap (ODbL): amenity=pharmacy in Algeria. Wikidata carries
 *     essentially no geocoded Algerian pharmacies and there is no open official
 *     directory (the Ordre National des Pharmaciens site is down), so OSM is the
 *     sole source: published with honest partial-coverage framing (~3.8k real
 *     officines, after excluding an OSM bulk-import artifact, against an estimated
 *     ~11k nationally).
 *
 * OSM carries no commune/wilaya codes, so administrative linkage is attached by
 * nearest-centroid join against the flagship geoalgeria commune set (wilaya
 * effectively exact; commune best-effort). Useful contact tags (phone, hours,
 * operator) and a `dispensing` flag are kept where OSM has them.
 *
 * Usage: node scripts/fetch.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildMetadata, toCSV, toGeoJSON } from "@geoalgeria/schema";
import { carryOverIds, forwardRetiredId, readCommitted, readRetiredIds, readRetiredMigrations, writeRetiredIds, resolveDates } from "../../../scripts/lib/v2-transforms.mjs";
import { RESOLVE_RULES, describeLinkage, resolveCommune } from "../../../scripts/lib/build-utils.mjs";
import { PHARMACY_WORDS, TIFINAGH_LETTER, splitByScript } from "../../../scripts/lib/name-script.mjs";
import { mergeDoubleMappings } from "../../../scripts/lib/merge-double-mappings.mjs";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data");
const REPO_ROOT = join(__dirname, "..", "..", "..");
const RESEARCH_DIR = join(REPO_ROOT, "research", "pharmacies");
// Approximate size of the national officine network for honest coverage framing.
// Deliberately round: a reference order-of-magnitude, not a claim of a registry.
const OFFICIAL_TOTAL = 11000;
// Sanity floor: a truncated upstream response parses fine and would otherwise be
// silently accepted as the whole dataset. Algeria has ~5.5k pharmacies in OSM;
// reject anything grossly below that and fall through to the next endpoint.
const OSM_MIN = 2500;
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const MAX_BYTES = 128 * 1024 * 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  node["amenity"="pharmacy"](area.dz);
  way["amenity"="pharmacy"](area.dz);
  relation["amenity"="pharmacy"](area.dz);
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
  throw new Error("Overpass unavailable on every endpoint: OSM is the sole source, so aborting rather than writing a partial dataset");
}

// --- helpers ---------------------------------------------------------------
const str = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const wcode = (n) => (Number.isInteger(n) && n > 0 ? String(n).padStart(2, "0") : null);
const LEAD_MARKS = /^[̀-ͯؐ-ًؚ-ٰٟۖ-ۭ]+/;
// Tifinagh counts as a name-bearing script here, so a Tamazight-only name reaches
// `name` instead of being dropped as unnamed. It is never routed into name_ar or
// name_fr, which carry one script each.
const NAME_LETTER = /[A-Za-zء-يٱ-ۿⴰ-⵿]/;
const cleanName = (v) => {
  if (typeof v !== "string") return null;
  const x = v.replace(/\s+/g, " ").trim().replace(LEAD_MARKS, "").trim();
  return x.length >= 2 && NAME_LETTER.test(x) ? x : null;
};
const inAlgeria = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= 18 && lat <= 38 && lng >= -9 && lng <= 12;

// Which element of a Double mapping is kept: the names and contact details it
// states. Unchanged from the rule this package has always used.
const RANK_FIELDS = ["name", "name_ar", "name_fr", "phone", "opening_hours", "address"];
// What the kept element absorbs from the one it replaces. Derived from RANK_FIELDS
// rather than retyped, so a field that decides a merge can never be left out of
// the carry-over it just decided; the extras are the two the ranking never counted.
const FILL_FIELDS = [...RANK_FIELDS, "operator", "dispensing"];

// OSM dispensing=yes/no -> boolean, else null (unknown).
function parseDispensing(t) {
  const d = (t.dispensing || "").toLowerCase();
  if (d === "yes") return true;
  if (d === "no") return false;
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

function normOSM(elements, publishedOsmIds = new Set()) {
  const rows = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!inAlgeria(lat, lng)) continue;
    const t = el.tags || {};
    const rawName = cleanName(t.name);
    const tagFr = cleanName(t["name:fr"]);
    const tagAr = cleanName(t["name:ar"]);
    // Route strictly by script so name_ar holds Arabic only and name_fr Latin only,
    // even when OSM mis-tags them. Every candidate tag is split by script first,
    // because contributors routinely write more than one language into one tag
    // ("Pharmacie bouchekouf صيدلية بوشقوف", or Tifinagh run straight into Arabic
    // with no separator): classifying such a value whole filed its Latin words
    // under name_ar on 28 records (private tracker #256). The split only cuts, so
    // neither field ever holds a word the source does not. Preference is unchanged:
    // the dedicated tag, then the raw name, then the other tag. A Tifinagh half
    // goes in neither field, because this package publishes no Tamazight name
    // field; it stays on `name`, which is the raw tag.
    const halves = [splitByScript(tagAr), splitByScript(rawName), splitByScript(tagFr)];
    const nameAr = halves.find((h) => h.ar)?.ar ?? null;
    const nameFr = [halves[2], halves[1], halves[0]].find((h) => h.la)?.la ?? null;
    rows.push({
      source: "osm",
      osm_id: `${el.type}/${el.id}`,
      name: rawName || nameFr || nameAr,
      name_ar: nameAr,
      name_fr: nameFr,
      operator: cleanName(t.operator),
      phone: str(t.phone) || str(t["contact:phone"]) || str(t["contact:mobile"]),
      opening_hours: str(t.opening_hours),
      dispensing: parseDispensing(t),
      lat: Number(Number(lat).toFixed(6)),
      lng: Number(Number(lng).toFixed(6)),
      // node = surveyed point; way/relation = building centroid from `out center`.
      geo_precision: el.type === "node" ? "osm_node" : "osm_centroid",
      address: parseAddress(t),
    });
  }
  // Double mappings are merged by scripts/lib/merge-double-mappings.mjs: a shared
  // Loose name key within 40 m, then the exact same point. Names are compared there
  // as keys per script rather than as display text, so "Pharmacie bouchekouf صيدلية
  // بوشقوف" and the plain "بوشقوف" six metres away are read as one Oued Endja
  // pharmacy, which an exact string comparison shipped twice (private tracker
  // #256). The kept element absorbs every field it lacks from the one it replaces,
  // so a merge costs no phone, address, opening hours or dispensing flag; its own
  // value wins wherever both state one, and the disagreement is reported rather
  // than resolved. Each merge becomes a forward in retired-ids.json, so a consumer
  // holding the retired id still reaches the pharmacy in one hop.
  const { rows: mergedRows, merged, conflicts } = mergeDoubleMappings(rows, {
    radiusM: 40,
    ignoredWords: PHARMACY_WORDS,
    rankFields: RANK_FIELDS,
    fillFields: FILL_FIELDS,
    isPublished: (osmId) => publishedOsmIds.has(osmId),
  });
  if (merged.length) {
    console.log(`  OSM double mappings: ${merged.length} element(s) merged away, fields carried over`);
  }
  for (const c of conflicts) {
    console.log(`    conflict kept ${c.kept} ${c.field}=${JSON.stringify(c.keptValue)} over ${c.dropped} ${JSON.stringify(c.droppedValue)}`);
  }

  // The bulk-import guard runs last, so a forward whose kept element it drops leads
  // nowhere and is not a forward at all.
  const live = dropBulkImports(mergedRows);
  const published = new Set(live.map((r) => r.osm_id));
  return { rows: live, merged: merged.filter((entry) => published.has(entry.kept)) };
}

// Drop OSM bulk-import artifacts: a long run of consecutive-id, unnamed pharmacy
// *ways* packed into a tiny area is a machine dump, not real officines (e.g. the
// ~1,769-way import around Attatba/Tipaza that otherwise makes Tipaza the #1
// wilaya). Guarded three ways so legitimate mapping is never touched: the ids
// must be consecutive, the run must exceed a high floor, and it must be spatially
// tight. Real pharmacies are named and/or have non-adjacent ids spread across the
// country.
function dropBulkImports(rows) {
  const RUN_MIN = 20; // no real place is mapped as 20+ consecutive-id unnamed ways
  const MAX_SPAN = 0.5; // degrees (~55 km): the whole run must sit in a tight box
  const ways = rows
    .map((r, i) => ({ i, lat: r.lat, lng: r.lng, id: r.osm_id.startsWith("way/") && !r.name ? Number(r.osm_id.slice(4)) : NaN }))
    .filter((x) => Number.isFinite(x.id))
    .sort((a, b) => a.id - b.id);
  const drop = new Set();
  let run = [];
  const flush = () => {
    if (run.length >= RUN_MIN) {
      const la = run.map((x) => x.lat);
      const lo = run.map((x) => x.lng);
      const tight = Math.max(...la) - Math.min(...la) < MAX_SPAN && Math.max(...lo) - Math.min(...lo) < MAX_SPAN;
      if (tight) for (const x of run) drop.add(x.i);
    }
    run = [];
  };
  for (const x of ways) {
    if (run.length && x.id - run[run.length - 1].id > 2) flush();
    run.push(x);
  }
  flush();
  if (drop.size) console.log(`  OSM bulk-import guard: dropped ${drop.size} consecutive-id unnamed-way artifact record(s)`);
  return rows.filter((_, i) => !drop.has(i));
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
  if (!communes.length) throw new Error("no commune centroids loaded: check packages/dataset/data/algeria.json");
  return communes;
}

// Administrative linkage is the shared rule, scripts/lib/build-utils.mjs
// resolveCommune(): the commune whose OpenStreetMap outline contains the point wins
// outright, searched over the whole country, with the wilaya taken from the commune
// registry; only where no outline holds the point does distance decide, inside the
// wilaya whose shipped polygon does. The unrestricted
// nearest-centroid join this replaces moved a pharmacy inside the wilaya 53 polygon
// into Adrar when the 2026-09-29 batch moved 245 commune centres.
//
// `published` maps the stable OSM id to the wilaya the record shipped in, and is the
// only answer for a point no wilaya polygon contains.
function attachCommune(rows, communes, published) {
  const counts = Object.fromEntries(RESOLVE_RULES.map((k) => [k, 0]));
  for (const r of rows) {
    const { commune, rule } = resolveCommune(r.lat, r.lng, communes, published.get(`osm:${r.osm_id}`) ?? null);
    counts[rule]++;
    if (!commune) continue;
    r.wilaya_code = wcode(commune.wilaya_code);
    r.wilaya = commune.wilaya_fr;
    r.wilaya_ar = commune.wilaya_ar;
    r.commune = commune.commune_fr;
    r.commune_code = commune.code_commune;
  }
  return counts;
}

// Derive `{wilaya_code}-{seq}`, seq ordered by osm_id so a build is deterministic.
// The sequence is positional, so an upstream insert shifts every later record.
// carryOverIds, called in main(), pins still-present records back to the id they
// shipped under, so this only mints ids for genuinely new pharmacies.
function assignIds(rows) {
  const byWilaya = new Map();
  for (const r of rows) {
    const w = r.wilaya_code || "00";
    if (!byWilaya.has(w)) byWilaya.set(w, []);
    byWilaya.get(w).push(r);
  }
  for (const [w, list] of byWilaya) {
    // Plain codepoint order: localeCompare() reads the ambient ICU and can
    // reorder committed output between machines.
    list.sort((a, b) => (a.osm_id < b.osm_id ? -1 : a.osm_id > b.osm_id ? 1 : 0));
    list.forEach((r, i) => {
      r.id = `${w}-${String(i + 1).padStart(5, "0")}`;
    });
  }
}

// Map the internal OSM shape to the canonical @geoalgeria/schema v2 GeoRecord:
// geo_precision → exact|approximate (raw method kept in geo_method), osm_id → refs.osm,
// commune_code → 4-digit ONS string (first 2 digits = wilaya_code), denormalized wilaya
// name fields dropped (derivable from wilaya_code via the geoalgeria core dataset).
function toV2(rows) {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    name_fr: r.name_fr,
    name_ar: r.name_ar,
    wilaya_code: r.wilaya_code,
    commune_code: r.commune_code == null ? null : String(r.commune_code).padStart(4, "0"),
    commune: r.commune,
    lat: r.lat,
    lng: r.lng,
    geo_precision: r.geo_precision === "osm_node" ? "exact" : "approximate",
    geo_method: r.geo_precision,
    source: "osm",
    refs: { osm: r.osm_id },
    operator: r.operator,
    phone: r.phone,
    opening_hours: r.opening_hours,
    dispensing: r.dispensing,
    address: r.address,
  }));
}

// --- writers ---------------------------------------------------------------
// toCSV / toGeoJSON come from @geoalgeria/schema (the canonical emit helpers).
const writeJSON = (p, obj) => writeFileSync(join(OUT_DIR, p), JSON.stringify(obj, null, 2) + "\n");
const writeText = (p, txt) => writeFileSync(join(OUT_DIR, p), txt);

// --- main ------------------------------------------------------------------
// Reuse the cached raw pull (research/pharmacies/osm-raw.json): a reproducible,
// offline rebuild that doesn't re-hit Overpass. Use: node scripts/fetch.mjs --cache
function readCache() {
  const p = join(RESEARCH_DIR, "osm-raw.json");
  const json = JSON.parse(readFileSync(p, "utf-8"));
  if (!Array.isArray(json.elements) || json.elements.length < OSM_MIN) {
    throw new Error(`cache ${p} missing or too small: run without --cache to refetch`);
  }
  console.log(`Using cached OSM pull: ${json.elements.length} elements`);
  return json.elements;
}

async function main() {
  const OFFLINE = process.argv.includes("--cache");
  const osmRaw = OFFLINE ? readCache() : await fetchOSM();
  const committed = readCommitted(OUT_DIR, "pharmacies.json") ?? [];
  const published = new Map();
  for (const r of committed) {
    if (r.refs?.osm && r.wilaya_code) published.set(`osm:${r.refs.osm}`, r);
  }
  let { rows, merged } = normOSM(osmRaw, new Set(committed.map((r) => r.refs?.osm).filter(Boolean)));
  console.log(`  OSM: ${rows.length} geocoded pharmacies`);

  const communes = loadCommunes();
  console.log(`  ${communes.length} commune centroids loaded`);
  const linkage = attachCommune(rows, communes, published);
  console.log(`  linkage: ${describeLinkage(linkage)}`);

  rows = rows.filter((r) => r.wilaya_code); // drop anything that failed the commune join (should be none)
  assignIds(rows);
  rows = toV2(rows);
  // Pin every still-present pharmacy back to the id it shipped under, keyed on the
  // stable OSM id. Without this a single new pharmacy re-sequences every later
  // record in its wilaya, so a re-survey would churn ids that are public join keys.
  //
  // `prefixOf` is the one exception: the published type documents the id as
  // `{wilaya_code}-{seq}`, so a pinned id whose prefix the commune join has
  // contradicted is re-issued into its own wilaya's id space instead, and the stale
  // id retires with a forward to the new one (private tracker #255).
  const retiredIds = readRetiredIds(OUT_DIR);
  const migrations = readRetiredMigrations(OUT_DIR);
  carryOverIds(rows, committed, (r) => (r.refs?.osm ? `osm:${r.refs.osm}` : null), "pharmacies", retiredIds, {
    prefixOf: (r) => r.wilaya_code,
    migrations,
    note:
      "Re-issued as the id on the right: this record's wilaya changed, and the id " +
      "documents its wilaya in the prefix, so the old id was no longer readable. " +
      "Same pharmacy, same OpenStreetMap element, new public id.",
  });
  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Forward each merged-away pharmacy to the record that carries it now, citing
  // both OpenStreetMap elements the merge stood for so a consumer can check it
  // against the source instead of taking the note's word for it. carryOverIds has
  // already retired the merged-away record's id, because its OSM key left the
  // dataset; this says where the pharmacy went.
  const idByOsm = new Map(rows.map((r) => [r.refs.osm, r.id]));
  for (const { dropped, kept } of merged) {
    const was = published.get(`osm:${dropped}`)?.id;
    const now = idByOsm.get(kept);
    if (!was || !now || !retiredIds.has(was)) continue;
    forwardRetiredId(
      migrations,
      was,
      now,
      `Merged into ${now}: one pharmacy OpenStreetMap held as two elements. The two ` +
        `stood within 40 m and their names share a Loose name key once each is split by ` +
        `script, and the element kept is the one carrying the most fields. Elements ` +
        `${kept} (kept) and ${dropped} (merged away).`,
      { osm: [kept, dropped] },
    );
  }

  const cols = [
    "id", "name", "name_fr", "name_ar", "wilaya_code", "commune_code", "commune",
    "lat", "lng", "geo_precision", "geo_method", "source", "refs",
    "operator", "phone", "opening_hours", "dispensing", "address",
  ];

  // A live pull stamps today; a --cache replay reuses the committed dates so it
  // reproduces the committed metadata instead of flipping it to the replay date.
  const { updated, retrieved } = resolveDates(OUT_DIR, OFFLINE);
  const named = rows.filter((r) => r.name).length;
  const metadata = {
    ...buildMetadata({
      package: "@geoalgeria/pharmacies",
      records: rows,
      sources: [
        {
          key: "osm",
          name: "OpenStreetMap: pharmacies (amenity=pharmacy) in Algeria",
          url: "https://www.openstreetmap.org",
          license: "ODbL 1.0 (© OpenStreetMap contributors)",
          retrieved,
          // Pinned, not inferred: buildMetadata passes sources through verbatim, so
          // leaving it off drops the claim the committed metadata already carries.
          evidence_type: "crowdsourced",
        },
      ],
      license: "ODbL-1.0",
      updated,
      estimatedUniverse: OFFICIAL_TOTAL,
      coverageNote: `${rows.length} pharmacies compiled from OpenStreetMap, against an estimated ~${OFFICIAL_TOTAL} officines nationally (order-of-magnitude, no open official registry). A community-maintained extract, so coverage is partial and uneven by wilaya, denser in the north.`,
      titles: {
        en: "Algeria pharmacies (officines)",
        fr: "Pharmacies d'Algérie",
        ar: "صيدليات الجزائر",
      },
    }),
    // domain-specific enrichment stats (additive to the canonical metadata)
    named,
    with_phone: rows.filter((r) => r.phone).length,
    with_hours: rows.filter((r) => r.opening_hours).length,
    with_address: rows.filter((r) => r.address).length,
    with_dispensing: rows.filter((r) => r.dispensing !== null).length,
    linkage_note:
      "Commune/wilaya linkage is derived by nearest-centroid join against the geoalgeria commune set; wilaya is effectively exact, commune is best-effort.",
  };

  mkdirSync(join(OUT_DIR, "csv"), { recursive: true });
  mkdirSync(join(OUT_DIR, "geojson"), { recursive: true });
  writeJSON("pharmacies.json", rows);
  writeText("csv/pharmacies.csv", toCSV(rows, cols));
  writeJSON("geojson/pharmacies.geojson", toGeoJSON(rows));
  writeJSON("metadata.json", metadata);
  writeRetiredIds(OUT_DIR, retiredIds, migrations);
  console.log(
    `Wrote ${rows.length} pharmacies (${named} named, ${metadata.wilayas_covered} wilayas): ` +
      `${metadata.with_phone} with phone, ${metadata.with_hours} with hours, ${metadata.with_address} with address.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
