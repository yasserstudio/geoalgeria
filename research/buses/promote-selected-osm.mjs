// Promote the reviewed urban/suburban OSM subset from the ignored research cache
// into a compact, tracked Source that can rebuild @geoalgeria/buses offline.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeCapture } from "../../scripts/lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CACHE = join(HERE, "osm");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));

const etusa = read(join(HERE, "etusa-lines-clean.json"));
const candidates = read(join(CACHE, "candidate-lines.json"));
const features = read(join(CACHE, "candidate-lines.geojson")).features;
const stations = read(join(CACHE, "stations.json"));
const rawRelations = read(join(CACHE, "raw", "relations.json")).elements;
const rawManifest = read(join(CACHE, "raw", "manifest.json"));
const registry = read(join(HERE, "operator-registry.json"));
const officialTiaret = read(join(ROOT, "sources", "buses", "etus-tiaret-lines.json"));
const officialEtusto = read(join(ROOT, "sources", "buses", "etusto-lines.json"));
const officialSetif = read(join(ROOT, "sources", "buses", "etus-setif-lines.json"));
const approvedSetifRelations = new Map(
  officialSetif.evidence.geometry_validations.map((validation) => [
    validation.line,
    validation.osm_relation_ids,
  ]),
);

const dedupeMultiLineString = (geometry) => {
  if (geometry.type !== "MultiLineString") return geometry;
  const seen = new Set();
  return {
    ...geometry,
    coordinates: geometry.coordinates.filter((coordinates) => {
      const key = JSON.stringify(coordinates);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
};

const approvedSetifLineFor = (relationIds) =>
  [...approvedSetifRelations.entries()].find(([, approvedIds]) =>
    approvedIds.length === relationIds.length
    && approvedIds.every((id, index) => id === relationIds[index]))?.[0] ?? null;

// OSM writes some ETUSA refs zero-padded ("03" for Line 3). Join on a canonical
// form so a published Line is not silently denied its geometry, and carry the
// PUBLISHED spelling forward so the shape still keys to its Line downstream.
const normRef = (ref) => String(ref ?? "").trim().toUpperCase().replace(/^0+(?=\d)/, "");
const publishedEtusaRefByNorm = new Map(etusa.lines.map((line) => [normRef(line.line), line.line]));
const canonicalEtusaRef = (ref) => publishedEtusaRefByNorm.get(normRef(ref)) ?? ref;
const reviewedTiaretRefs = new Set(officialTiaret.map((line) => line.ref));
const reviewedEtustoRefs = new Set(officialEtusto.map((line) => line.ref));
const reviewedSetifRefs = new Set(officialSetif.lines.map((line) => line.ref));
const selected = candidates.filter((candidate) =>
  candidate.classification?.value === "urban_suburban_candidate" &&
  candidate.map_readiness === "geometry_candidate" && (
    // ETUSA identity is accepted from OSM itself, not only from the retained
    // 50-Line registry: the registry covers Lines 1-99 from one crowdsourced
    // list and omits the 6xx/7xx suburban network entirely. The operator match
    // is already evidenced (operator/network tag or Wikidata QID) before a
    // candidate reaches here, and every published Line links its OSM relations
    // so a reader can report or fix a wrong route at the origin. ETUSA's remit
    // is urban AND suburban Alger, so its runs into Boumerdes and Tipaza are
    // kept: 604 and 630 match the AOTU-A plan termini (Dergana-Reghaia El
    // Kerrouche, Hammedi-El Harrach) and 747 carries the same operator tag.
    // Cross-wilaya routes of any OTHER operator remain excluded.
    candidate.operator_id === "etusa" ||
    (candidate.operator_id === "etus-tiaret" && reviewedTiaretRefs.has(candidate.ref)) ||
    (candidate.operator_id === "etusto" && reviewedEtustoRefs.has(candidate.ref)) ||
    (candidate.operator_id === "etus-setif" && approvedSetifLineFor(candidate.relation_ids) != null) ||
    candidate.operator_id === "etus-mostaganem"
  ),
);

const byOperator = Object.fromEntries(
  ["etusa", "etus-tiaret", "etusto", "etus-mostaganem", "etus-setif"].map((id) => [
    id,
    selected.filter((candidate) => candidate.operator_id === id).length,
  ]),
);
if (selected.length !== 75 || byOperator.etusa !== 61 || byOperator["etus-tiaret"] !== 7
  || byOperator.etusto !== 3 || byOperator["etus-mostaganem"] !== 1
  || byOperator["etus-setif"] !== 3) {
  throw new Error(`Selection drifted: ${JSON.stringify({ total: selected.length, byOperator })}`);
}

const featureById = new Map(features.map((feature) => [feature.id, feature]));
const relationById = new Map(rawRelations.map((relation) => [relation.id, relation]));
const selectedRelationIds = new Set(selected.flatMap((candidate) => candidate.relation_ids));
const selectedStationIds = new Set(selected.flatMap((candidate) => candidate.station_ids));

const lineShapes = selected
  .map((candidate) => {
    const feature = featureById.get(candidate.id);
    if (!feature?.geometry) throw new Error(`Missing geometry for ${candidate.id}`);
    const relations = candidate.relation_ids.map((id) => relationById.get(id));
    if (relations.some((relation) => !relation)) throw new Error(`Missing relation for ${candidate.id}`);
    const ref = candidate.operator_id === "etus-setif"
      ? approvedSetifLineFor(candidate.relation_ids) ?? candidate.ref
      : candidate.operator_id === "etusa"
        ? canonicalEtusaRef(candidate.ref)
        : candidate.ref;
    return {
      operator_id: candidate.operator_id,
      ref,
      name: candidate.name ?? null,
      wilaya_code: candidate.wilaya_codes[0] ?? null,
      directions: candidate.directions,
      relation_ids: candidate.relation_ids,
      relations,
      geometry: ref === "106B" ? dedupeMultiLineString(feature.geometry) : feature.geometry,
    };
  })
  .sort((a, b) => a.operator_id.localeCompare(b.operator_id) || a.ref.localeCompare(b.ref, undefined, { numeric: true }));

const selectedStations = stations
  .filter((station) => selectedStationIds.has(station.id))
  .map((station) => ({
    id: station.id,
    osm_type: station.osm_type,
    osm_id: station.osm_id,
    name: station.name ?? null,
    name_fr: station.name_fr ?? null,
    name_ar: station.name_ar ?? null,
    lat: station.lat,
    lng: station.lng,
    wilaya_code: station.wilaya_code,
    roles: station.roles,
    highway: station.highway ?? null,
    public_transport: station.public_transport ?? null,
  }))
  .sort((a, b) => a.osm_id - b.osm_id);

const relevantResponses = Object.fromEntries(
  Object.entries(rawManifest.responses)
    .filter(([key, response]) => {
      if (key === "relations") return true;
      const ids = response.query.match(/rel\(id:([\d,]+)\)/)?.[1].split(",").map(Number) ?? [];
      return ids.some((id) => selectedRelationIds.has(id));
    })
    .map(([key, response]) => [key, response]),
);

const source = {
  schema_version: "1.0.0",
  source: "OpenStreetMap via Overpass API",
  license: "ODbL-1.0",
  attribution: "© OpenStreetMap contributors",
  selection_note: "Reviewed urban/suburban geometry subset only: 61 ETUSA shapes, of which 35 carry a ref from the retained 50-line registry and 26 take their Line identity from the evidenced OSM operator match alone (the registry lists only Lines 1-99 and omits the 6xx/7xx suburban network; three of these, 604, 630 and 747, are suburban runs into Boumerdes and Tipaza within ETUSA's remit); 7 ETUS Tiaret Lines selected from the extracted official Operator Line set, 3 ETUSTO Lines selected from the extracted official Operator Line set, 3 ETUS Setif Lines matched to official Operator identities, and the single ETUS Mostaganem candidate. The stale Tiaret ref 33 plus unresolved, taxi, non-ETUSA cross/inter-wilaya, unmatched Setif, ETUAD, and validation-only official geometry are excluded.",
  membership_note: "Station memberships preserve raw OSM relation-member order and roles. This order is unvalidated as a passenger stop sequence, and no terminus status is inferred.",
  selection_counts: {
    shape_candidates: lineShapes.length,
    directional_relations: selectedRelationIds.size,
    stations: selectedStations.length,
    by_operator: byOperator,
  },
  receipt: {
    collection_mode: rawManifest.collection_mode,
    note: rawManifest.note,
    responses: relevantResponses,
  },
  operators: registry.operators
    .filter((operator) => ["etusa", "etus-tiaret", "etusto", "etus-mostaganem", "etus-setif"].includes(operator.id))
    .map(({ id, name_fr, name_ar, wilaya_codes, scope }) => ({ id, name_fr, name_ar, wilaya_codes, scope })),
  line_shapes: lineShapes,
  stations: selectedStations,
};

writeCapture("buses", "osm-urban-selected", source, {
  url: "https://overpass-api.de/api/interpreter",
  retrieved: "2026-09-01",
  records: lineShapes.length,
  note: "Reviewed trimmed OSM projection. Non-atomic retrieval and snapshot intervals, queries, endpoint URLs, and upstream response hashes are embedded in the capture receipt.",
});

console.log(`promoted ${lineShapes.length} shapes, ${selectedRelationIds.size} relations, ${selectedStations.length} stations`);
