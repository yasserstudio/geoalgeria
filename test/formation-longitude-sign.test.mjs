// A longitude that lost its minus sign, and why containment cannot see it.
//
// THE DEFECT. The takwin capture ships 32 of Oran's rows with a POSITIVE longitude.
// Nothing in the repository failed on them, because the builder stamps `wilaya_code`
// from the coordinate (`containingWilayaCode`), so +0.63 became wilaya 48 and +0.31
// wilaya 27, and every containment check then agreed with itself: the record is inside
// the wilaya its own wrong coordinate chose. test/record-in-declared-wilaya.test.mjs
// lists 302 exceptions and not one of them is from this package, because a defect that
// derives the attribution from the defect is invisible to a containment test.
//
// WHAT CATCHES IT. The portal names the publishing directorate on every row (IDDFEP),
// which is an attribution the coordinate had no part in. So a row whose point sits
// outside that directorate's wilaya while its MIRROR sits inside it has a dropped
// sign, and nothing else in the capture looks like that: it fires on exactly those 32
// rows, all of them Oran's, and on no row of any other directorate.
//
// THE MIRROR IS NOT A REPO-WIDE RULE. Asked of every published record against its own
// `wilaya_code` rather than against a publishing directorate, the same question answers
// yes for five records in other packages whose mirror happens to land in the far side of
// a wilaya that straddles the meridian. Those are coincidences, not dropped signs, which
// is why this guard is scoped to the one source that names an independent authority per
// row. Record 01392 (private tracker #301) is the row that led here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { containingWilayaCode } from "../scripts/lib/build-utils.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const capture = read("sources", "formation-professionnelle", "takwin-etab.json").data;
const establishments = read("packages", "formation-professionnelle", "data", "establishments.json");
const wilayas = read("packages", "dataset", "data", "wilayas.json").wilayas;

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

const trimOrNull = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

/** Published records keyed the way the builder's own cross-check keys them: `code`
 *  repeats on five rows, so the name joins with it. */
const published = new Map(establishments.map((r) => [`${r.code}|${r.name}`, r]));

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
    rows.push({ raw: r, lat, lng, scope: scopeOf(r.IDDFEP === 99 ? 16 : r.IDDFEP) });
  }
  return rows;
}

/** Does mirroring the longitude carry the point into the wilaya that published it? */
function mirrorRecovers({ lat, lng, scope }) {
  if (lng <= 0) return false;
  const asIs = containingWilayaCode(lat, lng);
  if (asIs && scope.has(Number(asIs))) return false;
  const mirrored = containingWilayaCode(lat, -lng);
  return Boolean(mirrored && scope.has(Number(mirrored)));
}

test("the capture's unsigned longitudes are all Oran's, and all 32 ship mirrored", () => {
  const unsigned = sourceRows().filter(mirrorRecovers);
  assert.equal(unsigned.length, 32);
  assert.deepEqual([...new Set(unsigned.map((r) => r.raw.IDDFEP))], [31]);

  for (const { raw, lng } of unsigned) {
    const record = published.get(`${raw.Code}|${trimOrNull(raw.Nom)}`);
    assert.ok(record, `${raw.Code}: no published record to check`);
    assert.equal(record.lng, -Math.round(lng * 1e6) / 1e6, `${record.id}: longitude not mirrored`);
    assert.equal(record.wilaya_code, "31", `${record.id}: not stamped with Oran`);
    assert.equal(record.geo_precision, "exact", `${record.id}: the portal's own reading, sign restored`);
  }
});

test("no published establishment keeps a longitude its own directorate contradicts", () => {
  const kept = [];
  for (const row of sourceRows()) {
    const record = published.get(`${row.raw.Code}|${trimOrNull(row.raw.Nom)}`);
    if (!record || record.lat == null || record.lng == null) continue;
    if (mirrorRecovers({ lat: record.lat, lng: record.lng, scope: row.scope })) {
      kept.push(`${record.id} w${record.wilaya_code} ${record.lat},${record.lng}`);
    }
  }
  // No allow-list: a row here is a dropped sign the builder did not restore.
  assert.deepEqual(kept, []);
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
