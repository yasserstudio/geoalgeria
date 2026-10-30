// The MJS GeoServer capture: what the committed snapshot keeps, what it drops,
// and that an offline replay reads it back.
//
// The server mints a fresh feature id on every request, so the capture is a
// projection rather than the bytes as received. These tests pin that projection:
// without them a later "capture as received" tidy-up would silently turn every
// no-change refresh into a whole-file diff.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canonicalizeMjsLayer,
  mjsLayerUrl,
  readMjsCapture,
  MJS_SOURCE,
} from "../scripts/lib/mjs-sig.mjs";
import { stableStringify, captureMeta, captureSha256 } from "../scripts/lib/source-store.mjs";

// A layer answer in the shape GeoServer returns it: a volatile per-request
// feature id, a stable properties.id, and whatever order the server felt like.
const feature = (uuid, fid, extra = {}) => ({
  type: "Feature",
  id: `infrastructures_sportives.fid-5ffd9fe9_1a17f142549_${fid}`,
  geometry: { type: "Point", coordinates: [3.05, 36.75] },
  geometry_name: "geom",
  properties: { id: uuid, nomination_de_linfrastructure: "Stade", ...extra },
});

const answer = (features) => ({
  type: "FeatureCollection",
  totalFeatures: features.length,
  features,
});

test("the capture drops the per-request feature id", () => {
  const canonical = canonicalizeMjsLayer(answer([feature("aaa", "c65")]));
  assert.equal("id" in canonical.features[0], false);
  // Everything the build reads survives.
  assert.deepEqual(canonical.features[0].geometry, { type: "Point", coordinates: [3.05, 36.75] });
  assert.equal(canonical.features[0].geometry_name, "geom");
  assert.equal(canonical.features[0].properties.id, "aaa");
  assert.equal(canonical.features[0].properties.nomination_de_linfrastructure, "Stade");
  assert.equal(canonical.totalFeatures, 1);
  assert.equal(canonical.type, "FeatureCollection");
});

test("two pulls that differ only in feature id and order capture byte-identically", () => {
  // The same three records, re-ordered and re-fid'd the way a second pull returns them.
  const first = answer([feature("bbb", "80d"), feature("aaa", "80e"), feature("ccc", "80f")]);
  const second = answer([feature("ccc", "112f"), feature("bbb", "1130"), feature("aaa", "1131")]);
  assert.equal(
    stableStringify(canonicalizeMjsLayer(first)),
    stableStringify(canonicalizeMjsLayer(second)),
  );
});

test("a real source edit still reaches the diff", () => {
  const before = canonicalizeMjsLayer(answer([feature("aaa", "80d")]));
  const after = canonicalizeMjsLayer(
    answer([feature("aaa", "112f", { adresse_de_linfrastructure: "Centre ville" })]),
  );
  assert.notEqual(stableStringify(before), stableStringify(after));
});

test("features sort by the stable record id, not by arrival", () => {
  const canonical = canonicalizeMjsLayer(
    answer([feature("ccc", "1"), feature("aaa", "2"), feature("bbb", "3")]),
  );
  assert.deepEqual(
    canonical.features.map((f) => f.properties.id),
    ["aaa", "bbb", "ccc"],
  );
});

test("a feature with no properties.id sorts last instead of throwing", () => {
  const orphan = { type: "Feature", geometry: null, properties: {} };
  const canonical = canonicalizeMjsLayer(answer([feature("aaa", "1"), orphan]));
  assert.equal(canonical.features.length, 2);
  assert.equal(canonical.features[0].properties.id, "aaa");
});

test("id-less features order by their own body, not by arrival", () => {
  const orphan = (nom) => ({
    type: "Feature",
    id: "infrastructures_sportives.fid-5ffd9fe9_1a17f142549_80d",
    geometry: { type: "Point", coordinates: [3.05, 36.75] },
    geometry_name: "geom",
    properties: { nomination_de_linfrastructure: nom },
  });
  const forward = canonicalizeMjsLayer(answer([orphan("Piscine"), orphan("Stade")]));
  const reversed = canonicalizeMjsLayer(answer([orphan("Stade"), orphan("Piscine")]));
  assert.deepEqual(
    forward.features.map((f) => f.properties.nomination_de_linfrastructure),
    ["Piscine", "Stade"],
  );
  assert.equal(stableStringify(forward), stableStringify(reversed));
});

test("a top-level key outside the whitelist is dropped, not refused", () => {
  const canonical = canonicalizeMjsLayer({
    ...answer([feature("aaa", "80d")]),
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::4326" } },
    bbox: [-9, 18, 12, 38],
  });
  assert.deepEqual(Object.keys(canonical).sort(), ["features", "totalFeatures", "type"]);
  assert.deepEqual(Object.keys(canonical.features[0]).sort(), [
    "geometry",
    "geometry_name",
    "properties",
    "type",
  ]);
});

test("the layer URL requests the whole country as GeoJSON", () => {
  const url = mjsLayerUrl("etablissements_de_jeunes");
  assert.match(url, /^https:\/\/sig\.mjs\.gov\.dz\/api\/v1\.0\/geoserver\/public\/wms\?/);
  assert.match(url, /layers=etablissements_de_jeunes/);
  assert.match(url, /bbox=-9,18,12,38/);
  assert.match(url, /format=application\/json;type=geojson/);
  assert.equal(MJS_SOURCE, "https://sig.mjs.gov.dz/dashboard/viewer");
});

// Both packages must rebuild from the committed captures with no network at all.
for (const [pkg, capture, minExpected] of [
  ["sports", "sig-infrastructures", 4000],
  ["jeunesse", "sig-etablissements", 1800],
]) {
  test(`${pkg} replays its committed capture offline`, () => {
    const features = readMjsCapture({ pkg, capture, minExpected });
    const meta = captureMeta(pkg, capture);
    assert.ok(meta, `sources/${pkg}/${capture}.json is not in the manifest`);
    assert.equal(features.length, meta.records);
    assert.ok(features.length >= minExpected);
    // The stable upstream id the next refresh can key on is present on every row.
    assert.equal(features.filter((f) => f.properties?.id).length, features.length);
    assert.equal(new Set(features.map((f) => f.properties.id)).size, features.length);
    // The volatile GeoServer id is not committed.
    assert.equal(features.some((f) => "id" in f), false);
  });

  // The body tie-break must be a no-op on what is already committed: both
  // captures carry a properties.id on every row, so re-projecting the committed
  // file has to reproduce its recorded sha256 exactly.
  test(`${pkg} re-canonicalizes to its committed sha256`, () => {
    const stored = JSON.parse(
      readFileSync(new URL(`../sources/${pkg}/${capture}.json`, import.meta.url), "utf-8"),
    );
    assert.equal(captureSha256(canonicalizeMjsLayer(stored)), captureMeta(pkg, capture).sha256);
  });

  test(`${pkg} replay refuses a capture below the floor`, () => {
    assert.throws(
      () => readMjsCapture({ pkg, capture, minExpected: 10_000_000 }),
      /missing or too small.*run without --cache/s,
    );
  });
}
