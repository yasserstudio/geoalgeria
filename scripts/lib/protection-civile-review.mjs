import { pointInGeometry } from "../../packages/schema/index.js";

const DGPC_SOURCE_URL = "https://dgpc.dz/dgpc2/unite.geojson";

const round6 = (value) => Math.round(Number(value) * 1_000_000) / 1_000_000;
const coordinateKey = ({ lat, lng }) => `${lat},${lng}`;
const inAlgeriaBox = (lng, lat) =>
  Number.isFinite(lng) && Number.isFinite(lat) && lng >= -9 && lng <= 12 && lat >= 18 && lat <= 38;

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function sourceReceipt(feature) {
  if (!feature) return null;
  const properties = feature.properties ?? {};
  let lng = round6(properties.x);
  let lat = round6(properties.y);
  // Mirror the publisher's one known x/y recovery (DGPC objectid 876): the
  // properties are transposed while the GeoJSON geometry is correct.
  if (!inAlgeriaBox(lng, lat) && inAlgeriaBox(lat, lng)) [lng, lat] = [lat, lng];
  return {
    objectid: String(properties.objectid),
    cod_wilaya: properties.cod_wilaya == null ? null : String(properties.cod_wilaya).padStart(2, "0"),
    name_ar: properties.nom_ar ?? null,
    statut: properties.statut ?? null,
    commune_ar: properties.commune_1 ?? null,
    address: properties.adresse ?? null,
    lat,
    lng,
  };
}

function sourceCoordinateChanged(record, source) {
  return source && (record.lat !== source.lat || record.lng !== source.lng);
}

/**
 * Build the deterministic Protection Civile review queue. The queue does not
 * guess corrections: it only gathers records with an explicit precision,
 * duplicate-coordinate, boundary, source-link, or reviewed-override signal.
 */
export function buildProtectionCivileReview({
  records,
  rawFeatureCollection,
  boundaries,
  checkedAt,
  sourceUrl = DGPC_SOURCE_URL,
  sourceSha256,
  sourceRetrieved,
}) {
  if (!Array.isArray(records)) throw new Error("records must be an array");
  if (!Array.isArray(rawFeatureCollection?.features)) {
    throw new Error("rawFeatureCollection.features must be an array");
  }
  if (!(boundaries instanceof Map) || boundaries.size === 0) {
    throw new Error("boundaries must be a non-empty Map");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt ?? "")) {
    throw new Error("checkedAt must be an ISO calendar date");
  }
  if (!/^[a-f0-9]{64}$/.test(sourceSha256 ?? "")) {
    throw new Error("sourceSha256 must be the source-store manifest sha256");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceRetrieved ?? "")) {
    throw new Error("sourceRetrieved must be an ISO calendar date");
  }

  const rawByObjectId = new Map(
    rawFeatureCollection.features.map((feature) => [
      String(feature.properties?.objectid),
      feature,
    ]),
  );
  const recordsByCoordinate = Map.groupBy(records, coordinateKey);
  const candidates = [];

  for (const record of records) {
    const source = sourceReceipt(rawByObjectId.get(String(record.refs?.dgpc)));
    const coordinatePeers = (recordsByCoordinate.get(coordinateKey(record)) ?? [])
      .filter((peer) => peer.id !== record.id)
      .map((peer) => ({ id: peer.id, name_ar: peer.name_ar, statut: peer.statut }));
    const containingWilayas = [];
    for (const [code, geometry] of boundaries) {
      if (pointInGeometry(record.lng, record.lat, geometry)) containingWilayas.push(code);
    }
    containingWilayas.sort();

    const reasons = [];
    if (!source) reasons.push("missing_dgpc_source_record");
    if (record.geo_precision === "approximate") reasons.push("approximate_coordinate");
    if (coordinatePeers.length) reasons.push("shared_coordinate");
    if (!containingWilayas.includes(record.wilaya_code)) {
      reasons.push("outside_declared_wilaya");
      if (containingWilayas.length === 0) reasons.push("outside_all_wilaya_boundaries");
    }
    if (sourceCoordinateChanged(record, source)) {
      reasons.push(
        record.review_status === "corrected"
          ? "reviewed_coordinate_override"
          : "unreviewed_source_coordinate_drift",
      );
    }
    if (!reasons.length) continue;

    candidates.push({
      record: {
        id: record.id,
        name_ar: record.name_ar,
        statut: record.statut,
        wilaya_code: record.wilaya_code,
        commune_code: record.commune_code ?? null,
        commune: record.commune ?? null,
        lat: record.lat,
        lng: record.lng,
        geo_precision: record.geo_precision,
        geo_method: record.geo_method,
        refs: record.refs,
        ...(record.review_status
          ? {
              review_status: record.review_status,
              reviewed_at: record.reviewed_at,
              reviewed_by: record.reviewed_by,
              review_evidence: record.review_evidence,
            }
          : {}),
      },
      reasons,
      boundary: {
        declared_wilaya: record.wilaya_code,
        containing_wilayas: containingWilayas,
      },
      coordinate_peers: coordinatePeers,
      dgpc_source: source,
    });
  }

  candidates.sort((a, b) => a.record.id.localeCompare(b.record.id));
  const reasonCounts = countBy(candidates.flatMap((candidate) => candidate.reasons));

  return {
    schema_version: 1,
    dataset: "protection-civile",
    checked_at: checkedAt,
    source_snapshot: {
      url: sourceUrl,
      retrieved: sourceRetrieved,
      feature_count: rawFeatureCollection.features.length,
      sha256: sourceSha256,
    },
    summary: {
      total_records: records.length,
      candidates: candidates.length,
      reviewed_candidates: candidates.filter((candidate) => candidate.record.review_status).length,
      unreviewed_candidates: candidates.filter((candidate) => !candidate.record.review_status).length,
      reasons: reasonCounts,
    },
    candidates,
  };
}
