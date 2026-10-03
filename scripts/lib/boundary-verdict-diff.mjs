// What "the verdicts changed" means when the boundary cache is rebuilt from a
// fresh OpenStreetMap pull.
//
// The refresh workflow re-pulls the `out geom` geometry monthly, so the geometry
// side of the diff is noise by default: OSM moves, mappers refine a shoreline, and
// 3.7 MB of reduced rings change without a single commune centre changing side.
// What the containment guard actually asserts is a verdict per commune, and only
// three things can happen to one: a centre that was inside its own commune is now
// outside it, a centre that was outside is now inside, or a commune that could be
// decided at all stops being decidable (or starts). Those are the rows a human has
// to read, so those alone open a pull request.
//
// Overpass mirrors are independently replicated and drift by hours, so
// `timestamp_osm_base` is reported next to the verdicts: an unchanged base with a
// changed verdict means the rebuild, not the planet, moved, and that is a bug in
// this repository rather than news from OSM.

const keyOf = (row) => `${row.wilaya_code}|${row.name_fr}`;
const label = (row) => `${row.name_fr} (${row.code_commune}, w${row.wilaya_code})`;

const index = (rows) => new Map((rows ?? []).map((r) => [keyOf(r), r]));

const added = (before, after) => [...after.values()].filter((r) => !before.has(keyOf(r)));

/**
 * Compare two verdict documents written by
 * `scripts/build-commune-boundary-cache.mjs --verdicts`.
 *
 * @returns {{ changed: boolean, osm_base_moved: boolean, before: object, after: object,
 *   now_outside: object[], now_inside: object[], lost_boundary: object[], gained_boundary: object[] }}
 */
export function diffVerdicts(before, after) {
  const outsideBefore = index(before.outside);
  const outsideAfter = index(after.outside);
  const noneBefore = index(before.undecidable);
  const noneAfter = index(after.undecidable);

  const nowOutside = added(outsideBefore, outsideAfter);
  const nowInside = added(outsideAfter, outsideBefore);
  const lostBoundary = added(noneBefore, noneAfter);
  const gainedBoundary = added(noneAfter, noneBefore);

  return {
    changed:
      nowOutside.length + nowInside.length + lostBoundary.length + gainedBoundary.length > 0,
    osm_base_moved: before.cache?.timestamp_osm_base !== after.cache?.timestamp_osm_base,
    before,
    after,
    now_outside: nowOutside,
    now_inside: nowInside,
    lost_boundary: lostBoundary,
    gained_boundary: gainedBoundary,
  };
}

const section = (title, rows, render) =>
  rows.length ? [`### ${title} (${rows.length})`, "", ...rows.map(render), ""] : [];

/** The diff as the body of a pull request, or as the reason there is no pull request. */
export function renderVerdictDiff(diff) {
  const { before, after } = diff;
  const lines = [
    "A scheduled rebuild of the commune boundary cache from a fresh OpenStreetMap",
    "`out geom` pull. The geometry moved; what follows is what that did to the",
    "containment guard in `test/commune-centre-in-commune.test.mjs`.",
    "",
    "| | Committed | Rebuilt |",
    "| --- | --- | --- |",
    `| Overpass \`timestamp_osm_base\` | ${before.cache?.timestamp_osm_base ?? "-"} | ${after.cache?.timestamp_osm_base ?? "-"} |`,
    `| Communes in the cache | ${before.cache?.count ?? "-"} | ${after.cache?.count ?? "-"} |`,
    `| Relations pulled | ${before.cache?.relation_count ?? "-"} | ${after.cache?.relation_count ?? "-"} |`,
    `| Centres outside their own commune | ${before.counts?.outside ?? "-"} | ${after.counts?.outside ?? "-"} |`,
    `| Communes with no usable boundary | ${before.counts?.undecidable ?? "-"} | ${after.counts?.undecidable ?? "-"} |`,
    `| Centres inside but within the reduction tolerance | ${before.counts?.near_edge ?? "-"} | ${after.counts?.near_edge ?? "-"} |`,
    "",
  ];

  if (!diff.changed) {
    lines.push(
      "**No verdict changed.** Every commune centre lands on the same side of its own",
      "commune as it did on the committed cache, so the rebuilt geometry is a refresh",
      "with nothing to decide and was discarded.",
      "",
    );
    return lines.join("\n");
  }

  lines.push("## Verdicts that changed", "");
  if (!diff.osm_base_moved)
    lines.push(
      "**The OSM base did not move.** A verdict that changes against an unchanged",
      "`timestamp_osm_base` is the rebuild disagreeing with itself, not OpenStreetMap",
      "reporting something new. Read this as a defect in the builder first.",
      "",
    );

  lines.push(
    ...section(
      "Now outside its own commune",
      diff.now_outside,
      (r) => `- ${label(r)}: ${r.metres_outside} m from the boundary, OSM relation ${r.osm_relation_id}`,
    ),
    ...section("Now inside its own commune", diff.now_inside, (r) => `- ${label(r)}`),
    ...section(
      "No usable OpenStreetMap boundary any more",
      diff.lost_boundary,
      (r) => `- ${label(r)}: ${r.reason}`,
    ),
    ...section("Decidable again", diff.gained_boundary, (r) => `- ${label(r)}`),
    "## What to do with this",
    "",
    "Each row above is a hand decision, not a merge. Decide it against the commune's",
    "own `admin_level=8` relation as `research/_commune-centres/README.md` describes,",
    "then either correct the stored centre through a corrections file and",
    "`scripts/fix-commune-centres.mjs`, or keep its entry in",
    "`research/_commune-centres/containment-exceptions.json` with the reason it is there.",
    "",
  );
  return lines.join("\n");
}
