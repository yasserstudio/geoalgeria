#!/usr/bin/env node
// Run the coordinate review over the commune centres and write what it settles.
//
// WHAT COMES OUT
//   research/_commune-centres/corrections-<run>.json  the Strong consensus fixes, in the
//     shape scripts/fix-commune-centres.mjs already applies, each row carrying
//     `decided_by: "consensus"`, its Votes and the licence of the Candidate that won.
//   research/_commune-centres/review-queue-<date>.json  everything the engine did not
//     settle, with its Candidates, its Votes and the reason, for the Owner's review page.
//
// REPLAYABLE. The run reads committed snapshots only, so test/review-decisions.test.mjs
// re-derives every row of both files offline. Because applying a fix removes the commune
// from the set under review, that test rewinds the corrected communes to their `from`
// first, and `--rewind <ledger>` does the same here, which is how a run is verified after
// the fixes have landed.
//
// THE L3 VERDICTS FILE IS NEVER COMMITTED. `--verdicts <path>` (or
// GEOALGERIA_GOOGLE_VERDICTS) points at a file outside this repository and raises the
// Vote count on some communes. It is deliberately NOT how the committed ledger was
// produced: a committed row must be re-derivable from committed inputs, and no Google
// content, verdict or coordinate, enters this repository (ADR 0001 rule 6).
//
// USAGE
//   node scripts/review/run.mjs                       # report
//   node scripts/review/run.mjs --write                # write the ledger and the queue
//   node scripts/review/run.mjs --verdicts <path>      # add the L3 layer (report only)
//   node scripts/review/run.mjs --rewind <ledger>      # replay a landed run

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { metresBetween } from "../lib/seat-evidence.mjs";
import { REPO_ROOT, loadSnapshots } from "./snapshots.mjs";
import { SEAT_DELTA_KM, reviewCommuneCentres } from "./engine.mjs";
import { WINNER_LICENCE } from "./layers/index.mjs";
import { AGREEMENT_KM, COPY_RADIUS_M, MIN_EXACT_RECORDS, MOVE_CAP_KM } from "./thresholds.mjs";

const DIR = join(REPO_ROOT, "research", "_commune-centres");

/** Put the communes a ledger corrected back at their `from`, so a landed run replays. */
export function rewind(snapshots, ledgers) {
  for (const ledger of ledgers)
    for (const row of ledger.corrections) {
      const commune = snapshots.byCode.get(row.code_commune);
      if (!commune) throw new Error(`rewind: ${row.code_commune} is not a commune this repository ships`);
      commune.point = row.from;
    }
  return snapshots;
}

/** One ledger row from one `fix` decision. */
function correctionRow(decision, snapshots) {
  const commune = snapshots.byCode.get(decision.code_commune);
  const to = decision.winner.point;
  const seat = snapshots.seats.byCommune.get(decision.code_commune);
  const votes = decision.votes.map((v) => {
    const claim = decision.claims.find((c) => c.source === v.source);
    return {
      source: v.source,
      layer: v.layer,
      snapshot: v.snapshot,
      licence: v.licence,
      voted_for: v.candidate,
      distance_m: v.distance_m,
      distance_to_new_point_m: claim?.point ? Math.round(metresBetween(claim.point[0], claim.point[1], to[0], to[1])) : null,
      copied: v.copied,
    };
  });
  return {
    code_commune: decision.code_commune,
    wilaya_code: decision.wilaya_code,
    name_fr: decision.name_fr,
    name_ar: decision.name_ar,
    decided_by: "consensus",
    licence: WINNER_LICENCE[decision.winner.source],
    from: commune.point,
    to,
    delta_m: decision.move_m,
    consensus: {
      tier: decision.tier,
      winning_candidate: decision.winner.source,
      selected_because: decision.selected_because,
      seat_delta_m: decision.seat_delta_m,
      inside_commune_outline: true,
      candidates: decision.candidates,
      votes,
      ...(decision.answers.some((a) => a.not_independent)
        ? { not_independent: decision.answers.flatMap((a) => a.not_independent ?? []) }
        : {}),
      sanity: decision.sanity,
    },
    ...(decision.winner.source === "osm_seat" && seat
      ? {
          osm: {
            relation: seat.osm_relation_id,
            admin_centre_node: seat.admin_centre_node,
            admin_centre_point: seat.seat,
            wikidata: seat.wikidata ?? null,
          },
        }
      : {}),
  };
}

/** One queue entry from one unsettled decision. */
function queueRow(decision, snapshots) {
  return {
    code_commune: decision.code_commune,
    wilaya_code: decision.wilaya_code,
    name_fr: decision.name_fr,
    name_ar: decision.name_ar,
    reason: decision.reason,
    tier: decision.tier,
    selected_because: decision.selected_because,
    seat_delta_m: decision.seat_delta_m,
    published: snapshots.byCode.get(decision.code_commune).point,
    candidates: decision.candidates,
    votes: decision.votes.map((v) => ({
      source: v.source,
      layer: v.layer,
      snapshot: v.snapshot,
      voted_for: v.candidate,
      distance_m: v.distance_m,
      copied: v.copied,
    })),
    silenced: decision.silenced,
    answers: decision.answers,
    sanity: decision.sanity,
  };
}

const RULES = {
  selected: `a published centre more than ${SEAT_DELTA_KM} km from its OpenStreetMap seat, or with no seat`,
  agreement_km: AGREEMENT_KM,
  copy_radius_m: COPY_RADIUS_M,
  min_exact_records: MIN_EXACT_RECORDS,
  move_cap_km: MOVE_CAP_KM,
  decision_record: "docs/adr/0001-coordinate-review-by-independent-votes.md",
  thresholds: "scripts/review/thresholds.mjs",
};

/** The two documents one run writes. */
export function buildDocuments({ decisions, counts }, snapshots, { run, generated }) {
  const inputs = {
    "osm-seat-reference.json": snapshots.seats.meta,
    "wikidata-reference.json": snapshots.wikidata.meta,
    "commune-boundaries.json": snapshots.boundaries.meta,
    "exact records": { files: "packages/*/data/*.json", records: snapshots.records.total, read: snapshots.records.committed },
    "L3 verdicts": snapshots.verdicts ? { read: snapshots.verdicts.meta.read, path: "outside this repository" } : null,
  };
  const fixes = decisions.filter((d) => d.outcome === "fix");
  const ledger = {
    generated,
    run,
    source:
      "The coordinate review engine (scripts/review/), layers L0 to L2: the OpenStreetMap admin_centre seat, the Wikidata P625 coordinate of the item that commune's relation carries, and the geometric median of the geo_precision: exact records inside the commune's own OpenStreetMap outline. Every published value here is the Candidate that won its Strong consensus, and every row says which Candidate that was and which Claims voted for it.",
    endpoint: null,
    timestamp_osm_base: snapshots.seats.meta.timestamp_osm_base,
    wikidata_query_date: snapshots.wikidata.meta.query_date,
    licence: "ODbL 1.0, (c) OpenStreetMap contributors",
    method:
      `Every commune ${RULES.selected} was reviewed: ${counts.reviewed} of them. Each layer states a Claim about where the commune's town is; the Candidates are the published point, the OpenStreetMap seat, the Wikidata point and the record median. A Claim votes for a Candidate it did not produce, within ${AGREEMENT_KM} km, and not when it is within ${COPY_RADIUS_M} m of it, because at that distance the two share a value instead of confirming each other. Candidates that agree with each other are one answer, and two Claims within ${COPY_RADIUS_M} m of each other cast one Vote between them. A row is written only on Strong consensus: three Votes for one answer, or two with the record median among them, no Vote for any Candidate outside it, and the winning Candidate inside the commune's own outline. A move over ${MOVE_CAP_KM} km is never applied here however many Votes back it, because at that distance a centre also re-stamps other packages' nearest-centroid joins. Plain consensus, no consensus and the over-cap moves are in review-queue-${generated}.json for the Owner, and the communes still undecided keep the point they publish. ` +
      `No reading taken off a proprietary map decided any row: the L3 verdict layer is optional, lives outside this repository, and was not used to produce this file, so every row re-derives from the committed snapshots alone (test/review-decisions.test.mjs). Thresholds and the measurement behind each: ${RULES.thresholds}. Decision record: ${RULES.decision_record}.`,
    rules: RULES,
    inputs,
    applied: true,
    count: fixes.length,
    corrections: fixes.map((d) => correctionRow(d, snapshots)),
  };

  const queue = {
    generated,
    run,
    note:
      `Everything the coordinate review engine did not settle, for the Owner's review page. A row keeps the point it publishes until the Owner decides it; nothing here is nulled and no published field is added. \`reason\` is why it is not a fix: plain_consensus (two Votes but not the Strong tier), no_consensus (fewer than two independent Votes), split_votes (a Candidate outside the leading answer also has a Vote), move_over_cap (Strong consensus for a move over ${MOVE_CAP_KM} km), outside_outline or no_outline (the winning Candidate cannot be placed inside the commune), no_candidates (no open source states anything about this commune). Rebuild with \`node scripts/review/run.mjs --write\`.`,
    rules: RULES,
    inputs,
    reviewed: counts.reviewed,
    counts,
    count: counts.queue,
    queue: decisions.filter((d) => d.outcome === "queue").map((d) => queueRow(d, snapshots)),
    confirmed: decisions.filter((d) => d.outcome === "confirmed").map((d) => queueRow(d, snapshots)),
  };
  return { ledger, queue };
}

function writeAtomic(path, value) {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, path);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const i = argv.indexOf(name);
    return i < 0 ? null : argv[i + 1];
  };
  const verdictsPath = flag("--verdicts") ?? process.env.GEOALGERIA_GOOGLE_VERDICTS ?? null;
  const generated = flag("--date") ?? new Date().toISOString().slice(0, 10);
  const run = flag("--run") ?? generated;

  const snapshots = loadSnapshots({ verdictsPath, today: generated });
  const rewinds = argv.flatMap((a, i) => (argv[i - 1] === "--rewind" ? [JSON.parse(readFileSync(a, "utf-8"))] : []));
  if (rewinds.length) rewind(snapshots, rewinds);

  const result = reviewCommuneCentres(snapshots);
  const { ledger, queue } = buildDocuments(result, snapshots, { run, generated });

  console.log(`reviewed ${result.counts.reviewed} commune centres (${RULES.selected})`);
  console.log(`  ${result.counts.fix} Strong consensus fix(es): ${JSON.stringify(result.counts.byWinner)}`);
  console.log(`  ${result.counts.confirmed} confirmed at the published point`);
  console.log(`  ${result.counts.queue} in the Review queue: ${JSON.stringify(result.counts.byReason)}`);
  if (snapshots.verdicts) console.log("  L3 verdicts were read; this run must NOT be written to the repository");

  if (argv.includes("--write")) {
    if (snapshots.verdicts) throw new Error("--write with --verdicts: a committed row must re-derive from committed inputs only");
    writeAtomic(join(DIR, `corrections-${run}.json`), ledger);
    writeAtomic(join(DIR, `review-queue-${generated}.json`), queue);
    console.log(`wrote corrections-${run}.json and review-queue-${generated}.json`);
    console.log("next: add the ledger to CORRECTION_FILES in scripts/lib/commune-corrections.mjs, then");
    console.log("  node scripts/fix-commune-centres.mjs --write");
    console.log("  node scripts/fix-wilaya-capital-points.mjs --write");
    console.log("  node scripts/sync-commune-centroid-dependents.mjs --write");
  }
}
