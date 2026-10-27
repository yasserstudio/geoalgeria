// MJS GeoServer (sig.mjs.gov.dz) layer pull, capture and offline replay.
//
// Two packages build from the same official GIS: @geoalgeria/sports
// (infrastructures_sportives) and @geoalgeria/jeunesse
// (etablissements_de_jeunes). Both request every feature as GeoJSON through the
// WMS GetMap endpoint, which is public where the WFS is auth-gated.
//
// The server answers only from an Algerian vantage point, so a refresh depends
// on a narrow window. Each pull is therefore captured under sources/<pkg>/ the
// moment it arrives, before any validation that could abort the run, and both
// packages rebuild from that capture with --cache. Convention:
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

import { writeCapture, readCapture } from "./source-store.mjs";

const WMS_BASE = "https://sig.mjs.gov.dz/api/v1.0/geoserver/public/wms";

/** The public dashboard the layers back; the citation published records carry. */
export const MJS_SOURCE = "https://sig.mjs.gov.dz/dashboard/viewer";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const CAPTURE_NOTE =
  "Trimmed projection: GeoServer's per-request feature id is dropped (it changes " +
  "on every pull) and features are sorted by the stable properties.id. Geometry " +
  "and all source properties are kept as received.";

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
 * Order features by the stable record UUID and drop the volatile fid. A feature
 * carrying no properties.id is kept and sorted after the identified ones rather
 * than throwing: the capture must survive whatever the ministry's GIS emits, and
 * the fetchers' own validation is what rejects an unusable row. Keeping it last
 * also means such a row cannot shift the identified ones in the diff.
 *
 * Exported for test/mjs-sig-capture.test.mjs, which pins the projection.
 */
export function canonicalizeMjsLayer(raw) {
  const idOf = (f) => {
    const id = f?.properties?.id;
    return id == null || id === "" ? null : String(id);
  };
  return {
    type: raw.type,
    totalFeatures: raw.totalFeatures,
    features: [...raw.features]
      .sort((a, b) => {
        const [x, y] = [idOf(a), idOf(b)];
        if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
        return x.localeCompare(y);
      })
      .map((f) => ({
        type: f.type,
        geometry: f.geometry,
        geometry_name: f.geometry_name,
        properties: f.properties,
      })),
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
