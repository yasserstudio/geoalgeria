// L2 internal agreement: the geometric median of the `geo_precision: exact` records this
// repository already publishes inside the commune's own OpenStreetMap outline.
//
// WHY IT IS A CLAIM AND NOT A CHECK. Thousands of post offices, schools, pharmacies and
// clinics were surveyed one by one, by sources that never saw our commune centres. Where
// enough of them fall inside one commune's outline, where they cluster IS a statement about
// where that commune's town is, made by our own data rather than by a third party. It is the
// Claim the ADR gives the most weight: two Votes with the median among them are a Strong
// consensus.
//
// THE MEDIAN, NOT THE MEAN. A geometric median (Weiszfeld) is the point minimising total
// distance, so one outlying facility at the far end of a Saharan commune moves it by
// metres where a mean would follow it for kilometres.
//
// POINT-IN-POLYGON, NOT THE COMMUNE A RECORD NAMES. Which records count is decided by the
// outline, so a record wrongly attributed to this commune cannot pull the median, and a
// record attributed elsewhere but standing here still counts.

import { MIN_EXACT_RECORDS } from "../thresholds.mjs";

/** 6 decimals is this repository's coordinate resolution (packages/schema round6). */
const round6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * Weiszfeld's algorithm over [lng, lat] points, longitude scaled by cos(lat) so the
 * iteration runs on metres rather than on degrees.
 */
export function geometricMedian(points) {
  let x = points.reduce((s, p) => s + p[0], 0) / points.length;
  let y = points.reduce((s, p) => s + p[1], 0) / points.length;
  const cosLat = Math.cos((y * Math.PI) / 180);
  for (let i = 0; i < 256; i++) {
    let nx = 0;
    let ny = 0;
    let w = 0;
    for (const [px, py] of points) {
      const d = Math.hypot((px - x) * cosLat, py - y);
      if (d < 1e-12) continue;
      nx += px / d;
      ny += py / d;
      w += 1 / d;
    }
    if (!w) break;
    const sx = nx / w;
    const sy = ny / w;
    const moved = Math.hypot(sx - x, sy - y);
    x = sx;
    y = sy;
    if (moved < 1e-9) break;
  }
  return [round6(x), round6(y)];
}

export const layer = {
  id: "L2",
  source: "record_median",
  licence: "the terms of the GeoAlgeria packages the records come from",
  describe: `the geometric median of at least ${MIN_EXACT_RECORDS} exact records inside the commune outline`,

  claim({ snapshots, exactRecords }) {
    if (exactRecords.points.length < MIN_EXACT_RECORDS) return null;
    return {
      layer: layer.id,
      source: layer.source,
      licence: layer.licence,
      snapshot: snapshots.records.committed,
      point: geometricMedian(exactRecords.points),
      verdict: null,
      detail: { records: exactRecords.points.length, files: exactRecords.files.length },
    };
  },
};
