// Merging a Double mapping: one real place a crowdsourced source holds as more
// than one element (CONTEXT.md, "Double mapping").
//
// It is separate from the generator that calls it so it can be tested on fixtures
// instead of only on the country, the same reason commune-resolver.mjs is separate
// from build-utils.mjs.
//
// Two passes, in this order:
//  1. elements within `radiusM` whose names share a Loose name key, compared as
//     keys per script rather than as display text (see name-script.mjs), which is
//     what lets one spelling of a place meet another;
//  2. elements on the exact same point, for a pair whose names the first pass
//     could not see were one place.
//
// A merge keeps one element and retires the other, and the kept one absorbs every
// field it lacks from the element it replaces, so no phone, address or opening
// hours is lost to merging. The kept element's own value always wins where both
// have one: a disagreement is reported, never resolved and never concatenated.
//
// Rows are the internal shape the OSM generators build before the v2 mapping: an
// `osm_id`, `lat`/`lng`, and the name/contact fields named by `rankFields` and
// `fillFields`.

import { haversine } from "./build-utils.mjs";
import { looseNameKeys } from "./name-script.mjs";

/**
 * @param {object[]} rows                    the normalized OSM rows, never mutated:
 *                                           the returned rows are fresh objects
 * @param {object} options
 * @param {number} [options.radiusM]         how close two elements must stand to be one place
 * @param {Set<string>} [options.ignoredWords]  Loose keys a Loose name key drops
 * @param {string[]} options.rankFields      the fields whose presence decides which
 *                                           element of a pair is kept
 * @param {string[]} options.fillFields      the fields the kept element absorbs when
 *                                           it lacks them; must be a superset of
 *                                           rankFields, or this throws
 * @param {(osmId: string) => boolean} [options.isPublished]  true for an element the
 *                                           package already ships, which is kept
 *                                           outright so no id is retired that could
 *                                           have been kept
 * @returns {{rows: object[], merged: Array<{dropped: string, kept: string}>,
 *            conflicts: Array<{kept: string, dropped: string, field: string,
 *                              keptValue: unknown, droppedValue: unknown}>}}
 */
export function mergeDoubleMappings(
  rows,
  { radiusM = 40, ignoredWords = new Set(), rankFields, fillFields, isPublished = () => false },
) {
  // A field that decides which element is kept but is not carried over would be
  // silently dropped by the merge it just decided.
  const notCarried = rankFields.filter((field) => !fillFields.includes(field));
  if (notCarried.length) {
    throw new Error(
      `mergeDoubleMappings: fillFields must be a superset of rankFields; missing ${notCarried.join(", ")}`,
    );
  }

  // A fixed order, so which element is kept never depends on how Overpass happened
  // to order its response. Shallow copies, not the caller's objects: absorb() fills
  // the kept element's gaps, and a caller that still holds the input array has every
  // right to find it as it passed it (the same rule sante's mergeRepeatPosts keeps).
  const ordered = rows
    .map((row) => ({ ...row }))
    .sort((a, b) => (a.osm_id < b.osm_id ? -1 : a.osm_id > b.osm_id ? 1 : 0));

  const merged = [];
  const conflicts = [];
  const richness = (r) => rankFields.reduce((n, field) => n + (r[field] == null ? 0 : 1), 0);

  // Which element of a pair is kept. An already-published element wins first, so a
  // merge never retires an id it could have kept and never mints one it could have
  // reused. Otherwise the element carrying the most wins, and the lower OSM id
  // breaks the remaining ties.
  const keeps = (r, other) => {
    const published = isPublished(r.osm_id);
    if (published !== isPublished(other.osm_id)) return published;
    if (richness(r) !== richness(other)) return richness(r) > richness(other);
    return r.osm_id < other.osm_id;
  };

  // Fill every gap in the kept element from the one it replaces, and report, never
  // resolve, a field the two state differently.
  const absorb = (kept, dropped) => {
    for (const field of fillFields) {
      if (dropped[field] == null) continue;
      if (kept[field] == null) kept[field] = dropped[field];
      else if (kept[field] !== dropped[field]) {
        conflicts.push({
          kept: kept.osm_id,
          dropped: dropped.osm_id,
          field,
          keptValue: kept[field],
          droppedValue: dropped[field],
        });
      }
    }
  };

  // Re-point the entries that named an element another has just displaced, so one
  // merge is one hop and never a chain. This is the upstream-element bookkeeping
  // that feeds the ledger; the ledger's own forwarding is forwardRetiredId() in
  // v2-transforms.mjs, which works on published ids these rows do not have yet.
  const mergeInto = (dropped, kept) => {
    for (const entry of merged) if (entry.kept === dropped.osm_id) entry.kept = kept.osm_id;
    for (const entry of conflicts) if (entry.kept === dropped.osm_id) entry.kept = kept.osm_id;
    merged.push({ dropped: dropped.osm_id, kept: kept.osm_id });
  };

  // Pass 1: a shared Loose name key within radiusM. A name that says only what
  // every record in the set is ("pharmacy") keys on nothing, so it merges nothing.
  const held = [];
  for (const row of ordered) {
    const keys = looseNameKeys([row.name, row.name_fr, row.name_ar], ignoredWords);
    const hit = keys.size
      ? held.findIndex(
          (other) =>
            haversine(row.lat, row.lng, other.row.lat, other.row.lng) <= radiusM &&
            [...other.keys].some((key) => keys.has(key)),
        )
      : -1;
    if (hit < 0) {
      held.push({ row, keys });
      continue;
    }
    const prev = held[hit];
    // The merged record answers to both elements' keys, whichever names it ends up
    // carrying, so a third element naming either of them still finds it.
    const union = new Set([...prev.keys, ...keys]);
    if (keeps(row, prev.row)) {
      absorb(row, prev.row);
      mergeInto(prev.row, row);
      held[hit] = { row, keys: union };
    } else {
      absorb(prev.row, row);
      mergeInto(row, prev.row);
      prev.keys = union;
    }
  }

  // Pass 2: the exact same point.
  const byPoint = new Map();
  const order = [];
  for (const { row } of held) {
    const point = `${row.lat},${row.lng}`;
    const prev = byPoint.get(point);
    if (!prev) {
      byPoint.set(point, row);
      order.push(point);
    } else if (keeps(row, prev)) {
      absorb(row, prev);
      mergeInto(prev, row);
      byPoint.set(point, row);
    } else {
      absorb(prev, row);
      mergeInto(row, prev);
    }
  }

  return { rows: order.map((point) => byPoint.get(point)), merged, conflicts };
}
