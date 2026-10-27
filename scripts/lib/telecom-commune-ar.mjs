// The Arabic commune label the 5G packages publish.
//
// The operators treat their Arabic commune column as free text and rewrite it between
// pulls. The 2026-10-27 Mobilis capture moved it on 109 existing records and, scored
// against the commune registry in packages/dataset, 83 of the 109 matched the registry
// before and only 53 after: a definite article prepended to a name that already carried
// one, a word duplicated, or a different commune's name altogether. So the registry's
// name is what publishes wherever a record resolves to a canonical commune, and the
// operator's own label only where nothing resolves (Djezzy publishes no commune at all,
// so its records keep their null).
//
// It runs after the review ledger, in the writer rather than in the fetcher, so the
// wilaya a reviewed correction settled is the one the commune is resolved against.
//
// RESOLUTION, in order:
//   1. the commune code, when the record carries one;
//   2. an exact current or former FRENCH commune label inside the declared wilaya;
//   3. an exact current or former ARABIC label inside the declared wilaya, but only when
//      the record's own point does not refute that commune. The Arabic column is the one
//      the operators rewrite, so on its own it is the weakest claim in the row and it
//      gets corroborated before it is trusted; a French label is not second-guessed this
//      way because the operators leave it alone.
//   4. the few operator spellings pinned below.
// Containment is deliberately NOT a resolution path of its own: of the 89 records whose
// point falls inside exactly one commune outline, 69 name something other than that
// commune, usually a neighbourhood inside it, and relabelling those would change what
// the record says rather than how it spells it.

import { communeResolver } from "./build-utils.mjs";
import {
  canonicalCommuneForCode,
  canonicalCommuneForCurrentLabel,
  latinNameKey,
} from "./commune-index.mjs";

// Operator spellings that differ from every current and former registry label by more
// than punctuation, pinned by hand with the evidence that settles each one. Keyed by the
// declared wilaya and the operator's own French label, the wilaya normalized the way
// every other commune lookup in this repository normalizes it. Extend as the operators
// drift; a label that resolves on its own never reaches this map.
const PINNED_OPERATOR_COMMUNE = new Map([
  // Mobilis writes commune 2130 Filfila as two words. Its own Arabic for these rows was
  // فلفلة, the registry's name for 2130, until the 2026-10-27 capture doubled it, and
  // the points are inside 2130's outline.
  ["21|fil fila", "2130"],
  // Mobilis writes commune 2129 Bin El Ouiden with Bir. Its own Arabic was بئر الويدان,
  // which matches that French; the 2026-10-27 capture replaced it with بئر العرش, the
  // registry's name for commune 1908 in wilaya 19. The points are inside 2129's outline.
  ["21|bir el ouiden", "2129"],
]);

const pinKey = (site) => `${Number(site.wilaya_code)}|${latinNameKey(site.commune ?? "")}`;

// The outlines are a large geometry load, so build the resolver once and only if a
// record actually reaches the Arabic branch.
let cachedResolver = null;
const resolver = () => (cachedResolver ??= communeResolver());

/**
 * Does the record's own point refute this commune? A record with no coordinate to ask
 * cannot corroborate anything, so it fails closed; a commune OpenStreetMap ships no
 * outline for cannot refute anything, so a null verdict passes, which is the same
 * not-refuted reading scripts/lib/commune-resolver.mjs uses for its own conservative
 * branch.
 */
function pointAgreesWith(site, commune) {
  if (!Number.isFinite(site.lat) || !Number.isFinite(site.lng)) return false;
  return resolver().insideOwnOutline(site.lat, site.lng, commune.code_commune) !== false;
}

/** The canonical commune a 5G record resolves to, or null. */
export function canonicalCommuneForSite(site) {
  const byCode = site.commune_code ? canonicalCommuneForCode(site.commune_code) : null;
  if (byCode) return byCode;
  const byFrench = canonicalCommuneForCurrentLabel(site.wilaya_code, site.commune, null);
  if (byFrench) return byFrench;
  const byArabic = canonicalCommuneForCurrentLabel(site.wilaya_code, null, site.commune_ar);
  if (byArabic) return pointAgreesWith(site, byArabic) ? byArabic : null;
  const pinned = PINNED_OPERATOR_COMMUNE.get(pinKey(site));
  return pinned ? canonicalCommuneForCode(pinned) : null;
}

/**
 * True when this record resolves on its Arabic label alone, the one path that needs
 * corroborating. Exported so the guard can count those records and assert that the
 * corroboration is not quietly dropping any of them.
 */
export function resolvedByArabicLabelAlone(site) {
  if (site.commune_code && canonicalCommuneForCode(site.commune_code)) return false;
  if (canonicalCommuneForCurrentLabel(site.wilaya_code, site.commune, null)) return false;
  return Boolean(canonicalCommuneForCurrentLabel(site.wilaya_code, null, site.commune_ar));
}

/** The Arabic commune label to publish for one 5G record. */
export function communeArForSite(site) {
  return canonicalCommuneForSite(site)?.name_ar ?? site.commune_ar ?? null;
}

/** Writer hook: one record with its Arabic commune label resolved. */
export const relabelCommuneAr = (row) => ({ ...row, commune_ar: communeArForSite(row) });
