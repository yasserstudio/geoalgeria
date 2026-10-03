// L3 alarm: an agreement verdict read off a proprietary map, with no coordinate in it.
//
// WHY IT IS OPTIONAL AND NEVER COMMITTED. ADR 0001 layer L3: the verdicts are produced by
// a local-only script in the private application repository, never in CI, and no Google
// content enters this repository. The file is read from a path given on the command line
// (`--verdicts <path>`) or in GEOALGERIA_GOOGLE_VERDICTS, the engine runs without it, and
// no test depends on it. A verdict carries agreement only, so it is a Claim with a
// `verdict` naming the Candidate it backs and no point of its own; it can never be the
// provenance of a published coordinate.
//
// THE FILE: [{code, name, verdict}] with verdict one of
//   osm-agrees        the town is where the OpenStreetMap seat is
//   published-agrees  the town is where we publish it
//   neither-agrees | vague | no-answer   states nothing, so it casts no Vote

const BACKS = {
  "osm-agrees": "osm_seat",
  "published-agrees": "published",
  "neither-agrees": null,
  vague: null,
  "no-answer": null,
};

export const layer = {
  id: "L3",
  source: "google_verdict",
  licence: "not published: an agreement verdict with no coordinate (ADR 0001 rule 6)",
  describe: "an agreement verdict read off a proprietary map, held outside this repository",

  claim({ commune, snapshots }) {
    const row = snapshots.verdicts?.byCommune.get(commune.code_commune);
    if (!row) return null;
    if (!(row.verdict in BACKS)) throw new Error(`commune ${commune.code_commune}: unknown verdict ${JSON.stringify(row.verdict)}`);
    const backs = BACKS[row.verdict];
    if (!backs) return null;
    return {
      layer: layer.id,
      source: layer.source,
      licence: layer.licence,
      snapshot: snapshots.verdicts.meta.read,
      point: null,
      verdict: backs,
      detail: { verdict: row.verdict },
    };
  },
};
