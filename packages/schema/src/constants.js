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

/** Fewest fraction digits a coordinate must carry before `geo_precision: "exact"`
 *  is a claim the number can support. Resolution is a hard ceiling on accuracy: a
 *  value written to d fraction digits pins latitude no better than ±0.5×10⁻ᵈ°, i.e.
 *  ±556 m at d=2 and ±56 m at d=3. `exact` means "a real per-facility point"
 *  (→ a Pin); ±556 m is a neighbourhood, ±56 m is a building. So the cut sits
 *  between 2 and 3, and 3 is the minimum that can be called exact.
 *
 *  These are truncations, not coincidences: 70% of the repo's exact coordinates
 *  carry 6–7 fraction digits and 84% carry ≥5, while the ≤2 tail is 0.53% — and
 *  where a coarse value can be checked against the place it names it is wrong by
 *  tens of km (three @geoalgeria/banques BADR branches — M'Sila, Bou Saâda and
 *  Hammam Dhalaa — all sat on exactly (35, 4), 93/29/100 km from those towns). */
export const MIN_EXACT_DECIMALS = 3;

/** Generous Algeria bounding box (WGS84) for the coordinate sanity guard.
 *  Deliberately loose — its job is to catch lat/lng swaps and sign flips, not to
 *  fence the border. A swapped Algerian point (lat≈28 → lng=28) or a sign-flipped
 *  latitude (−28) lands well outside this box. */
export const DZ_BBOX = { minLng: -9, maxLng: 12, minLat: 18, maxLat: 38 };
