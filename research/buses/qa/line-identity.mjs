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
