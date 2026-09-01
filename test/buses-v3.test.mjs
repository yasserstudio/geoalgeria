import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));
const lines = read("packages/buses/data/lines.json");
const shapes = read("packages/buses/data/shapes.json");
const directions = read("packages/buses/data/directions.json");
const stations = read("packages/buses/data/stations.json");
const memberships = read("packages/buses/data/station-memberships.json");
const operators = read("packages/buses/data/operators.json");
const source = read("sources/buses/osm-urban-selected.json");

test("buses v3 ships only the reviewed release boundary", () => {
  assert.equal(lines.length, 61);
  assert.equal(shapes.length, 44);
  assert.equal(directions.length, 79);
  assert.equal(stations.length, 1061);
  assert.equal(memberships.length, 1869);
  assert.equal(operators.length, 4);
  assert.equal(directions.filter((direction) => direction.public_transport_version === 2).length, 78);
  assert.equal(directions.filter((direction) => direction.public_transport_version === null).length, 1);
  assert.deepEqual(
    Object.fromEntries(operators.map((operator) => [operator.id, [operator.line_count, operator.shape_count]])),
    { etusa: [50, 33], "etus-mostaganem": [1, 1], "etus-tiaret": [7, 7], etusto: [3, 3] },
  );
  assert.deepEqual(new Set(lines.map((line) => line.operator_id)), new Set(["etusa", "etus-tiaret", "etus-mostaganem", "etusto"]));
  assert.ok(lines.every((line) => !line.id.includes("setif") && !line.id.includes("etuad")));
  assert.ok(!lines.some((line) => line.id === "etus-tiaret-33"));
  assert.deepEqual(lines.filter((line) => line.operator_id === "etusto").map((line) => line.line), ["1", "6", "9"]);
});

test("Line and Station public ids and shape references are stable", () => {
  assert.equal(lines.filter((line) => line.operator_id === "etusa").length, 50);
  assert.ok(lines.filter((line) => line.operator_id === "etusa").every((line) => line.id === `etusa-${line.line}`));
  assert.ok(lines.filter((line) => line.operator_id !== "etusa").every((line) => line.id === `${line.operator_id}-${line.line}`));
  assert.ok(stations.every((station) => station.id === `osm-node-${station.osm_id}`));
  assert.equal(new Set(lines.map((line) => line.id)).size, lines.length);
  assert.equal(new Set(stations.map((station) => station.id)).size, stations.length);
  const shapeIds = new Set(shapes.map((shape) => shape.id));
  assert.equal(lines.filter((line) => line.shape_id != null).length, 44);
  assert.ok(lines.every((line) => line.shape_id == null || shapeIds.has(line.shape_id)));
});

test("shape GeoJSON mirrors every reviewed shape", () => {
  const geojson = read("packages/buses/data/geojson/shapes.geojson");
  assert.equal(geojson.type, "FeatureCollection");
  assert.equal(geojson.features.length, 44);
  assert.ok(geojson.features.every((feature) => feature.geometry.type === "MultiLineString"));
  assert.deepEqual(new Set(geojson.features.map((feature) => feature.properties.line_id)), new Set(shapes.map((shape) => shape.line_id)));
});

test("ordered memberships reproduce raw OSM member positions without collapsing repeats", () => {
  const sourceStations = new Set(source.stations.map((station) => station.id));
  const expected = [];
  for (const shape of source.line_shapes) {
    for (const relation of shape.relations) {
      relation.members.forEach((member, osmMemberIndex) => {
        if (!sourceStations.has(`${member.type}/${member.ref}`)) return;
        expected.push({ relation: relation.id, osmMemberIndex, station: `osm-${member.type}-${member.ref}`, role: member.role || null });
      });
    }
  }
  assert.equal(expected.length, 1869);
  const actual = memberships.map((membership) => ({
    relation: membership.osm_relation_id,
    osmMemberIndex: membership.osm_member_index,
    station: membership.station_id,
    role: membership.role,
  }));
  assert.deepEqual(actual, expected.sort((a, b) => a.relation - b.relation || a.osmMemberIndex - b.osmMemberIndex));
  assert.ok(memberships.every((membership) => membership.sequence_status === "osm_member_order_unvalidated"));
  assert.ok(new Set(memberships.map((membership) => membership.station_id)).size < memberships.length);
});

test("Station null names and the 12 explicit ETUSA Wilaya derivations are preserved", () => {
  assert.ok(stations.some((station) => station.name === null));
  const derived = stations.filter((station) => station.wilaya_method === "operator_scope");
  assert.equal(derived.length, 12);
  assert.ok(derived.every((station) => station.wilaya_code === "16" && station.operator_ids.length === 1 && station.operator_ids[0] === "etusa"));
});

test("tracked OSM Source bytes match their receipt", () => {
  const text = readFileSync(join(ROOT, "sources/buses/osm-urban-selected.json"), "utf8");
  const manifest = read("sources/buses/manifest.json");
  assert.equal(createHash("sha256").update(text).digest("hex"), manifest["osm-urban-selected"].sha256);
  assert.equal(manifest["osm-urban-selected"].bytes, Buffer.byteLength(text));
  assert.equal(source.license, "ODbL-1.0");
  assert.equal(source.receipt.collection_mode, "non-atomic-batched");
});

test("bus v3 public API reaches new entities", async () => {
  const api = await import(join(ROOT, "packages/buses/index.js"));
  assert.equal(api.operatorRecords().length, 4);
  assert.equal(api.shapes().length, 44);
  assert.equal(api.directions().length, 79);
  assert.equal(api.stations().length, 1061);
  assert.equal(api.stationMemberships().length, 1869);
  assert.equal(api.shapeForLine("etus-tiaret-32")?.line_id, "etus-tiaret-32");
  assert.equal(api.shapeForLine("etusto-9")?.line_id, "etusto-9");
  const direction = api.directionsByLine("etus-mostaganem-1")[0];
  assert.ok(direction);
  assert.ok(api.membershipsByDirection(direction.id).length > 0);
  assert.ok(api.stationsByLine("etus-mostaganem-1").length > 0);
});
