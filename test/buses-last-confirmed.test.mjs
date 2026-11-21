import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const text = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const json = (path) => JSON.parse(text(path));
const lines = json("../packages/buses/data/lines.json");
const shapes = json("../packages/buses/data/shapes.json");
const geojson = json("../packages/buses/data/geojson/shapes.geojson");
const metadata = json("../packages/buses/data/metadata.json");

// Last confirmed (CONTEXT.md, Owner 2026-11-19): the official Operator source's
// own date when it carries a full one, else the day it was read or supplied.
// Wikipedia and OpenStreetMap are not official, so their Lines ship null.
test("each Line's last_confirmed is its official Operator source date, or null without one", () => {
  const spread = {};
  for (const line of lines) {
    const key = `${line.operator_id} ${line.last_confirmed}`;
    spread[key] = (spread[key] ?? 0) + 1;
  }
  assert.deepEqual(spread, {
    "etusa null": 76,
    "etus-mostaganem null": 1,
    "etus-setif 2026-05-26": 5,
    "etusl-laghouat 2026-07-09": 4,
    "etus-tiaret 2026-09-02": 7,
    "etusto 2026-09-02": 5,
    "etus-bejaia 2026-09-02": 5,
    "etus-msila 2026-09-02": 4,
    "etus-sidi-bel-abbes 2026-09-02": 8,
    "etuad 2026-09-03": 16,
    "etus-annaba 2026-09-03": 6,
    "etus-tlemcen 2026-09-03": 10,
    "etus-oran 2026-09-04": 1,
    "etus-oeb 2026-09-04": 5,
    "etus-c-constantine 2026-09-16": 25,
    "etus-skikda 2026-09-27": 6,
  });
  // Official means the metadata's own evidence_type, the one list fetch.mjs reads too.
  const official = new Set(metadata.sources.filter((source) => source.evidence_type === "official").map((source) => source.key));
  assert.ok(lines.every((line) => (line.last_confirmed === null) === !official.has(line.source)));
  assert.ok(lines.every((line) => line.last_confirmed === null || line.last_confirmed <= metadata.updated));
});

test("last_confirmed reaches the CSV and the shapes a map draws", () => {
  assert.ok(text("../packages/buses/data/csv/lines.csv").split("\n")[0].split(",").includes("last_confirmed"));
  const byLine = new Map(lines.map((line) => [line.id, line.last_confirmed]));
  assert.ok(shapes.every((shape) => shape.last_confirmed === byLine.get(shape.line_id)));
  assert.ok(geojson.features.every((feature) => feature.properties.last_confirmed === byLine.get(feature.properties.line_id)));
});
