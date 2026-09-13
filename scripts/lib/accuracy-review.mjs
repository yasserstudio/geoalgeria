import { pointInGeometry, pointInWilaya } from "../../packages/schema/index.js";

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const finiteCoordinates = (record) => Number.isFinite(record.lat) && Number.isFinite(record.lng);

export function countReasons(candidates) {
  const counts = {};
  for (const candidate of candidates) {
    for (const reason of candidate.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => compare(a, b)));
}

// Geospatial arrays may contain only null coordinates. Relations and aggregate
// arrays without coordinate fields do not create missing-coordinate candidates.
export function isGeospatialEntity(records) {
  return Array.isArray(records) && records.some((record) =>
    record && typeof record === "object" && ("lat" in record || "lng" in record),
  );
}

export function buildAccuracyReview({ dataset, entity, records, boundaries, neighbours }) {
  if (!(boundaries instanceof Map) || !boundaries.size) throw new Error("Boundaries are required");
  const sorted = [...records].sort((a, b) => compare(String(a.id), String(b.id)));
  const ids = new Set();
  const atCoordinate = new Map();
  for (const record of sorted) {
    if (record.id == null || ids.has(String(record.id))) {
      throw new Error(`${dataset}/${entity}: missing or duplicate record id ${record.id}`);
    }
    ids.add(String(record.id));
    if (!finiteCoordinates(record)) continue;
    const key = `${record.lat},${record.lng}`;
    if (!atCoordinate.has(key)) atCoordinate.set(key, []);
    atCoordinate.get(key).push(record.id);
  }

  const coordinateGroups = [];
  for (const [coordinate, recordIds] of atCoordinate) {
    if (recordIds.length < 2) continue;
    coordinateGroups.push({
      id: `${dataset}/${entity}@${coordinate}`,
      record_ids: recordIds,
    });
  }
  coordinateGroups.sort((a, b) => compare(a.id, b.id));
  const candidates = [];
  for (const record of sorted) {
    const reasons = [];
    const finite = finiteCoordinates(record);
    const declared = record.wilaya_code == null ? null : String(record.wilaya_code).padStart(2, "0");
    if (!boundaries.has(declared)) reasons.push("missing_or_unknown_wilaya");
    let boundary = null;
    let coordinateGroup = null;
    if (!finite) {
      reasons.push(record.lat == null && record.lng == null ? "missing_coordinate" : "invalid_coordinate");
      if (record.geo_precision != null) reasons.push("invalid_geo_precision");
    } else {
      if (Math.abs(record.lat) > 90 || Math.abs(record.lng) > 180) reasons.push("invalid_coordinate");
      if (!["exact", "approximate"].includes(record.geo_precision)) reasons.push("invalid_geo_precision");
      if (record.geo_precision === "approximate") reasons.push("approximate_coordinate");
      const coordinate = `${record.lat},${record.lng}`;
      if (atCoordinate.get(coordinate).length > 1) {
        reasons.push("shared_coordinate");
        coordinateGroup = `${dataset}/${entity}@${coordinate}`;
      }
      if (!boundaries.has(declared) || !pointInWilaya(record.lng, record.lat, declared, boundaries)) {
        const containing = [...boundaries]
          .filter(([, geometry]) => pointInGeometry(record.lng, record.lat, geometry))
          .map(([code]) => code).sort(compare);
        boundary = { declared_wilaya: declared, containing_wilayas: containing };
        if (boundaries.has(declared)) reasons.push("outside_declared_wilaya");
        if (!containing.length) reasons.push("outside_all_wilaya_boundaries");
        else if (boundaries.has(declared)) {
          if (!neighbours?.has(declared)) throw new Error(`Missing neighbours for wilaya ${declared}`);
          reasons.push(containing.some((code) => neighbours.get(declared).has(code))
            ? "inside_adjacent_wilaya" : "inside_nonadjacent_wilaya");
        }
      }
    }
    if (!reasons.length) continue;
    candidates.push({
      id: `${dataset}/${entity}/${record.id}`,
      dataset,
      entity,
      reasons: reasons.sort(compare),
      record: structuredClone(record),
      ...(boundary ? { boundary } : {}),
      ...(coordinateGroup ? { coordinate_group: coordinateGroup } : {}),
    });
  }
  return {
    summary: {
      dataset,
      entity,
      total_records: records.length,
      candidates: candidates.length,
      reasons: countReasons(candidates),
    },
    candidates,
    coordinate_groups: coordinateGroups,
  };
}
