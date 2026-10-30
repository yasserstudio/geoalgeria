// Every clause of the Protection Civile commune join, on fixtures.
//
// WHY FIXTURES AND NOT THE COUNTRY. test/protection-civile-commune-outline.test.mjs
// asserts the published rows, which is the regression ratchet. It cannot state a clause
// the current capture happens not to exercise (an outline overlap that crosses a wilaya
// line), and it cannot show that a clause fired for the reason claimed rather than
// because a later clause reached the same commune anyway. These fixtures are a handful
// of communes arranged so that for each clause exactly one answer is possible.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COMMUNE_JOIN_CLAUSES,
  NAME_EDIT_TOLERANCE,
  createCommuneJoin,
  editDistanceAtMost,
  nearestNameMatch,
  normAr,
} from "../scripts/lib/protection-civile-commune.mjs";

// --- fixtures -----------------------------------------------------------------
// A commune row in the shape the generator builds: folded Arabic name plus a centre.
const commune = (code_commune, wilaya_code, name_fr, name_ar, lat, lng) => ({
  code_commune,
  wilaya_code,
  name_fr,
  name_ar_norm: normAr(name_ar),
  lat,
  lng,
});

// Wilaya 16, Algiers: the registry spells Ben Aknoun with the alef the DGPC drops, and
// its neighbour Hydra is five edits away, so nothing is ambiguous within two.
const BEN_AKNOUN = commune(1622, "16", "Ben Aknoun", "ابن عكنون", 36.7589, 3.0101);
const HYDRA = commune(1628, "16", "Hydra", "حيدرة", 36.7447, 3.0328);
// Wilaya 33: In Amenas, one edit from the DGPC's "إن أميناس".
const IN_AMENAS = commune(3306, "33", "In Amenas", "إن أمناس", 28.0501, 9.6378);
const BORDJ_OMAR_DRISS = commune(3304, "33", "Bordj Omar Driss", "برج عمر إدريس", 28.1, 6.83);
// Two communes of wilaya 09 whose folded names are each one edit from "بليدة" (which
// folds to "بليده") and neither of them equal to it, so a tolerant match has a tie and
// must refuse rather than pick by file order.
const TIE_A = commune(901, "09", "Tie A", "بليد", 36.47, 2.83);
const TIE_B = commune(902, "09", "Tie B", "بليدي", 36.5, 2.9);

const communes = {
  byWilaya: new Map([
    ["16", [BEN_AKNOUN, HYDRA]],
    ["33", [IN_AMENAS, BORDJ_OMAR_DRISS]],
    ["09", [TIE_A, TIE_B]],
  ]),
};

const counters = () => Object.fromEntries(COMMUNE_JOIN_CLAUSES.map((k) => [k, 0]));
// A containment query stated per call, so each test says what geometry it is asking
// about instead of sharing one arrangement.
const joinWith = (hits, tooCoarse = () => false) =>
  createCommuneJoin({ containingCommunes: () => hits, tooCoarseToJoin: tooCoarse });

// --- the folded key and the distance -------------------------------------------
test("the folded key strips diacritics and folds the alef and ya variants", () => {
  assert.equal(normAr("إن أميناس"), "ان اميناس");
  assert.equal(normAr("بَنْ عكنون"), "بن عكنون");
  assert.equal(normAr(null), "");
});

test("editDistanceAtMost returns null rather than a distance it was not asked for", () => {
  assert.equal(editDistanceAtMost("ابن عكنون", "ابن عكنون", 2), 0);
  assert.equal(editDistanceAtMost("بن عكنون", "ابن عكنون", 2), 1);
  assert.equal(editDistanceAtMost("بن عكنون", "حيدرة", 2), null);
  // The length gap alone is enough to refuse, without filling the matrix.
  assert.equal(editDistanceAtMost("ا", "اااااااا", 2), null);
});

test("a tie inside the tolerance is refused, never broken by file order", () => {
  assert.equal(nearestNameMatch("بليدة", [TIE_A, TIE_B]), null);
  assert.equal(nearestNameMatch("", [BEN_AKNOUN]), null);
  assert.equal(nearestNameMatch("حيدرة", [BEN_AKNOUN, HYDRA]).code_commune, 1628);
});

// --- clause 1 and 2: the DGPC's own name ---------------------------------------
test("an exact folded name match wins, and geometry is not consulted", () => {
  const stats = counters();
  const join = joinWith([{ code_commune: 1628 }]);
  const hit = join("ابن عكنون", "16", 3.0101, 36.7589, communes, stats);
  assert.equal(hit.code_commune, 1622);
  assert.deepEqual(stats, { ...counters(), commune_name: 1 });
});

test("a name within two edits of exactly one commune of the wilaya wins over the outline", () => {
  for (const c of [
    { id: "16-048", commune1: "بن عكنون", wilaya: "16", lng: 3.010066, lat: 36.758895, expect: 1622, outline: 1628 },
    { id: "33-007", commune1: "إن أميناس", wilaya: "33", lng: 9.637, lat: 28.05, expect: 3306, outline: 3304 },
  ]) {
    const stats = counters();
    const join = joinWith([{ code_commune: c.outline }]);
    const hit = join(c.commune1, c.wilaya, c.lng, c.lat, communes, stats);
    assert.equal(hit.code_commune, c.expect, `${c.id}: the DGPC's own name is one edit from ${c.expect}`);
    assert.equal(stats.commune_name_near, 1, `${c.id}: decided by the tolerant name match`);
    assert.equal(stats.commune_outline, 0, `${c.id}: the outline must not overrule the source`);
  }
});

test("a name no commune of the wilaya is within two edits of falls through to the outline", () => {
  const stats = counters();
  const join = joinWith([{ code_commune: 1628 }]);
  const hit = join("مدينة لا توجد", "16", 3.03, 36.74, communes, stats);
  assert.equal(hit.code_commune, 1628);
  assert.deepEqual(stats, { ...counters(), commune_outline: 1 });
});

test("a tie inside the tolerance falls through to the outline rather than guessing", () => {
  const stats = counters();
  const join = joinWith([{ code_commune: 902 }]);
  const hit = join("بليدة", "09", 2.9, 36.5, communes, stats);
  assert.equal(hit.code_commune, 902);
  assert.equal(stats.commune_name_near, 0);
  assert.equal(stats.commune_outline, 1);
});

test("the tolerance is two edits, and three is not within it", () => {
  assert.equal(NAME_EDIT_TOLERANCE, 2);
  const stats = counters();
  // "حي" is three edits from Hydra's folded "حيدره" and far from Ben Aknoun, so
  // neither is inside the window and the outline decides. Two edits ("حيد") would
  // have reached Hydra.
  assert.equal(editDistanceAtMost("حي", normAr("حيدرة"), 3), 3);
  const join = joinWith([{ code_commune: 1622 }]);
  assert.equal(join("حي", "16", 3.01, 36.75, communes, stats).code_commune, 1622);
  assert.equal(stats.commune_name_near, 0);
});

// --- clause 4: containment is global, the wilaya filters it ---------------------
test("an outline overlap that crosses a wilaya line keeps the in-wilaya commune", () => {
  const stats = counters();
  // OpenStreetMap outlines overlap where a split has not been caught up with. The
  // lowest containing code nationwide is 1622, in wilaya 16; this unit's wilaya is 33.
  // Taking the lowest code and then checking it would discard 3306 and fall to a
  // centre 300 km away.
  const join = joinWith([{ code_commune: 1622 }, { code_commune: 3306 }]);
  const hit = join(null, "33", 9.637, 28.05, communes, stats);
  assert.equal(hit.code_commune, 3306, "the first containing outline OF THE WILAYA decides");
  assert.deepEqual(stats, { ...counters(), commune_outline: 1 });
});

test("containing outlines are offered in order, and the lowest in-wilaya code wins", () => {
  const stats = counters();
  const join = joinWith([{ code_commune: 1622 }, { code_commune: 1628 }]);
  assert.equal(join(null, "16", 3.02, 36.75, communes, stats).code_commune, 1622);
});

test("no containing outline of the wilaya falls through to the nearest centre", () => {
  const stats = counters();
  const join = joinWith([{ code_commune: 3306 }]);
  const hit = join(null, "16", 3.0328, 36.7447, communes, stats);
  assert.equal(hit.code_commune, 1628, "Hydra's centre is the nearest of wilaya 16");
  assert.deepEqual(stats, { ...counters(), commune_centroid: 1 });
});

// --- clause 3: the coarse-coordinate guard -------------------------------------
test("a coordinate too coarse to join on never reaches the outline", () => {
  const stats = counters();
  const hits = [{ code_commune: 1622 }];
  let asked = 0;
  const join = createCommuneJoin({
    containingCommunes: () => { asked++; return hits; },
    tooCoarseToJoin: () => true,
  });
  const hit = join(null, "16", 3, 37, communes, stats);
  assert.equal(asked, 0, "the containment query is not even run on a placeholder point");
  assert.equal(stats.commune_outline, 0);
  assert.equal(stats.commune_centroid, 1);
  assert.ok(hit, "it still falls back to a centre rather than publishing no commune");
});

test("the real guard is the repository's own MIN_EXACT_DECIMALS rule", async () => {
  const { isTooCoarseToJoin } = await import("../scripts/lib/commune-resolver.mjs");
  const stats = counters();
  let asked = 0;
  const join = createCommuneJoin({ containingCommunes: () => { asked++; return []; } });
  join(null, "16", 3, 37, communes, stats);
  assert.ok(isTooCoarseToJoin(37, 3), "a whole-degree pair is too coarse by the shared rule");
  assert.equal(asked, 0, "the default guard is the shared one, not a permanently open door");
});

// --- the join reads only the sources ---------------------------------------------
test("the join takes no published record, so its answer cannot depend on its last answer", () => {
  const stats = counters();
  const join = joinWith([{ code_commune: 1628 }]);
  // Six arguments and no seventh: there is nowhere to pass the package's own output.
  assert.equal(join.length, 6);
  // Called twice with the same inputs it answers the same thing, whatever was published
  // in between.
  const first = join("بن عكنون", "16", 3.00313, 36.7453, communes, stats);
  const second = join("بن عكنون", "16", 3.00313, 36.7453, communes, counters());
  assert.equal(first.code_commune, 1622);
  assert.equal(second.code_commune, 1622);
});

test("23-017's own inputs answer Oued El Aneb, the value its ledger row expects", () => {
  // The decision to publish El Bouni is a frozen row in
  // quality/overrides/protection-civile.json, not a clause here. This pins what the rule
  // produces so that row's `expect` stays honest; the pair is asserted end to end in
  // test/protection-civile-commune-outline.test.mjs.
  const OUED_EL_ANEB = commune(2306, "23", "Oued El Aneb", "واد العنب", 36.9, 7.55);
  const EL_BOUNI = commune(2305, "23", "El Bouni", "البوني", 36.84, 7.71);
  const w23 = { byWilaya: new Map([["23", [EL_BOUNI, OUED_EL_ANEB]]]) };
  const stats = counters();
  // El Bouni's outline contains the point; the DGPC's name is one edit from Oued El Aneb.
  const join = joinWith([{ code_commune: 2305 }]);
  const hit = join("وادي العنب", "23", 7.60981, 36.8269, w23, stats);
  assert.equal(hit.code_commune, 2306, "the source's own name decides, so the rule says 2306");
  assert.equal(stats.commune_name_near, 1);
  assert.equal(stats.commune_outline, 0);
});

// --- a wilaya with no communes --------------------------------------------------
test("a wilaya the commune set does not know yields no commune at all", () => {
  const stats = counters();
  const join = joinWith([{ code_commune: 1622 }]);
  assert.equal(join("ابن عكنون", "99", 3.01, 36.75, communes, stats), null);
  assert.deepEqual(stats, counters());
});
