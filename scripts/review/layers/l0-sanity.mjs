// L0 sanity: what is wrong with the point we already publish.
//
// IT STATES NO CLAIM. Every other layer locates the place; this one judges the value in
// the file, so `claim()` returns null and the findings come back from `check()`. They are
// recorded on the decision so a queued commune tells the Owner why it was looked at, and
// so a fix carries the defect it repaired.
//
// WHAT IS NOT RE-IMPLEMENTED HERE. "Inside Algeria" and "inside the declared wilaya" are
// already held on every pull request by test/commune-in-boundary.test.mjs and
// test/record-in-declared-wilaya.test.mjs, and containment in the commune's own outline by
// test/commune-centre-in-commune.test.mjs with its own exceptions list. This layer reads
// the same geometry through the same libraries rather than carrying a second opinion.

import { inCommuneOutline, isTooCoarseToJoin } from "../../lib/commune-resolver.mjs";
import { coordinateAnomaly } from "../../lib/seat-evidence.mjs";

export const layer = {
  id: "L0",
  source: "sanity",
  licence: null,
  describe: "the published point against the geometry and the values around it",

  /** L0 judges the published point instead of locating the place, so it states no Claim. */
  claim: () => null,

  /**
   * @param {object} context
   * @param {object} context.commune  `{code_commune, point, ...}`
   * @param {object|null} context.outline  the commune's outline entry, or null
   * @param {number[]|null} context.seat  the OpenStreetMap seat, or null
   * @param {Map<string, number[]>} context.centresByKey  every other commune's centre,
   *   keyed "lng,lat", so a borrowed centre is a lookup rather than a sweep
   */
  check({ commune, outline, seat, centresByKey }) {
    const [lng, lat] = commune.point;
    const borrowed = centresByKey.get(`${lng},${lat}`);
    return {
      in_own_commune_outline: outline ? inCommuneOutline(lng, lat, outline) : null,
      too_coarse_to_be_a_point: isTooCoarseToJoin(lat, lng),
      borrowed_from_commune: borrowed && borrowed !== commune.code_commune ? borrowed : null,
      mangled_form_of_the_seat: seat ? coordinateAnomaly(commune.point, seat) : null,
    };
  },
};
