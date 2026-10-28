// MJS GeoServer (sig.mjs.gov.dz) layer pull, capture and offline replay.
//
// Two packages build from the same official GIS: @geoalgeria/sports
// (infrastructures_sportives) and @geoalgeria/jeunesse
// (etablissements_de_jeunes). Both request every feature as GeoJSON through the
// WMS GetMap endpoint, which is public where the WFS is auth-gated.
//
// The server answers only from an Algerian vantage point, so a refresh depends
// on a narrow window. Each pull is therefore captured under sources/<pkg>/ the
// moment it arrives, before any validation that could abort the run, so the
// capture replays offline with --cache long after the window closes. The
// rebuild itself is held: both --cache runs abort in applyReviewedOverrides on
// a review decision gone stale by absorption (sports facilities.json/01663,
// jeunesse institutions.json/00728, each expecting wilaya 14 where the build
// now derives 64 with commune 1439), before either package writes anything.
// Retiring those decisions edits the #209 audit gate, so both are parked for
// batch 2026-16; refresh-schedule.json carries the full reason per package.
// Owed in 2026-16, once the rebuild runs again: a gate that proves a live pull
// replays byte-identically to the committed capture end to end. The tests pin
// the projection only (test/mjs-sig-capture.test.mjs). Convention:
// sources/README.md.
//
// The capture is a reviewed projection, not the bytes as received: GeoServer
// mints a fresh per-request feature id ("<layer>.fid-5ffd9fe9_1a17f142549_80d")
// and two pulls 90 seconds apart changed all 2,337 of them, so keeping it would
// make every no-change re-fetch a whole-file diff. Dropping it leaves the
// capture byte-identical across those two pulls (verified) while losing nothing
// the build reads: the fetchers key on properties.id, the stable per-record
// UUID, which is also what the features are sorted by so a server-side reorder
// stays a no-op.

import { writeCapture, readCapture, stableStringify } from "./source-store.mjs";

const WMS_BASE = "https://sig.mjs.gov.dz/api/v1.0/geoserver/public/wms";

/** The public dashboard the layers back; the citation published records carry. */
export const MJS_SOURCE = "https://sig.mjs.gov.dz/dashboard/viewer";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const CAPTURE_NOTE =
  "Trimmed projection, a key whitelist rather than a single drop. Kept: the " +
  "top-level type, totalFeatures and features; per feature its type, geometry, " +
  "geometry_name and the whole properties object as received. Dropped: " +
  "GeoServer's per-request feature id (it changes on every pull) and any other " +
  "top-level key the endpoint may add, crs included. Features are sorted by the " +
  "stable properties.id, with their own canonical body as the tie-break.";

/** GetMap URL for a layer, the whole country in one request. */
export function mjsLayerUrl(layer) {
  return (
    `${WMS_BASE}?service=WMS&version=1.1.1&request=GetMap` +
    `&layers=${layer}` +
    "&bbox=-9,18,12,38&width=1&height=1&srs=EPSG:4326" +
    "&format=application/json;type=geojson"
  );
}

/**
 * Project a layer answer onto the keys the build reads, then order it.
 *
 * This is a whitelist, not a single drop. Kept: the top-level `type`,
 * `totalFeatures` and `features`; per feature its `type`, `geometry`,
 * `geometry_name` and the whole `properties` object as received. Everything
 * else goes, which is GeoServer's volatile per-request feature `id` today and
 * any other top-level key the endpoint may start sending (`crs`, `bbox`,
 * `links`) tomorrow. It does not throw on an unknown key on purpose: the next
 * live pull has to survive whatever the ministry's GIS emits, and a new key
 * would show up in review as the capture losing nothing it had.
 *
 * A feature carrying no properties.id is kept and sorted after the identified
 * ones rather than throwing, for the same reason; the fetchers' own validation
 * is what rejects an unusable row. Keeping it last also means such a row cannot
 * shift the identified ones in the diff.
 *
 * Exported for test/mjs-sig-capture.test.mjs, which pins the projection.
 */
export function canonicalizeMjsLayer(raw) {
  const idOf = (f) => {
    const id = f?.properties?.id;
    return id == null || id === "" ? null : String(id);
  };
  // Project before sorting, so the tie-break below reads the body that is
  // committed and never the volatile per-request fid.
  const features = raw.features.map((f) => ({
    type: f.type,
    geometry: f.geometry,
    geometry_name: f.geometry_name,
    properties: f.properties,
  }));
  // Rows with no properties.id (or, were the GIS ever to repeat one) used to
  // compare equal and so kept server arrival order, which is not a property of
  // the data: two pulls could then capture differently with nothing changed
  // upstream. Their own canonical body breaks the tie instead.
  const bodies = new Map(features.map((f) => [f, stableStringify(f, 0)]));
  return {
    type: raw.type,
    totalFeatures: raw.totalFeatures,
    features: features.sort((a, b) => {
      const [x, y] = [idOf(a), idOf(b)];
      if (x !== null && y !== null) {
        const byId = x.localeCompare(y);
        if (byId !== 0) return byId;
      } else if (x !== y) {
        return x === null ? 1 : -1;
      }
      const [ba, bb] = [bodies.get(a), bodies.get(b)];
      return ba < bb ? -1 : ba > bb ? 1 : 0;
    }),
  };
}

/**
 * Pull a layer live and capture it under sources/<pkg>/<capture>.json.
 *
 * The capture is written before the feature-count floor is checked, so a short
 * or malformed answer still leaves its evidence on disk for review.
 *
 * @param {object} opts
 * @param {string} opts.pkg          package name (directory under sources/)
 * @param {string} opts.capture      capture name, kebab-case, no extension
 * @param {string} opts.layer        GeoServer layer name
 * @param {number} opts.minExpected  floor below which the pull is treated as partial
 * @returns {Promise<object[]>} the captured features
 */
export async function fetchMjsLayer({ pkg, capture, layer, minExpected }) {
  const url = mjsLayerUrl(layer);
  console.log(`Fetching MJS layer ${layer} from GeoServer…`);
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`WMS request failed: HTTP ${res.status}`);
  const raw = await res.json();

  if (!raw.features || !Array.isArray(raw.features)) {
    throw new Error("unexpected response: no features array");
  }
  const canonical = canonicalizeMjsLayer(raw);
  writeCapture(pkg, capture, canonical, {
    url,
    records: canonical.features.length,
    note: CAPTURE_NOTE,
  });
  console.log(`  captured ${canonical.features.length} raw features to sources/${pkg}/${capture}.json`);

  if (canonical.features.length < minExpected) {
    throw new Error(
      `only ${canonical.features.length} features; expected >= ${minExpected}`,
    );
  }
  return canonical.features;
}

/**
 * Read a captured layer back for an offline (`--cache`) rebuild.
 * @returns {object[]} the captured features
 */
export function readMjsCapture({ pkg, capture, minExpected }) {
  const json = readCapture(pkg, capture);
  if (!Array.isArray(json.features) || json.features.length < minExpected) {
    throw new Error(
      `capture sources/${pkg}/${capture}.json missing or too small ` +
        `(${json.features?.length ?? 0} features, expected >= ${minExpected}): ` +
        "run without --cache to refetch",
    );
  }
  console.log(`Using stored MJS capture: ${json.features.length} raw features`);
  return json.features;
}
