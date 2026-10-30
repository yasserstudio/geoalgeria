#!/usr/bin/env node
/**
 * Capture for the second-source check of @geoalgeria/enseignement-superieur's
 * campus Claims (run 2026-10-28), in the sense of docs/adr/0001 and CONTEXT.md
 * "Coordinate review".
 *
 * The Review queue research/enseignement-superieur/precision-review-2026-10-28.json
 * holds 34 records whose only open Claim is an OpenStreetMap campus element read
 * from the 2026-08-03 Overpass capture, and the four BAC 2026 additions P08, P09,
 * P10 and P23 (packages/enseignement-superieur/scripts/seeds/bac-2026.json) are
 * published exact on one OSM object each. ADR 0001 needs a second independent
 * open source before a point is exact. This script reads the evidence for that
 * second source and writes it as two committed captures, through
 * scripts/lib/source-store.mjs only:
 *
 *   sources/enseignement-superieur/osm-campus-objects.json
 *     every OSM element those 39 records name, re-read live from the editing API:
 *     version, timestamp, visibility, all tags and the element's point (a node's
 *     lat/lon; for a way or relation the centre of the bounding box of its nodes,
 *     which is what Overpass `out center` gave the capture), plus how far that
 *     point now sits from the point the record's Claim was read at.
 *
 *   sources/enseignement-superieur/wikidata-campuses.json
 *     the Wikidata items that could be the same institution: (a) the live OSM
 *     element's `wikidata` tag, (b) a `wikibase:around` search within 5 km of each
 *     Claim point for instances of higher-education institution, university,
 *     educational institution or school, and (c) an EntitySearch on the record's
 *     French and Arabic names, kept only when the item's P17 is Algeria or one of
 *     its P625 values lies in Algeria. For each item only P625 (every value, with
 *     rank), P856, P31, P402, P17 and its fr/ar/en labels and aliases are kept,
 *     never the whole entity.
 *
 * All Wikidata reads go to the public SPARQL endpoint, the name search included
 * (WDQS's MWAPI EntitySearch service runs wbsearchentities on its side): on
 * 2026-10-28 www.wikidata.org/w/api.php answered this machine with HTTP 429,
 * while query.wikidata.org answered normally.
 *
 * Nothing here decides anything: second-source-votes.mjs reads the two captures
 * offline and writes the verdicts.
 *
 * Run (behind an HTTPS proxy, Node needs NODE_USE_ENV_PROXY=1):
 *   node research/enseignement-superieur/fetch-second-sources.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCapture } from "../../scripts/lib/source-store.mjs";
import { containingWilayaCode, haversine } from "../../scripts/lib/build-utils.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const PKG = "enseignement-superieur";
const readJson = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf8"));

const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const OSM_API = "https://api.openstreetmap.org/api/0.6";
const SPARQL = "https://query.wikidata.org/sparql";
const AROUND_KM = 5;
const AROUND_CLASSES = ["Q38723", "Q3918", "Q2385804", "Q3914"];
const SEARCH_LIMIT = 20;
const ALGERIA = "Q262";
const GAP_MS = 1100; // about one request per second, per the hosts' etiquette
const BATCH = 150;

/** The BAC 2026 additions and the record ids the generator gave them. */
const BAC = { P08: "00184", P09: "00183", P10: "00182", P23: "00185" };

// ---- the records -----------------------------------------------------------

// The frozen inputs of the 2026-10-28 review (see second-source-votes.mjs).
const INPUT = readJson("research", PKG, "second-source-input-2026-10-28.json");
const QUEUE = INPUT.queue;
const RECORDS = new Map(INPUT.records.map((r) => [r.id, r]));
const SEED = INPUT.bac_additions;

function hostOf(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!/^[a-z]+:\/\//i.test(s)) s = `http://${s}`;
  try {
    return new URL(s).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

const TARGETS = [];
for (const q of QUEUE) {
  TARGETS.push({ id: q.id, claims: q.claims.map((c) => ({ ref: c.element, point: { lat: c.point.lat, lng: c.point.lng } })) });
}
for (const [code, id] of Object.entries(BAC)) {
  const add = SEED[code];
  const rec = RECORDS.get(id);
  if (!add?.place?.osm) throw new Error(`${code}: no place.osm in the seed`);
  if (!rec || hostOf(rec.website) !== hostOf(add.website)) throw new Error(`${code}: record ${id} is not this addition`);
  TARGETS.push({ id, bac: code, claims: [{ ref: add.place.osm, point: { lat: add.place.lat, lng: add.place.lng } }] });
}
TARGETS.sort((a, b) => (a.id < b.id ? -1 : 1));
for (const t of TARGETS) {
  const r = RECORDS.get(t.id);
  if (!r) throw new Error(`${t.id}: not in institutions.json`);
  Object.assign(t, { name: r.name, name_ar: r.name_ar, website: r.website, wilaya_code: r.wilaya_code });
}

// ---- polite HTTP -----------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function request(url, init = {}, { allow = [] } = {}) {
  for (let attempt = 1; ; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let res;
    try {
      res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers ?? {}) } });
    } catch (e) {
      if (attempt >= 4) throw e;
      await sleep(5000 * attempt);
      continue;
    }
    if (res.ok || allow.includes(res.status)) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const after = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 10000 * attempt);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText} for ${url.slice(0, 200)}`);
  }
}

async function sparql(query) {
  const res = await request(SPARQL, {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }).toString(),
  });
  return (await res.json()).results.bindings;
}
const qidOf = (uri) => String(uri).split("/").pop();

// ---- step 1: the OSM elements, live ----------------------------------------

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const refKey = (ref) => {
  const [t, i] = ref.split("/");
  return `${t}/${String(i).padStart(12, "0")}`;
};

/** Bounding-box centre of every node a way or relation reaches, as Overpass `out center` does. */
function bboxCentre(nodes) {
  let s = Infinity, w = Infinity, n = -Infinity, e = -Infinity;
  for (const p of nodes) {
    s = Math.min(s, p.lat); n = Math.max(n, p.lat);
    w = Math.min(w, p.lon); e = Math.max(e, p.lon);
  }
  return { lat: Math.round(((s + n) / 2) * 1e7) / 1e7, lng: Math.round(((w + e) / 2) * 1e7) / 1e7 };
}

async function readElement(ref) {
  const [type, id] = ref.split("/");
  const url = type === "node" ? `${OSM_API}/node/${id}.json` : `${OSM_API}/${type}/${id}/full.json`;
  const res = await request(url, { headers: { Accept: "application/json" } }, { allow: [410] });
  if (res.status === 410) {
    // Deleted: the history holds the deleting version and the last visible one.
    const hist = (await (await request(`${OSM_API}/${type}/${id}/history.json`, { headers: { Accept: "application/json" } })).json()).elements;
    const del = hist[hist.length - 1];
    const lastVisible = [...hist].reverse().find((v) => v.visible !== false);
    return {
      ref, type, id: Number(id), http_status: 410, deleted: true, visible: false,
      version: del.version, timestamp: del.timestamp,
      tags: lastVisible?.tags ?? {},
      last_visible_version: lastVisible?.version ?? null,
      point: lastVisible && lastVisible.lat != null ? { lat: lastVisible.lat, lng: lastVisible.lon } : null,
    };
  }
  const els = (await res.json()).elements;
  const self = els.find((e) => e.type === type && String(e.id) === id);
  if (!self) throw new Error(`${ref}: the API answer does not hold the element`);
  let point;
  let nodeCount = null;
  if (type === "node") point = { lat: self.lat, lng: self.lon };
  else {
    const nodes = els.filter((e) => e.type === "node");
    nodeCount = nodes.length;
    point = bboxCentre(nodes);
  }
  return {
    ref, type, id: Number(id), http_status: 200, deleted: false, visible: self.visible !== false,
    version: self.version, timestamp: self.timestamp, tags: self.tags ?? {},
    ...(nodeCount != null ? { node_count: nodeCount } : {}),
    ...(type === "relation" ? { members: (self.members ?? []).map((m) => `${m.type}/${m.ref}`).sort() } : {}),
    point,
  };
}

const claimRefs = new Map(); // ref -> { records:Set, points: Map<id, point> }
for (const t of TARGETS) {
  for (const c of t.claims) {
    if (!claimRefs.has(c.ref)) claimRefs.set(c.ref, { records: new Set(), capture: new Map() });
    const e = claimRefs.get(c.ref);
    e.records.add(t.id);
    e.capture.set(t.id, c.point);
  }
}

const osmElements = [];
for (const ref of [...claimRefs.keys()].sort((a, b) => cmp(refKey(a), refKey(b)))) {
  process.stderr.write(`osm ${ref}\n`);
  const el = await readElement(ref);
  const { records, capture } = claimRefs.get(ref);
  // One capture point per element: the queue and the seed read each element once.
  const points = [...new Set([...capture.values()].map((p) => `${p.lat},${p.lng}`))];
  if (points.length !== 1) throw new Error(`${ref}: the records read it at ${points.length} different points`);
  const cp = [...capture.values()][0];
  osmElements.push({
    ...el,
    records: [...records].sort(),
    capture_point: { lat: cp.lat, lng: cp.lng },
    moved_m: el.point ? Math.round(haversine(cp.lat, cp.lng, el.point.lat, el.point.lng) * 10) / 10 : null,
  });
}

// ---- step 2: Wikidata candidates -------------------------------------------

/** qid -> Set of "record|via|detail" leads, so the capture says why each item is in it. */
const leads = new Map();
const lead = (qid, record, via, detail) => {
  if (!/^Q[0-9]+$/.test(qid)) return;
  if (!leads.has(qid)) leads.set(qid, new Set());
  leads.get(qid).add(JSON.stringify({ record, via, detail }));
};

// (a) the live element's wikidata tag
const osmTags = [];
for (const el of osmElements) {
  const tag = el.tags?.wikidata;
  if (!tag) continue;
  for (const v of String(tag).split(";").map((s) => s.trim()).filter(Boolean)) {
    osmTags.push({ element: el.ref, wikidata: v });
    for (const r of el.records) lead(v, r, "osm_wikidata_tag", el.ref);
  }
}

// (b) wikibase:around each Claim point (the live point, else the capture point)
const around = [];
for (const el of osmElements) {
  const p = el.point ?? el.capture_point;
  process.stderr.write(`around ${el.ref}\n`);
  const rows = await sparql(`SELECT ?item (MIN(?dist) AS ?d) WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?loc .
    bd:serviceParam wikibase:center "Point(${p.lng} ${p.lat})"^^geo:wktLiteral ;
                    wikibase:radius "${AROUND_KM}" ;
                    wikibase:distance ?dist .
  }
  VALUES ?cls { ${AROUND_CLASSES.map((q) => `wd:${q}`).join(" ")} }
  ?item wdt:P31/wdt:P279* ?cls .
} GROUP BY ?item`);
  const hits = rows
    .map((b) => ({ qid: qidOf(b.item.value), distance_km: Math.round(Number(b.d.value) * 1000) / 1000 }))
    .sort((a, b) => a.distance_km - b.distance_km || cmp(Number(a.qid.slice(1)), Number(b.qid.slice(1))));
  around.push({ element: el.ref, point: p, radius_km: AROUND_KM, classes: AROUND_CLASSES, hits });
  for (const h of hits) for (const r of el.records) lead(h.qid, r, "around", `${el.ref} ${h.distance_km} km`);
}

// (c) EntitySearch on the record's names
function searchTexts(raw) {
  if (!raw) return [];
  const full = String(raw).replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
  const stripped = full.replace(/\([^)]*\)?/g, " ").replace(/\s+ex\s.*$/i, " ").replace(/سابقا.*$/, " ").replace(/\s+/g, " ").trim();
  const head = stripped.split(/\s*[-–‐]\s*/)[0].trim();
  return [...new Set([full, stripped, head].filter((s) => s.length >= 4))];
}
const searchJobs = new Map(); // `${lang}|${text}` -> Set(records)
for (const t of TARGETS) {
  for (const [lang, raw] of [["fr", t.name], ["ar", t.name_ar]]) {
    for (const text of searchTexts(raw)) {
      const k = `${lang}|${text}`;
      if (!searchJobs.has(k)) searchJobs.set(k, new Set());
      searchJobs.get(k).add(t.id);
    }
  }
}
const searches = [];
for (const k of [...searchJobs.keys()].sort()) {
  const [language, ...rest] = k.split("|");
  const text = rest.join("|");
  process.stderr.write(`search ${language} ${text}\n`);
  const rows = await sparql(`SELECT ?item ?ord WHERE {
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org" ;
                    wikibase:api "EntitySearch" ;
                    mwapi:search ${JSON.stringify(text)} ;
                    mwapi:language "${language}" ;
                    mwapi:limit "${SEARCH_LIMIT}" .
    ?item wikibase:apiOutputItem mwapi:item .
    ?ord wikibase:apiOrdinal true .
  }
}`);
  const hits = rows
    .map((b) => ({ qid: qidOf(b.item.value), ord: Number(b.ord.value) }))
    .filter((h) => /^Q[0-9]+$/.test(h.qid))
    .sort((a, b) => a.ord - b.ord)
    .map((h) => h.qid);
  searches.push({ language, text, records: [...searchJobs.get(k)].sort(), hits });
}

// ---- step 3: the listed fields of every candidate --------------------------

const numQ = (q) => Number(q.slice(1));
// Reference values that make a P625 statement proprietary-map content: Google
// Maps (Q12013), or a reference URL on a Google maps host.
const PROPRIETARY_SOURCES = new Set(["Q12013"]);
const PROPRIETARY_URL = /^https?:\/\/(www\.)?(maps\.google\.|google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/i;
const PROPS = ["P856", "P31", "P402", "P17"];

async function fields(qids) {
  const out = new Map();
  for (let i = 0; i < qids.length; i += BATCH) {
    const values = qids.slice(i, i + BATCH).map((q) => `wd:${q}`).join(" ");
    process.stderr.write(`fields ${Math.min(i + BATCH, qids.length)}/${qids.length}\n`);
    for (const q of qids.slice(i, i + BATCH))
      out.set(q, { qid: q, labels: {}, aliases: { ar: [], en: [], fr: [] }, P625: [], P856: [], P31: [], P402: [], P17: [] });
    // http://wikiba.se/ontology#NormalRank -> "normal"
    const rank = (u) => String(u).split("#").pop().replace(/Rank$/, "").toLowerCase();
    // Each P625 statement with its references, so a coordinate's provenance is
    // evidence the decision reads, not a note typed afterwards (PR #310 review).
    const statements = new Map();
    for (const b of await sparql(`SELECT ?item ?st ?lat ?lon ?globe ?rank ?rp ?rv WHERE {
  VALUES ?item { ${values} }
  ?item p:P625 ?st . ?st wikibase:rank ?rank ; psv:P625 ?v .
  ?v wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  OPTIONAL { ?v wikibase:geoGlobe ?globe }
  OPTIONAL { ?st prov:wasDerivedFrom ?ref . ?ref ?rp ?rv . FILTER(?rp IN (pr:P143, pr:P248, pr:P854, pr:P4656)) }
}`)) {
      const key = b.st.value;
      if (!statements.has(key))
        statements.set(key, {
          qid: qidOf(b.item.value), lat: Number(b.lat.value), lng: Number(b.lon.value), rank: rank(b.rank.value),
          globe: b.globe ? qidOf(b.globe.value) : null, references: [],
        });
      if (b.rp) {
        const v = b.rv.type === "uri" && b.rv.value.startsWith("http://www.wikidata.org/entity/") ? qidOf(b.rv.value) : b.rv.value;
        statements.get(key).references.push({ property: qidOf(b.rp.value), value: v });
      }
    }
    for (const st of statements.values()) {
      const references = [...new Map(st.references.map((r) => [`${r.property}|${r.value}`, r])).values()]
        .sort((a, b) => cmp(a.property, b.property) || cmp(String(a.value), String(b.value)));
      // docs/adr/0001: Google content never enters the public repository. A
      // value Wikidata states from Google Maps is not captured, only the fact
      // that one exists, so the decision can say why the item casts no Vote.
      const proprietary = references.find((r) => PROPRIETARY_SOURCES.has(String(r.value)) || PROPRIETARY_URL.test(String(r.value)));
      out.get(st.qid).P625.push(
        proprietary
          ? { excluded: `referenced to a proprietary map (${proprietary.property} ${proprietary.value}); value not captured`, rank: st.rank, references }
          : { lat: st.lat, lng: st.lng, rank: st.rank, globe: st.globe, references },
      );
    }
    for (const b of await sparql(`SELECT ?item ?pid ?val ?rank WHERE {
  VALUES ?item { ${values} }
  VALUES (?pid ?p ?ps) { ${PROPS.map((p) => `("${p}" p:${p} ps:${p})`).join(" ")} }
  ?item ?p ?st . ?st ?ps ?val ; wikibase:rank ?rank .
}`)) {
      const v = b.val.type === "uri" && b.val.value.startsWith("http://www.wikidata.org/entity/") ? qidOf(b.val.value) : b.val.value;
      out.get(qidOf(b.item.value))[b.pid.value].push({ value: v, rank: rank(b.rank.value) });
    }
    for (const b of await sparql(`SELECT ?item ?kind ?text WHERE {
  VALUES ?item { ${values} }
  { ?item rdfs:label ?text . BIND("label" AS ?kind) } UNION { ?item skos:altLabel ?text . BIND("alias" AS ?kind) }
  FILTER(LANG(?text) IN ("fr", "ar", "en"))
}`)) {
      const it = out.get(qidOf(b.item.value));
      const lang = b.text["xml:lang"];
      if (b.kind.value === "label") it.labels[lang] = b.text.value;
      else it.aliases[lang].push(b.text.value);
    }
  }
  for (const it of out.values()) {
    it.P625.sort((a, b) => (a.lat ?? 999) - (b.lat ?? 999) || (a.lng ?? 999) - (b.lng ?? 999) || cmp(a.rank, b.rank) || cmp(a.excluded ?? "", b.excluded ?? ""));
    for (const p of PROPS) it[p].sort((a, b) => cmp(String(a.value), String(b.value)) || cmp(a.rank, b.rank));
    for (const l of ["ar", "en", "fr"]) it.aliases[l] = [...new Set(it.aliases[l])].sort();
  }
  return out;
}

const searchHitQids = [...new Set(searches.flatMap((s) => s.hits))];
const wanted = [...new Set([...leads.keys(), ...searchHitQids])].sort((a, b) => numQ(a) - numQ(b));
const got = await fields(wanted);

// A search hit is kept only when the item is Algerian (P17) or one of its P625 values lies in Algeria.
const inAlgeria = (it) =>
  it.P17.some((v) => v.value === ALGERIA && v.rank !== "deprecated") ||
  it.P625.some((p) => p.rank !== "deprecated" && containingWilayaCode(p.lat, p.lng) != null);
const searchDropped = [];
for (const s of searches) {
  s.kept = [];
  for (const q of s.hits) {
    const it = got.get(q);
    if (it && inAlgeria(it)) {
      s.kept.push(q);
      for (const r of s.records) lead(q, r, "search", `${s.language}: ${s.text}`);
    } else searchDropped.push(q);
  }
}
const items = [...leads.keys()]
  .sort((a, b) => numQ(a) - numQ(b))
  .map((q) => {
    const it = got.get(q);
    if (!it) throw new Error(`${q}: fields not read`);
    const found = [...leads.get(q)].map((s) => JSON.parse(s)).sort((a, b) => cmp(a.record, b.record) || cmp(a.via, b.via) || cmp(a.detail, b.detail));
    return { ...it, found_by: found };
  });

// ---- write the captures ----------------------------------------------------

const retrieved = new Date().toISOString().slice(0, 10);
writeCapture(PKG, "osm-campus-objects", osmElements, {
  url: OSM_API,
  retrieved,
  records: osmElements.length,
  note:
    "Live re-read from the OSM editing API of every element named by the campus Claims of the 2026-10-28 Review queue (research/enseignement-superieur/precision-review-2026-10-28.json, read from the 2026-08-03 Overpass capture osm-campuses.json) and of the four BAC 2026 additions P08/P09/P10/P23 (seeds/bac-2026.json place.osm), for the ADR 0001 second-source check. Per element: version, timestamp, visibility (a deleted one is read from its history), all tags, and its point: a node's lat/lon, a way's or relation's bounding-box centre of its nodes (Overpass `out center`), plus records, the point the Claim was read at (capture_point) and moved_m between the two. Projection written by research/enseignement-superieur/fetch-second-sources.mjs; ODbL.",
});
const wikidata = {
  items,
  osm_tags: osmTags.sort((a, b) => cmp(refKey(a.element), refKey(b.element)) || cmp(a.wikidata, b.wikidata)),
  around: around.sort((a, b) => cmp(refKey(a.element), refKey(b.element))),
  searches: searches.sort((a, b) => cmp(a.language, b.language) || cmp(a.text, b.text)),
  search_hits_outside_algeria: [...new Set(searchDropped)].sort((a, b) => numQ(a) - numQ(b)),
};
writeCapture(PKG, "wikidata-campuses", wikidata, {
  url: SPARQL,
  retrieved,
  records: items.length,
  note:
    `Wikidata items that could be the same institution as a record of the 2026-10-28 campus Review queue or a BAC 2026 addition, for the ADR 0001 second-source check: the live OSM element's wikidata tag, a wikibase:around search within ${AROUND_KM} km of each Claim point for P31/P279* ${AROUND_CLASSES.join("/")}, and an MWAPI EntitySearch on the record's French and Arabic names (full, without parenthesis or ex-tail, and the part before the dash), a search hit kept only when its P17 is ${ALGERIA} or a P625 value lies in Algeria. Per item only P625 (every value, with rank), P856, P31, P402, P17 (with rank) and the fr/ar/en labels and aliases, plus found_by, the lead that brought it in. All read over the SPARQL endpoint because www.wikidata.org/w/api.php answered HTTP 429 on ${retrieved}. Written by research/enseignement-superieur/fetch-second-sources.mjs; CC0.`,
});

console.log(`osm-campus-objects: ${osmElements.length} elements (${osmElements.filter((e) => e.deleted).length} deleted, ${osmElements.filter((e) => e.moved_m != null && e.moved_m > 50).length} moved over 50 m)`);
console.log(`wikidata-campuses: ${items.length} items from ${osmTags.length} OSM tags, ${around.length} around searches, ${searches.length} name searches`);
