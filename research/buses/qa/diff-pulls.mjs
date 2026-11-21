// Compares two OSM pulls (Overpass elements: route relations + their ways) and
// says which relations were added, removed or changed. Pure: no I/O.
// A change records what moved: the member list, the drawn geometry of its ways,
// or the relation's tags (name, ref, from/to...).

function byType(pull) {
  const relations = new Map();
  const ways = new Map();
  for (const e of pull.elements) {
    if (e.type === "relation") relations.set(e.id, e);
    if (e.type === "way") ways.set(e.id, e);
  }
  return { relations, ways };
}

const sortedTags = (tags = {}) => JSON.stringify(Object.entries(tags).sort(([a], [b]) => a.localeCompare(b)));
const memberList = (relation) => JSON.stringify(relation.members.map((m) => [m.type, m.ref, m.role ?? ""]));
// The drawn path as one point sequence: splitting a way without moving it is
// not a geometry change (the shared node appears once).
const geometry = (relation, ways) =>
  JSON.stringify(
    relation.members
      .filter((m) => m.type === "way")
      .flatMap((m) => ways.get(m.ref)?.geometry ?? [])
      .map((p) => [p.lat, p.lon])
      .filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]),
  );

export function diffPulls(previous, current, shipped = []) {
  const before = byType(previous);
  const after = byType(current);

  const added = [...after.relations.keys()].filter((id) => !before.relations.has(id)).sort((a, b) => a - b);
  const removed = [...before.relations.keys()].filter((id) => !after.relations.has(id)).sort((a, b) => a - b);

  const changed = [];
  let unchanged = 0;
  for (const [id, now] of [...after.relations].sort(([a], [b]) => a - b)) {
    const then = before.relations.get(id);
    if (!then) continue;
    const change = {
      id,
      members: memberList(then) !== memberList(now),
      geometry: geometry(then, before.ways) !== geometry(now, after.ways),
      tags: sortedTags(then.tags) !== sortedTags(now.tags),
    };
    if (change.members || change.geometry || change.tags) changed.push(change);
    else unchanged++;
  }

  const changedIds = new Set(changed.map((c) => c.id));
  const shippedRows = shipped
    .filter((d) => d.osm_relation_id != null)
    .map((d) => ({
      direction_id: d.id,
      osm_relation_id: d.osm_relation_id,
      change: !after.relations.has(d.osm_relation_id)
        ? "removed"
        : changedIds.has(d.osm_relation_id)
          ? "changed"
          : !before.relations.has(d.osm_relation_id)
            ? "added"
            : "unchanged",
    }));

  return { added, removed, changed, unchanged, shipped: shippedRows };
}
