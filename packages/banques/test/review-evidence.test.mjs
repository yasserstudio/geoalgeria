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

// --- the arcminute re-placements (private tracker #285) ----------------------
// Six branches sat on degrees-and-minutes placeholders. Three could be bound to an
// OpenStreetMap object of the right bank; three could not, and carry their commune's
// centre instead. Both halves are checked against the source they name, so a
// decision cannot quietly become a coordinate nobody can re-derive.

test("re-placed AGB and BADR branches reproduce their OSM evidence", () => {
  const expected = new Map([
    // record id -> [OSM object, the bank the tags must name]
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
    assert.match(
      [candidate.tags.brand, candidate.tags.operator, candidate.tags.name, candidate.tags["operator:de"]]
        .filter(Boolean)
        .join(" "),
      bank,
    );
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
  const round6 = (n) => Number(n.toFixed(6));
  const communes = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"].flatMap(
    (file) => read(`packages/dataset/data/${file}`),
  );
  const byCode = new Map(
    communes.map((commune) => [String(commune.code_commune).padStart(4, "0"), commune]),
  );

  const centroidDecisions = ledger.decisions.filter((d) => d.patch?.geo_method === "commune_centroid");
  assert.deepEqual(
    centroidDecisions.map((d) => d.record_id).sort(),
    ["agb-constantine", "agb-laghouat", "badr-413"],
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
