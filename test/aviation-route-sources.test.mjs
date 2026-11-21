// Every route in @geoalgeria/aviation ships `sources`, its citation list, and
// `source` stays the primary citation: the same url as the first entry
// (ADR 0002). These are the invariants a consumer may rely on, proved against
// the shipped data in all three formats, because a citation that exists in the
// JSON and not in the CSV is a citation a reader cannot check.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "aviation", "data");
const routes = JSON.parse(readFileSync(join(DATA, "routes.json"), "utf-8"));

test("every route carries at least one citation", () => {
  const empty = routes.filter((r) => !Array.isArray(r.sources) || r.sources.length === 0);
  assert.deepEqual(empty.map((r) => r.id), [], "a route with no citation may not ship");
});

test("the first citation is the row's own `source`", () => {
  // The contract that lets `source` keep its meaning: a consumer reading one
  // citation and a consumer reading the list start from the same url.
  const disagree = routes.filter((r) => r.sources[0] !== r.source);
  assert.deepEqual(disagree.map((r) => r.id), []);
});

test("a citation is a plain url string, never an object", () => {
  // The shape, deliberately plain: a richer entry carrying a publisher, a
  // supports list and a publication date went out before the 2.9.0 release
  // (ADR 0002), so an object here is a regression, not an enrichment.
  const bad = [];
  for (const r of routes)
    for (const s of r.sources)
      if (typeof s !== "string") bad.push(`${r.id}: ${typeof s} ${JSON.stringify(s)}`);
  assert.deepEqual(bad, []);
});

test("every citation url is http(s)", () => {
  const bad = [];
  for (const r of routes)
    for (const s of r.sources)
      if (!/^https?:\/\/\S+$/.test(s ?? "")) bad.push(`${r.id}: ${JSON.stringify(s)}`);
  assert.deepEqual(bad, [], "a citation a reader cannot open is not a citation");
});

test("no route cites the same url twice", () => {
  const dupes = routes.filter((r) => new Set(r.sources).size !== r.sources.length);
  assert.deepEqual(dupes.map((r) => r.id), []);
});

test("the CSV mirror carries the list space-separated in one column", () => {
  const csv = readFileSync(join(DATA, "csv", "routes.csv"), "utf-8");
  const header = csv.split("\n")[0].split(",");
  assert.ok(header.includes("sources"), "the CSV has a sources column");
  assert.equal(header.indexOf("sources"), header.indexOf("source") + 1);
  // One row read back, to prove the documented format round-trips: a url carries
  // no space, so the cell splits cleanly on one.
  const row = routes.find((r) => r.sources.length > 1);
  assert.ok(csv.includes(row.sources.join(" ")), `${row.id}: its citation list is not in the CSV`);
});

test("the GeoJSON mirror carries the list in its properties", () => {
  const fc = JSON.parse(readFileSync(join(DATA, "geojson", "routes.geojson"), "utf-8"));
  assert.equal(fc.features.length, routes.length);
  const byId = new Map(routes.map((r) => [r.id, r]));
  const missing = fc.features.filter(
    (f) =>
      JSON.stringify(f.properties.sources) !== JSON.stringify(byId.get(f.properties.id)?.sources),
  );
  assert.deepEqual(missing.map((f) => f.properties.id), []);
});

test("the 24 October 2026 statement is cited on the ten legs it announces", () => {
  // Conakry, Brazzaville, Lagos, Shanghai and Tripoli at Mitiga, both
  // directions of each. It is an extra entry rather than the `source`, which
  // stays the report covering the fields each row ships, because the statement
  // carries no flight number and no day name. A leg that has since flown keeps
  // citing it: the promotion moves `source` to the report of the operation and
  // the announcement stays behind it, which is what the list is for.
  const url =
    "https://www.algerie360.com/air-algerie-nouvelles-destinations-conakry-shanghai-tripoli/";
  const cited = routes.filter((r) => r.sources.includes(url));
  assert.deepEqual(
    cited.map((r) => r.id).sort(),
    ["alg-bzv", "alg-cky", "alg-los", "alg-mji", "alg-pvg", "bzv-alg", "cky-alg", "los-alg", "mji-alg", "pvg-alg"],
  );
  for (const r of cited)
    assert.notEqual(r.source, url, `${r.id}: the statement is not the primary citation`);
});

test("the statement alone never takes a leg out of plannedRoutes()", () => {
  // The 2026-10-26 first-flight pass moved exactly two of the ten: ALG-CKY on
  // two Guinean reports of the inaugural landing, ALG-PVG on the inaugural
  // rotation's departure from Algiers. The 2026-10-28 re-check moved a third,
  // ALG-MJI, on the report of AH 4006 leaving Algiers for Mitiga. The 2026-10-30
  // pass moved the remaining six, each on its own flight's observed history
  // (collection-rules section 36). So all ten have now flown, and the invariant
  // the test guards is the one that outlives them: not one of them got here on
  // the statement. Each `source` below is a dated report or observation of the
  // leg actually operating, and the statement is behind it in every list.
  //
  // The map is exhaustive on purpose. A leg that cites the statement and is not
  // named here fails, so a future row cannot quietly arrive with the
  // announcement as its evidence.
  const flown = {
    "alg-cky":
      "https://www.africaguinee.com/transport-aerien-air-algerie-signe-son-grand-retour-en-guinee-apres-45-ans-dabsence/",
    "alg-pvg":
      "https://observalgerie.com/2026/10/26/voyage/air-algerie-inaugure-une-nouvelle-liaison-long-courrier",
    "alg-mji": "https://www.visa-algerie.com/air-algerie-de-retour-en-libye-dans-un-contexte-favorable/",
    "pvg-alg": "https://www.flightradar24.com/data/flights/ah3083",
    "cky-alg": "https://www.flightradar24.com/data/flights/ah5359",
    "mji-alg": "https://www.flightradar24.com/data/flights/ah4007",
    "alg-bzv": "https://www.flightradar24.com/data/flights/ah5390",
    "bzv-alg": "https://www.flightradar24.com/data/flights/ah5391",
    "alg-los": "https://www.flightradar24.com/data/flights/ah5354",
    "los-alg": "https://www.flightradar24.com/data/flights/ah5354",
  };
  const url =
    "https://www.algerie360.com/air-algerie-nouvelles-destinations-conakry-shanghai-tripoli/";
  for (const r of routes.filter((x) => x.sources.includes(url))) {
    assert.ok(r.id in flown, `${r.id}: cites the statement but no report of an operation`);
    assert.equal(r.planned, false, `${r.id}: it flew, so it is not planned`);
    assert.equal(r.source, flown[r.id], `${r.id}: cite the report of the operation first`);
  }
});

test("Delhi is planned both ways on the 19 Nov 2026 filing, against section 10", () => {
  // Owner decision of 2026-11-21 (collection-rules section 37). The 2026 filing
  // was withdrawn in September, and AeroRoutes' 19 Nov post reports a tentative
  // relaunch no earlier than 28 Mar 2027 with reservations still closed. That is
  // below section 10's bar, and the rows ship anyway, as `listed`: the post is
  // `source` because it is the current plan and the only page stating the flight
  // numbers and days, the ambassador's 7 Jul announcement follows it, and the
  // September withdrawal reports stay in the list so a reader sees them.
  const filing = "https://www.aeroroutes.com/eng/261119-ahns27del";
  const rest = [
    "https://algerie-eco.com/2026/07/09/air-algerie-un-vol-direct-alger-new-delhi-a-partir-de-fin-octobre-2026/",
    "https://www.aeroroutes.com/eng/260911-ahnw26del",
    "https://observalgerie.com/2026/09/12/voyage/air-algerie-retire-une-nouvelle-ligne-long-courrier-de-son-programme/",
    "https://www.algerie360.com/air-algerie-repousse-lancement-vol-direct-alger-delhi/",
  ];
  const want = {
    "alg-del": { flight: "AH 3104", days: ["tue", "thu", "sun"] },
    "del-alg": { flight: "AH 3105", days: ["mon", "wed", "fri"] },
  };
  for (const [id, { flight, days }] of Object.entries(want)) {
    const r = routes.find((x) => x.id === id);
    assert.ok(r, `${id} is missing`);
    assert.equal(r.planned, true, `${id}: nothing has flown, so it is planned`);
    assert.equal(r.carrier, "AH");
    assert.equal(r.status, "unclear");
    assert.equal(r.evidence, "listed", `${id}: a tentative filing with no bookings is not verified`);
    assert.equal(r.flight, flight);
    assert.deepEqual(r.days, days);
    assert.deepEqual(r.sources, [filing, ...rest]);
  }
});

test("Beirut does not cite the 20 Jun 2026 Delhi and Shanghai report", () => {
  // The Wikipedia table pins that report to its Beirut row, and it says nothing
  // about Beirut. The builder drops it there (MISCITED), so the suspension
  // notice is the row's only claim.
  const url =
    "https://algerie-eco.com/2026/06/20/air-algerie-prevoit-douvrir-des-vols-vers-delhi-et-shanghai-des-lhiver-prochain/";
  const bey = routes.find((r) => r.id === "alg-bey");
  assert.ok(bey.sources.length > 0);
  assert.ok(!bey.sources.includes(url), "alg-bey still cites the Delhi report");
});

test("the 2026-11-21 Flightradar24 pass ships each leg operating on its own history", () => {
  // Section 36: a dated Landed row in the flight's own history is first-flight
  // evidence. The history is `source`; whatever the row stood on before stays
  // behind it. Days are each leg's own observed nights, never mirrored.
  const fr24 = (n) => `https://www.flightradar24.com/data/flights/${n}`;
  const wiki = (a) => `https://en.wikipedia.org/wiki/${a}`;
  const want = {
    "alg-ndj": { flight: "AH 5370", days: ["wed", "sat"],
      sources: [fr24("ah5370"), "https://www.aeroroutes.com/eng/260622-ahnw267m8"] },
    "ndj-alg": { flight: "AH 5371", days: ["thu", "sun"], sources: [fr24("ah5371")] },
    "aae-jed": { flight: "AH 486", days: ["mon", "wed"], sources: [fr24("ah486")] },
    "alg-bod": { flight: "AH 1190", days: null, sources: [fr24("ah1190")] },
    // Both Strasbourg legs: the airport's announcement follows each history.
    // Its mon/thu was the launch schedule; the histories show tue/sat now.
    "alg-sxb": { flight: "AH 1452", days: ["tue", "sat"],
      sources: [fr24("ah1452"), "https://www.strasbourg.aeroport.fr/passagers/nouveau-alger-avec-air-algerie-2/"] },
    "sxb-alg": { flight: "AH 1453", days: ["tue", "sat"],
      sources: [fr24("ah1453"), "https://www.strasbourg.aeroport.fr/passagers/nouveau-alger-avec-air-algerie-2/"] },
    "czl-ist": { flight: "AH 3022", days: ["mon", "tue", "thu", "fri", "sat"],
      sources: [fr24("ah3022"), wiki("Mohamed_Boudiaf_International_Airport")] },
    "cfk-mrs": { flight: "AH 1136", days: ["wed", "sat"],
      sources: [fr24("ah1136"), wiki("Chlef_International_Airport")] },
    "qsf-ory": { flight: "AH 1108", days: ["tue", "sat", "sun"],
      sources: [fr24("ah1108"), wiki("Ain_Arnat_Airport")] },
    "qsf-cdg": { flight: "AH 1108", days: ["mon"], sources: [fr24("ah1108")] },
    "orn-cdg": { flight: "AH 1084", days: ["mon", "tue", "wed", "thu", "sat", "sun"],
      sources: [fr24("ah1084")] },
    "orn-lil": { flight: "AH 1078", days: ["mon", "wed", "sat"],
      sources: [fr24("ah1078"), wiki("Ahmed_Ben_Bella_Airport")] },
    "czl-nce": { flight: "AH 1198", days: ["mon", "thu", "sat"],
      sources: [fr24("ah1198"), wiki("Mohamed_Boudiaf_International_Airport")] },
  };
  for (const [id, { flight, days, sources }] of Object.entries(want)) {
    const r = routes.find((x) => x.id === id);
    assert.ok(r, `${id} is missing`);
    assert.equal(r.carrier, "AH");
    assert.equal(r.status, "active", id);
    assert.equal(r.evidence, "verified", id);
    assert.equal(r.planned, false, `${id}: it has flown, so it is not planned`);
    assert.equal(r.flight, flight, id);
    assert.deepEqual(r.days, days, id);
    assert.deepEqual(r.sources, sources, id);
  }
  // AH 486's Algiers to Jeddah sector of 21 Nov was only Scheduled, which is
  // not a Landed row, so it adds no `alg-jed`.
  assert.ok(!routes.some((r) => r.id === "alg-jed" && r.carrier === "AH"));
  // AH 5370 continues via N'Djamena, so it is no evidence for a nonstop
  // Addis Ababa leg, and alg-add keeps the listing it had.
  const add = routes.find((r) => r.id === "alg-add");
  assert.equal(add.evidence, "listed");
  assert.ok(!add.sources.some((u) => u.startsWith("https://www.flightradar24.com/")));
});
