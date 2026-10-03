#!/usr/bin/env node
// Build the committed commune-boundary cache the containment guard reads, and the
// seat-distance report that replaced the seat-distance guard.
//
// WHY A CACHE AND NOT A QUERY. test/commune-centre-in-commune.test.mjs asks one
// question of every commune centre in every file that carries one: is it inside its
// own commune? Answering it needs commune polygons, which this repository does not
// publish (it ships 69 wilaya outlines, simplified to a 3.4 km median vertex gap,
// and nothing at commune level). The polygons exist only in OpenStreetMap, and the
// `out geom` pull that carries them is 52 MB of way-member geometry. A test that
// fetches is a test that fails when Overpass is busy, and a moving reference cannot
// be a ratchet, so the pull is reduced once, here, into a file the test reads.
//
// WHAT "REDUCED" COSTS, AND THE PROOF IT COSTS NOTHING TODAY. Each relation's outer
// and inner rings are stitched from its way members, then simplified with
// Douglas-Peucker at TOLERANCE_DEG and rounded to 5 decimals (~1.1 m). That is a
// display-grade outline by this repository's own standard, roughly 30 times finer
// than the shipped wilaya outlines, and it is not asserted to be safe: this script
// tests every one of the 1,541 stored centres against BOTH the unsimplified rings
// and the reduced ones and refuses to write if a single verdict disagrees. It also
// records each centre's distance to the reduced boundary, so the rows where the
// reduction is doing the deciding are countable rather than assumed. A centre that
// lands within TOLERANCE_DEG of a commune border in future is decided by
// research/_commune-centres/osm-<pull>/containment.json, which is computed from the
// unsimplified geometry, not by this cache.
//
// WHY CONTAINMENT AND NOT DISTANCE. The Owner's 2026-09-29 decision (private
// tracker #170), replacing the 1 km seat-distance rule the same day it shipped: the
// standing guard enforces containment, and the distance to the OSM seat becomes a
// report. The median delta over all 1,537 compared rows is 402 m and 496 were over
// 1 km on the day the line was drawn, because our value and the OSM node are two
// hand-placed claims about one seat. A rule that needs 496 exceptions is measuring
// disagreement, not error. Containment is a fact about one claim: a centre outside
// its own commune is wrong whatever the other claim says, which is exactly how the
// 189 corrections of this batch were decided.
//
// OUTPUTS
//   research/_commune-centres/commune-boundaries.json
//       the reduced polygons, undated on purpose: a standing reference the guard
//       reads on every run, refreshed in place.
//   research/_commune-centres/commune-boundaries.provenance.json
//       the cache's content digest, held in its own file so the geometry and the
//       proof of it are two committed files rather than one. The reasoning is in
//       scripts/lib/boundary-cache-provenance.mjs; the gate is
//       test/boundary-cache-provenance.test.mjs.
//   research/_commune-centres/containment-exceptions.json
//       the documented exceptions, one reason each: every commune the guard cannot
//       decide (no OSM relation, unusable geometry) and every centre still outside
//       its own commune after this batch.
//   research/_commune-centres/seat-distance-2026-09-29.md
//       the seat delta as a report. No test reads it.
//
// USAGE
//   node scripts/build-commune-boundary-cache.mjs --fetch-geometry --write
//       pull `out geom` for the relations the committed audit matched, reduce it and
//       write everything. One Overpass request; it is 52 MB and rate-limited.
//   node scripts/build-commune-boundary-cache.mjs --from-raw-geometry --write
//       the same from a local (gitignored) pull, optionally at --raw-geometry <path>
//   node scripts/build-commune-boundary-cache.mjs --write
//       re-emit the committed cache, its digest, the exceptions and the report with
//       nothing refetched. Deterministic: identical input, identical bytes.
//   node scripts/build-commune-boundary-cache.mjs
//       re-verify the committed cache against the current data, write nothing
//   node scripts/build-commune-boundary-cache.mjs --verdicts <path>
//       the same, and write the verdicts the refresh workflow diffs, nothing else

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalCommunes } from "./lib/commune-index.mjs";
import {
  PROVENANCE_FILE,
  boundaryCacheHash,
  sealEnvelope,
  serialiseCache,
  serialiseProvenance,
} from "./lib/boundary-cache-provenance.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH = join(ROOT, "research", "_commune-centres");
const PULL = "2026-09-29";
const PULL_DIR = join(RESEARCH, `osm-${PULL}`);
const AUDIT = join(RESEARCH, `audit-${PULL}.json`);
const SEATS = join(RESEARCH, "osm-seat-reference.json");
const CACHE = join(RESEARCH, "commune-boundaries.json");
const PROVENANCE = join(RESEARCH, PROVENANCE_FILE);
const EXCEPTIONS = join(RESEARCH, "containment-exceptions.json");
const REPORT = join(RESEARCH, `seat-distance-${PULL}.md`);

/** `--flag value`, so the refresh workflow can point at its own paths. */
const option = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? null : (process.argv[at + 1] ?? null);
};

const FETCH_GEOMETRY = process.argv.includes("--fetch-geometry");
const RAW_GEOM = option("--raw-geometry") ?? join(PULL_DIR, "overpass-geometry-raw.json");
const FROM_RAW_GEOMETRY = process.argv.includes("--from-raw-geometry") || FETCH_GEOMETRY;
const VERDICTS = option("--verdicts");
const WRITE = process.argv.includes("--write");

// One endpoint for the whole run, for the reason scripts/audit-commune-centres.mjs
// states: Overpass mirrors are independently replicated and drift by hours, so a
// pull split across two of them compares rows against two planet states.
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const LICENCE = "ODbL 1.0, (c) OpenStreetMap contributors";

// ~55 m of Douglas-Peucker, at 5 decimals (~1.1 m). Chosen as the coarsest rung
// that keeps the committed file reviewable while every verdict is still proved
// against the unsimplified rings below; a tolerance is only ever as good as that
// proof, so it is a constant here and an assertion there.
const TOLERANCE_DEG = 0.0005;
const PRECISION = 5;

// --- geometry ----------------------------------------------------------------
// Ring stitching and the crossing test are the same code as
// scripts/audit-commune-centres.mjs, which decided the 189 corrections. Duplicated
// deliberately: this script has to be able to disagree with that one, and a shared
// helper would make the two verdicts the same computation by construction instead
// of the same answer by check.

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

const inside = (lng, lat, outer, inner) =>
  outer.some((r) => inRing(lng, lat, r)) && !inner.some((r) => inRing(lng, lat, r));

/** Perpendicular distance from p to segment a-b, in degrees. */
function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker, iterative so a 30,000-vertex ring cannot blow the stack. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let far = -1;
    let farthest = 0;
    for (let i = start + 1; i < end; i++) {
      const d = segDist(points[i], points[start], points[end]);
      if (d > farthest) {
        farthest = d;
        far = i;
      }
    }
    if (farthest > tolerance) {
      keep[far] = 1;
      stack.push([start, far], [far, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n) => Number(n.toFixed(PRECISION));
const reduceRing = (ring) => simplify(ring, TOLERANCE_DEG).map((p) => [round(p[0]), round(p[1])]);

/** Smallest distance in degrees from a point to any ring edge. */
function distanceToRings(point, ringSets) {
  let best = Infinity;
  for (const rings of ringSets) {
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        best = Math.min(best, segDist(point, ring[j], ring[i]));
      }
    }
  }
  return best;
}

// Degrees to metres, at the latitude the row sits at. Only used to report a margin,
// never to decide one, so the small-angle approximation is honest here.
const DEG_M = 111_320;
const marginMetres = (deg, lat) => Math.round(deg * DEG_M * Math.cos((lat * Math.PI) / 180));

// --- the pull -----------------------------------------------------------------

/**
 * Fetch the `out geom` pull for exactly the relations the committed audit matched,
 * and keep it. It is 52 MB and Overpass is rate-limited, so the response is written
 * to a gitignored file first: a rebuild that then fails is re-run from the file with
 * --from-raw-geometry rather than by asking the mirror again.
 */
async function fetchGeometry(relationIds, into) {
  const query = `[out:json][timeout:900];\nrel(id:${relationIds.join(",")});\nout geom;\n`;
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) throw new Error(`Overpass ${response.status} ${response.statusText}`);
  const text = await response.text();
  writeFileSync(into, text);
  console.log(`fetched ${relationIds.length} relation(s) into ${into} (${text.length} bytes)`);
  return JSON.parse(text);
}

// --- the data under test ------------------------------------------------------

const centres = new Map(
  canonicalCommunes.map((c) => [c.code_commune, { ...c, point: [c.longitude, c.latitude] }]),
);
if (centres.size !== canonicalCommunes.length) throw new Error("duplicate code_commune in the flagship set");

const audit = JSON.parse(readFileSync(AUDIT, "utf-8"));
/** code_commune -> the OSM relation the 2026-09-29 audit matched it to. */
const relationOf = new Map(audit.all.map((r) => [r.code_commune, r.osm.relation]));

// --- build or verify ----------------------------------------------------------

let cache;
if (FROM_RAW_GEOMETRY) {
  const rawGeom = FETCH_GEOMETRY
    ? await fetchGeometry(
        [...new Set(relationOf.values())].filter((id) => Number.isInteger(id)).sort((a, b) => a - b),
        RAW_GEOM,
      )
    : JSON.parse(readFileSync(RAW_GEOM, "utf-8"));
  const byId = new Map(rawGeom.elements.filter((e) => e.type === "relation").map((r) => [r.id, r]));
  const communes = [];
  const disagreements = [];
  for (const [code, commune] of [...centres].sort((a, b) => a[0] - b[0])) {
    const relationId = relationOf.get(code);
    const relation = relationId == null ? null : byId.get(relationId);
    if (!relation) {
      communes.push({ code_commune: code, name_fr: commune.name_fr, wilaya_code: Number(commune.wilaya_code), osm_relation_id: relationId ?? null, usable: false, reason: "no admin_level=8 relation in the pull" });
      continue;
    }
    const outer = stitchRings(relation, "outer");
    const inner = stitchRings(relation, "inner");
    if (outer.rings.length === 0 || outer.open > 0) {
      communes.push({ code_commune: code, name_fr: commune.name_fr, wilaya_code: Number(commune.wilaya_code), osm_relation_id: relation.id, usable: false, reason: `${outer.open} open outer ring(s), ${outer.rings.length} closed` });
      continue;
    }
    const reducedOuter = outer.rings.map(reduceRing);
    const reducedInner = inner.rings.map(reduceRing);
    const full = inside(commune.point[0], commune.point[1], outer.rings, inner.rings);
    const reduced = inside(commune.point[0], commune.point[1], reducedOuter, reducedInner);
    if (full !== reduced) disagreements.push(`${commune.name_fr} (${code}): unsimplified says ${full}, reduced says ${reduced}`);
    const lngs = reducedOuter.flat().map((p) => p[0]);
    const lats = reducedOuter.flat().map((p) => p[1]);
    communes.push({
      code_commune: code,
      name_fr: commune.name_fr,
      wilaya_code: Number(commune.wilaya_code),
      osm_relation_id: relation.id,
      usable: true,
      bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      margin_m: marginMetres(distanceToRings(commune.point, [reducedOuter, reducedInner]), commune.point[1]),
      outer: reducedOuter,
      inner: reducedInner,
    });
  }
  // The whole justification for committing a simplified outline. If one verdict
  // moved, the tolerance is wrong for this data and nothing is written.
  if (disagreements.length) {
    console.error(`${disagreements.length} verdict(s) disagree between the unsimplified and reduced rings; nothing written:`);
    for (const d of disagreements) console.error(`  ${d}`);
    process.exit(1);
  }
  // `generated`, `note`, `query` and the relation identity are set by sealEnvelope,
  // which both this path and a plain re-emit go through, so the two write the same
  // bytes from the same pull. `generated` follows timestamp_osm_base rather than the
  // clock: an unchanged OSM base must leave no diff for the refresh workflow to open
  // a pull request about.
  cache = sealEnvelope({
    source: "OpenStreetMap admin_level=8 commune relations with full geometry (`out geom`), via Overpass",
    endpoint: ENDPOINT,
    timestamp_osm_base: rawGeom.osm3s?.timestamp_osm_base ?? null,
    licence: LICENCE,
    tolerance_deg: TOLERANCE_DEG,
    precision: PRECISION,
    communes,
  });
} else {
  cache = sealEnvelope(JSON.parse(readFileSync(CACHE, "utf-8")));
}

// --- the verdict over the current data ---------------------------------------

const byCode = new Map(cache.communes.map((c) => [c.code_commune, c]));
const auditRow = new Map(audit.all.map((r) => [r.code_commune, r]));

/** Why a centre outside its own commune was not corrected in the 2026-09-29 batch.
 *  The 189 that were corrected met all four tests; each of these fails one, and
 *  which one it fails is what a hand decision would have to answer. */
function whyNotCorrected(code) {
  const r = auditRow.get(code);
  if (!r) return "not compared in the 2026-09-29 audit, so there is no seat evidence either way";
  if (r.seat_in_own_commune === false)
    return "the relation's admin_centre node is outside the commune too, so OSM has no in-commune seat to move to; the boundary or the linkage is the suspect";
  if (r.seat_in_own_commune === null)
    return "the relation's geometry is unusable, so nothing can be said about where its admin_centre sits";
  if (!r.seat_in_declared_wilaya)
    return "the admin_centre node is inside the commune but outside the wilaya we declare the commune in, which makes the linkage or the shipped outline the suspect, not the point";
  if (!r.seat_name_agrees)
    return (
      "the admin_centre node is not this commune's seat on any of the three reads scripts/lib/seat-evidence.mjs " +
      "makes: it carries neither the commune's folded name in either script, nor that name once the definite " +
      "article is dropped, nor the same wikidata item as its own relation"
    );
  return "outside its own commune with the four evidence tests all met, which should have been corrected: re-run the audit";
}

const outside = [];
const undecidable = [];
const nearEdge = [];
for (const [code, commune] of [...centres].sort((a, b) => a[0] - b[0])) {
  const boundary = byCode.get(code);
  if (!boundary || !boundary.usable) {
    undecidable.push({ code_commune: code, wilaya_code: Number(commune.wilaya_code), name_fr: commune.name_fr, reason: boundary?.reason ?? "not in the boundary cache" });
    continue;
  }
  const within = inside(commune.point[0], commune.point[1], boundary.outer, boundary.inner);
  if (!within)
    outside.push({
      code_commune: code,
      wilaya_code: Number(commune.wilaya_code),
      name_fr: commune.name_fr,
      osm_relation_id: boundary.osm_relation_id,
      metres_outside: boundary.margin_m,
      seat_delta_m: auditRow.get(code)?.delta_m ?? null,
      reason: whyNotCorrected(code),
    });
  else if (boundary.margin_m <= Math.round(TOLERANCE_DEG * DEG_M))
    nearEdge.push({ code_commune: code, wilaya_code: Number(commune.wilaya_code), name_fr: commune.name_fr, margin_m: boundary.margin_m });
}

console.log(`boundary cache: ${cache.count} commune(s), tolerance ${cache.tolerance_deg} deg, OSM ${cache.timestamp_osm_base}`);
console.log(`  sha256: ${boundaryCacheHash(cache)}`);
console.log(`  undecidable: ${undecidable.length} (no usable OSM boundary)`);
console.log(`  outside their own commune: ${outside.length}`);
console.log(`  inside but within the reduction tolerance of the boundary: ${nearEdge.length}`);
for (const n of nearEdge) console.log(`    ${n.name_fr} (${n.code_commune}) ${n.margin_m} m`);

// --- the verdicts, for the refresh workflow to diff ---------------------------
// Written on request and nowhere near the committed files: the refresh workflow
// takes one of these from the committed cache and one from the rebuilt cache, and
// scripts/diff-boundary-verdicts.mjs decides from the pair whether anything a human
// has to read actually moved.

if (VERDICTS) {
  writeFileSync(
    VERDICTS,
    `${JSON.stringify(
      {
        cache: {
          generated: cache.generated,
          timestamp_osm_base: cache.timestamp_osm_base,
          tolerance_deg: cache.tolerance_deg,
          count: cache.count,
          relation_count: cache.relation_count,
          sha256: boundaryCacheHash(cache),
        },
        counts: { outside: outside.length, undecidable: undecidable.length, near_edge: nearEdge.length },
        outside,
        undecidable,
        near_edge: nearEdge,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote ${VERDICTS}`);
}

// --- the seat delta, as a report ----------------------------------------------

function seatReport() {
  const seats = JSON.parse(readFileSync(SEATS, "utf-8"));
  const R = 6371008.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const metres = (aLng, aLat, bLng, bLat) => {
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  };
  const rows = [];
  for (const seat of seats.communes) {
    const commune = centres.get(seat.code_commune);
    if (!commune) continue;
    rows.push({
      ...seat,
      delta_m: Math.round(metres(commune.point[0], commune.point[1], seat.seat[0], seat.seat[1])),
      in_own_commune: byCode.get(seat.code_commune)?.usable
        ? inside(commune.point[0], commune.point[1], byCode.get(seat.code_commune).outer, byCode.get(seat.code_commune).inner)
        : null,
    });
  }
  rows.sort((a, b) => b.delta_m - a.delta_m || a.code_commune - b.code_commune);
  const over = (m) => rows.filter((r) => r.delta_m > m).length;
  const median = rows.length ? rows[Math.floor(rows.length / 2)].delta_m : 0;
  return { rows, over, median };
}

const report = seatReport();
console.log(`seat deltas after this batch: >300 m ${report.over(300)} · >1 km ${report.over(1000)} · >5 km ${report.over(5000)} · median ${report.median} m`);

if (!WRITE) process.exit(0);

// The cache and the digest that proves it, written together and never apart:
// scripts/lib/boundary-cache-provenance.mjs owns both serialisations so the file on
// disk and the hash in the sidecar can only ever have been computed from the same
// document.
writeFileSync(CACHE, serialiseCache(cache));
writeFileSync(PROVENANCE, serialiseProvenance(cache));

writeFileSync(
  EXCEPTIONS,
  `${JSON.stringify(
    {
      generated: cache.generated,
      guard: "test/commune-centre-in-commune.test.mjs",
      licence: LICENCE,
      note:
        "Every commune the containment guard does not hold to its own polygon, with the reason. `no_boundary` is what cannot be decided at all: OpenStreetMap carries no usable admin_level=8 geometry, so there is nothing to be inside of. `exceptions` is a centre still outside its own commune, which is a known defect waiting on evidence, not a tolerance. Both lists are exact in both directions: a commune that stops needing its entry fails the guard rather than keeping it. Regenerate with `node scripts/build-commune-boundary-cache.mjs --fetch-geometry --write`.",
      no_boundary: undecidable,
      count: outside.length,
      exceptions: outside,
    },
    null,
    2,
  )}\n`,
);

const table = report.rows
  .filter((r) => r.delta_m > 1000)
  .map((r) => `| ${r.code_commune} | ${r.name_fr} | ${r.wilaya_code} | ${r.delta_m} | ${r.in_own_commune === null ? "-" : r.in_own_commune ? "yes" : "**no**"} | ${r.osm_relation_id} |`)
  .join("\n");

writeFileSync(
  REPORT,
  `# Commune centres against their OSM chef-lieu node: the report (${PULL} pull)

A **report, not a gate**. Until 2026-09-29 a test failed any commune centre more
than 1 km from its recorded OSM seat, with 496 pinned exceptions. The Owner's
decision the same day (private tracker #170) replaced it: the standing guard
enforces containment
(\`test/commune-centre-in-commune.test.mjs\`), and the distance to the seat is
measured here instead.

Why. Our centre and the OSM \`admin_centre\` node are two hand-placed claims about
one town, so a delta between them says the two sources disagree, not that ours is
wrong. The median over all ${report.rows.length} compared rows is
**${report.median} m**, and a rule needing 496 exceptions was measuring that
disagreement. Containment is a fact about one claim on its own: a centre outside
its own commune is wrong whatever the node says, and that is how the 189
corrections of this batch were decided.

- Seat reference: \`osm-seat-reference.json\` (Overpass \`timestamp_osm_base\`
  ${JSON.parse(readFileSync(SEATS, "utf-8")).timestamp_osm_base})
- Licence: ${LICENCE}
- Regenerate: \`node scripts/build-commune-boundary-cache.mjs --write\`

## Bands, after the 189 corrections

| Band | Communes |
| --- | --- |
| over 300 m | ${report.over(300)} |
| over 1 km | ${report.over(1000)} |
| over 5 km | ${report.over(5000)} |
| median | ${report.median} m |
| largest | ${report.rows[0]?.delta_m ?? 0} m (${report.rows[0]?.name_fr ?? "-"}, ${report.rows[0]?.code_commune ?? "-"}) |

The \`In own commune\` column is the guard's question. A row over 1 km that still
answers **no** is a defect with incomplete evidence, listed in
\`containment-exceptions.json\`; a row that answers yes is a disagreement.

## Over 1 km, by delta

| Code | Commune | Wilaya | Delta (m) | In own commune | OSM relation |
| --- | --- | --- | --- | --- | --- |
${table}
`,
);

console.log(`wrote commune-boundaries.json (${cache.count}), commune-boundaries.provenance.json, containment-exceptions.json (${outside.length} + ${undecidable.length} no_boundary), seat-distance-${PULL}.md`);
