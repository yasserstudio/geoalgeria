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
