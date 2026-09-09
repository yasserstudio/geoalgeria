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
  const decisions = ledger.decisions.filter(({ record_id }) => record_id.startsWith("sga-"));
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
