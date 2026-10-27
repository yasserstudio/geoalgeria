// A longitude that lost its minus sign, and why neither containment nor the wilaya
// alone can decide it.
//
// THE DEFECT. The takwin capture ships 32 of Oran's rows with a POSITIVE longitude.
// Nothing in the repository failed on them, because the builder stamps `wilaya_code`
// from the coordinate (`containingWilayaCode`), so +0.63 became wilaya 48 and +0.31
// wilaya 27, and every containment check then agreed with itself: the record is inside
// the wilaya its own wrong coordinate chose. test/record-in-declared-wilaya.test.mjs
// lists 302 exceptions and not one of them is from this package, because a defect that
// derives the attribution from the defect is invisible to a containment test.
//
// WHAT CATCHES IT. The portal names the publishing directorate on every row (IDDFEP)
// and the commune on every row (CommunnNom), neither of which the coordinate had any
// part in. So a dropped sign is a point that sits outside its directorate's wilaya
// while its MIRROR sits both inside that wilaya AND beside the commune the row names.
//
// WHY THE WILAYA ALONE IS NOT ENOUGH. Reflecting a longitude is a jump of up to
// 2 * lng, which on a wilaya-sized test is unbounded: a grid scan of the 0.1 to 9 E
// half-plane finds 13 directorates for which SOME mirror lands in their own wilaya,
// the worst travelling 1,698 km (27.3 N, 8.6 E sits in wilaya 33 and mirrors into
// wilaya 37). A Bechar row at 29.6 N, +5.3 E would have mirrored into Beni Abbes and
// shipped as `exact`. The commune test bounds the jump to a commune-sized radius, and
// `assertion 3` below is that bound stated as a case the rule must refuse.
//
// WHY A RADIUS AND NOT CONTAINMENT IN THE NAMED COMMUNE. Measured over the 32: 23 of
// their mirrors land inside the outline of the very commune the row names, and 9 land
// in a NEIGHBOURING commune of the same wilaya, which is ordinary for an address on a
// commune edge and for a portal that files a campus under the city it belongs to. The
// three furthest from their own commune's centre each land in the commune their own
// French address names: `PWGFU` files under Oran and sits in Bir El Djir at 7.15 km
// (`HAI KHEMISTI 14 N 232 BIR EL DJIR ORAN`), `PPSNN` files under Bethioua and sits in
// Arzew at 6.81 km (`RUE DES JARDINS ARZEW ORAN`), `PN7HO` files under Sidi Chami and
// sits in Es Senia at 9.35 km (`CITE BAHI AMER ... ES SENIA ORAN`). Containment in the
// named commune would refuse all nine; the radius accepts them and still refuses the
// Bechar jump by two orders of magnitude.
//
// THE MIRROR IS NOT A REPO-WIDE RULE EITHER. Asked of every published record against
// its own `wilaya_code` rather than against a publishing directorate and a named
// commune, the same question answers yes for five records in other packages whose
// mirror happens to land on the far side of a wilaya that straddles the meridian.
// Those are coincidences, not dropped signs. Record 01392 (private tracker #301) is
// the row that led here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { containingWilayaCode } from "../scripts/lib/build-utils.mjs";
import {
  MIRROR_COMMUNE_KM,
  recoverLongitudeSign,
} from "../packages/formation-professionnelle/scripts/fetch.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const capture = read("sources", "formation-professionnelle", "takwin-etab.json").data;
const establishments = read("packages", "formation-professionnelle", "data", "establishments.json");
const wilayas = read("packages", "dataset", "data", "wilayas.json").wilayas;
const communeFC = read("packages", "dataset", "data", "geojson", "communes.geojson");

// The same scope the builder joins in: the source's pre-2026 wilaya plus the wilayas
// the reform carved out of it, which is the same territory under both schemes.
const daughters = new Map();
for (const w of wilayas) {
  const mother = Number(w.mother_wilaya_code);
  if (!mother) continue;
  if (!daughters.has(mother)) daughters.set(mother, []);
  daughters.get(mother).push(Number(w.code));
}
const scopeOf = (code) => new Set([code, ...(daughters.get(code) || [])]);

// The generator's own Arabic fold and commune lookup, reproduced here rather than
// imported, so the test states the join it checks instead of sharing a bug with it.
const normAr = (s) =>
  String(s || "")
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]/gu, "");

const centreOf = new Map(); // `${wilaya}|${normalized name}` -> {lat, lng}
for (const f of communeFC.features) {
  const code = Number(f.properties?.wilaya_code);
  const key = normAr(f.properties?.name_ar);
  const [lng, lat] = f.geometry?.coordinates || [];
  if (!code || !key || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  const k = `${code}|${key}`;
  if (!centreOf.has(k)) centreOf.set(k, { lat, lng });
}
const parseCommune = (v) => {
  if (!v) return null;
  const i = v.indexOf("_");
  return i > 0 ? v.slice(0, i).trim() : v.trim();
};
function namedCommuneCentre(raw) {
  const key = normAr(parseCommune(raw.CommunnNom));
  if (!key) return null;
  const src = raw.IDDFEP === 99 ? 16 : raw.IDDFEP;
  for (const code of [src, ...(daughters.get(src) || [])]) {
    const hit = centreOf.get(`${code}|${key}`);
    if (hit) return hit;
  }
  return null;
}

const trimOrNull = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

/** The published name the generator emits: `Nom`, then `Code`, then a synthetic id.
 *  The fallback matters: row `4715A` ships no `Nom`, and keying on the raw field alone
 *  silently dropped it from this guard (fetch.mjs, the `name:` field of the record). */
const publishedName = (raw) =>
  trimOrNull(raw.Nom) || trimOrNull(raw.Code) || `ID-${raw.IDetablissement}`;

const published = new Map(establishments.map((r) => [`${r.code}|${r.name}`, r]));
const publishedFor = (raw) => published.get(`${raw.Code}|${publishedName(raw)}`);

/** Capture rows with a usable pair, each with the wilaya scope that published it. */
function sourceRows() {
  const rows = [];
  for (const r of capture) {
    if (r.IDNature_etsF === 1) continue; // the ministry itself
    const lat = parseFloat(r.Latitude);
    const lng = parseFloat(r.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat === 0 || lng === 0) continue;
    if (lat < 18 || lat > 38 || lng < -9 || lng > 12) continue;
    rows.push({
      raw: r,
      lat,
      lng,
      scope: scopeOf(r.IDDFEP === 99 ? 16 : r.IDDFEP),
      centre: namedCommuneCentre(r),
    });
  }
  return rows;
}

/** Did the generator's rule restore this row's sign? */
const fires = ({ lat, lng, scope, centre }) => recoverLongitudeSign(lat, lng, scope, centre) !== lng;

test("every capture row with a coordinate is joined to its published record", () => {
  // The guard below is only as wide as this join. A row that cannot be found is a row
  // the rule is never asked about, which is how `4715A` went missing.
  const orphans = sourceRows()
    .filter(({ raw }) => !publishedFor(raw))
    .map(({ raw }) => `${raw.IDetablissement}/${raw.Code}`);
  assert.deepEqual(orphans, []);
});

test("the capture's unsigned longitudes are all Oran's, and all 32 ship mirrored", () => {
  const unsigned = sourceRows().filter(fires);
  assert.equal(unsigned.length, 32);
  assert.deepEqual([...new Set(unsigned.map((r) => r.raw.IDDFEP))], [31]);

  for (const { raw, lng } of unsigned) {
    const record = publishedFor(raw);
    assert.ok(record, `${raw.Code}: no published record to check`);
    assert.equal(record.lng, -Math.round(lng * 1e6) / 1e6, `${record.id}: longitude not mirrored`);
    assert.equal(record.wilaya_code, "31", `${record.id}: not stamped with Oran`);
    assert.equal(record.geo_precision, "exact", `${record.id}: the portal's own reading, sign restored`);
  }
});

test("every restored sign lands well inside the commune radius, not at its edge", () => {
  // A rule whose firing rows crowd its threshold is a rule tuned to its data. The
  // furthest of the 32 sits at 9.35 km, a third of the way to the bound.
  const R = 6371008.8;
  const km = (aLng, aLat, bLng, bLat) => {
    const t = (x) => (x * Math.PI) / 180;
    const h =
      Math.sin(t(bLat - aLat) / 2) ** 2 +
      Math.cos(t(aLat)) * Math.cos(t(bLat)) * Math.sin(t(bLng - aLng) / 2) ** 2;
    return (2 * R * Math.asin(Math.sqrt(h))) / 1000;
  };
  const distances = sourceRows()
    .filter(fires)
    .map(({ lng, lat, centre }) => km(-lng, lat, centre.lng, centre.lat));
  assert.equal(distances.length, 32);
  const worst = Math.max(...distances);
  assert.ok(worst < 10, `the furthest restored sign is ${worst.toFixed(2)} km from its commune's centre`);
  assert.ok(worst < MIRROR_COMMUNE_KM / 2, "the bound is not holding the firing set together");
});

test("a mirror that lands in the right wilaya but the wrong commune is refused", () => {
  // The Bechar case from the review. 29.6 N, +5.3 E is in Illizi (33); mirrored it is
  // in wilaya 08's Beni Abbes country, 1,024 km west, so the wilaya test alone accepts
  // it. The row names Bechar city, whose centre is nowhere near, so the commune test
  // refuses it and the portal's own pair ships untouched.
  const lat = 29.6;
  const lng = 5.3;
  const scope = scopeOf(8);
  assert.ok(!scope.has(Number(containingWilayaCode(lat, lng))), "the as-is point must be out of scope");
  assert.ok(scope.has(Number(containingWilayaCode(lat, -lng))), "the mirror must be in scope, or this proves nothing");

  const bechar = centreOf.get(`8|${normAr("بشار")}`);
  assert.ok(bechar, "Bechar's own commune centre is the reference point");
  assert.equal(recoverLongitudeSign(lat, lng, scope, bechar), lng, "a 1,000 km mirror was applied");

  // And the same row with a commune beside the mirror IS recovered, so the refusal
  // above is the commune test talking and not a disabled rule.
  assert.equal(recoverLongitudeSign(lat, lng, scope, { lat, lng: -lng }), -lng);
});

test("a row whose commune cannot be resolved is never mirrored", () => {
  // No commune to test against is not evidence of a dropped sign. The portal's pair
  // ships as it stands and the row stays in the review queue.
  const lat = 29.6;
  const lng = 5.3;
  assert.equal(recoverLongitudeSign(lat, lng, scopeOf(8), null), lng);
});

test("01392 is placed by its commune, not by the pair the portal shipped", () => {
  // The one Oran row the mirror cannot explain: whole arcminutes on both axes, and the
  // mirrored pair falls in the bay of Oran, inside no wilaya. It takes Es Senia's
  // centroid like every other establishment the portal left unplaced.
  const record = establishments.find((r) => r.id === "01392");
  assert.equal(record.wilaya_code, "31");
  assert.equal(record.commune, "السانية");
  assert.equal(record.geo_method, "commune");
  assert.equal(record.geo_precision, "approximate");
  assert.ok(record.lng < 0, "an Oran establishment has a negative longitude");
  assert.equal(containingWilayaCode(record.lat, record.lng), "31");
});
