import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
