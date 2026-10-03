// The layers of ADR 0001, in order, each a module with the same interface:
//
//   {id, source, licence, describe, claim(context) -> Claim | null}
//
// and L0 additionally `check(context)`, because it judges the published point rather than
// locating the place and so states no Claim.
//
// L4, the Owner's readings from the review page, is the review-page import (ADR 0001, P2)
// and is not a layer here yet.

import { layer as l0Sanity } from "./l0-sanity.mjs";
import { layer as l1OsmSeat } from "./l1-osm-seat.mjs";
import { layer as l1Wikidata } from "./l1-wikidata.mjs";
import { layer as l2RecordMedian } from "./l2-record-median.mjs";
import { layer as l3GoogleVerdict } from "./l3-google-verdict.mjs";

export const SANITY_LAYER = l0Sanity;

/** The layers that state a Claim, in the order they are read. */
export const CLAIM_LAYERS = [l1OsmSeat, l1Wikidata, l2RecordMedian, l3GoogleVerdict];

export { l0Sanity, l1OsmSeat, l1Wikidata, l2RecordMedian, l3GoogleVerdict };

/**
 * The licence a shipped coordinate carries, by the Candidate that won its Consensus.
 *
 * Derived from the layers rather than restated, so a layer's terms are written once: a
 * winning Candidate IS the point the layer that produced it stated, and it carries that
 * layer's licence. The L3 verdict layer is absent on purpose; it states no coordinate and
 * so can never be the provenance of a published value (ADR 0001 rule 6).
 */
export const WINNER_LICENCE = Object.fromEntries(
  CLAIM_LAYERS.filter((l) => l !== l3GoogleVerdict).map((l) => [l.source, l.licence]),
);
