// Establishment sites (Owner decision 2026-11-15): the registry lists CHU Bejaia
// once, but it runs on three premises. The reviewed seed places the record on
// one site and adds a `site_of` record for each other one.
//
// The bug class this exists for: a site added by hand drifts from its seed, an
// Owner reading off a proprietary map past the 500 m ceiling slips in, or a
// re-emit adds the sites a second time. None of that fails the schema.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applySites, readSitesSeed } from "../packages/sante/scripts/sites.mjs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const records = read("../packages/sante/data/sante.json");
const seed = readSitesSeed();
const clone = (x) => JSON.parse(JSON.stringify(x));

test("sante sites: the committed records are what the seed builds", () => {
  const rebuilt = applySites(clone(records), seed);
  const byId = (rows) => [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
  assert.deepEqual(byId(rebuilt), byId(records), "re-applying the seed must change nothing (idempotent)");
});

test("sante sites: CHU Bejaia sits on its first site, each further site points at it", () => {
  const parent = records.find((r) => r.id === "06-chu-01");
  assert.equal(parent.refs.osm, "way/156237500");
  assert.equal(parent.refs.msp, "3649");
  assert.equal(parent.geo_method, "osm_point");
  assert.equal(parent.site_of, undefined);
  const sites = records.filter((r) => r.site_of === "06-chu-01").map((r) => [r.id, r.refs.osm]);
  assert.deepEqual(sites.sort(), [
    ["06-chu-01-s2", "way/156238581"],
    ["06-chu-01-s3", "node/2466300649"],
  ]);
  for (const r of records.filter((x) => x.site_of)) {
    assert.equal(r.source, "osm");
    assert.equal(r.refs.msp, undefined);
    assert.equal(r.wilaya_code, parent.wilaya_code);
    assert.equal(r.type, parent.type);
  }
});

test("sante sites: an Owner reading past 500 m, or one that misstates its distance, is refused", () => {
  const far = clone(seed);
  far["06-chu-01"].sites[1].owner_confirmation.point = [5.0735, 36.7564]; // about 900 m west
  assert.throws(() => applySites(clone(records), far), /past the 500 m ceiling/);

  const misstated = clone(seed);
  misstated["06-chu-01"].sites[2].owner_confirmation.metres_from_published_value = 10;
  assert.throws(() => applySites(clone(records), misstated), /says 10 m, it is 50 m/);

  const wrongObject = clone(seed);
  wrongObject["06-chu-01"].sites[0].owner_confirmation.confirms = "way/1";
  assert.throws(() => applySites(clone(records), wrongObject), /confirms way\/1/);
});

test("sante sites: a seeded element another record already cites is refused", () => {
  const rows = clone(records).filter((r) => !r.site_of);
  rows.find((r) => r.id === "06-eph-01").refs.osm = "way/156238581";
  assert.throws(() => applySites(rows, seed), /already cites it/);
});
