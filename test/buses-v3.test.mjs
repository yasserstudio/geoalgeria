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
const officialTiaret = read("sources/buses/etus-tiaret-lines.json");
const officialEtusto = read("sources/buses/etusto-lines.json");
const officialBejaia = read("sources/buses/etus-bejaia-lines.json");
const officialMsila = read("sources/buses/etus-msila-lines.json");

test("buses v3 ships only the reviewed release boundary", () => {
  assert.equal(lines.length, 72);
  assert.equal(shapes.length, 44);
  assert.equal(directions.length, 79);
  assert.equal(stations.length, 1061);
  assert.equal(memberships.length, 1869);
  assert.equal(operators.length, 6);
  assert.equal(directions.filter((direction) => direction.public_transport_version === 2).length, 78);
  assert.equal(directions.filter((direction) => direction.public_transport_version === null).length, 1);
  assert.deepEqual(
    Object.fromEntries(operators.map((operator) => [operator.id, [operator.line_count, operator.shape_count]])),
    { etusa: [50, 33], "etus-bejaia": [5, 0], "etus-mostaganem": [1, 1], "etus-msila": [4, 0], "etus-tiaret": [7, 7], etusto: [5, 3] },
  );
  assert.deepEqual(new Set(lines.map((line) => line.operator_id)), new Set(["etusa", "etus-bejaia", "etus-msila", "etus-tiaret", "etus-mostaganem", "etusto"]));
  assert.ok(lines.every((line) => !line.id.includes("setif") && !line.id.includes("etuad")));
  assert.ok(!lines.some((line) => line.id === "etus-tiaret-33"));
  assert.deepEqual(lines.filter((line) => line.operator_id === "etusto").map((line) => line.line), ["1", "1A", "6", "7", "9"]);
  assert.ok(lines.filter((line) => line.operator_id === "etus-tiaret")
    .every((line) => line.source === "etus-tiaret" && line.source_refs.join("+") === "etus-tiaret+osm"));
  assert.ok(lines.filter((line) => line.operator_id === "etusto")
    .every((line) => line.source === "etusto"));
  assert.ok(lines.filter((line) => line.operator_id === "etusto" && line.shape_id)
    .every((line) => line.source_refs.join("+") === "etusto+osm"));
  assert.ok(lines.filter((line) => line.operator_id === "etusto" && !line.shape_id)
    .every((line) => line.source_refs.join("+") === "etusto"));
  assert.ok(lines.filter((line) => line.operator_id === "etus-bejaia")
    .every((line) => line.source === "etus-bejaia" && line.source_refs.join("+") === "etus-bejaia" && line.shape_id === null));
  assert.ok(lines.filter((line) => line.operator_id === "etus-msila")
    .every((line) => line.source === "etus-msila" && line.source_refs.join("+") === "etus-msila" && line.shape_id === null));
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

test("official Operator Sources define the reviewed Tiaret, Tizi Ouzou, Béjaïa and M'Sila Line sets", () => {
  assert.deepEqual(officialTiaret.map((line) => line.ref), ["26", "27", "28", "29", "30", "31", "32"]);
  assert.deepEqual(officialEtusto.map((line) => line.ref), ["1", "7", "1A", "9", "6"]);
  assert.ok(officialTiaret.every((line) => line.terminus1 && line.terminus2 && line.source_receipt.payload_sha256));
  assert.ok(officialEtusto.every((line) => line.terminus1 && line.terminus2));
  assert.deepEqual(officialBejaia.map((line) => line.ref), ["1", "2", "3", "4", "5"]);
  assert.ok(officialBejaia.every((line) => line.terminus1 && line.terminus2 && line.stop_count > 0 && line.map_id));
  assert.equal(officialBejaia.find((line) => line.ref === "1").stop_count_kind, "major");
  assert.ok(officialBejaia.filter((line) => line.ref !== "1").every((line) => line.stop_count_kind === "total"));
  assert.ok(officialBejaia.every((line) => line.page_receipt.payload_sha256 && line.map_receipt.payload_sha256));
  assert.ok(officialBejaia.every((line) => line.timetable_receipts.length >= 3
    && line.timetable_receipts.every((receipt) => receipt.payload_sha256)));
  assert.equal(officialBejaia.find((line) => line.ref === "5").service_hours.length, 4);
  assert.ok(officialBejaia.every((line) => line.service_hours.every((hours) => hours.days.length > 0)));
  assert.equal(officialBejaia.find((line) => line.ref === "4").source_title, "LIGNE 4 : GERE ROUTIERE / SIDI AHMED");
  assert.equal(officialBejaia.find((line) => line.ref === "4").terminus1, "GARE ROUTIERE");
  assert.equal(officialBejaia.find((line) => line.ref === "5").source_title, "LIGNE 5 : GARE ROUTIERE / IGHER OUZARIF");
  assert.equal(officialBejaia.find((line) => line.ref === "5").terminus2, "IGHZER OUZARIF");
  assert.deepEqual(officialMsila.map((line) => line.ref), ["17", "11", "12", "16"]);
  assert.ok(officialMsila.every((line) => line.terminus1 && line.terminus2
    && line.stop_count > 0 && line.stop_count_kind === "total"));
  assert.ok(officialMsila.every((line) => line.geometry === "official_route_diagram_reference"
    && line.page_receipt.payload_sha256
    && line.diagram_receipts.length > 0
    && line.diagram_receipts.every((receipt) => receipt.payload_sha256)));
});

test("tracked official Source bytes match their receipts", () => {
  const manifest = read("sources/buses/manifest.json");
  for (const name of ["etus-tiaret-lines", "etusto-lines", "etus-bejaia-lines", "etus-msila-lines"]) {
    const text = readFileSync(join(ROOT, `sources/buses/${name}.json`), "utf8");
    assert.equal(createHash("sha256").update(text).digest("hex"), manifest[name].sha256);
    assert.equal(manifest[name].bytes, Buffer.byteLength(text));
  }
});

test("bus v3 public API reaches new entities", async () => {
  const api = await import(join(ROOT, "packages/buses/index.js"));
  assert.equal(api.operatorRecords().length, 6);
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
