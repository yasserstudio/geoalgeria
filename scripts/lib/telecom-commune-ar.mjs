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
// It runs after the review ledger, in the writer rather than in the fetcher, so the wilaya
// a reviewed correction settled is the one the commune is resolved against.
//
// Resolution is the commune code when the record carries one, then an exact current or
// former commune label inside the declared wilaya, then the few operator spellings
// pinned below. Containment is deliberately not a path: of the 89 records whose point
// falls inside exactly one commune outline, 69 name something other than that commune,
// usually a neighbourhood inside it, and relabelling those would change what the record
// says rather than how it spells it.

import {
  canonicalCommuneForCode,
  canonicalCommuneForCurrentLabel,
  latinNameKey,
} from "./commune-index.mjs";

// Operator spellings that differ from every current and former registry label by more
// than punctuation, pinned by hand with the evidence that settles each one. Keyed by the
// declared wilaya and the operator's own French label. Extend as the operators drift; a
// label that resolves on its own never reaches this map.
const PINNED_OPERATOR_COMMUNE = new Map([
  // Mobilis writes commune 2130 Filfila as two words. Its own Arabic for these rows was
  // فلفلة, the registry's name for 2130, until the 2026-10-27 capture doubled it.
  ["21|fil fila", "2130"],
  // Mobilis writes commune 2129 Bin El Ouiden with Bir. Its own Arabic was بئر الويدان,
  // which matches that French; the 2026-10-27 capture replaced it with بئر العرش, the
  // registry's name for commune 1908 in wilaya 19.
  ["21|bir el ouiden", "2129"],
]);

/** The canonical commune a 5G record resolves to, or null. */
export function canonicalCommuneForSite(site) {
  const byCode = site.commune_code ? canonicalCommuneForCode(site.commune_code) : null;
  if (byCode) return byCode;
  const byLabel = canonicalCommuneForCurrentLabel(site.wilaya_code, site.commune, site.commune_ar);
  if (byLabel) return byLabel;
  const pinned = PINNED_OPERATOR_COMMUNE.get(
    `${site.wilaya_code}|${latinNameKey(site.commune ?? "")}`,
  );
  return pinned ? canonicalCommuneForCode(pinned) : null;
}

/** The Arabic commune label to publish for one 5G record. */
export function communeArForSite(site) {
  return canonicalCommuneForSite(site)?.name_ar ?? site.commune_ar ?? null;
}

/** Writer hook: one record with its Arabic commune label resolved. */
export const relabelCommuneAr = (row) => ({ ...row, commune_ar: communeArForSite(row) });
