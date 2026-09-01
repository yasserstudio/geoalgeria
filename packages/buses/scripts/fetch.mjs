// Build the reviewed urban/suburban bus release entirely from tracked Sources.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MIGRATIONS, writePackageV2 } from "../../../scripts/lib/v2-transforms.mjs";
import { readCapture } from "../../../scripts/lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const DATA = join(HERE, "..", "data");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
const osm = readCapture("buses", "osm-urban-selected");
const etusa = read(join(ROOT, "research", "buses", "etusa-lines-clean.json"));
const shapeSourceByKey = new Map(osm.line_shapes.map((shape) => [`${shape.operator_id}|${shape.ref}`, shape]));
const operatorLabels = {
  etusa: { operator: "ETUSA", network: "Alger" },
  "etus-tiaret": { operator: "ETUS Tiaret", network: "Tiaret" },
  "etus-mostaganem": { operator: "ETUS Mostaganem", network: "Mostaganem" },
};
const coordinateDecimals = (value) => {
  const text = String(value);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
};
const lineId = (operatorId, ref) => `${operatorId}-${ref}`;
const shapeId = (operatorId, ref) => `shape-${lineId(operatorId, ref)}`;

const lines = etusa.lines.map((line) => {
  const shape = shapeSourceByKey.get(`etusa|${line.line}`);
  return {
    id: lineId("etusa", line.line), operator_id: "etusa", operator: "ETUSA", network: "Alger",
    line: line.line, terminus1: line.terminus1 || null, terminus2: line.terminus2 || null,
    stops: line.stops ?? null, communes_served: line.communes_served || [],
    stations_served: line.stations_served || [], wilaya_code: "16",
    source: shape ? "wikipedia+osm" : "wikipedia",
    source_refs: shape ? ["wikipedia", "osm"] : ["wikipedia"], source_url: etusa.source,
    shape_id: shape ? shapeId("etusa", line.line) : null,
    osm_relation_ids: shape?.relation_ids ?? [],
  };
});

for (const shape of osm.line_shapes.filter((item) => item.operator_id !== "etusa")) {
  const labels = operatorLabels[shape.operator_id];
  lines.push({
    id: lineId(shape.operator_id, shape.ref), name: shape.name,
    operator_id: shape.operator_id, operator: labels.operator, network: labels.network,
    line: shape.ref, terminus1: null, terminus2: null, stops: null,
    communes_served: [], stations_served: [], wilaya_code: shape.wilaya_code,
    source: "osm", source_refs: ["osm"],
    source_url: `https://www.openstreetmap.org/relation/${shape.relation_ids[0]}`,
    shape_id: shapeId(shape.operator_id, shape.ref), osm_relation_ids: shape.relation_ids,
  });
}

const stationSourceById = new Map(osm.stations.map((station) => [station.id, station]));
const directions = [];
const memberships = [];
const linesByStation = new Map();
const operatorsByStation = new Map();

for (const shape of osm.line_shapes) {
  const currentLineId = lineId(shape.operator_id, shape.ref);
  for (const relation of shape.relations) {
    const directionId = `osm-relation-${relation.id}`;
    directions.push({
      id: directionId, line_id: currentLineId, shape_id: shapeId(shape.operator_id, shape.ref),
      osm_relation_id: relation.id, from: relation.tags?.from ?? null, to: relation.tags?.to ?? null,
      via: relation.tags?.via ?? null,
      public_transport_version: relation.tags?.["public_transport:version"] === "2" ? 2 : null,
      sequence_status: "osm_member_order_unvalidated", source: "osm",
    });
    let sourceSequence = 0;
    relation.members.forEach((member, osmMemberIndex) => {
      const sourceStationId = `${member.type}/${member.ref}`;
      if (!stationSourceById.has(sourceStationId)) return;
      sourceSequence += 1;
      const stationId = `osm-${member.type}-${member.ref}`;
      memberships.push({
        id: `${directionId}-member-${osmMemberIndex}`, direction_id: directionId,
        line_id: currentLineId, station_id: stationId, osm_relation_id: relation.id,
        osm_member_index: osmMemberIndex, source_sequence: sourceSequence,
        role: member.role || null, sequence_status: "osm_member_order_unvalidated", source: "osm",
      });
      if (!linesByStation.has(stationId)) linesByStation.set(stationId, new Set());
      if (!operatorsByStation.has(stationId)) operatorsByStation.set(stationId, new Set());
      linesByStation.get(stationId).add(currentLineId);
      operatorsByStation.get(stationId).add(shape.operator_id);
    });
  }
}

const stations = osm.stations.map((station) => {
  const id = `osm-${station.osm_type}-${station.osm_id}`;
  const derivedWilaya = station.wilaya_code == null;
  const operatorIds = [...(operatorsByStation.get(id) ?? [])].sort();
  if (derivedWilaya && (operatorIds.length !== 1 || operatorIds[0] !== "etusa")) {
    throw new Error(`Cannot derive Wilaya 16 from ETUSA scope for ${id}`);
  }
  return {
    id, name: station.name, name_fr: station.name_fr, name_ar: station.name_ar,
    wilaya_code: derivedWilaya ? "16" : station.wilaya_code,
    commune_code: null, commune: null, lat: station.lat, lng: station.lng,
    geo_precision: Math.min(coordinateDecimals(station.lat), coordinateDecimals(station.lng)) >= 4 ? "exact" : "approximate",
    geo_method: "osm_node", source: "osm",
    osm_type: station.osm_type, osm_id: station.osm_id,
    refs: { osm: `${station.osm_type}/${station.osm_id}` }, operator_ids: operatorIds,
    line_ids: [...(linesByStation.get(id) ?? [])].sort(),
    wilaya_method: derivedWilaya ? "operator_scope" : "point_in_wilaya",
    roles: station.roles, highway: station.highway, public_transport: station.public_transport,
  };
});

const shapes = osm.line_shapes.map((shape) => {
  const labels = operatorLabels[shape.operator_id];
  const line = lines.find((item) => item.id === lineId(shape.operator_id, shape.ref));
  return {
    id: shapeId(shape.operator_id, shape.ref), line_id: line.id,
    operator_id: shape.operator_id, operator: labels.operator, network: labels.network,
    line: shape.ref, name: line.name ?? shape.name ?? null, wilaya_code: shape.wilaya_code,
    terminus1: line.terminus1, terminus2: line.terminus2, source: "osm",
    osm_relation_ids: shape.relation_ids, geometry: shape.geometry,
  };
});

const counts = { lines: lines.length, shapes: shapes.length, directions: directions.length, stations: stations.length, memberships: memberships.length };
if (JSON.stringify(counts) !== JSON.stringify({ lines: 59, shapes: 42, directions: 75, stations: 1046, memberships: 1878 })) {
  throw new Error(`Bus release count drift: ${JSON.stringify(counts)}`);
}
if (stations.filter((station) => station.wilaya_method === "operator_scope").length !== 12) {
  throw new Error("Expected exactly 12 ETUSA Station Wilaya derivations");
}

const cfg = MIGRATIONS.buses;
const { metadata } = writePackageV2({
  pkg: "buses", dir: DATA,
  files: [
    { file: "lines.json", geojson: false, rows: lines.map(cfg.map) },
    { file: "stations.json", rows: stations },
  ],
  meta: cfg.meta, updated: "2026-09-01", retrieved: "2026-09-01",
  stats: { shapes: shapes.length, directions: directions.length, stations: stations.length, station_memberships: memberships.length },
});
write(join(DATA, "metadata.json"), {
  ...metadata,
  shapes: shapes.length,
  directions: directions.length,
  stations: stations.length,
  station_memberships: memberships.length,
});

mkdirSync(join(DATA, "geojson"), { recursive: true });
write(join(DATA, "operators.json"), osm.operators.map((operator) => ({
  id: operator.id, name: operatorLabels[operator.id].operator,
  name_fr: operator.name_fr, name_ar: operator.name_ar,
  wilaya_codes: operator.wilaya_codes, scope: operator.scope,
  line_count: lines.filter((line) => line.operator_id === operator.id).length,
  shape_count: shapes.filter((shape) => shape.operator_id === operator.id).length,
  source_refs: operator.id === "etusa" ? ["wikipedia", "osm"] : ["osm"],
})).sort((a, b) => a.id.localeCompare(b.id)));
write(join(DATA, "directions.json"), directions.sort((a, b) => a.osm_relation_id - b.osm_relation_id));
write(join(DATA, "station-memberships.json"), memberships.sort((a, b) => a.osm_relation_id - b.osm_relation_id || a.osm_member_index - b.osm_member_index));
write(join(DATA, "shapes.json"), shapes);
write(join(DATA, "geojson", "shapes.geojson"), {
  type: "FeatureCollection",
  features: shapes.map(({ geometry, ...properties }) => ({ type: "Feature", id: properties.id, geometry, properties })),
});

console.log("buses: 59 lines, 42 shapes, 75 directions, 1,046 stations, 1,878 ordered memberships → v3");
