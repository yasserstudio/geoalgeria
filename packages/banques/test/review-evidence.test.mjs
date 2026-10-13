import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// The contract package by path, not by name: banques declares no devDependencies,
// so "@geoalgeria/schema" does not resolve from here. round6 is imported rather
// than reimplemented, so this test rounds exactly as the writers do.
import { applyReviewedOverrides, round6 } from "../../schema/index.js";
import { MIGRATIONS } from "../../../scripts/lib/v2-transforms.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const ledger = read("quality/overrides/banques.json");
const candidates = read("research/banques/osm/candidates.json").records;
const byUrl = new Map(candidates.map((record) => [record.source_url, record]));

test("reviewed BNA corrections remain bound to the audited source rows", () => {
  const seeds = read("packages/banques/scripts/seeds/bna-reviewed.json");
  const branches = read("packages/banques/data/branches.json");
  const byId = new Map(branches.map((record) => [record.id, record]));

  assert.ok(seeds.length > 0);
  for (const seed of seeds) {
    const branch = byId.get(seed.id);
    assert.ok(branch, `${seed.id}: missing canonical branch`);
    assert.equal(seed.expected_name, branch.name);
    assert.equal(seed.expected_address, branch.address);
  }
});

test("reviewed BDL coordinates reproduce their exact-ref OSM evidence", () => {
  const decisions = ledger.decisions.filter(({ record_id }) => record_id.startsWith("bdl-"));
  assert.equal(decisions.length, 5);
  for (const decision of decisions) {
    const osmUrl = decision.evidence.map(({ url }) => url).find((url) =>
      url.startsWith("https://www.openstreetmap.org/"),
    );
    const candidate = byUrl.get(osmUrl);
    assert.ok(candidate, `${decision.record_id}: missing OSM snapshot record`);
    assert.equal(candidate.tags.ref, decision.record_id.slice("bdl-".length));
    assert.match(
      [candidate.tags.brand, candidate.tags.operator, candidate.tags.name, candidate.tags["short_name:fr"]]
        .filter(Boolean)
        .join(" "),
      /BDL|Banque de développement local/i,
    );
    assert.equal(candidate.wilaya_code, decision.expect.wilaya_code);
    assert.equal(candidate.lat, decision.patch.lat);
    assert.equal(candidate.lng, decision.patch.lng);
    assert.equal(candidate.precision, decision.patch.geo_precision);
    assert.equal(`osm_${candidate.osm_id.split("/")[0]}`, decision.patch.geo_method);
  }
});

test("reviewed SGA coordinates reproduce matching bank and street evidence", () => {
  const decisions = ledger.decisions.filter(
    ({ record_id, patch }) => record_id.startsWith("sga-") && patch.lat != null,
  );
  const expectedStreets = new Map([
    ["sga-chlef", /20.*rue des martyrs/i],
    ["sga-bab-ezzouar", /1.*rezig kadda/i],
    ["sga-amirouche", /boulevard colonel amirouche/i],
  ]);
  assert.equal(decisions.length, expectedStreets.size);
  for (const decision of decisions) {
    const osmUrl = decision.evidence.map(({ url }) => url).find((url) =>
      url.startsWith("https://www.openstreetmap.org/"),
    );
    const candidate = byUrl.get(osmUrl);
    assert.ok(candidate, `${decision.record_id}: missing OSM snapshot record`);
    assert.match(
      [candidate.tags.brand, candidate.tags.operator, candidate.tags.name, candidate.tags.long_name]
        .filter(Boolean)
        .join(" "),
      /Société Générale/i,
    );
    assert.match(
      [candidate.tags["addr:housenumber"], candidate.tags["addr:street"]]
        .filter(Boolean)
        .join(" "),
      expectedStreets.get(decision.record_id),
    );
    assert.equal(candidate.wilaya_code, decision.expect.wilaya_code);
    assert.equal(candidate.lat, decision.patch.lat);
    assert.equal(candidate.lng, decision.patch.lng);
    assert.equal(candidate.precision, decision.patch.geo_precision);
    assert.equal(`osm_${candidate.osm_id.split("/")[0]}`, decision.patch.geo_method);
  }
});

test("reviewed SGA Tizi Ouzou address stays ungeocoded", () => {
  const decision = ledger.decisions.find(({ record_id }) => record_id === "sga-tizi-ouzou");
  assert.deepEqual(decision.patch, {
    address: "Lot 254 N°34, Boulevard Stiti Ali, Tizi Ouzou",
  });
  assert.deepEqual(decision.evidence.map(({ url }) => url), [
    "https://particuliers.societegenerale.dz/fr/locations-details/tizi-ouzou/",
  ]);
  assert.equal(decision.expect.lat, null);
  assert.equal(decision.expect.lng, null);
});

// --- the rounded-placeholder re-placements (private tracker #285) ------------
// Six branches sat on a rounded placeholder: degrees and minutes with the seconds
// dropped. Four could be bound to an OpenStreetMap object of the right bank; two
// could not, and carry their commune's centre instead. Both halves are checked
// against the source they name, so a decision cannot quietly become a coordinate
// nobody can re-derive.

test("re-placed AGB and BADR branches reproduce their OSM evidence", () => {
  const expected = new Map([
    // record id -> [OSM object, a pattern the object's own tags must match]
    ["agb-constantine", ["https://www.openstreetmap.org/node/4828121569", /agb\.dz|Gulf Bank/i]],
    ["agb-tebessa", ["https://www.openstreetmap.org/way/288328744", /AGB|الخليج|Gulf/i]],
    ["badr-412", ["https://www.openstreetmap.org/node/6337732136", /BADR|بدر/i]],
    ["badr-772", ["https://www.openstreetmap.org/node/6298375922", /BADR|بدر/i]],
  ]);
  for (const [record_id, [osmUrl, bank]] of expected) {
    const decision = ledger.decisions.find((d) => d.record_id === record_id);
    assert.ok(decision, `${record_id}: no ledger decision`);
    assert.ok(
      decision.evidence.some(({ url }) => url === osmUrl),
      `${record_id}: ${osmUrl} is not among its evidence`,
    );
    const candidate = byUrl.get(osmUrl);
    assert.ok(candidate, `${record_id}: missing OSM snapshot record`);
    // The bank is read off whichever keys the object actually carries. AGB
    // Constantine is the reason this is not a `tags.name` check: that node names the
    // bank only in name:en/name:fr/official_name:fr and in its website, which is why
    // a name-only search missed it on the first pass.
    assert.match(Object.values(candidate.tags).join(" "), bank);
    assert.equal(candidate.wilaya_code, decision.expect.wilaya_code);
    assert.equal(candidate.lat, decision.patch.lat);
    assert.equal(candidate.lng, decision.patch.lng);
    // The snapshot's own precision decides: a node is the branch's point, a building
    // outline is a centroid. Nothing in the ledger may claim more than that.
    assert.equal(candidate.precision, decision.patch.geo_precision);
    assert.equal(`osm_${candidate.osm_id.split("/")[0]}`, decision.patch.geo_method);
  }
});

test("branches with no OSM object carry their commune's flagship centre", () => {
  const communes = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"].flatMap(
    (file) => read(`packages/dataset/data/${file}`),
  );
  const byCode = new Map(
    communes.map((commune) => [String(commune.code_commune).padStart(4, "0"), commune]),
  );

  const centroidDecisions = ledger.decisions.filter((d) => d.patch?.geo_method === "commune_centroid");
  assert.deepEqual(
    centroidDecisions.map((d) => d.record_id).sort(),
    ["agb-laghouat", "badr-413"],
  );
  for (const decision of centroidDecisions) {
    const commune = byCode.get(decision.patch.commune_code);
    assert.ok(commune, `${decision.record_id}: commune_code is not in the flagship set`);
    assert.equal(commune.name_fr, decision.patch.commune);
    assert.equal(String(commune.wilaya_code).padStart(2, "0"), decision.expect.wilaya_code);
    assert.equal(round6(commune.latitude), round6(decision.patch.lat));
    assert.equal(round6(commune.longitude), round6(decision.patch.lng));
    // A borrowed centre is never a per-facility point.
    assert.equal(decision.patch.geo_precision, "approximate");
  }
});

// THE STALE-DECISION TRAP. `expect` is checked against what INGEST produces, not
// against what the published file happens to hold, and this fix changed ingest:
// geoAt now demotes a rounded placeholder to `approximate`. So the four decisions
// whose records shipped `exact` have to expect `approximate`, or the next locator
// refresh throws "stale decision" and the build stops. That cannot be caught by
// reading either side alone, so this replays the raw locator coordinate through the
// real branch map and the real ledger.
test("a fresh locator pull still satisfies every #285 decision", () => {
  const branchMap = MIGRATIONS.banques.files.find((f) => f.file === "branches.json").map;
  const ids = ["agb-constantine", "agb-laghouat", "agb-tebessa", "badr-412", "badr-413", "badr-772"];
  const decisions = ids.map((id) => ledger.decisions.find((d) => d.record_id === id));

  // What scripts/fetch.mjs hands the map: the locator's own lat/lng and no precision
  // of its own, so the map applies its "exact" default and geoAt rules on it.
  const fresh = decisions.map((d) =>
    branchMap({
      id: d.record_id,
      bank_id: d.expect.bank_id,
      name: d.expect.name,
      address: d.expect.address,
      phone: null,
      wilaya_code: d.expect.wilaya_code,
      lat: d.expect.lat,
      lng: d.expect.lng,
    }),
  );

  // Ingest demotes every one of them, which is the whole point of the geoAt change.
  for (const [i, row] of fresh.entries()) {
    assert.equal(row.geo_precision, "approximate", `${ids[i]}: ingest did not demote the placeholder`);
    assert.equal(row.geo_precision, decisions[i].expect.geo_precision, `${ids[i]}: ledger expects otherwise`);
  }

  // And the ledger applies to that fresh set without throwing. Only the #285
  // decisions: applyReviewedOverrides refuses a decision whose record is absent, and
  // the BDL/SGA rows are not part of this replay.
  const subset = { ...ledger, decisions };
  const applied = applyReviewedOverrides(fresh, subset, { file: "branches.json" });
  const rows = applied.records ?? applied;
  for (const [i, id] of ids.entries()) {
    const row = rows.find((r) => r.id === id);
    assert.ok(row, `${id}: dropped by the ledger`);
    assert.equal(row.lat, decisions[i].patch.lat);
    assert.equal(row.lng, decisions[i].patch.lng);
    assert.equal(row.geo_precision, decisions[i].patch.geo_precision);
    assert.equal(row.geo_method, decisions[i].patch.geo_method);
    assert.equal(row.commune_code, decisions[i].patch.commune_code);
  }
});
