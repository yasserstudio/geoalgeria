// Collapsing the records an OpenStreetMap extract holds twice for one place, and
// keeping everything both of them said.
//
// It is separate from the generator that calls it so it can be tested on fixtures
// instead of only on the country, the same reason commune-resolver.mjs is separate
// from build-utils.mjs.
//
// Two passes, in this order:
//  1. the same name within `radiusM`, compared as per-script Loose keys rather than
//     as text (see name-script.mjs), which is what lets one spelling of a pharmacy
//     meet another;
//  2. the exact same point, for a pair whose names the first pass could not see
//     were one place.
//
// A collapse keeps one record and retires the other, and the kept record absorbs
// every field it lacks from the one it replaces, so no phone, address or opening
// hours is lost to de-duplication. The kept record's own value always wins where
// both have one: a conflict is reported, never merged and never concatenated.
//
// Rows are the internal shape the OSM generators build before the v2 mapping: an
// `osm_id`, `lat`/`lng`, and the name/contact fields named by `rankFields` and
// `fillFields`.

import { nameKeys } from "./name-script.mjs";

const DEG = Math.PI / 180;
const M_PER_DEG = 111_320;

/**
 * @param {object[]} rows                    the normalized OSM rows
 * @param {object} options
 * @param {number} [options.radiusM]         how close two records must be to be one place
 * @param {Set<string>} [options.ignoredWords]  Loose keys a name key drops
 * @param {string[]} options.rankFields      the fields whose presence decides which
 *                                           record of a pair survives
 * @param {string[]} options.fillFields      the fields the survivor absorbs when it
 *                                           lacks them (a superset of rankFields)
 * @param {(osmId: string) => boolean} [options.isPublished]  true for a record the
 *                                           package already ships, which survives a
 *                                           pair outright so no id is retired that
 *                                           could have been kept
 * @returns {{rows: object[], collapsed: Array<{dropped: string, kept: string}>,
 *            conflicts: Array<{kept: string, dropped: string, field: string,
 *                              keptValue: unknown, droppedValue: unknown}>}}
 */
export function collapseDuplicates(
  rows,
  { radiusM = 40, ignoredWords = new Set(), rankFields, fillFields, isPublished = () => false },
) {
  // A fixed order, so which record survives never depends on how Overpass happened
  // to order its response.
  const ordered = [...rows].sort((a, b) => (a.osm_id < b.osm_id ? -1 : a.osm_id > b.osm_id ? 1 : 0));

  const collapsed = [];
  const conflicts = [];
  const richness = (r) => rankFields.reduce((n, field) => n + (r[field] == null ? 0 : 1), 0);

  // Which of two records standing for one place survives. An already-published
  // record wins first, so a collapse never retires an id it could have kept and
  // never mints one it could have reused. Otherwise the record carrying the most
  // wins, and the lower OSM id breaks the remaining ties.
  const survives = (r, other) => {
    const published = isPublished(r.osm_id);
    if (published !== isPublished(other.osm_id)) return published;
    if (richness(r) !== richness(other)) return richness(r) > richness(other);
    return r.osm_id < other.osm_id;
  };

  // Fill every gap in the survivor from the record it replaces, and report, never
  // resolve, a field both of them state differently.
  const absorb = (survivor, dropped) => {
    for (const field of fillFields) {
      if (dropped[field] == null) continue;
      if (survivor[field] == null) survivor[field] = dropped[field];
      else if (survivor[field] !== dropped[field]) {
        conflicts.push({
          kept: survivor.osm_id,
          dropped: dropped.osm_id,
          field,
          keptValue: survivor[field],
          droppedValue: dropped[field],
        });
      }
    }
  };

  // Re-point the forwards that aimed at a record another has just displaced, so a
  // forward is always one hop and never a chain.
  const collapse = (dropped, survivor) => {
    for (const entry of collapsed) if (entry.kept === dropped.osm_id) entry.kept = survivor.osm_id;
    for (const entry of conflicts) if (entry.kept === dropped.osm_id) entry.kept = survivor.osm_id;
    collapsed.push({ dropped: dropped.osm_id, kept: survivor.osm_id });
  };

  // Pass 1: the same name within radiusM. A name that only says what every record
  // in the set is ("pharmacy") keys on nothing, so it collapses nothing.
  const kept = [];
  for (const row of ordered) {
    const keys = nameKeys([row.name, row.name_fr, row.name_ar], ignoredWords);
    const cosLat = Math.cos(row.lat * DEG);
    const near = (other) => {
      const dx = (other.lng - row.lng) * cosLat * M_PER_DEG;
      const dy = (other.lat - row.lat) * M_PER_DEG;
      return dx * dx + dy * dy <= radiusM * radiusM;
    };
    const hit = keys.size
      ? kept.findIndex((held) => near(held.row) && [...held.keys].some((key) => keys.has(key)))
      : -1;
    if (hit < 0) {
      kept.push({ row, keys });
      continue;
    }
    const held = kept[hit];
    // The merged record answers to both records' keys, whichever names it ends up
    // carrying, so a third record naming either of them still finds it.
    const merged = new Set([...held.keys, ...keys]);
    if (survives(row, held.row)) {
      absorb(row, held.row);
      collapse(held.row, row);
      kept[hit] = { row, keys: merged };
    } else {
      absorb(held.row, row);
      collapse(row, held.row);
      held.keys = merged;
    }
  }

  // Pass 2: the exact same point.
  const byPoint = new Map();
  const order = [];
  for (const { row } of kept) {
    const point = `${row.lat},${row.lng}`;
    const prev = byPoint.get(point);
    if (!prev) {
      byPoint.set(point, row);
      order.push(point);
    } else if (survives(row, prev)) {
      absorb(row, prev);
      collapse(prev, row);
      byPoint.set(point, row);
    } else {
      absorb(prev, row);
      collapse(row, prev);
    }
  }

  return { rows: order.map((point) => byPoint.get(point)), collapsed, conflicts };
}
