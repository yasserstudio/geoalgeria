// Matches OSM route relations to package Lines. A relation a Line already lists
// (osm_relation_ids) belongs to it; otherwise Line identity decides: Operator +
// line number, where "02" = "2" and "L02" = "L2", falling back to the bare
// number ("2" -> "AD-2") only when one Line of that Operator has it. Pure: no I/O.

const number = (ref) =>
  String(ref ?? "")
    .trim()
    .toLowerCase()
    .replace(/^([a-z]*)0+(?=\d)/, "$1");

const bare = (ref) => number(ref).replace(/^[a-z]+-?0*(?=\d)/, "");

export const lineIdentity = (operatorId, ref) => `${operatorId}|${number(ref)}`;

function identityIndex(lines) {
  const exact = new Map(lines.map((l) => [lineIdentity(l.operator_id, l.line), l]));
  const byBare = new Map();
  for (const l of lines) {
    const key = `${l.operator_id}|${bare(l.line)}`;
    byBare.set(key, byBare.has(key) ? null : l); // null = ambiguous
  }
  return { exact, byBare };
}

function lineFor(candidate, { exact, byBare }) {
  if (!candidate?.operator_id || !candidate.ref) return null;
  return exact.get(lineIdentity(candidate.operator_id, candidate.ref)) ?? byBare.get(`${candidate.operator_id}|${bare(candidate.ref)}`) ?? null;
}

// candidates: analyze-candidates.mjs output (one per candidate Line, with its relation_ids).
export function matchRelations(relationIds, { lines, candidates }) {
  const byIdentity = identityIndex(lines);
  const candidateOf = new Map(candidates.flatMap((c) => c.relation_ids.map((id) => [id, c])));
  const listedBy = new Map(lines.flatMap((l) => (l.osm_relation_ids ?? []).map((id) => [id, l])));
  return relationIds.map((id) => {
    const c = candidateOf.get(id);
    const line = listedBy.get(id) ?? lineFor(c, byIdentity);
    return {
      osm_relation_id: id,
      operator_id: line?.operator_id ?? c?.operator_id ?? null,
      line_id: line?.id ?? null,
      match: line ? "line" : c?.operator_id ? "unmatched_line" : "unmatched_operator",
    };
  });
}

// Package Lines with no shape whose OSM geometry candidate is not shipped yet.
// Each still has to pass the P1 checks before it ships.
export function promotableLines({ lines, candidates, shippedRelations }) {
  const byIdentity = identityIndex(lines);
  return candidates
    .filter((c) => c.map_readiness === "geometry_candidate")
    .map((c) => ({ candidate: c.id, line: lineFor(c, byIdentity), relation_ids: c.relation_ids }))
    .filter((c) => c.line && !c.line.shape_id && c.relation_ids.every((id) => !shippedRelations.has(id)))
    .map((c) => ({ candidate: c.candidate, line_id: c.line.id, relation_ids: c.relation_ids }));
}

// Every package Line without a Direction has no geometry yet (Owner 2026-11-19:
// the release bar is every Line accounted for). Its reason comes from data only:
// `osm_relation_not_approved`, an unshipped OSM relation matches it by identity
// but was never approved for promotion; otherwise `operator_list_only`, its
// Operator publishes an ordered stop list but no geometry exists (P4 is parked);
// otherwise `no_osm_relation`. `added` is osm-diff.json's newly mapped
// relations, already matched. Relations of a known Operator that match no Line
// are listed apart, since naming their Line would be a guess.
export function geometryGaps({ lines, directions, candidates, added = [], listedStopLineIds = new Set() }) {
  const shipped = new Set(directions.map((d) => d.osm_relation_id).filter((id) => id != null));
  const drawn = new Set(directions.map((d) => d.line_id));
  const known = new Set(candidates.flatMap((c) => c.relation_ids));
  const matches = [
    ...matchRelations([...known].filter((id) => !shipped.has(id)), { lines, candidates }),
    ...added.filter((a) => !shipped.has(a.osm_relation_id) && !known.has(a.osm_relation_id)),
  ];
  const relationsOf = (lineId) => matches.filter((m) => m.line_id === lineId).map((m) => m.osm_relation_id);
  return {
    lines: lines
      .filter((l) => !drawn.has(l.id))
      .map((l) => {
        const osmRelationIds = relationsOf(l.id);
        const reason = osmRelationIds.length
          ? "osm_relation_not_approved"
          : listedStopLineIds.has(l.id)
            ? "operator_list_only"
            : "no_osm_relation";
        return { line_id: l.id, reason, osm_relation_ids: osmRelationIds };
      }),
    unmatched_relations: matches
      .filter((m) => m.match === "unmatched_line")
      .map((m) => ({ osm_relation_id: m.osm_relation_id, operator_id: m.operator_id })),
  };
}
