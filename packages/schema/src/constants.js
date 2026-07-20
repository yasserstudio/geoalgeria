// Canonical constants for the GeoAlgeria data contract (schema v2).

/** The data-contract version every v2 dataset declares in metadata.schema_version. */
export const SCHEMA_VERSION = "2.0.0";

/** Coordinate-provenance vocabulary. Detail (e.g. "osm_node") lives in geo_method.
 *  `null` is a first-class value: it is the precision of a record that has no
 *  coordinate at all. The validator enforces the iff — geo_precision is null if
 *  and only if lat/lng are null — because a precision (and a geo_method) on a
 *  point that does not exist is a false provenance claim, and a null precision on
 *  a geocoded record throws provenance away. */
export const GEO_PRECISION = ["exact", "approximate", null];

/** Operational status of a facility/asset. Optional per-record; absent means unknown. */
export const LIFECYCLE = ["operating", "planned", "closed", "unknown"];

/** How a source establishes a record: an official register, community mapping, or
 *  our own computation. Declared per source (metadata.sources[].evidence_type). */
export const EVIDENCE_TYPE = ["official", "crowdsourced", "derived"];

/** The 69 post-2026-reform wilaya codes as zero-padded 2-digit strings ("01".."69"). */
export const WILAYA_CODES = Array.from({ length: 69 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

/** Generous Algeria bounding box (WGS84) for the coordinate sanity guard.
 *  Deliberately loose — its job is to catch lat/lng swaps and sign flips, not to
 *  fence the border. A swapped Algerian point (lat≈28 → lng=28) or a sign-flipped
 *  latitude (−28) lands well outside this box. */
export const DZ_BBOX = { minLng: -9, maxLng: 12, minLat: 18, maxLat: 38 };
