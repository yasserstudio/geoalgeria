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
const officialTiaret = readCapture("buses", "etus-tiaret-lines");
const officialEtusto = readCapture("buses", "etusto-lines");
const officialBejaia = readCapture("buses", "etus-bejaia-lines");
const officialMsila = readCapture("buses", "etus-msila-lines");
const officialSidiBelAbbes = readCapture("buses", "etus-sidi-bel-abbes-lines");
const officialSetif = readCapture("buses", "etus-setif-lines");
const officialAinDefla = readCapture("buses", "etus-ain-defla-lines");
const officialAnnaba = readCapture("buses", "etus-annaba-lines");
const etusa = read(join(ROOT, "research", "buses", "etusa-lines-clean.json"));
const shapeSourceByKey = new Map(osm.line_shapes.map((shape) => [`${shape.operator_id}|${shape.ref}`, shape]));
const officialLineByKey = new Map([
  ...officialTiaret.map((line) => [`etus-tiaret|${line.ref}`, { ...line, source: "etus-tiaret", source_url: "https://www.etus-tiaret.dz/ar/lines" }]),
  ...officialEtusto.map((line) => [`etusto|${line.ref}`, { ...line, source: "etusto", source_url: "http://etusto.dz/espv.html" }]),
]);
const operatorLabels = {
  etusa: { operator: "ETUSA", network: "Alger" },
  "etus-tiaret": { operator: "ETUS Tiaret", network: "Tiaret" },
  etusto: { operator: "ETUSTO", network: "Tizi Ouzou" },
  "etus-mostaganem": { operator: "ETUS Mostaganem", network: "Mostaganem" },
  "etus-setif": { operator: "ETUS Setif", network: "Setif" },
  etuad: { operator: "ETUS Aïn Defla", network: "Aïn Defla" },
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

// ETUSA Lines the retained registry never listed. That registry is one
// crowdsourced list of Lines 1-99, so the whole 6xx/7xx suburban network and
// several city Lines are absent from it while OSM carries them with an
// evidenced operator match. Their identity is OSM's, and `source` says so:
// terminus text stays null rather than borrowing the relation's from/to, which
// names a direction's endpoints and not the Line's published termini.
const publishedEtusaRefs = new Set(etusa.lines.map((line) => line.line));
for (const shape of osm.line_shapes.filter(
  (item) => item.operator_id === "etusa" && !publishedEtusaRefs.has(item.ref),
)) {
  lines.push({
    id: lineId("etusa", shape.ref), name: shape.name, operator_id: "etusa",
    operator: "ETUSA", network: "Alger", line: shape.ref,
    terminus1: null, terminus2: null, stops: null,
    communes_served: [], stations_served: [], wilaya_code: "16",
    source: "osm", source_refs: ["osm"],
    source_url: `https://www.openstreetmap.org/relation/${shape.relation_ids[0]}`,
    shape_id: shapeId("etusa", shape.ref), osm_relation_ids: shape.relation_ids,
  });
}

for (const official of officialBejaia) {
  lines.push({
    id: lineId("etus-bejaia", official.ref), name: `Ligne ${official.ref}`,
    operator_id: "etus-bejaia", operator: "ETUS Béjaïa", network: "Béjaïa",
    line: official.ref, terminus1: official.terminus1, terminus2: official.terminus2,
    stops: official.stop_count_kind === "total" ? official.stop_count : null,
    major_stops: official.stop_count_kind === "major" ? official.stop_count : null,
    service_hours: official.service_hours,
    communes_served: [], stations_served: [], wilaya_code: "06",
    source: "etus-bejaia", source_refs: ["etus-bejaia"], source_url: official.page_url,
    shape_id: null, osm_relation_ids: [],
  });
}

for (const official of officialMsila) {
  lines.push({
    id: lineId("etus-msila", official.ref), name: `Ligne ${official.ref}`,
    operator_id: "etus-msila", operator: "ETUS M'Sila", network: "M'Sila",
    line: official.ref, terminus1: official.terminus1, terminus2: official.terminus2,
    stops: official.stop_count, major_stops: null, service_hours: [],
    communes_served: [], stations_served: [], wilaya_code: "28",
    source: "etus-msila", source_refs: ["etus-msila"], source_url: official.page_url,
    shape_id: null, osm_relation_ids: [],
  });
}

for (const official of officialSidiBelAbbes.lines) {
  lines.push({
    id: lineId("etus-sidi-bel-abbes", official.ref), name: `Ligne ${official.ref}`,
    operator_id: "etus-sidi-bel-abbes", operator: "ETUS Sidi Bel Abbès", network: "Sidi Bel Abbès",
    line: official.ref, terminus1: official.terminus1, terminus2: official.terminus2,
    stops: null, major_stops: null, service_hours: [],
    departure_schedules: official.departure_schedules,
    route_diagram_url: official.route_diagram_url,
    communes_served: [], stations_served: [], wilaya_code: "22",
    source: "etus-sidi-bel-abbes", source_refs: ["etus-sidi-bel-abbes"],
    source_url: officialSidiBelAbbes.evidence.timetable_url,
    shape_id: null, osm_relation_ids: [],
  });
}

for (const official of officialSetif.lines) {
  const shape = shapeSourceByKey.get(`etus-setif|${official.ref}`);
  lines.push({
    id: lineId("etus-setif", official.ref), name: `Ligne ${official.ref}`,
    operator_id: "etus-setif", operator: "ETUS Setif", network: "Setif",
    line: official.ref,
    terminus1: official.terminus1_fr, terminus1_fr: official.terminus1_fr, terminus1_ar: official.terminus1_ar,
    terminus2: official.terminus2_fr, terminus2_fr: official.terminus2_fr, terminus2_ar: official.terminus2_ar,
    stops: null, major_stops: null, service_hours: [],
    communes_served: [], stations_served: [], wilaya_code: "19",
    source: "etus-setif", source_refs: shape ? ["etus-setif", "osm"] : ["etus-setif"],
    source_url: "https://www.facebook.com/111330534776381/",
    shape_id: shape ? shapeId("etus-setif", official.ref) : null,
    osm_relation_ids: shape?.relation_ids ?? [],
  });
}

// ETUS Aïn Defla: identities from the Operator's own artwork and program, one
// city per Line (Aïn Defla, Khemis Miliana, El Attaf); shape only where a
// reviewed OSM relation was matched to the official identity (AD-2).
for (const official of officialAinDefla.lines) {
  const shape = shapeSourceByKey.get(`etuad|${official.ref}`);
  lines.push({
    id: lineId("etuad", official.ref), name: `Ligne ${official.ref}`,
    operator_id: "etuad", operator: "ETUS Aïn Defla", network: official.network,
    line: official.ref,
    terminus1: official.terminus1_fr ?? null, terminus1_fr: official.terminus1_fr, terminus1_ar: official.terminus1_ar,
    terminus2: official.terminus2_fr ?? null, terminus2_fr: official.terminus2_fr, terminus2_ar: official.terminus2_ar,
    stops: null, major_stops: null, service_hours: [],
    communes_served: [], stations_served: [], wilaya_code: "44",
    source: "etus-ain-defla", source_refs: shape ? ["etus-ain-defla", "osm"] : ["etus-ain-defla"],
    source_url: "https://www.facebook.com/ETUS44/",
    shape_id: shape ? shapeId("etuad", official.ref) : null,
    osm_relation_ids: shape?.relation_ids ?? [],
  });
}

// ETUS Annaba: the six Lines the Operator numbers in its 2026 service program.
// Directory-only: wilaya 23's OSM relations carry no identity to match.
for (const official of officialAnnaba.lines) {
  lines.push({
    id: lineId("etus-annaba", official.ref), name: `Ligne ${official.ref}`,
    operator_id: "etus-annaba", operator: "ETUS Annaba", network: "Annaba",
    line: official.ref,
    terminus1: official.terminus1_fr, terminus1_fr: official.terminus1_fr, terminus1_ar: official.terminus1_ar,
    terminus2: official.terminus2_fr, terminus2_fr: official.terminus2_fr, terminus2_ar: official.terminus2_ar,
    stops: null, major_stops: null, service_hours: [],
    communes_served: [], stations_served: [], wilaya_code: "23",
    source: "etus-annaba", source_refs: ["etus-annaba"],
    source_url: officialAnnaba.evidence.announcement_url,
    shape_id: null, osm_relation_ids: [],
  });
}

for (const official of officialEtusto) {
  const shape = shapeSourceByKey.get(`etusto|${official.ref}`);
  lines.push({
    id: lineId("etusto", official.ref), name: shape?.name ?? `Ligne ${official.ref}`,
    operator_id: "etusto", operator: "ETUSTO", network: "Tizi Ouzou",
    line: official.ref, terminus1: official.terminus1, terminus2: official.terminus2, stops: null,
    communes_served: [], stations_served: [], wilaya_code: "15",
    source: "etusto", source_refs: shape ? ["etusto", "osm"] : ["etusto"],
    source_url: "http://etusto.dz/espv.html",
    shape_id: shape ? shapeId("etusto", official.ref) : null,
    osm_relation_ids: shape?.relation_ids ?? [],
  });
}

for (const shape of osm.line_shapes.filter((item) => !["etusa", "etusto", "etus-setif", "etuad"].includes(item.operator_id))) {
  const labels = operatorLabels[shape.operator_id];
  const official = officialLineByKey.get(`${shape.operator_id}|${shape.ref}`);
  lines.push({
    id: lineId(shape.operator_id, shape.ref), name: shape.name,
    operator_id: shape.operator_id, operator: labels.operator, network: labels.network,
    line: shape.ref, terminus1: official?.terminus1 ?? null, terminus2: official?.terminus2 ?? null, stops: null,
    communes_served: [], stations_served: [], wilaya_code: shape.wilaya_code,
    source: official?.source ?? "osm", source_refs: official ? [official.source, "osm"] : ["osm"],
    source_url: official?.source_url ?? `https://www.openstreetmap.org/relation/${shape.relation_ids[0]}`,
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
  const currentLine = lines.find((line) => line.id === currentLineId);
  for (const relation of shape.relations) {
    const directionId = `osm-relation-${relation.id}`;
    directions.push({
      id: directionId, line_id: currentLineId, shape_id: shapeId(shape.operator_id, shape.ref),
      osm_relation_id: relation.id,
      from: relation.tags?.from ?? null,
      to: relation.tags?.to ?? null,
      via: relation.tags?.via ?? null,
      public_transport_version: relation.tags?.["public_transport:version"] === "2" ? 2 : null,
      sequence_status: "osm_member_order_unvalidated",
      source: shape.operator_id === "etus-setif" ? "etus-setif+osm" : shape.operator_id === "etuad" ? "etus-ain-defla+osm" : "osm",
      source_refs: shape.operator_id === "etus-setif" ? ["etus-setif", "osm"] : shape.operator_id === "etuad" ? ["etus-ain-defla", "osm"] : ["osm"],
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
    // A stop mapped as a way (a platform or shelter footprint) has no node
    // position: Overpass hands back the way's centre. That is a derived point,
    // so it is approximate however many decimals it carries, and it must not
    // claim the osm_node method.
    geo_precision: station.osm_type === "way"
      ? "approximate"
      : Math.min(coordinateDecimals(station.lat), coordinateDecimals(station.lng)) >= 4 ? "exact" : "approximate",
    geo_method: station.osm_type === "way" ? "osm_way_center" : "osm_node", source: "osm",
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
    terminus1: line.terminus1, terminus1_fr: line.terminus1_fr, terminus1_ar: line.terminus1_ar,
    terminus2: line.terminus2, terminus2_fr: line.terminus2_fr, terminus2_ar: line.terminus2_ar,
    source: "osm",
    osm_relation_ids: shape.relation_ids, geometry: shape.geometry,
  };
});

const counts = { lines: lines.length, shapes: shapes.length, directions: directions.length, stations: stations.length, memberships: memberships.length };
if (JSON.stringify(counts) !== JSON.stringify({ lines: 133, shapes: 76, directions: 128, stations: 1603, memberships: 2685 })) {
  throw new Error(`Bus release count drift: ${JSON.stringify(counts)}`);
}
if (stations.filter((station) => station.wilaya_method === "operator_scope").length !== 12) {
  throw new Error("Expected exactly 12 ETUSA Station Wilaya derivations");
}

const cfg = MIGRATIONS.buses;
const { metadata } = writePackageV2({
  pkg: "buses", dir: DATA,
  files: [
    { file: "lines.json", geojson: false, rows: lines.map(cfg.map),
      sortRows: (a, b) => Number(a.wilaya_code) - Number(b.wilaya_code)
        || String(a.name_fr ?? a.id).localeCompare(String(b.name_fr ?? b.id), "fr", { numeric: true }) },
    { file: "stations.json", rows: stations },
  ],
  meta: cfg.meta, updated: "2026-09-02", retrieved: "2026-09-02",
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
const operatorRows = osm.operators.map((operator) => ({
  id: operator.id, name: operatorLabels[operator.id].operator,
  name_fr: operator.name_fr, name_ar: operator.name_ar,
  wilaya_codes: operator.wilaya_codes, scope: operator.scope,
  line_count: lines.filter((line) => line.operator_id === operator.id).length,
  shape_count: shapes.filter((shape) => shape.operator_id === operator.id).length,
  source_refs: operator.id === "etusa" ? ["wikipedia", "osm"]
    : operator.id === "etus-tiaret" ? ["etus-tiaret", "osm"]
      : operator.id === "etusto" ? ["etusto", "osm"]
        : operator.id === "etus-setif" ? ["etus-setif", "osm"]
          : operator.id === "etuad" ? ["etus-ain-defla", "osm"] : ["osm"],
}));
operatorRows.push({
  id: "etus-annaba", name: "ETUS Annaba",
  name_fr: "Entreprise de transport urbain et suburbain d'Annaba", name_ar: "المؤسسة العمومية للنقل الحضري وشبه الحضري عنابة",
  wilaya_codes: ["23"], scope: "urban_suburban",
  line_count: officialAnnaba.lines.length, shape_count: 0, source_refs: ["etus-annaba"],
});
operatorRows.push({
  id: "etus-bejaia", name: "ETUS Béjaïa",
  name_fr: "Entreprise de Transport Urbain et Suburbain de Béjaïa", name_ar: null,
  wilaya_codes: ["06"], scope: "urban_suburban",
  line_count: officialBejaia.length, shape_count: 0, source_refs: ["etus-bejaia"],
});
operatorRows.push({
  id: "etus-msila", name: "ETUS M'Sila",
  name_fr: "Entreprise de Transport Urbain et Suburbain de M'Sila", name_ar: "المؤسسة العمومية للنقل الحضري وشبه الحضري بالمسيلة",
  wilaya_codes: ["28"], scope: "urban_suburban",
  line_count: officialMsila.length, shape_count: 0, source_refs: ["etus-msila"],
});
operatorRows.push({
  id: "etus-sidi-bel-abbes", name: "ETUS Sidi Bel Abbès",
  name_fr: "Entreprise de Transport Urbain et Suburbain de Sidi Bel Abbès",
  name_ar: "المؤسسة العمومية للنقل الحضري وشبه الحضري سيدي بلعباس",
  wilaya_codes: ["22"], scope: "urban_suburban",
  line_count: officialSidiBelAbbes.lines.length, shape_count: 0,
  source_refs: ["etus-sidi-bel-abbes"],
});
// Where a reader can confirm a Line with the Operator itself. Only pages whose
// title was verified in review; a missing page is null, never guessed.
const operatorContacts = {
  etusa: { website_url: "https://www.etusa.dz/", facebook_url: null },
  "etus-tiaret": { website_url: "https://www.etus-tiaret.dz/", facebook_url: null },
  etusto: { website_url: "http://etusto.dz/", facebook_url: null },
  "etus-setif": { website_url: null, facebook_url: "https://www.facebook.com/111330534776381/" },
  "etus-mostaganem": { website_url: null, facebook_url: "https://www.facebook.com/100048728689041/" },
  "etus-bejaia": { website_url: "https://etusbejaia.dz/", facebook_url: null },
  "etus-msila": { website_url: "https://etus-msila.dz/", facebook_url: null },
  "etus-sidi-bel-abbes": { website_url: "https://etus22.dz/", facebook_url: null },
  etuad: { website_url: null, facebook_url: "https://www.facebook.com/ETUS44/" },
  "etus-annaba": { website_url: null, facebook_url: "https://www.facebook.com/100063517660926/" },
};
for (const row of operatorRows) Object.assign(row, operatorContacts[row.id] ?? { website_url: null, facebook_url: null });
write(join(DATA, "operators.json"), operatorRows.sort((a, b) => a.id.localeCompare(b.id)));
write(join(DATA, "directions.json"), directions.sort((a, b) => a.osm_relation_id - b.osm_relation_id));
write(join(DATA, "station-memberships.json"), memberships.sort((a, b) => a.osm_relation_id - b.osm_relation_id || a.osm_member_index - b.osm_member_index));
write(join(DATA, "shapes.json"), shapes);
write(join(DATA, "geojson", "shapes.geojson"), {
  type: "FeatureCollection",
  features: shapes.map(({ geometry, ...properties }) => ({ type: "Feature", id: properties.id, geometry, properties })),
});

// Report the counts actually written; a hardcoded summary here silently kept
// printing the previous release's numbers through a real change.
const n = (value) => value.toLocaleString("en-US");
console.log(
  `buses: ${n(counts.lines)} lines, ${n(counts.shapes)} shapes, ${n(counts.directions)} directions, ` +
    `${n(counts.stations)} stations, ${n(counts.memberships)} ordered memberships → v3`,
);
