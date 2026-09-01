#!/usr/bin/env node
/**
 * Aggregate the local OSM directional relations into research-only candidate
 * Lines, normalize evidenced operator aliases, and expose every scope/readiness
 * decision for review. This does not write @geoalgeria/buses package data.
 *
 * Run after collect-osm.mjs:
 *   node research/buses/analyze-candidates.mjs
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stableStringify } from "../../scripts/lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OSM = join(HERE, "osm");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const json = (value) => `${stableStringify(value)}\n`;
const fold = (value) => String(value ?? "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const compact = (values) => [...new Set(values.filter((value) => value != null && value !== ""))];
const candidateId = (key) => `candidate-${createHash("sha1").update(key).digest("hex").slice(0, 12)}`;

const relations = read(join(OSM, "relations.json"));
const relationGeojson = read(join(OSM, "relations.geojson"));
const stations = read(join(OSM, "stations.json"));
const coverage = read(join(OSM, "coverage.json"));
const registry = read(join(HERE, "operator-registry.json"));
const operators = new Map(registry.operators.map((operator) => [operator.id, operator]));
if (operators.size !== registry.operators.length) throw new Error("duplicate operator id in registry");
const registeredEvidenceIds = new Set();
const allowedEvidenceTypes = new Set(["official", "crowdsourced", "derived"]);
for (const operator of registry.operators) {
  const sourceClaims = new Set();
  for (const source of operator.sources) {
    if (!source.id || !source.url || !allowedEvidenceTypes.has(source.evidence_type) || !source.kind
      || !Array.isArray(source.claims) || !source.reuse_status) {
      throw new Error(`invalid Source entry for Operator ${operator.id}`);
    }
    if (registeredEvidenceIds.has(source.id)) throw new Error(`duplicate Source id: ${source.id}`);
    registeredEvidenceIds.add(source.id);
    for (const claim of source.claims) sourceClaims.add(claim);
  }
  for (const available of operator.available_data) {
    if (!sourceClaims.has(available)) throw new Error(`unlinked available_data claim for ${operator.id}: ${available}`);
  }
  const discoveryClaims = new Set();
  for (const lead of operator.discovery_leads ?? []) {
    if (!lead.id || !lead.url || !lead.kind || !Array.isArray(lead.claims) || !lead.reuse_status
      || Object.hasOwn(lead, "evidence_type")) {
      throw new Error(`invalid discovery lead for Operator ${operator.id}`);
    }
    if (registeredEvidenceIds.has(lead.id)) throw new Error(`duplicate evidence id: ${lead.id}`);
    registeredEvidenceIds.add(lead.id);
    for (const claim of lead.claims) discoveryClaims.add(claim);
  }
  for (const finding of operator.discovery_findings ?? []) {
    if (!discoveryClaims.has(finding)) throw new Error(`unlinked discovery finding for ${operator.id}: ${finding}`);
  }
}
const relationIdsInSource = new Set(relations.map((relation) => relation.osm_id));
if (relationIdsInSource.size !== relations.length) throw new Error("duplicate OSM relation id in source data");
for (const match of registry.relation_operator_matches) {
  if (!operators.has(match.operator_id)) throw new Error(`unknown override operator: ${match.operator_id}`);
  if (!relationIdsInSource.has(match.osm_relation_id)) throw new Error(`unknown override relation: ${match.osm_relation_id}`);
}

const aliases = new Map();
for (const operator of registry.operators) {
  for (const alias of operator.aliases) {
    const key = fold(alias);
    const previous = aliases.get(key);
    if (previous && previous !== operator.id) throw new Error(`operator alias conflict: ${alias}`);
    aliases.set(key, operator.id);
  }
}
const overrides = new Map(registry.relation_operator_matches.map((match) => [match.osm_relation_id, match]));

const stationIdsByRelation = new Map();
const stationWilayasByRelation = new Map();
for (const station of stations) {
  for (const relationId of station.relation_ids) {
    const id = Number(relationId);
    const ids = stationIdsByRelation.get(id) ?? new Set();
    ids.add(station.id);
    stationIdsByRelation.set(id, ids);
    if (station.wilaya_code) {
      const wilayas = stationWilayasByRelation.get(id) ?? new Set();
      wilayas.add(station.wilaya_code);
      stationWilayasByRelation.set(id, wilayas);
    }
  }
}

function matchOperator(relation) {
  const override = overrides.get(relation.osm_id);
  if (override) return { id: override.operator_id, method: "official_relation_match", reason: override.reason };
  if (relation.tags?.["operator:wikidata"] === "Q3055259" || relation.tags?.["network:wikidata"] === "Q3055259") {
    return { id: "etusa", method: "wikidata_tag", reason: "OSM operator/network Wikidata Q3055259" };
  }
  const values = [relation.operator, relation.network, relation.tags?.["operator:ar"], relation.tags?.["network:ar"]];
  const matches = compact(values.map((value) => aliases.get(fold(value))));
  if (matches.length === 1) return { id: matches[0], method: "alias", reason: "Controlled operator/network alias" };
  if (matches.length > 1) return { id: null, method: "conflict", reason: `Conflicting aliases: ${matches.join(", ")}` };
  return { id: null, method: "unmatched", reason: "No evidenced operator alias" };
}

function canonicalRef(relation) {
  const raw = relation.ref ?? relation.name?.match(/^\s*(\d+[A-Za-z]?)\b/)?.[1] ?? null;
  if (!raw) return null;
  return String(raw).trim().replace(/\s+(?:r|reverse|aller|retour)$/i, "").trim() || null;
}

function endpointPair(relation) {
  const endpoints = [fold(relation.from), fold(relation.to)].filter(Boolean).sort();
  return endpoints.length === 2 ? endpoints.join("<->") : null;
}

function directedEndpoints(relation) {
  const from = fold(relation.from);
  const to = fold(relation.to);
  return from && to && from !== to ? { from, to } : null;
}

function effectiveWilayas(relation) {
  return compact([
    ...(relation.wilaya_codes ?? []),
    ...(stationWilayasByRelation.get(relation.osm_id) ?? []),
  ]).sort();
}

function groupKey(relation, operatorMatch, reciprocalEndpointGroups) {
  const ref = canonicalRef(relation);
  const endpoints = endpointPair(relation);
  const wilayas = effectiveWilayas(relation).join("+") || "unknown";
  if (operatorMatch.id) {
    const operator = operators.get(operatorMatch.id);
    if (operator.candidate_grouping === "ref" && ref) return `${operator.id}|ref:${fold(ref)}`;
    if (ref && endpoints) return `${operator.id}|ref:${fold(ref)}|ends:${endpoints}`;
    if (ref) return `${operator.id}|ref:${fold(ref)}`;
    if (endpoints) return `${operator.id}|ends:${endpoints}`;
    return `${operator.id}|relation:${relation.osm_id}`;
  }
  if (ref && endpoints) return `${wilayas}|ref:${fold(ref)}|ends:${endpoints}`;
  if (reciprocalEndpointGroups.has(relation.osm_id)) return reciprocalEndpointGroups.get(relation.osm_id);
  return `${wilayas}|relation:${relation.osm_id}`;
}

const relationContexts = relations.map((relation) => ({ relation, operatorMatch: matchOperator(relation) }));
const endpointBuckets = new Map();
for (const context of relationContexts) {
  const { relation, operatorMatch } = context;
  const directed = directedEndpoints(relation);
  if (operatorMatch.id || canonicalRef(relation) || !directed) continue;
  const wilayas = effectiveWilayas(relation).join("+") || "unknown";
  const key = `${wilayas}|ends:${endpointPair(relation)}`;
  const bucket = endpointBuckets.get(key) ?? [];
  bucket.push({ ...context, directed });
  endpointBuckets.set(key, bucket);
}

const reciprocalEndpointGroups = new Map();
for (const [key, bucket] of endpointBuckets) {
  const forward = bucket
    .filter(({ directed }) => directed.from < directed.to)
    .sort((a, b) => a.relation.osm_id - b.relation.osm_id);
  const reverse = bucket
    .filter(({ directed }) => directed.from > directed.to)
    .sort((a, b) => a.relation.osm_id - b.relation.osm_id);
  const pairCount = Math.min(forward.length, reverse.length);
  for (let index = 0; index < pairCount; index++) {
    const pairKey = `${key}|reciprocal:${index + 1}`;
    reciprocalEndpointGroups.set(forward[index].relation.osm_id, pairKey);
    reciprocalEndpointGroups.set(reverse[index].relation.osm_id, pairKey);
  }
}

const groups = new Map();
for (const { relation, operatorMatch } of relationContexts) {
  const key = groupKey(relation, operatorMatch, reciprocalEndpointGroups);
  const group = groups.get(key) ?? [];
  group.push({ relation, operatorMatch });
  groups.set(key, group);
}

function classify(group) {
  if (group.relations.some((relation) => relation.quality_flags.includes("taxi_label"))) {
    return { value: "taxi_excluded", reason: "At least one relation is explicitly taxi-labelled" };
  }
  if (group.operator?.scope === "urban_suburban") {
    return { value: "urban_suburban_candidate", reason: `Matched controlled operator ${group.operator.id}` };
  }
  if (group.wilaya_codes.length > 1 && group.max_length_km >= 35) {
    return { value: "inter_wilaya_candidate", reason: "Unmatched operator, multi-wilaya geometry and ≥35 km relation" };
  }
  if (group.wilaya_codes.length > 1) {
    return { value: "cross_wilaya_review", reason: "Multi-wilaya geometry without an evidenced operator scope" };
  }
  return { value: "unresolved", reason: "Insufficient evidence for urban/suburban or inter-wilaya scope" };
}

const relationFeatures = new Map(relationGeojson.features.map((feature) => [Number(String(feature.id).split("/").at(-1)), feature]));
const candidateFeatures = [];
const candidates = [...groups.entries()].map(([key, members]) => {
  const groupRelations = members.map((member) => member.relation);
  const operatorIds = compact(members.map((member) => member.operatorMatch.id));
  const operator = operatorIds.length === 1 ? operators.get(operatorIds[0]) : null;
  const relationIds = groupRelations.map((relation) => relation.osm_id).sort((a, b) => a - b);
  const stationIds = compact(relationIds.flatMap((id) => [...(stationIdsByRelation.get(id) ?? [])])).sort();
  const wilayaCodes = compact(groupRelations.flatMap(effectiveWilayas)).sort();
  const lengths = groupRelations.map((relation) => relation.length_km).filter(Number.isFinite);
  const refs = compact(groupRelations.map(canonicalRef));
  const candidate = {
    id: candidateId(key),
    candidate_line_group: key,
    relation_ids: relationIds,
    relation_count: relationIds.length,
    ref: refs.length === 1 ? refs[0] : null,
    refs,
    name: groupRelations.map((relation) => relation.name).find(Boolean) ?? null,
    directions: groupRelations.map((relation) => ({
      relation_id: relation.osm_id,
      from: relation.from,
      to: relation.to,
    })),
    operator_id: operator?.id ?? null,
    operator_name_fr: operator?.name_fr ?? null,
    operator_match_methods: compact(members.map((member) => member.operatorMatch.method)),
    operator_match_reasons: compact(members.map((member) => member.operatorMatch.reason)),
    operator_raw: compact(groupRelations.map((relation) => relation.operator)),
    network_raw: compact(groupRelations.map((relation) => relation.network)),
    wilaya_codes: wilayaCodes,
    geometry_relation_count: groupRelations.filter((relation) => relation.geometry_status !== "none").length,
    complete_geometry_relation_count: groupRelations.filter((relation) => relation.geometry_status === "complete").length,
    station_ids: stationIds,
    station_member_count: stationIds.length,
    min_length_km: lengths.length ? Math.min(...lengths) : null,
    max_length_km: lengths.length ? Math.max(...lengths) : null,
    colours: compact(groupRelations.map((relation) => relation.colour)),
    quality_flags: compact(groupRelations.flatMap((relation) => relation.quality_flags)).sort(),
  };
  candidate.operator = operator;
  candidate.classification = classify({
    relations: groupRelations,
    operator,
    wilaya_codes: wilayaCodes,
    max_length_km: candidate.max_length_km ?? 0,
  });
  const hasIdentity = Boolean(candidate.ref && candidate.name && candidate.directions.some((direction) => direction.from && direction.to));
  candidate.map_readiness = candidate.classification.value !== "urban_suburban_candidate"
    ? "review_only"
    : candidate.complete_geometry_relation_count === 0
      ? "blocked_no_geometry"
      : hasIdentity ? "geometry_candidate" : "needs_identity";
  candidate.station_readiness = candidate.station_member_count > 0 ? "station_members_available" : "missing_station_members";

  const segments = relationIds.flatMap((id) => relationFeatures.get(id)?.geometry?.coordinates ?? []);
  if (segments.length) {
    candidateFeatures.push({
      type: "Feature",
      id: candidate.id,
      geometry: { type: "MultiLineString", coordinates: segments },
      properties: Object.fromEntries(Object.entries(candidate).filter(([field]) =>
        !["directions", "station_ids", "operator"].includes(field),
      )),
    });
  }
  delete candidate.operator;
  return candidate;
}).sort((a, b) => a.id.localeCompare(b.id));

const assignedRelationIds = candidates.flatMap((candidate) => candidate.relation_ids);
if (assignedRelationIds.length !== relations.length || new Set(assignedRelationIds).size !== relations.length) {
  throw new Error("candidate grouping must assign every relation exactly once");
}
if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) {
  throw new Error("candidate id collision");
}

function rollup(field) {
  const counts = new Map();
  for (const candidate of candidates) {
    const value = candidate[field]?.value ?? candidate[field] ?? "(missing)";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

const wilayaNames = new Map(read(join(ROOT, "packages/dataset/data/geojson/wilayas.geojson")).features.map((feature) => [
  String(feature.properties.code).padStart(2, "0"),
  feature.properties.name_fr,
]));

const byWilaya = new Map();
for (const candidate of candidates) {
  for (const code of candidate.wilaya_codes.length ? candidate.wilaya_codes : ["(missing)"]) {
    const row = byWilaya.get(code) ?? { code, name_fr: wilayaNames.get(code) ?? null, candidates: 0, urban_suburban: 0, geometry_candidates: 0, unresolved: 0 };
    row.candidates++;
    if (candidate.classification.value === "urban_suburban_candidate") row.urban_suburban++;
    if (candidate.map_readiness === "geometry_candidate") row.geometry_candidates++;
    if (["unresolved", "cross_wilaya_review"].includes(candidate.classification.value)) row.unresolved++;
    byWilaya.set(code, row);
  }
}

const byOperator = registry.operators.map((operator) => {
  const matched = candidates.filter((candidate) => candidate.operator_id === operator.id);
  return {
    operator_id: operator.id,
    name_fr: operator.name_fr,
    evidence_types: compact(operator.sources.map((source) => source.evidence_type)).sort(),
    candidate_lines: matched.length,
    relations: matched.reduce((sum, candidate) => sum + candidate.relation_count, 0),
    geometry_candidates: matched.filter((candidate) => candidate.map_readiness === "geometry_candidate").length,
    with_station_members: matched.filter((candidate) => candidate.station_member_count > 0).length,
    reuse_status: operator.reuse_status,
  };
}).sort((a, b) => b.candidate_lines - a.candidate_lines || a.operator_id.localeCompare(b.operator_id));

const summary = {
  generated_from_osm_retrieved_at: coverage.retrieved_completed_at,
  operator_registry_updated: registry.updated,
  directional_relations: relations.length,
  candidate_lines: candidates.length,
  classification: rollup("classification"),
  map_readiness: rollup("map_readiness"),
  station_readiness: rollup("station_readiness"),
  matched_operator_candidates: candidates.filter((candidate) => candidate.operator_id).length,
  unmatched_operator_candidates: candidates.filter((candidate) => !candidate.operator_id).length,
  by_operator: byOperator,
  by_wilaya: [...byWilaya.values()].sort((a, b) => b.candidates - a.candidates || a.code.localeCompare(b.code)),
};

const table = (headers, rows) => [
  `| ${headers.join(" | ")} |`,
  `| ${headers.map((_, index) => index === 0 ? "---" : "---:").join(" | ")} |`,
  ...rows.map((row) => `| ${row.join(" | ")} |`),
].join("\n");

const report = `# Bus candidate Line readiness

Generated from the local OSM collection retrieved through **${summary.generated_from_osm_retrieved_at}**.
This is a classification audit, not published package data.

## Headline

- Directional OSM relations: **${summary.directional_relations}**
- Candidate Lines after controlled grouping: **${summary.candidate_lines}**
- Urban/suburban candidates: **${summary.classification.urban_suburban_candidate ?? 0}**
- Inter-wilaya candidates: **${summary.classification.inter_wilaya_candidate ?? 0}**
- Cross-wilaya review: **${summary.classification.cross_wilaya_review ?? 0}**
- Taxi exclusions: **${summary.classification.taxi_excluded ?? 0}**
- Unresolved scope: **${summary.classification.unresolved ?? 0}**
- Urban/suburban geometry candidates: **${summary.map_readiness.geometry_candidate ?? 0}**
- Candidates with station members: **${summary.station_readiness.station_members_available ?? 0}**

## Operators

${table(
  ["Operator", "Candidate Lines", "Relations", "Geometry candidates", "With stations"],
  summary.by_operator.filter((row) => row.candidate_lines > 0).map((row) => [
    `${row.operator_id} — ${row.name_fr}`,
    row.candidate_lines,
    row.relations,
    row.geometry_candidates,
    row.with_station_members,
  ]),
)}

## Wilaya coverage

${table(
  ["Wilaya", "Candidates", "Urban/suburban", "Geometry candidates", "Unresolved"],
  summary.by_wilaya.map((row) => [
    row.code === "(missing)" ? "Unassigned" : `${row.code} — ${row.name_fr ?? "Unknown"}`,
    row.candidates,
    row.urban_suburban,
    row.geometry_candidates,
    row.unresolved,
  ]),
)}

## Decision rules

- A controlled operator match makes a Line an urban/suburban candidate; it does
  not make it publication-ready.
- Taxi-labelled relations are excluded before any geographic inference.
- Unmatched multi-wilaya candidates at 35 km or more are marked inter-wilaya
  candidates; shorter unmatched crossings stay in manual review.
- Same-wilaya relations without an evidenced operator remain unresolved.
- Geometry and station readiness are separate. A Line can be drawable while
  still lacking usable station members.

## Source-access result

- ETUS Béjaïa: five official public My Maps KML geometries are fetchable, but no
  open reuse license was found.
- ETUSTO: five official Lines, service window and fare are public; geometry is
  published as raster images.
- ETUS Oran: public Traccar server metadata, protected devices/positions.
- Sétif, Constantine, Annaba, Jijel, Skikda and Ouargla: third-party Play
  listings claim live positions, but no reusable public feed was identified.

The next data action is manual validation of the geometry candidates and an
operator-access request for live data. UI work should wait for that review.
`;

writeFileSync(join(OSM, "candidate-lines.json"), json(candidates));
writeFileSync(join(OSM, "candidate-lines.geojson"), json({ type: "FeatureCollection", features: candidateFeatures }));
writeFileSync(join(OSM, "readiness.json"), json(summary));
writeFileSync(join(OSM, "READINESS.md"), report);

console.log(`Candidate Lines: ${summary.candidate_lines}`);
console.log(`Urban/suburban: ${summary.classification.urban_suburban_candidate ?? 0}`);
console.log(`Geometry candidates: ${summary.map_readiness.geometry_candidate ?? 0}`);
console.log("Report: research/buses/osm/READINESS.md");
