import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const report = json("../research/buses/qa/report.json");
const directions = json("../packages/buses/data/directions.json");
const memberships = json("../packages/buses/data/station-memberships.json");
const verdict = new Map(report.directions.map((d) => [d.direction_id, d.status]));

test("the committed QA report has a verdict for every shipped OSM Direction", () => {
  const missing = directions.filter((d) => d.osm_relation_id != null && !verdict.has(d.id)).map((d) => d.id);
  assert.deepEqual(missing, []);
});

// P2 publishes the verdicts: every shipped OSM status equals the report's.
test("a shipped OSM sequence status is the report's verdict", () => {
  const claims = [...directions.map((d) => [d.id, d.sequence_status]), ...memberships.map((m) => [m.direction_id, m.sequence_status])];
  const wrong = claims.filter(([id, status]) => status.startsWith("osm_member_order_") && status !== verdict.get(id));
  assert.deepEqual(wrong, []);
});
