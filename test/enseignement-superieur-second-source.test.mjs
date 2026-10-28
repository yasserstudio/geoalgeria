// The universities' two-Vote campus points (docs/adr/0001), held to their evidence.
//
// scripts/fetch.mjs re-measures each seed entry against its own numbers. That alone
// would let a hand-edited point pass as long as it agreed with itself (PR #310
// review), so this ties every Wikidata confirmation in seeds/second-source.json to
// the committed decision that justified it, and that decision to the captures it was
// read from.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readCapture } from "../scripts/lib/source-store.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const SEED = read("packages/enseignement-superieur/scripts/seeds/second-source.json");
const VOTES = read("research/enseignement-superieur/second-source-votes-2026-10-28.json");
const OSM = readCapture("enseignement-superieur", "osm-campus-objects");
const WD = readCapture("enseignement-superieur", "wikidata-campuses");
const DATA = read("packages/enseignement-superieur/data/institutions.json");

const entries = Object.entries(SEED).filter(([k]) => !k.startsWith("_"));
const byId = new Map(VOTES.records.map((r) => [r.id, r]));
const el = new Map(OSM.map((e) => [`${e.type}/${e.id}`, e]));
const item = new Map(WD.items.map((i) => [i.qid, i]));

for (const [key, e] of entries) {
  const id = String(e.record).slice(0, 5);
  const wd = e.wikidata_confirmation;
  if (!wd) continue;
  test(`second-source ${id}: the Wikidata confirmation is the committed decision`, () => {
    const v = byId.get(id);
    assert.ok(v, `${key}: no decision for ${id} in the votes file`);
    assert.equal(v.verdict, "promote", `${id}: the votes file says ${v.verdict}, not promote`);
    assert.equal(v.ship.osm, e.osm, `${id}: the seed ships ${e.osm}, the decision ${v.ship.osm}`);
    assert.equal(v.ship.wikidata, wd.item, `${id}: the seed cites ${wd.item}, the decision ${v.ship.wikidata}`);
    assert.deepEqual([e.lng, e.lat], [v.ship.point.lng, v.ship.point.lat], `${id}: the seed point is not the decided one`);
    assert.deepEqual(wd.point, [v.ship.p625.lng, v.ship.p625.lat], `${id}: the confirming P625 is not the decided one`);
  });
  test(`second-source ${id}: the decision is the captured evidence`, () => {
    const o = el.get(e.osm);
    assert.ok(o, `${id}: ${e.osm} is not in the OSM capture`);
    assert.equal(o.version, e.osm_version, `${id}: ${e.osm} is v${o.version} in the capture, v${e.osm_version} in the seed`);
    assert.deepEqual([o.point.lng, o.point.lat], [e.lng, e.lat], `${id}: the seed point is not the captured OSM point`);
    const it = item.get(wd.item);
    assert.ok(it, `${id}: ${wd.item} is not in the Wikidata capture`);
    const p = it.P625.find((x) => !x.excluded && x.lng === wd.point[0] && x.lat === wd.point[1]);
    assert.ok(p, `${id}: ${wd.item} carries no captured open P625 at the confirming point`);
    const osmRef = (p.references ?? []).some((r) => r.value === "Q936" || /openstreetmap\.org/i.test(String(r.value)));
    assert.ok(!osmRef, `${id}: the confirming P625 is referenced to OpenStreetMap, a Copied claim`);
  });
}

test("no published coordinate is an Owner reading or a confirming P625", () => {
  const second = [];
  for (const [, e] of entries) {
    if (e.owner_confirmation) second.push(e.owner_confirmation.point);
    if (e.wikidata_confirmation) second.push(e.wikidata_confirmation.point);
  }
  const bac = read("packages/enseignement-superieur/scripts/seeds/bac-2026.json");
  for (const block of [bac.additions ?? {}, bac.successions ?? {}])
    for (const e of Object.values(block)) if (e.place?.owner_confirmation) second.push(e.place.owner_confirmation.point);
  const published = new Set(DATA.map((r) => `${r.lng},${r.lat}`));
  for (const [lng, lat] of second) assert.ok(!published.has(`${lng},${lat}`), `${lat}, ${lng} is a confirmation and must never ship`);
});
