// Canonical constants for the GeoAlgeria data contract (schema v2).

/** The data-contract version every v2 dataset declares in metadata.schema_version. */
export const SCHEMA_VERSION = "2.0.0";

/** Coordinate-provenance vocabulary. Detail (e.g. "osm_node") lives in geo_method. */
export const GEO_PRECISION = ["exact", "approximate"];

/** The 69 post-2026-reform wilaya codes as zero-padded 2-digit strings ("01".."69"). */
export const WILAYA_CODES = Array.from({ length: 69 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

/** Generous Algeria bounding box (WGS84) for the coordinate sanity guard.
 *  Deliberately loose — its job is to catch lat/lng swaps and sign flips, not to
 *  fence the border. A swapped Algerian point (lat≈28 → lng=28) or a sign-flipped
 *  latitude (−28) lands well outside this box. */
export const DZ_BBOX = { minLng: -9, maxLng: 12, minLat: 18, maxLat: 38 };
