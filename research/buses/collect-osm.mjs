#!/usr/bin/env node
/**
 * Collect and audit every OpenStreetMap route=bus relation in Algeria.
 *
 * This is a research collector, not the @geoalgeria/buses package build. It
 * preserves each raw Overpass response locally and emits enough normalized data
 * to decide which urban networks are ready for a later product update.
 *
 * Usage:
 *   node research/buses/collect-osm.mjs
 *   node research/buses/collect-osm.mjs --cache
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { containingWilayaCode, haversine, round6, wcode } from "../../scripts/lib/build-utils.mjs";
import { stableStringify } from "../../scripts/lib/source-store.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(HERE, "osm");
const SNAPSHOT_FILE = join(OUT, "snapshot.json");
const PROGRESS_FILE = join(OUT, "progress.json");
const RECEIPTS_DIR = join(OUT, "raw");
const RECEIPTS_MANIFEST_FILE = join(RECEIPTS_DIR, "manifest.json");
const UA = "geoalgeria-data/1.0 (+https://geoalgeria.com)";
const MIN_RELATIONS = 150;
const BATCH_SIZE = 10;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const RELATION_QUERY = `[out:json][timeout:180];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
rel(area.dz)["type"="route"]["route"="bus"];
out body;`;

const memberQuery = (ids) => `[out:json][timeout:180];
rel(id:${ids.join(",")})->.routes;
way(r.routes)->.route_ways;
.route_ways out body geom;
node(r.routes)->.route_nodes;
.route_nodes out body;`;

const json = (value) => `${stableStringify(value)}\n`;
const sha256 = (value) => createHash("sha256").update(json(value)).digest("hex");
const clean = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const pct = (value, total) => total ? Math.round((value / total) * 1000) / 10 : 0;
const keyFor = (element) => `${element.type}/${element.id}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isEtusaRelation(relation) {
  const text = `${relation.operator ?? ""} ${relation.network ?? ""} ${relation.tags["operator:ar"] ?? ""} ${relation.tags["network:ar"] ?? ""}`;
  return /etusa/i.test(text) || /[إا]يتوزا/.test(text) ||
    relation.tags["operator:wikidata"] === "Q3055259" || relation.tags["network:wikidata"] === "Q3055259";
}

const normalizedKey = (value) => String(value ?? "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function candidateLineGroup(relation) {
  const scope = isEtusaRelation(relation)
    ? "etusa"
    : normalizedKey(`${relation.wilaya_code ?? "unknown"}|${relation.operator ?? relation.network ?? "unknown"}`);
  const ref = normalizedKey(relation.ref);
  if (ref && !/taxi/.test(ref)) return `${scope}|ref:${ref}`;
  const endpoints = [normalizedKey(relation.from), normalizedKey(relation.to)].filter(Boolean).sort();
  if (endpoints.length === 2) return `${scope}|ends:${endpoints.join("<->")}`;
  return `${scope}|relation:${relation.osm_id}`;
}

async function fetchQuery(query, preferredEndpoints = ENDPOINTS) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    for (const endpoint of preferredEndpoints) {
      try {
        console.log(`Querying ${endpoint} (attempt ${attempt}) …`);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": UA,
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(360_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.elements)) throw new Error("Overpass response has no elements array");
        if (clean(payload.remark)) throw new Error(`Overpass remark: ${payload.remark}`);
        return { endpoint, payload, retrieved_at: new Date().toISOString() };
      } catch (error) {
        lastError = error;
        console.warn(`  ${error.message}`);
      }
    }
  }
  throw new Error(`Overpass failed on every endpoint: ${lastError?.message ?? "unknown error"}`);
}

function writeReceipt(manifest, name, query, response) {
  const file = `${name}.json`;
  writeFileSync(join(RECEIPTS_DIR, file), json(response.payload));
  manifest.responses[name] = {
    file,
    query,
    endpoint: response.endpoint,
    retrieved_at: response.retrieved_at,
    osm_timestamp: response.payload.osm3s?.timestamp_osm_base ?? null,
    elements: response.payload.elements.length,
    sha256: sha256(response.payload),
  };
  writeFileSync(RECEIPTS_MANIFEST_FILE, json(manifest));
}

function verifyMemberResponse(batch, payload) {
  const actual = new Set(payload.elements.map(keyFor));
  const expected = batch.flatMap((relation) => (relation.members ?? [])
    .filter((member) => member.type === "node" || member.type === "way")
    .map((member) => `${member.type}/${member.ref}`));
  const missing = [...new Set(expected)].filter((key) => !actual.has(key));
  if (missing.length) {
    throw new Error(`member batch is partial: ${missing.length} referenced elements missing (${missing.slice(0, 3).join(", ")})`);
  }
}

async function fetchSnapshot() {
  const progress = existsSync(PROGRESS_FILE) ? JSON.parse(readFileSync(PROGRESS_FILE, "utf8")) : null;
  let receiptManifest;
  let relationsResponse;
  if (progress) {
    receiptManifest = JSON.parse(readFileSync(RECEIPTS_MANIFEST_FILE, "utf8"));
    relationsResponse = {
      endpoint: receiptManifest.responses.relations.endpoint,
      payload: progress,
      retrieved_at: receiptManifest.responses.relations.retrieved_at,
    };
  } else {
    relationsResponse = await fetchQuery(RELATION_QUERY);
    receiptManifest = {
      source: "OpenStreetMap via Overpass API",
      license: "ODbL-1.0",
      collection_mode: "non-atomic-batched",
      note: "Each response is preserved separately because public mirrors can have different replication timestamps. The derived snapshot records the collection interval and must not be treated as one atomic OSM revision.",
      responses: {},
    };
    writeReceipt(receiptManifest, "relations", RELATION_QUERY, relationsResponse);
  }
  const relations = relationsResponse.payload.elements?.filter((element) => element.type === "relation") ?? [];
  if (relations.length < MIN_RELATIONS) {
    throw new Error(`only ${relations.length} relations (minimum ${MIN_RELATIONS})`);
  }

  const endpoints = new Set(progress?.geoalgeria_collection.endpoints ?? [relationsResponse.endpoint]);
  const completedIds = new Set(progress?.geoalgeria_collection.completed_relation_ids ?? []);
  const elements = new Map((progress?.elements ?? relations).map((element) => [keyFor(element), element]));
  const orderedEndpoints = [
    relationsResponse.endpoint,
    ...ENDPOINTS.filter((endpoint) => endpoint !== relationsResponse.endpoint),
  ];

  const buildComposite = () => {
    const receipts = Object.values(receiptManifest.responses);
    const retrieved = receipts.map((receipt) => receipt.retrieved_at).filter(Boolean).sort();
    const osmTimestamps = receipts.map((receipt) => receipt.osm_timestamp).filter(Boolean).sort();
    return {
      version: relationsResponse.payload.version,
      generator: relationsResponse.payload.generator,
      osm3s: relationsResponse.payload.osm3s,
      geoalgeria_collection: {
        atomic: false,
        relation_query: RELATION_QUERY,
        member_batch_size: BATCH_SIZE,
        member_batches: Math.ceil(relations.length / BATCH_SIZE),
        endpoints: [...endpoints],
        completed_relation_ids: [...completedIds].sort((a, b) => a - b),
        retrieved_started_at: retrieved[0] ?? null,
        retrieved_completed_at: retrieved.at(-1) ?? null,
        osm_timestamp_start: osmTimestamps[0] ?? null,
        osm_timestamp_end: osmTimestamps.at(-1) ?? null,
        receipts_manifest: "raw/manifest.json",
      },
      elements: [...elements.values()].sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id),
    };
  };

  const saveProgress = () => writeFileSync(PROGRESS_FILE, json(buildComposite()));

  if (!progress) saveProgress();
  for (let offset = 0; offset < relations.length; offset += BATCH_SIZE) {
    const batch = relations.slice(offset, offset + BATCH_SIZE);
    if (batch.every((relation) => completedIds.has(relation.id))) continue;
    console.log(`Members ${offset + 1}–${offset + batch.length} of ${relations.length}`);
    const query = memberQuery(batch.map((relation) => relation.id));
    const response = await fetchQuery(query, orderedEndpoints);
    verifyMemberResponse(batch, response.payload);
    const receiptName = `members-${String(Math.floor(offset / BATCH_SIZE) + 1).padStart(3, "0")}`;
    writeReceipt(receiptManifest, receiptName, query, response);
    endpoints.add(response.endpoint);
    for (const element of response.payload.elements ?? []) elements.set(keyFor(element), element);
    for (const relation of batch) completedIds.add(relation.id);
    saveProgress();
    await sleep(1500);
  }

  const payload = buildComposite();
  unlinkSync(PROGRESS_FILE);
  return { endpoint: [...endpoints].join(", "), payload };
}

function wilayaNames() {
  const fc = JSON.parse(readFileSync(
    join(ROOT, "packages/dataset/data/geojson/wilayas.geojson"),
    "utf8",
  ));
  return new Map(fc.features.map((feature) => [
    wcode(feature.properties.code),
    feature.properties.name_fr,
  ]));
}

function elementPoint(element) {
  if (Number.isFinite(element?.lat) && Number.isFinite(element?.lon)) {
    return { lat: element.lat, lng: element.lon };
  }
  const geometry = element?.geometry?.filter((point) =>
    Number.isFinite(point.lat) && Number.isFinite(point.lon),
  ) ?? [];
  if (!geometry.length) return null;
  return {
    lat: geometry.reduce((sum, point) => sum + point.lat, 0) / geometry.length,
    lng: geometry.reduce((sum, point) => sum + point.lon, 0) / geometry.length,
  };
}

function isStationMember(member, element) {
  const role = member.role?.toLowerCase() ?? "";
  const tags = element?.tags ?? {};
  return role.includes("stop") || role.includes("platform") ||
    tags.highway === "bus_stop" || tags.amenity === "bus_station" ||
    tags.public_transport === "platform" || tags.public_transport === "stop_position";
}

function geometryFor(relation, elements) {
  const pathMembers = relation.members.filter((member) => {
    if (member.type !== "way") return false;
    return !isStationMember(member, elements.get(`way/${member.ref}`));
  });
  const segments = [];
  let waysWithGeometry = 0;
  for (const member of pathMembers) {
    const way = elements.get(`way/${member.ref}`);
    const coordinates = way?.geometry?.map((point) => [point.lon, point.lat])
      .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng)) ?? [];
    if (coordinates.length < 2) continue;
    waysWithGeometry++;
    segments.push(member.role === "backward" ? coordinates.reverse() : coordinates);
  }

  const coordinates = segments.flat();
  let lengthM = 0;
  for (const segment of segments) {
    for (let index = 1; index < segment.length; index++) {
      lengthM += haversine(segment[index - 1][1], segment[index - 1][0], segment[index][1], segment[index][0]);
    }
  }
  if (!coordinates.length) {
    return {
      geometry: null,
      bbox: null,
      centroid: null,
      way_members: pathMembers.length,
      ways_with_geometry: waysWithGeometry,
      geometry_status: "none",
      length_km: null,
    };
  }

  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  const bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)].map(round6);
  const centroid = {
    lat: round6(lats.reduce((sum, lat) => sum + lat, 0) / lats.length),
    lng: round6(lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length),
  };
  return {
    geometry: { type: "MultiLineString", coordinates: segments },
    bbox,
    centroid,
    way_members: pathMembers.length,
    ways_with_geometry: waysWithGeometry,
    geometry_status: waysWithGeometry === pathMembers.length ? "complete" : "partial",
    length_km: Math.round(lengthM / 100) / 10,
  };
}

function fieldCoverage(relations, fields) {
  return Object.fromEntries(fields.map((field) => {
    const count = relations.filter((relation) => clean(relation[field])).length;
    return [field, { count, pct: pct(count, relations.length) }];
  }));
}

function grouped(relations, field) {
  const groups = new Map();
  for (const relation of relations) {
    const value = clean(relation[field]) ?? "(missing)";
    const row = groups.get(value) ?? {
      value, relations: 0, drawable: 0, identifiable: 0, with_operator: 0, with_ref: 0, with_stations: 0,
      candidate_line_groups: new Set(),
    };
    row.relations++;
    if (relation.geometry_status !== "none") row.drawable++;
    if (relation.geometry_status !== "none" && relation.ref && relation.name && relation.from && relation.to) row.identifiable++;
    if (relation.geometry_status !== "none" && relation.operator) row.with_operator++;
    if (relation.ref) row.with_ref++;
    if (relation.station_members > 0) row.with_stations++;
    row.candidate_line_groups.add(relation.candidate_line_group);
    groups.set(value, row);
  }
  return [...groups.values()].map(({ candidate_line_groups, ...row }) => ({
    ...row,
    candidate_lines: candidate_line_groups.size,
  })).sort((a, b) => b.relations - a.relations || a.value.localeCompare(b.value));
}

function mdCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function groupTable(rows, limit = 30) {
  return [
    "| Value | Relations | Candidate lines | Drawable | With ref | With stations |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...rows.slice(0, limit).map((row) =>
      `| ${mdCell(row.value)} | ${row.relations} | ${row.candidate_lines} | ${row.drawable} | ${row.with_ref} | ${row.with_stations} |`,
    ),
  ].join("\n");
}

function buildReport(audit) {
  const fields = Object.entries(audit.field_coverage)
    .map(([field, value]) => `| ${field} | ${value.count} | ${value.pct}% |`)
    .join("\n");
  const wilayas = audit.by_wilaya.map((row) =>
    `| ${mdCell(`${row.code} — ${row.name_fr ?? "Unknown"}`)} | ${row.relations} | ${row.candidate_lines} | ${row.drawable} | ${row.identifiable} | ${row.with_operator} | ${row.with_stations} |`,
  ).join("\n");

  return `# Algeria OSM bus-line coverage audit

Collection: **non-atomic batched pull** · OSM timestamps **${audit.osm_timestamp_start} → ${audit.osm_timestamp_end}** · retrieved **${audit.retrieved_started_at} → ${audit.retrieved_completed_at}** · ODbL

Each raw response, query, endpoint, retrieval time, OSM timestamp, and SHA-256 is
preserved in \`${audit.receipts_manifest}\`. The derived snapshot spans the
interval above; it is not presented as one atomic OSM revision.

This is a research snapshot of every OpenStreetMap \`type=route + route=bus\`
relation inside Algeria. It is not yet part of \`@geoalgeria/buses\` and has not
been shipped to the app.

## Headline

- Relations: **${audit.relations}**
- Candidate Lines after pairing directions: **${audit.candidate_lines}** (needs relation-level validation)
- Map-drawable relations: **${audit.drawable_relations}** (${pct(audit.drawable_relations, audit.relations)}%)
- Relations with complete member-way geometry: **${audit.complete_geometry_relations}** (${pct(audit.complete_geometry_relations, audit.relations)}%)
- Identifiable drawable relations (ref, name, from, and to): **${audit.identifiable_relations}**
- Approximate mapped relation-km: **${audit.mapped_relation_km.toLocaleString("en-US")} km** (overlapping relations are counted separately)
- Unique station members: **${audit.unique_stations}**
- Relations carrying at least one station member: **${audit.relations_with_stations}** (${pct(audit.relations_with_stations, audit.relations)}%)
- Relations carrying service hours: **${audit.relations_with_service_hours}**
- Relations carrying frequency or duration: **${audit.relations_with_frequency_or_duration}**
- Geometry crossing more than one wilaya boundary: **${audit.cross_wilaya_relations}** (review signal, not an automatic inter-wilaya classification)
- Relations labelled as taxi despite \`route=bus\`: **${audit.taxi_labelled_relations}** (exclude pending scope review)

## Existing ETUSA package overlap

- OSM relations identifiable as ETUSA: **${audit.etusa.osm_relations}**
- Unique OSM ETUSA refs: **${audit.etusa.osm_unique_refs}**
- Existing package refs: **${audit.etusa.package_refs}**
- Existing package refs matched in OSM: **${audit.etusa.matched_package_refs}**

## Field completeness

| Field | Relations | Coverage |
| --- | ---: | ---: |
${fields}

## Operator values

${groupTable(audit.by_operator)}

## Network values

${groupTable(audit.by_network)}

## Wilaya assignment

Wilaya is derived from each relation geometry centroid for this feasibility audit.

| Wilaya | Relations | Candidate lines | Drawable | Identifiable | With operator | With stations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${wilayas}

## Interpretation

- Geometry can support a national bus-lines layer, but station coverage must be
  treated independently: a drawable relation does not imply an ordered or complete
  station list.
- OSM route relations are directional journey patterns. Candidate line counts
  pair obvious opposite directions, but publication must retain each direction
  and validate the grouping instead of treating every relation as a separate
  passenger line.
- Operator and network tags are not normalized. Missing or multilingual values
  need a controlled operator registry before publication.
- OSM provides some service windows, but frequency and duration are nearly
  absent and there is no departure timetable. Live vehicles, departures,
  fares, and service alerts require first-party operator feeds or explicit
  data partnerships; they must not be inferred from geometry.
- A relation crossing a wilaya boundary is only flagged for review. Urban/suburban
  networks can cross boundaries, so final urban vs inter-wilaya scope needs an
  operator and endpoint check rather than a geometry-only rule.
- Relations explicitly labelled as taxis are quarantined even when OSM tags
  them \`route=bus\`; the public urban bus layer must not inherit that tagging
  ambiguity.
- The local normalized files are suitable for UI feasibility and source
  matching, not direct publication. Relation-by-relation validation and stable
  ID matching come next.
`;
}

function normalize(snapshot, endpoint) {
  const elements = new Map(snapshot.elements.map((element) => [keyFor(element), element]));
  const names = wilayaNames();
  const relations = snapshot.elements.filter((element) => element.type === "relation");
  const stations = new Map();
  const features = [];

  const normalizedRelations = relations.map((relation) => {
    const tags = relation.tags ?? {};
    const relationGeometry = geometryFor(relation, elements);
    const stationKeys = [];
    for (const member of relation.members ?? []) {
      const element = elements.get(`${member.type}/${member.ref}`);
      if (!isStationMember(member, element)) continue;
      const stationKey = `${member.type}/${member.ref}`;
      stationKeys.push(stationKey);
      const point = elementPoint(element);
      const existing = stations.get(stationKey) ?? {
        id: stationKey,
        osm_type: member.type,
        osm_id: member.ref,
        name: clean(element?.tags?.name),
        name_fr: clean(element?.tags?.["name:fr"]),
        name_ar: clean(element?.tags?.["name:ar"]),
        public_transport: clean(element?.tags?.public_transport),
        highway: clean(element?.tags?.highway),
        amenity: clean(element?.tags?.amenity),
        operator: clean(element?.tags?.operator),
        network: clean(element?.tags?.network),
        lat: point ? round6(point.lat) : null,
        lng: point ? round6(point.lng) : null,
        roles: [],
        relation_ids: [],
      };
      if (member.role && !existing.roles.includes(member.role)) existing.roles.push(member.role);
      if (!existing.relation_ids.includes(String(relation.id))) existing.relation_ids.push(String(relation.id));
      stations.set(stationKey, existing);
    }

    const wilayaCode = relationGeometry.centroid
      ? wcode(containingWilayaCode(relationGeometry.centroid.lat, relationGeometry.centroid.lng))
      : null;
    const wilayaCodes = relationGeometry.geometry
      ? [...new Set(relationGeometry.geometry.coordinates.flat().map(([lng, lat]) =>
        wcode(containingWilayaCode(lat, lng)),
      ).filter(Boolean))].sort()
      : [];
    const normalizedRelation = {
      osm_id: relation.id,
      osm_url: `https://www.openstreetmap.org/relation/${relation.id}`,
      ref: clean(tags.ref),
      name: clean(tags.name),
      name_fr: clean(tags["name:fr"]),
      name_ar: clean(tags["name:ar"]),
      operator: clean(tags.operator),
      network: clean(tags.network),
      from: clean(tags.from),
      to: clean(tags.to),
      via: clean(tags.via),
      colour: clean(tags.colour) ?? clean(tags.color),
      duration: clean(tags.duration),
      interval: clean(tags.interval),
      opening_hours: clean(tags.opening_hours),
      wheelchair: clean(tags.wheelchair),
      public_transport_version: clean(tags["public_transport:version"]),
      roundtrip: clean(tags.roundtrip),
      wilaya_code: wilayaCode,
      wilaya_codes: wilayaCodes,
      wilaya_name_fr: wilayaCode ? names.get(wilayaCode) ?? null : null,
      bbox: relationGeometry.bbox,
      centroid: relationGeometry.centroid,
      length_km: relationGeometry.length_km,
      way_members: relationGeometry.way_members,
      ways_with_geometry: relationGeometry.ways_with_geometry,
      geometry_status: relationGeometry.geometry_status,
      station_members: new Set(stationKeys).size,
      tags,
    };
    normalizedRelation.quality_flags = [
      ...(normalizedRelation.geometry_status === "none" ? ["no_geometry"] : []),
      ...(!normalizedRelation.operator ? ["missing_operator"] : []),
      ...(!normalizedRelation.network ? ["missing_network"] : []),
      ...(!normalizedRelation.ref ? ["missing_ref"] : []),
      ...(normalizedRelation.station_members === 0 ? ["no_station_members"] : []),
      ...(normalizedRelation.wilaya_codes.length > 1 ? ["cross_wilaya"] : []),
      ...(/taxi/i.test(`${normalizedRelation.ref ?? ""} ${normalizedRelation.name ?? ""}`) ? ["taxi_label"] : []),
    ];
    normalizedRelation.candidate_line_group = candidateLineGroup(normalizedRelation);
    if (relationGeometry.geometry) {
      features.push({
        type: "Feature",
        id: `relation/${relation.id}`,
        bbox: relationGeometry.bbox,
        geometry: relationGeometry.geometry,
        properties: Object.fromEntries(Object.entries(normalizedRelation).filter(([key]) => !["bbox", "centroid", "tags"].includes(key))),
      });
    }
    return normalizedRelation;
  }).sort((a, b) => a.osm_id - b.osm_id);

  const stationRows = [...stations.values()].map((station) => {
    station.roles.sort();
    station.relation_ids.sort((a, b) => Number(a) - Number(b));
    station.relation_count = station.relation_ids.length;
    station.wilaya_code = Number.isFinite(station.lat) && Number.isFinite(station.lng)
      ? wcode(containingWilayaCode(station.lat, station.lng))
      : null;
    station.wilaya_name_fr = station.wilaya_code ? names.get(station.wilaya_code) ?? null : null;
    return station;
  }).sort((a, b) => a.id.localeCompare(b.id));

  const existingEtusa = JSON.parse(readFileSync(join(HERE, "etusa-lines-clean.json"), "utf8"));
  const packageRefs = new Set(existingEtusa.lines.map((line) => String(line.line).trim()));
  const etusaRelations = normalizedRelations.filter(isEtusaRelation);
  const etusaRefs = new Set(etusaRelations.map((relation) => relation.ref).filter(Boolean));
  const fields = [
    "ref", "name", "name_fr", "name_ar", "operator", "network", "from", "to", "via",
    "colour", "duration", "interval", "opening_hours", "wheelchair", "public_transport_version",
  ];

  const byWilaya = grouped(normalizedRelations, "wilaya_code").map((row) => ({
    ...row,
    code: row.value,
    name_fr: row.value === "(missing)" ? null : names.get(row.value) ?? null,
  }));
  const audit = {
    source: "OpenStreetMap via Overpass API",
    license: "ODbL-1.0",
    query: RELATION_QUERY,
    endpoint,
    atomic_snapshot: snapshot.geoalgeria_collection.atomic,
    retrieved_started_at: snapshot.geoalgeria_collection.retrieved_started_at,
    retrieved_completed_at: snapshot.geoalgeria_collection.retrieved_completed_at,
    osm_timestamp_start: snapshot.geoalgeria_collection.osm_timestamp_start,
    osm_timestamp_end: snapshot.geoalgeria_collection.osm_timestamp_end,
    receipts_manifest: snapshot.geoalgeria_collection.receipts_manifest,
    snapshot_sha256: sha256(snapshot),
    raw_elements: snapshot.elements.length,
    relations: normalizedRelations.length,
    candidate_lines: new Set(normalizedRelations.map((relation) => relation.candidate_line_group)).size,
    drawable_relations: normalizedRelations.filter((relation) => relation.geometry_status !== "none").length,
    complete_geometry_relations: normalizedRelations.filter((relation) => relation.geometry_status === "complete").length,
    identifiable_relations: normalizedRelations.filter((relation) =>
      relation.geometry_status !== "none" && relation.ref && relation.name && relation.from && relation.to,
    ).length,
    mapped_relation_km: Math.round(normalizedRelations.reduce((sum, relation) => sum + (relation.length_km ?? 0), 0)),
    unique_stations: stationRows.length,
    geocoded_stations: stationRows.filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng)).length,
    relations_with_stations: normalizedRelations.filter((relation) => relation.station_members > 0).length,
    relations_with_service_hours: normalizedRelations.filter((relation) => relation.opening_hours).length,
    relations_with_frequency_or_duration: normalizedRelations.filter((relation) => relation.interval || relation.duration).length,
    cross_wilaya_relations: normalizedRelations.filter((relation) => relation.wilaya_codes.length > 1).length,
    taxi_labelled_relations: normalizedRelations.filter((relation) => relation.quality_flags.includes("taxi_label")).length,
    field_coverage: fieldCoverage(normalizedRelations, fields),
    by_operator: grouped(normalizedRelations, "operator"),
    by_network: grouped(normalizedRelations, "network"),
    by_wilaya: byWilaya,
    etusa: {
      osm_relations: etusaRelations.length,
      osm_unique_refs: etusaRefs.size,
      package_refs: packageRefs.size,
      matched_package_refs: [...packageRefs].filter((ref) => etusaRefs.has(ref)).length,
      matched_refs: [...packageRefs].filter((ref) => etusaRefs.has(ref)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    },
  };

  return {
    relations: normalizedRelations,
    relationsGeojson: { type: "FeatureCollection", features },
    stations: stationRows,
    stationsGeojson: {
      type: "FeatureCollection",
      features: stationRows.filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng)).map((station) => ({
        type: "Feature",
        id: station.id,
        geometry: { type: "Point", coordinates: [station.lng, station.lat] },
        properties: Object.fromEntries(Object.entries(station).filter(([key]) => !["lat", "lng"].includes(key))),
      })),
    },
    audit,
  };
}

mkdirSync(RECEIPTS_DIR, { recursive: true });
let snapshot;
let endpoint;
if (process.argv.includes("--cache")) {
  snapshot = JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8"));
  endpoint = snapshot.geoalgeria_collection.endpoints.join(", ");
  console.log("Using cached research/buses/osm/snapshot.json");
} else {
  ({ endpoint, payload: snapshot } = await fetchSnapshot());
  writeFileSync(SNAPSHOT_FILE, json(snapshot));
}

const result = normalize(snapshot, endpoint);
writeFileSync(join(OUT, "relations.json"), json(result.relations));
writeFileSync(join(OUT, "relations.geojson"), json(result.relationsGeojson));
writeFileSync(join(OUT, "stations.json"), json(result.stations));
writeFileSync(join(OUT, "stations.geojson"), json(result.stationsGeojson));
writeFileSync(join(OUT, "coverage.json"), json(result.audit));
writeFileSync(join(OUT, "COVERAGE.md"), buildReport(result.audit));

console.log(`Bus relations: ${result.audit.relations}`);
console.log(`Drawable: ${result.audit.drawable_relations}`);
console.log(`Stations: ${result.audit.unique_stations}`);
console.log(`Report: research/buses/osm/COVERAGE.md`);
