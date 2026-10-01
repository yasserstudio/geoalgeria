// The coordinate review engine: snapshots in, one decision per commune out.
//
// WHAT IT DOES. For each commune it looks at, it asks every layer for its Claim, builds the
// Candidate set those Claims and the published point make up, and hands both to the voting
// rules in scripts/review/votes.mjs. It decides nothing itself; it is the wiring, so the
// rules stay unit testable and the inputs stay replayable.
//
// WHICH COMMUNES. The ones a seat delta or a missing seat puts in question: more than
// SEAT_DELTA_KM from their OpenStreetMap seat, or with no seat to compare against. A seat
// delta on its own is NOT a defect (the Owner's decision of 2026-09-29, private tracker
// #170); it is the question this engine answers.
//
// THE WILAYA POINTS ARE NOT A LAYER. Since data PR #242 a wilaya's latitude/longitude IS
// its capital commune's centre, so it is a copy of a Candidate rather than a Claim about
// one, and reading it would count one value twice. A fix to a capital commune's centre is
// carried into its wilaya by scripts/fix-wilaya-capital-points.mjs.

import { metresBetween } from "../lib/seat-evidence.mjs";
import { inCommuneOutline } from "../lib/commune-resolver.mjs";
import { CLAIM_LAYERS, SANITY_LAYER } from "./layers/index.mjs";
import { decide } from "./votes.mjs";
import { SEAT_DELTA_KM } from "./thresholds.mjs";

export { SEAT_DELTA_KM };

/** The commune codes under review, and why each one is in the set. */
export function selectCommunes(snapshots) {
  const out = [];
  for (const commune of snapshots.communes) {
    const seat = snapshots.seats.byCommune.get(commune.code_commune)?.seat ?? null;
    if (!seat) {
      out.push({ commune, seat: null, selected_because: "no_seat", seat_delta_m: null });
      continue;
    }
    const metres = metresBetween(commune.point[0], commune.point[1], seat[0], seat[1]);
    if (metres > SEAT_DELTA_KM * 1000)
      out.push({ commune, seat, selected_because: "seat_delta", seat_delta_m: Math.round(metres) });
  }
  return out.sort((a, b) => a.commune.code_commune - b.commune.code_commune);
}

/** "lng,lat" -> the commune that publishes that exact point, for L0's borrowed-centre read. */
function centreIndex(communes) {
  const byKey = new Map();
  for (const c of communes) {
    const key = `${c.point[0]},${c.point[1]}`;
    if (!byKey.has(key)) byKey.set(key, c.code_commune);
  }
  return byKey;
}

/** One commune's decision, with everything a ledger row or a queue entry needs. */
export function reviewCommune({ commune, seat, selected_because, seat_delta_m }, snapshots, centresByKey) {
  const outline = snapshots.boundaries.byCommune.get(commune.code_commune) ?? null;
  const usableOutline = outline?.usable && outline.bbox ? outline : null;
  const exactRecords = snapshots.records.byCommune.get(commune.code_commune) ?? { points: [], files: [] };
  const context = { commune, outline: usableOutline, seat, snapshots, exactRecords, centresByKey };

  const claims = CLAIM_LAYERS.map((l) => l.claim(context)).filter(Boolean);
  const candidates = [
    { source: "published", point: commune.point },
    ...claims.filter((c) => c.point).map((c) => ({ source: c.source, point: c.point, licence: c.licence, snapshot: c.snapshot })),
  ];
  const isInsideOutline = (point) => (usableOutline ? inCommuneOutline(point[0], point[1], usableOutline) : null);

  return {
    code_commune: commune.code_commune,
    wilaya_code: commune.wilaya_code,
    name_fr: commune.name_fr,
    name_ar: commune.name_ar,
    selected_because,
    seat_delta_m,
    sanity: SANITY_LAYER.check(context),
    claims: claims.map((c) => ({ layer: c.layer, source: c.source, snapshot: c.snapshot, point: c.point, verdict: c.verdict, ...c.detail })),
    ...decide({ candidates, claims, isInsideOutline }),
  };
}

/** Every decision of one run, in commune-code order, with the run's counts. */
export function reviewCommuneCentres(snapshots) {
  const centresByKey = centreIndex(snapshots.communes);
  const decisions = selectCommunes(snapshots).map((row) => reviewCommune(row, snapshots, centresByKey));
  const counts = { reviewed: decisions.length, fix: 0, confirmed: 0, queue: 0, byReason: {}, byWinner: {} };
  for (const d of decisions) {
    counts[d.outcome]++;
    if (d.outcome === "queue") counts.byReason[d.reason] = (counts.byReason[d.reason] ?? 0) + 1;
    if (d.outcome === "fix") counts.byWinner[d.winner.source] = (counts.byWinner[d.winner.source] ?? 0) + 1;
  }
  return { decisions, counts };
}
