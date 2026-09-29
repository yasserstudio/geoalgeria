#!/usr/bin/env node
// Audit every commune centre against its OpenStreetMap chef-lieu node.
//
// WHY. The 2026-09-27 sweep (research/_commune-centres/README.md) could only see
// a centre that leaves its own commune or its own wilaya polygon. It said so
// itself: "a centre that is wrong by hundreds of metres while staying inside the
// right commune, Bethioua's class, is invisible to it". Answering that class for
// all 1,541 rows means comparing every centre with the `admin_centre` node of its
// own OSM `admin_level=8` relation, which is this script.
//
// WHAT IT IS NOT. A delta is not a defect. Our value and the OSM node are two
// different claims about where a commune's seat is, and both are placed by hand.
// So this script measures and classifies; it corrects nothing. Confirmed errors
// go through research/_commune-centres/corrections-*.json and
// scripts/fix-commune-centres.mjs, one reviewed row at a time.
//
// OUTPUTS
//   research/_commune-centres/osm-2026-09-29/admin-relations.json
//       the reduced, committed capture: one row per OSM relation with the tags
//       this repository uses and its admin_centre node's coordinates. Written by
//       --fetch from the raw Overpass response, which stays local (gitignored)
//       because its way-member lists are megabytes of noise no reviewer reads.
//   research/_commune-centres/audit-2026-09-29.json   every matched row's delta
//   research/_commune-centres/audit-2026-09-29.md     the counts and the >300 m list
//   research/_commune-centres/osm-seat-reference.json  what test/commune-centre-osm-seat
//       .test.mjs holds the data to. Undated on purpose: it is a standing
//       reference the guard reads on every run, not a one-off provenance snapshot.
//       It also carries osm_relation_id and wikidata for both communes and
//       wilayas, harvested here and NOT published as package fields (that is a
//       separate contract change).
//
// USAGE
//   node scripts/audit-commune-centres.mjs --fetch --write  # pull, then write everything
//   node scripts/audit-commune-centres.mjs --from-raw       # re-reduce a local raw pull
//   node scripts/audit-commune-centres.mjs                  # report from the capture
//   node scripts/audit-commune-centres.mjs --write          # also write the files above

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadBoundaries, pointInWilaya } from "../packages/schema/index.js";
import {
  canonicalCommunes,
  canonicalCommuneForCode,
  padCommuneCode,
  latinNameKey,
  arabicNameKey,
} from "./lib/commune-index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "packages", "dataset", "data");
const RESEARCH = join(ROOT, "research", "_commune-centres");
const PULL = "2026-09-29";
const PULL_DIR = join(RESEARCH, `osm-${PULL}`);
const RAW = join(PULL_DIR, "overpass-raw.json");
const RAW_GEOM = join(PULL_DIR, "overpass-geometry-raw.json");
const CAPTURE = join(PULL_DIR, "admin-relations.json");
const CONTAINMENT = join(PULL_DIR, "containment.json");
const QUERY_FILE = join(PULL_DIR, "overpass-query.overpassql");

const FETCH = process.argv.includes("--fetch");
const FROM_RAW = process.argv.includes("--from-raw");
const GEOMETRY = process.argv.includes("--geometry");
const FROM_RAW_GEOMETRY = process.argv.includes("--from-raw-geometry");
const WRITE = process.argv.includes("--write");

// One endpoint for the whole run. Overpass mirrors are independently replicated
// and drift by hours, so a pull split across two of them would compare rows
// against two different planet states and blame the difference on our data.
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";

// Tags kept in the capture. `ref`/`ref:ONS` are the join, `wikidata` is the
// harvest, the names are the check that the join landed on the right commune.
const KEEP_TAGS = ["admin_level", "ref", "ref:ONS", "wikidata", "name", "name:fr", "name:ar"];
// The admin_centre node's own identity. "The seat node is the named chef-lieu
// locality" is half the evidence for calling one of our values wrong, so the node's
// place class and its names are kept beside its coordinates rather than assumed.
const KEEP_NODE_TAGS = ["place", "name", "name:fr", "name:ar", "wikidata"];

const LICENCE = "ODbL 1.0, (c) OpenStreetMap contributors";

// --- fetch -------------------------------------------------------------------

async function fetchOverpass(query, into) {
  const body = `data=${encodeURIComponent(query)}`;
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      mkdirSync(PULL_DIR, { recursive: true });
      writeFileSync(into, text);
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      console.error(`Overpass attempt ${attempt} failed: ${error.message}`);
      // Overpass rate-limits per slot, so back off in minutes, not milliseconds.
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 30_000));
    }
  }
  throw lastError;
}

/** Reduce the raw response to the committed capture. */
function reduceRaw(raw) {
  const nodes = new Map(raw.elements.filter((e) => e.type === "node").map((n) => [n.id, n]));
  const relations = [];
  for (const el of raw.elements) {
    if (el.type !== "relation") continue;
    const tags = {};
    for (const key of KEEP_TAGS) if (el.tags?.[key] != null) tags[key] = el.tags[key];
    const member = (el.members ?? []).find((m) => m.role === "admin_centre" && m.type === "node");
    const node = member ? nodes.get(member.ref) : null;
    let nodeTags = null;
    if (node) {
      nodeTags = {};
      for (const key of KEEP_NODE_TAGS) if (node.tags?.[key] != null) nodeTags[key] = node.tags[key];
    }
    relations.push({
      id: el.id,
      tags,
      admin_centre: node ? { node: node.id, lng: node.lon, lat: node.lat, tags: nodeTags } : null,
    });
  }
  relations.sort((a, b) => a.id - b.id);
  return {
    generated: PULL,
    source: "OpenStreetMap administrative relations (admin_level 4 and 8) and their admin_centre nodes, via Overpass",
    endpoint: ENDPOINT,
    query: `research/_commune-centres/osm-${PULL}/overpass-query.overpassql`,
    generator: raw.generator,
    timestamp_osm_base: raw.osm3s?.timestamp_osm_base ?? null,
    licence: LICENCE,
    note: "Reduced from the raw Overpass response: the relations' way-member lists are dropped, the admin_centre node is resolved to its coordinates, and only the tags this repository joins or harvests on are kept.",
    count: relations.length,
    relations,
  };
}

// --- geometry ----------------------------------------------------------------

/** Great-circle metres between two [lng, lat] pairs. */
function metresBetween(aLng, aLat, bLng, bLat) {
  const R = 6371008.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;

// --- containment against the commune's own unsimplified OSM boundary ---------
//
// The second half of the evidence, and the standard 2026-09-27 set: a stored point
// OUTSIDE the commune's own `admin_level=8` boundary while that relation's
// admin_centre node is inside it is a coordinate error, whatever the delta says.
// The wilaya outlines this repository ships cannot answer it; they are simplified
// to a 3.4 km median vertex gap and there are no commune outlines at all.
//
// This is a second Overpass pull (`out geom` over the matched relations, ~54 MB),
// so it is opt-in: --geometry fetches it and writes the verdicts to
// containment.json, which the default run then folds in if it is there.

const ringKey = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;

/** Stitch a relation's way members of one role into closed rings. */
function stitchRings(relation, role) {
  const pool = (relation.members ?? [])
    .filter((m) => m.type === "way" && (m.role === role || (role === "outer" && !m.role)))
    .map((m) => (m.geometry ?? []).map((g) => [g.lon, g.lat]))
    .filter((g) => g.length >= 2);
  const closed = [];
  let open = 0;
  while (pool.length) {
    let ring = pool.shift().slice();
    let grew = true;
    while (grew && ringKey(ring[0]) !== ringKey(ring[ring.length - 1])) {
      grew = false;
      for (let i = 0; i < pool.length; i++) {
        const seg = pool[i];
        const head = ringKey(ring[0]);
        const tail = ringKey(ring[ring.length - 1]);
        if (ringKey(seg[0]) === tail) ring = ring.concat(seg.slice(1));
        else if (ringKey(seg[seg.length - 1]) === tail) ring = ring.concat(seg.slice().reverse().slice(1));
        else if (ringKey(seg[seg.length - 1]) === head) ring = seg.slice(0, -1).concat(ring);
        else if (ringKey(seg[0]) === head) ring = seg.slice().reverse().slice(0, -1).concat(ring);
        else continue;
        pool.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ringKey(ring[0]) === ringKey(ring[ring.length - 1])) closed.push(ring);
    else open++;
  }
  return { rings: closed, open };
}

function inRing(lng, lat, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Reduce the geometry pull to one verdict per commune. */
function reduceGeometry(rawGeom, rows) {
  const byId = new Map(
    rawGeom.elements.filter((e) => e.type === "relation").map((r) => [r.id, r]),
  );
  const verdicts = [];
  for (const row of rows) {
    const relation = byId.get(row.osm.relation);
    if (!relation) {
      verdicts.push({ code_commune: row.code_commune, relation: row.osm.relation, usable: false });
      continue;
    }
    const outer = stitchRings(relation, "outer");
    const inner = stitchRings(relation, "inner");
    const test = (lng, lat) =>
      outer.rings.some((r) => inRing(lng, lat, r)) && !inner.rings.some((r) => inRing(lng, lat, r));
    verdicts.push({
      code_commune: row.code_commune,
      relation: row.osm.relation,
      usable: outer.rings.length > 0 && outer.open === 0,
      open_rings: outer.open,
      ours_in_own_commune: test(row.ours[0], row.ours[1]),
      seat_in_own_commune: test(row.osm_seat[0], row.osm_seat[1]),
    });
  }
  return {
    generated: PULL,
    source: "OpenStreetMap admin_level=8 commune relations with full geometry (`out geom`), via Overpass",
    endpoint: ENDPOINT,
    timestamp_osm_base: rawGeom.osm3s?.timestamp_osm_base ?? null,
    licence: LICENCE,
    method:
      "Each relation's outer way members are stitched into closed rings and both points are tested against them (inner rings subtract). `usable` is false when a relation has no closed outer ring, in which case nothing is claimed about it.",
    count: verdicts.length,
    verdicts,
  };
}

// --- matching ----------------------------------------------------------------

const wilayasDoc = JSON.parse(readFileSync(join(DATASET, "wilayas.json"), "utf8"));
const wilayas = wilayasDoc.wilayas ?? wilayasDoc;
const BOUNDARIES = loadBoundaries(
  JSON.parse(readFileSync(join(DATASET, "geojson", "wilaya-boundaries.geojson"), "utf8")),
);
const seatInDeclaredWilaya = (commune, seat) =>
  pointInWilaya(seat.lng, seat.lat, String(commune.wilaya_code).padStart(2, "0"), BOUNDARIES);

// The documented mother-wilaya mapping, read from the data rather than restated.
// The 2019 reform (wilayas 49-58) renumbered its communes, so OSM relations that
// still carry the pre-reform ONS code cannot be joined on the code at all; the
// 2026 reform (59-69) kept the mother wilaya's commune codes, so those join
// directly. Nothing here guesses: a pre-reform code is only ever resolved inside
// the set of communes whose current wilaya declares that code's wilaya as its
// mother, and only when exactly one of them answers to the OSM name.
const communesByMotherWilaya = new Map();
const motherOf = new Map(
  wilayas.map((w) => [Number(w.code), Number(w.mother_wilaya_code ?? w.code)]),
);
for (const commune of canonicalCommunes) {
  const mother = motherOf.get(Number(commune.wilaya_code));
  if (mother === Number(commune.wilaya_code)) continue;
  if (!communesByMotherWilaya.has(mother)) communesByMotherWilaya.set(mother, []);
  communesByMotherWilaya.get(mother).push(commune);
}

// Relations whose commune no key resolves, pinned by relation id with what was
// checked. Every one is a transliteration gap, not an ambiguity: the ONS ref is
// the documented pre-2019 code inside the right mother wilaya, the Arabic name is
// the same name spelled differently, and the relation's admin_centre node falls
// inside the commune's declared current wilaya polygon (asserted below, so a pin
// that stops being true fails the run instead of quietly standing).
//   relation -> [code_commune, why]
const PINNED_RELATIONS = new Map([
  [4175368, [5303, "ref 1110, Tamanrasset's Foggaret Ezzaouia; we spell it Foggaret Ezzoua"]],
  [4175371, [5302, "ref 1103, Tamanrasset's In Ghar; we spell it Inghar"]],
  [4175376, [5402, "ref 1107, Tamanrasset's Tinzaouten; we spell it Tin Zouatine"]],
  [6531001, [5202, "ref 0803, Bechar's Ouled Khoudir; we spell it Ouled-Khodeir"]],
  [6542940, [5512, "ref 3019, Ouargla's Megarine; OSM name:fr reads Magarine"]],
  [21037899, [4401, 'no ONS ref at all; name is "Commune Ain Defla", the only w44 commune left unclaimed']],
]);

const osmNameKeys = (tags) => ({
  fr: latinNameKey(tags["name:fr"] ?? tags.name ?? ""),
  ar: arabicNameKey(tags["name:ar"] ?? ""),
});

/** One commune in `candidates` whose French or Arabic name the relation carries. */
function uniqueByName(candidates, tags) {
  const keys = osmNameKeys(tags);
  const hits = candidates.filter(
    (c) =>
      (keys.fr && latinNameKey(c.name_fr) === keys.fr) ||
      (keys.ar && arabicNameKey(c.name_ar) === keys.ar),
  );
  return hits.length === 1 ? hits[0] : null;
}

function matchRelations(capture) {
  const communeRels = capture.relations.filter((r) => r.tags.admin_level === "8");
  const wilayaRels = capture.relations.filter((r) => r.tags.admin_level === "4");

  const byCommune = new Map(); // code_commune -> { relation, how }
  const claimedBy = new Map(); // code_commune -> relation id
  const leftover = [];

  const claim = (commune, relation, how) => {
    if (claimedBy.has(commune.code_commune)) {
      throw new Error(
        `commune ${commune.code_commune} claimed by relations ${claimedBy.get(commune.code_commune)} and ${relation.id}`,
      );
    }
    claimedBy.set(commune.code_commune, relation.id);
    byCommune.set(commune.code_commune, { relation, how });
  };

  // Pass 1: the ONS code, which is the join for 2 of every 3 wilayas and for both
  // reforms that kept their codes.
  for (const relation of communeRels) {
    const ref = padCommuneCode(relation.tags["ref:ONS"] ?? relation.tags.ref);
    const commune = ref ? canonicalCommuneForCode(ref) : null;
    if (commune) claim(commune, relation, "ref:ONS");
    else leftover.push(relation);
  }

  // Pass 2: a pre-2019-reform ONS code, resolved inside its mother wilaya's
  // carved-out communes by name.
  const stillLeft = [];
  for (const relation of leftover) {
    const ref = padCommuneCode(relation.tags["ref:ONS"] ?? relation.tags.ref);
    const motherWilaya = ref ? Number(ref.slice(0, 2)) : null;
    const candidates = (communesByMotherWilaya.get(motherWilaya) ?? []).filter(
      (c) => !claimedBy.has(c.code_commune),
    );
    const commune = candidates.length ? uniqueByName(candidates, relation.tags) : null;
    if (commune) claim(commune, relation, "pre-reform ref:ONS + name in mother wilaya");
    else stillLeft.push(relation);
  }

  // Pass 3: name alone, and only when it is unambiguous across all 1,541 unclaimed
  // communes. A relation with no ONS ref has no wilaya to scope to, so ambiguity
  // is the whole risk and an ambiguous name is reported, never resolved.
  const afterName = [];
  for (const relation of stillLeft) {
    const candidates = canonicalCommunes.filter((c) => !claimedBy.has(c.code_commune));
    const commune = uniqueByName(candidates, relation.tags);
    if (commune) claim(commune, relation, "unique name, no ONS ref");
    else afterName.push(relation);
  }

  // Pass 4: the hand-checked pins above.
  const unmatchedRelations = [];
  for (const relation of afterName) {
    const pin = PINNED_RELATIONS.get(relation.id);
    if (!pin) {
      unmatchedRelations.push(relation);
      continue;
    }
    const commune = canonicalCommuneForCode(pin[0]);
    if (!commune) throw new Error(`pin for relation ${relation.id} names unknown commune ${pin[0]}`);
    if (!relation.admin_centre || !seatInDeclaredWilaya(commune, relation.admin_centre))
      throw new Error(
        `pinned relation ${relation.id} -> ${commune.name_fr} (${pin[0]}): its admin_centre node is not inside wilaya ${commune.wilaya_code}`,
      );
    claim(commune, relation, `pinned: ${pin[1]}`);
  }
  // A pin that no longer applies is a stale claim about OSM, not a spare line.
  for (const [id] of PINNED_RELATIONS) {
    if (![...byCommune.values()].some((v) => v.relation.id === id))
      throw new Error(`pinned relation ${id} matched on its own or is gone from the capture; review the pin`);
  }

  return { byCommune, wilayaRels, unmatchedRelations };
}

// --- hints -------------------------------------------------------------------

/** Nearest OTHER commune's OSM seat, for the "another commune's seat" hint. */
function buildSeatList(byCommune) {
  const seats = [];
  for (const [code, { relation }] of byCommune) {
    if (relation.admin_centre) seats.push({ code, ...relation.admin_centre });
  }
  return seats;
}

/** Why our value might differ, as a lead for the reviewer, never as a verdict. */
function hintFor(commune, seat, seats) {
  const ourLng = Number(commune.longitude);
  const ourLat = Number(commune.latitude);
  const near = (a, b) => Math.abs(a - b) < 0.002; // ~200 m

  if (near(ourLng, seat.lat) && near(ourLat, seat.lng)) return "swap";
  if (near(Math.abs(ourLng), Math.abs(seat.lng)) && near(ourLat, seat.lat) && ourLng * seat.lng < 0)
    return "sign";
  if (near(Math.abs(ourLat), Math.abs(seat.lat)) && near(ourLng, seat.lng) && ourLat * seat.lat < 0)
    return "sign";

  let nearest = null;
  for (const other of seats) {
    if (other.code === commune.code_commune) continue;
    const d = metresBetween(ourLng, ourLat, other.lng, other.lat);
    if (!nearest || d < nearest.d) nearest = { d, code: other.code };
  }
  if (nearest && nearest.d < 1000) {
    const other = canonicalCommuneForCode(nearest.code);
    return `other commune's seat: ${other.name_fr} (${nearest.code}) at ${Math.round(nearest.d)} m`;
  }
  return "plausible";
}

// --- main --------------------------------------------------------------------

const capture = FETCH
  ? reduceRaw(await fetchOverpass(readFileSync(QUERY_FILE, "utf8"), RAW))
  : FROM_RAW
    ? reduceRaw(JSON.parse(readFileSync(RAW, "utf8")))
    : JSON.parse(readFileSync(CAPTURE, "utf8"));
if ((FETCH || FROM_RAW) && WRITE) {
  writeFileSync(CAPTURE, `${JSON.stringify(capture, null, 2)}\n`);
  console.log(`wrote ${CAPTURE} (${capture.count} relations, timestamp_osm_base ${capture.timestamp_osm_base})`);
}

const { byCommune, wilayaRels, unmatchedRelations } = matchRelations(capture);
const seats = buildSeatList(byCommune);

const rows = [];
const noSeat = [];
const unmatchedCommunes = [];
const nameDisagreements = [];
for (const commune of canonicalCommunes) {
  const hit = byCommune.get(commune.code_commune);
  if (!hit) {
    unmatchedCommunes.push(commune);
    continue;
  }
  const { relation, how } = hit;
  const keys = osmNameKeys(relation.tags);
  // The join is by code for 1,477 of the rows, so the name is the independent
  // check on it, not another key. A disagreement is reported next to its delta.
  if (
    keys.fr !== latinNameKey(commune.name_fr) &&
    keys.ar !== arabicNameKey(commune.name_ar)
  ) {
    nameDisagreements.push(
      `${commune.name_fr} (${commune.code_commune}) vs OSM ${relation.id} "${relation.tags["name:fr"] ?? relation.tags.name}" / "${relation.tags["name:ar"] ?? ""}"`,
    );
  }
  if (!relation.admin_centre) {
    noSeat.push(commune);
    continue;
  }
  const seat = relation.admin_centre;
  // Measured between the ROUNDED values, because those are the ones published in
  // the seat reference and held in the carriers at 6 decimals. Measuring the raw
  // OSM node instead puts the audit and its own guard a metre apart on some rows.
  const ours = [round6(Number(commune.longitude)), round6(Number(commune.latitude))];
  const osmSeat = [round6(seat.lng), round6(seat.lat)];
  const delta = metresBetween(ours[0], ours[1], osmSeat[0], osmSeat[1]);
  rows.push({
    code_commune: commune.code_commune,
    wilaya_code: Number(commune.wilaya_code),
    name_fr: commune.name_fr,
    name_ar: commune.name_ar,
    ours,
    osm_seat: osmSeat,
    delta_m: Math.round(delta),
    matched_by: how,
    osm: {
      relation: relation.id,
      admin_centre_node: seat.node,
      "ref:ONS": relation.tags["ref:ONS"] ?? relation.tags.ref ?? null,
      wikidata: relation.tags.wikidata ?? null,
      name: relation.tags.name ?? null,
    },
    // The seat node's own identity: is it the locality this commune is named
    // after? `place` says what kind of settlement it is, and seat_name_agrees
    // whether it carries the commune's name in either language.
    seat_node: seat.tags ?? null,
    seat_name_agrees: seat.tags
      ? latinNameKey(seat.tags["name:fr"] ?? seat.tags.name ?? "") === latinNameKey(commune.name_fr) ||
        arabicNameKey(seat.tags["name:ar"] ?? "") === arabicNameKey(commune.name_ar)
      : false,
    name_agrees:
      keys.fr === latinNameKey(commune.name_fr) || keys.ar === arabicNameKey(commune.name_ar),
    // Independent of the delta: if the seat itself is outside the wilaya we
    // declare the commune in, the disagreement is about the linkage or the
    // shipped outline, not about how far apart two seat claims are.
    seat_in_declared_wilaya: seatInDeclaredWilaya(commune, seat),
  });
}

rows.sort((a, b) => b.delta_m - a.delta_m || a.code_commune - b.code_commune);

// --- fold in the containment verdicts ----------------------------------------

let containment = null;
if (GEOMETRY || FROM_RAW_GEOMETRY) {
  const ids = rows.map((r) => r.osm.relation).sort((a, b) => a - b);
  const query = `[out:json][timeout:900];\nrel(id:${ids.join(",")});\nout geom;\n`;
  const rawGeom = GEOMETRY
    ? await fetchOverpass(query, RAW_GEOM)
    : JSON.parse(readFileSync(RAW_GEOM, "utf8"));
  containment = reduceGeometry(rawGeom, rows);
  if (WRITE) {
    writeFileSync(CONTAINMENT, `${JSON.stringify(containment, null, 2)}\n`);
    console.log(`wrote ${CONTAINMENT} (timestamp_osm_base ${containment.timestamp_osm_base})`);
  }
} else {
  try {
    containment = JSON.parse(readFileSync(CONTAINMENT, "utf8"));
  } catch {
    containment = null;
  }
}
if (containment) {
  const byCode = new Map(containment.verdicts.map((v) => [v.code_commune, v]));
  for (const row of rows) {
    const v = byCode.get(row.code_commune);
    if (!v) continue;
    row.ours_in_own_commune = v.usable ? v.ours_in_own_commune : null;
    row.seat_in_own_commune = v.usable ? v.seat_in_own_commune : null;
  }
}

// The 2026-09-27 standard, restated: our point outside the commune's own
// unsimplified OSM boundary while that relation's admin_centre node is inside it,
// and the node is the locality the commune is named after. Nothing else here is a
// decided error, and even this is a decision, not an application: corrections go
// through research/_commune-centres/corrections-*.json and fix-commune-centres.mjs.
const decided = containment
  ? rows.filter(
      (r) =>
        r.ours_in_own_commune === false &&
        r.seat_in_own_commune === true &&
        r.seat_name_agrees &&
        r.seat_in_declared_wilaya,
    )
  : [];
const over = (m) => rows.filter((r) => r.delta_m > m).length;
const above300 = rows.filter((r) => r.delta_m > 300).map((r) => ({
  ...r,
  hint: hintFor(canonicalCommuneForCode(r.code_commune), byCommune.get(r.code_commune).relation.admin_centre, seats),
}));

console.log(`capture timestamp_osm_base ${capture.timestamp_osm_base} (${ENDPOINT})`);
console.log(`matched ${byCommune.size} of ${canonicalCommunes.length} communes to an OSM admin_level=8 relation`);
console.log(`  compared ${rows.length}; ${noSeat.length} matched relation(s) carry no admin_centre node`);
console.log(`  ${unmatchedCommunes.length} commune(s) with no relation, ${unmatchedRelations.length} relation(s) with no commune`);
for (const c of unmatchedCommunes) console.log(`    no relation: ${c.name_fr} (${c.code_commune}, w${c.wilaya_code})`);
for (const r of unmatchedRelations)
  console.log(`    no commune: relation ${r.id} ref ${r.tags["ref:ONS"] ?? r.tags.ref ?? "-"} "${r.tags.name ?? r.tags["name:fr"]}"`);
// Transliteration variance, overwhelmingly: the join is the ONS code and the name
// is only the independent read on it. The full list lives in the JSON so a row
// that disagrees on the name AND carries a large delta can be told apart.
console.log(`  ${nameDisagreements.length} matched row(s) whose FR and AR names both differ from OSM's (see the JSON)`);
const seatOutside = rows.filter((r) => !r.seat_in_declared_wilaya);
console.log(`  ${seatOutside.length} matched row(s) whose OSM seat is outside the wilaya we declare`);
console.log(`deltas: >300 m ${over(300)} · >1 km ${over(1000)} · >5 km ${over(5000)} · max ${rows[0]?.delta_m ?? 0} m`);
console.log(
  containment
    ? `containment: ${rows.filter((r) => r.ours_in_own_commune === false).length} stored point(s) outside their own commune; ${decided.length} meet the 2026-09-27 evidence standard in full`
    : "containment: not computed (run --geometry for the second pull)",
);
const wilayaHarvest = wilayaRels.filter((r) => r.tags.wikidata).length;
console.log(`harvest: wikidata on ${rows.filter((r) => r.osm.wikidata).length}/${rows.length} communes, ${wilayaHarvest}/${wilayaRels.length} wilayas`);

if (!WRITE) process.exit(0);

// --- written artefacts -------------------------------------------------------

const header = {
  generated: PULL,
  source: capture.source,
  endpoint: capture.endpoint,
  timestamp_osm_base: capture.timestamp_osm_base,
  licence: LICENCE,
};

writeFileSync(
  join(RESEARCH, `audit-${PULL}.json`),
  `${JSON.stringify(
    {
      ...header,
      method:
        "Every commune centre this repository ships compared with the admin_centre (chef-lieu) node of its own OSM admin_level=8 relation. Joined on ref:ONS, then on a pre-2019-reform ONS code resolved by name inside the mother wilaya's carved-out communes, then on a globally unique name. A delta is not a defect: both values are hand-placed claims about the same seat.",
      compared: rows.length,
      counts: {
        over_300_m: over(300),
        over_1000_m: over(1000),
        over_5000_m: over(5000),
        outside_own_commune: rows.filter((r) => r.ours_in_own_commune === false).length,
        decided_errors: decided.length,
      },
      unmatched_communes: unmatchedCommunes.map((c) => ({
        code_commune: c.code_commune,
        wilaya_code: Number(c.wilaya_code),
        name_fr: c.name_fr,
        name_ar: c.name_ar,
      })),
      unmatched_relations: unmatchedRelations.map((r) => ({ relation: r.id, tags: r.tags })),
      name_disagreements: nameDisagreements,
      review: above300,
      all: rows,
    },
    null,
    2,
  )}\n`,
);

const summaryRows = above300
  .map(
    (r) =>
      `| ${r.code_commune} | ${r.name_fr} | ${r.wilaya_code} | ${r.delta_m} | ${r.ours.join(", ")} | ${r.osm_seat.join(", ")} | ${r.hint} |`,
  )
  .join("\n");

writeFileSync(
  join(RESEARCH, `audit-${PULL}.md`),
  `# Commune centres against their OSM chef-lieu node (${PULL})

Answers the class the 2026-09-27 containment sweep could not see: a centre that is
wrong while staying inside the right commune. Every one of the
${canonicalCommunes.length} commune centres is compared with the \`admin_centre\`
node of its own OpenStreetMap \`admin_level=8\` relation.

- Source: ${capture.source}
- Endpoint: ${ENDPOINT}, one endpoint for the whole run (mirrors drift)
- Overpass \`timestamp_osm_base\`: **${capture.timestamp_osm_base}**
- Licence: ${LICENCE}
- Machine-readable: \`audit-${PULL}.json\`

## Coverage

| | Count |
| --- | --- |
| commune centres shipped | ${canonicalCommunes.length} |
| matched to an OSM relation | ${byCommune.size} |
| compared (matched relation has an \`admin_centre\` node) | ${rows.length} |
| communes with no OSM relation | ${unmatchedCommunes.length} |
| OSM relations with no commune | ${unmatchedRelations.length} |

## Deltas

| Band | Count |
| --- | --- |
| over 300 m | ${over(300)} |
| over 1 km | ${over(1000)} |
| over 5 km | ${over(5000)} |
| largest | ${rows[0]?.delta_m ?? 0} m |

A delta is not a defect. Our value and the OSM node are two hand-placed claims
about the same seat, and the node can be the wrong one of the two.

## Above 300 m, by delta

| Code | Commune | Wilaya | Delta (m) | Ours (lng, lat) | OSM seat (lng, lat) | Hint |
| --- | --- | --- | --- | --- | --- | --- |
${summaryRows}
`,
);

// The standing reference the guard holds the data to.
writeFileSync(
  join(RESEARCH, "osm-seat-reference.json"),
  `${JSON.stringify(
    {
      ...header,
      note: "The reference test/commune-centre-osm-seat.test.mjs reads. Undated because the guard reads it on every run; refresh it in place with `node scripts/audit-commune-centres.mjs --fetch --write` and review the diff. `osm_relation_id` and `wikidata` are harvested here and are deliberately NOT package fields yet.",
      communes: rows.map((r) => ({
        code_commune: r.code_commune,
        wilaya_code: r.wilaya_code,
        name_fr: r.name_fr,
        seat: r.osm_seat,
        osm_relation_id: r.osm.relation,
        admin_centre_node: r.osm.admin_centre_node,
        wikidata: r.osm.wikidata,
      })),
      wilayas: wilayaRels
        .map((r) => ({
          wilaya_code: Number(r.tags["ref:ONS"] ?? r.tags.ref),
          name_fr: r.tags["name:fr"] ?? r.tags.name ?? null,
          osm_relation_id: r.id,
          wikidata: r.tags.wikidata ?? null,
        }))
        .sort((a, b) => a.wilaya_code - b.wilaya_code),
    },
    null,
    2,
  )}\n`,
);

// The decided errors, in the exact shape scripts/fix-commune-centres.mjs reads, so
// applying them is a rename and one command. Deliberately NOT named
// corrections-*.json and deliberately not applied here: moving 174 flagship centres
// re-derives ten dependent packages (research/_commune-centres/README.md), which is
// a release of its own, not a rider on an audit.
if (decided.length) {
  writeFileSync(
    join(RESEARCH, `pending-corrections-${PULL}.json`),
    `${JSON.stringify(
      {
        ...header,
        method:
          "Every row here fails the 2026-09-27 standard in full: the stored point is outside the commune's own unsimplified OSM admin_level=8 boundary, that relation's admin_centre node is inside it and inside the declared wilaya, and the node carries the commune's own name. `to` is that node rounded to 6 decimals. Corrections-file shaped, NOT applied.",
        applied: false,
        count: decided.length,
        corrections: decided.map((r) => ({
          code_commune: r.code_commune,
          wilaya_code: r.wilaya_code,
          name_fr: r.name_fr,
          name_ar: r.name_ar,
          from: r.ours,
          to: r.osm_seat,
          delta_m: r.delta_m,
          osm: {
            relation: r.osm.relation,
            admin_centre_node: r.osm.admin_centre_node,
            "ref:ONS": r.osm["ref:ONS"] ?? null,
            name: r.osm.name,
            admin_centre_place: r.seat_node?.place ?? null,
            admin_centre_name: r.seat_node?.name ?? null,
          },
          evidence: {
            stored_in_own_commune_boundary: false,
            admin_centre_in_own_commune_boundary: true,
            admin_centre_in_declared_wilaya: true,
            admin_centre_carries_commune_name: true,
          },
        })),
      },
      null,
      2,
    )}\n`,
  );
}

// The guard's exceptions. Every centre already over the 1 km line at this audit is
// listed with the reason it is there, pinned to the metre, so the line holds from
// today forward without pretending today is clean. A row that moves at all, in
// either direction, fails and has to be re-decided.
const GUARD_M = 1000;
const exceptions = rows
  .filter((r) => r.delta_m > GUARD_M)
  .map((r) => ({
    code_commune: r.code_commune,
    wilaya_code: r.wilaya_code,
    name_fr: r.name_fr,
    delta_m: r.delta_m,
    reason:
      r.ours_in_own_commune === false && decided.includes(r)
        ? "decided coordinate error: stored point outside its own OSM commune boundary, admin_centre inside it and named for the commune; awaiting the correction release (pending-corrections-2026-09-29.json)"
        : r.ours_in_own_commune === false
          ? "stored point outside its own OSM commune boundary, but the admin_centre evidence is incomplete; needs a hand decision"
          : r.seat_in_declared_wilaya === false
            ? "the OSM seat itself is outside the wilaya we declare, so the linkage or the shipped outline is the suspect, not the delta"
            : "unreviewed: stored point is inside its own OSM commune, so this is two hand-placed claims about one seat; pending the one-time review of every delta over 300 m",
  }))
  .sort((a, b) => a.code_commune - b.code_commune);

writeFileSync(
  join(RESEARCH, "seat-exceptions.json"),
  `${JSON.stringify(
    {
      generated: PULL,
      guard: "test/commune-centre-osm-seat.test.mjs",
      tolerance_m: GUARD_M,
      note: "Communes allowed to sit further than tolerance_m from their recorded OSM seat, each with the reason and the exact distance measured at the 2026-09-29 audit. The distance is part of the pin: a listed commune that moves is a new fact and fails rather than being absorbed. Regenerate with `node scripts/audit-commune-centres.mjs --write` after any centre correction.",
      count: exceptions.length,
      // Communes the guard cannot measure at all, because OSM carries no
      // admin_level=8 relation for them. Pinned so one quietly losing its
      // reference cannot turn into a pass.
      no_reference: unmatchedCommunes
        .map((c) => `${c.name_fr} (w${c.wilaya_code})`)
        .sort(),
      exceptions,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `wrote audit-${PULL}.json, audit-${PULL}.md, osm-seat-reference.json, seat-exceptions.json (${exceptions.length})` +
    (decided.length ? ` and pending-corrections-${PULL}.json (${decided.length})` : ""),
);
