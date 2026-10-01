# GeoAlgeria Data

The shared glossary for the GeoAlgeria data monorepo, the open, install-don't-scrape dataset for Algeria. This file pins the project's canonical vocabulary; it is a glossary only, not a spec. Use these terms (and avoid the listed alternatives) in issue titles, ADRs, package descriptions, and code.

## Language

### Administrative divisions

**Wilaya**:
A first-level administrative division of Algeria (province). There are 69 as of April 2026 (up from 48), each identified by a number.
_Avoid_: province, governorate, state

**Daira**:
A second-level division that groups communes within a wilaya (district). Named
after its seat commune, and identified by a stable id that is never reused: a
daira that stops existing leaves its id in `packages/dataset/data/retired-ids.json`,
while one that is renamed or reseated on another of its communes keeps its id,
because the id belongs to the body of communes and not to the seat.
Membership for wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and 59 to 69 comes
from executive decree 26-253 (JORA n 52, 21 July 2026); the other 48 wilayas
keep their decree 91-306 lists, so the national total is the dataset's count,
never stated as official.
_Avoid_: district, sub-prefecture, arrondissement

**Commune**:
The smallest administrative unit (municipality); the level a postal code resolves to.
_Avoid_: municipality, baladiya, town

**Capital**:
The Commune that is a Wilaya's seat, published as `capital_commune_code`, the `code_commune` of that Commune, so it joins the Commune record instead of duplicating its names. Fixed by the decrees that name the chefs-lieux of the wilayas (décret n° 84-79 of 3 April 1984 for 1-48, décret présidentiel n° 21-117 of 22 March 2021 for 49-58, décret présidentiel n° 26-206 of 25 May 2026 for 59-69), never read off the Wilaya's own name: wilaya 16's Capital is Alger Centre, and wilayas 53, 54 and 57 spell theirs differently from the Wilaya. A Wilaya's own `latitude`/`longitude` **is** its Capital's centre, the same value and not a second reading of it, so there is one point per Capital (rule 9 of `docs/adr/0001-coordinate-review-by-independent-votes.md`). Renders FR **chef-lieu**, AR **مقر الولاية**.
_Avoid_: seat, capital city, main city, principal town, admin centre

**Creation year**:
The year a Wilaya became official, that is the year the law creating it took effect, published as `created`. The 48 founded by Law 84-09 (1984) read `original`, or `1984` where the field is a number; wilayas 49-58 read `2019` (Law 19-12); wilayas 59-69 read `2026` (Law n° 26-06, *JO* n° 25 of 5 April 2026). Never the year a reform was announced: the 59-69 reform was announced on 2025-11-16 and its Creation year is still 2026.
_Avoid_: founded, established, announced year, reform year

**Former name**:
A spelling a Wilaya or Commune carried before a sourced correction; it still resolves to that record but is never shown as its current name.
_Avoid_: alias, old name, legacy name

**Postal code**:
The Algérie Poste code identifying a commune; resolves upward to its daira and wilaya.
_Avoid_: ZIP, zipcode, code postal

### Data organization

**Sector**:
A top-level subject area of Algeria data, one per `@geoalgeria/*` package (health, transport, telecom, culture, agriculture…). Umbrella packages (transport, pharma) group several related sectors.
_Avoid_: domain, category, vertical

### Entities

**Establishment**:
A single physical premises operated by an institution or ministry, a hospital, youth center, university campus, post office, training center. Maps to établissement / مؤسسة.
_Avoid_: facility, center, site

### Sector operators

No single umbrella term, the operator of a sector is named per its nature:

**Operator**:
The organization running a telecom or transport network (Djezzy, Mobilis, Ooredoo; SNTF, ETUSA, SETRAM).
_Avoid_: provider, carrier, company

**Carrier**:
A delivery company in the livraison sector; operates stop-desks.
_Avoid_: operator, courier, shipper

**Institution**:
A licensed bank or financial body in the banques sector.
_Avoid_: operator, provider

**Ministry**:
The government department that operates a public sector's establishments (Health; Youth & Sports; Culture; Agriculture; Higher Education; Vocational Training; Pharmaceutical Industry).
_Avoid_: department, government body

### Service points

No single umbrella term, the customer-facing point is named per its sector:

**Office**:
A post office in the poste sector (Algérie Poste).
_Avoid_: bureau, branch, agency

**ATM**:
An Algérie Poste self-service cash machine in the poste sector. Displayed in French as “GAB”.
_Avoid_: cash machine, distributor, cashpoint

**Agency**:
A customer-facing branch of ANEM (emploi, AWEM at wilaya level, ALEM at local level) or of Mobilis.
_Avoid_: office, branch

**Branch**:
A retail branch of a licensed bank in the banques sector.
_Avoid_: agency, office, subsidiary

**Store**:
A telecom operator's own retail shop (Djezzy, Ooredoo). Canonical over "boutique".
_Avoid_: boutique, shop, outlet

**Stop-desk**:
A carrier's pickup/drop-off point in the livraison sector.
_Avoid_: relay point, pickup point, locker

**Point of sale**:
A third-party resale partner approved by an operator (e.g. Mobilis approved points of sale), distinct from the operator's own agencies or stores.
_Avoid_: reseller, POS, retailer

**Unit**:
A Protection Civile (civil protection / fire & rescue) facility in the protection-civile sector, an operational site of the DGPC, of some `statut` tier (unité principale/secondaire, poste avancé, unité marine, …). Renders "unité de la protection civile".
_Avoid_: station, fire station, barracks, caserne

**Care facility**:
A clinic or proximity-care place in the cliniques sector (polyclinique, salle de soins, centre de santé, maternité, clinique), the OSM community tier of health. Distinct from the registry-tier **Health establishment** of the sante sector (CHU/EPH/EHS/EPSP), which this sector excludes, along with every OSM element a sante hospital-tier record (CHU/EPH/EHS) references; elements a sante EPSP record references stay, because there the reference is a geocoding anchor on the entity's seat and the element is one of the facilities it runs. The two tiers are never summed.
_Avoid_: health centre (ambiguous with the `centre_sante` type), infirmary, medical office

### Transport

**Station**:
A single point on a transport network, a train station, tram/metro stop, aerial-tramway/gondola station, or intercity bus station (gare routière). Mode-neutral.
_Avoid_: node, stop, halt
_Note_: the ferroviaire dataset currently ships these as `node`; that is a known divergence to reconcile toward this term.

**Line**:
A named service on a **ground** transport network (bus, rail, tram), running over many Stations.
_Avoid_: route, service
_Note_: "route" is reserved for aviation, below. A Line is a service with many stops; a Route is one nonstop leg between two airports. The `_Avoid_` above is scoped to ground transport and does not apply to `@geoalgeria/aviation`.

**Direction**:
One directional realization of a ground-transport Line. In `@geoalgeria/buses`, each Direction preserves one source OSM relation and its `from`/`to`/`via` labels; those labels do not by themselves establish passenger termini.
_Avoid_: route, trip, branch

**Membership**:
The link placing one Station member in one Direction at its raw source relation-member index. A Membership may repeat the same Station and preserves the source role. `osm_member_order_unvalidated` means source order is retained but has not been validated as passenger stop order.
_Avoid_: stop sequence, call, terminus

**Route**:
One **directional** nonstop leg between two airports, as shipped by `@geoalgeria/aviation`'s `routes()`. Direction is data, not presentation: `ALG->BUD` flies nonstop on Saturdays and `BUD->ALG` on Wednesdays, and there is never a same-day nonstop round trip, so they are two records and neither implies the other. A Route that is announced but not yet operating is a **Planned route**, in a separate collection reached by `plannedRoutes()`, never a `status` value.
_Avoid_: flight, line, connection, city pair
_Translations_: FR **liaison** (not "ligne", which is the ground-transport term above); AR **خط جوي** (qualified with جوي, so it cannot be read as a ground خط).

**Evidence tier**:
How strongly one Route is established: `verified` (the operator was confirmed as *operating* the leg, with direction and a great-circle duration check) or `listed` (a published source lists the carrier serving the pair, which claims *service* rather than operation). A per-record field, distinct from **Evidence type**, which describes the authority of a Source.
_Avoid_: confidence, quality, certainty, evidence level

### Telecom

**Coverage point**:
A single geocoded location where an operator provides mobile coverage of a given technology (e.g. 5G), taken from that operator's own coverage map.
_Avoid_: cell, site, tower, antenna

**Technology**:
The mobile-network generation of a coverage point (2G/3G/4G/5G).
_Avoid_: generation, network type, standard

### Pharmaceutical

**Manufacturer**:
An approved maker of medicines (PP) or medical devices (DM) in the industrie-pharmaceutique sector.
_Avoid_: producer, factory, plant

**Pharmacy**:
A retail pharmacy dispensing to the public in the pharmacies sector. Maps to officine.
_Avoid_: officine, drugstore, chemist

### Record attributes

**Bilingual**:
Carrying both a French (`Fr`) and an Arabic (`Ar`) name for a record.
_Avoid_: multilingual, translated, i18n

**Geocoded**:
Carrying real `lat`/`lng` coordinates for a record (as opposed to density-only or wilaya-linked-only).
_Avoid_: located, mapped, positioned

### Search and normalization

**Search key**:
The umbrella term for a folded form of a name, produced by the shared normalization package and matched against instead of the display name. Always qualified as a **Conservative key** or a **Loose key**; unqualified "search key" names the concept, never one of the two.
_Avoid_: slug (that is a URL identity), normalized name, canonical name, search string

**Conservative key**:
The strict fold every consumer must reproduce byte for byte: presentation forms, alef and hamza variants, tatweel, combining marks, Arabic-Indic digits and case are all resolved, word boundaries are preserved, and nothing that changes which letter a reader sees is folded away. A published catalog's keys are this fold, so a change to it is a major version.
_Avoid_: strict key, exact key, base key

**Loose key**:
The additional equivalence tier over the Conservative key, folding the pairs a speaker may spell either way (alef maqsura with yaa, taa marbuta with haa). It exists so a loose hit can be ranked below an exact one instead of being indistinguishable from it.
_Avoid_: fuzzy key, relaxed key, approximate key

**Rule**:
One reviewed fold or alias in the normalization package's frozen table, carrying an id (`ar.taa-marbuta-haa`), its class, the script it applies to, one sentence a speaker can argue with, and a review record. A Rule states something about the script and is safe for every name; a statement about one record is that record's own alias, carrying its own Source, not a Rule.
_Avoid_: mapping, transform, substitution

**Golden corpus**:
The exported fixture of cases every consumer asserts against, so the package, the release generator, Web and Mobile all prove the same keys from the same inputs. Every Rule is exercised by at least one case, and every case declares which Rule it proves.
_Avoid_: test fixtures, sample data, test corpus

**Match class**:
What a query and a name amount to, decided from the keys and their tokens alone: `exact`, `prefix`, `loose` or `none`. It stops short of ranking, which is private to the products, so a Match class says what the keys agree on and never which result comes first. The Golden corpus publishes the classes as `matchCases`, and every consumer proves its own classifier against them.
_Avoid_: match type, match quality, relevance, tier (a tier is a ranking, not a class)

### Provenance

**Source**:
The authoritative origin of a record or dataset (e.g. JORA, ONS, Algérie Poste, OpenStreetMap, Wikidata). Every record must be sourced. A record's `source` keys into `metadata.sources[]`; the first key is the authoritative "this exists" source, later keys (`msp+osm`) are geocoding aids.
_Avoid_: provenance, origin, reference

**Evidence type**:
How a source establishes its records, `official` (a government register or first-party operator feed), `crowdsourced` (community maps: OSM, Wikidata), or `derived` (computed). Declared per source (`SourceRef.evidence_type`), inferred from the source key via `evidenceForSourceKey`.
_Avoid_: verification, confidence (that's geometry), trust

**Lifecycle**:
A facility/asset's operational status, `operating`, `planned`, `closed`, or `unknown`. Optional per record (`GeoRecord.lifecycle`); absent means unknown.
_Avoid_: status, state, active/inactive

**Retrieved**:
The ISO date a source was last pulled (`SourceRef.retrieved`), distinct from `metadata.updated` (when the dataset was regenerated). Together they answer "is this stale because the source didn't change, or because we didn't re-pull?".
For hash-only scheduled checks that deliberately avoid date-only commits, `retrieved` remains the date of the canonical payload capture; the newer no-change check is recorded by the successful scheduled workflow run.
_Avoid_: fetched, scraped, synced

**Geometry confidence**:
How honest a coordinate is: `exact` (a real per-facility point → a Pin) vs `approximate` (a commune/wilaya centroid → a Dot) vs `null` (there is no coordinate at all → neither). Coarse-grained in `geo_precision`, which is null if and only if `lat`/`lng` are null; method detail (`osm_node`, `commune_centroid`) lives in `geo_method`, null on those same records because no method produced a point.
_Avoid_: accuracy, precision score

### Coordinate review

**Claim**:
One source's statement of where a place is, with its source, licence and snapshot date (the OSM seat, the Wikidata coordinate, the record median, a Google verdict, an Owner reading). See ADR 0001.
_Avoid_: evidence, reading, observation

**Candidate**:
A point a place's coordinate could be set to: the published point, the OSM seat, the Wikidata point or the record median. A Claim never votes for the Candidate it produced.
_Avoid_: option, proposal, suggestion

**Vote**:
A Claim that lands within the agreement radius of a Candidate (2 km for a commune centre) and is not a Copied claim.
_Avoid_: match, hit, support score

**Copied claim**:
A Claim within 50 m of the point it would vote for, because that point was copied from it. It proves nothing and casts no Vote. Two Claims within 50 m of **each other** are copies in the same sense, whichever way the copying went, so they cast one Vote between them and not two; the ledger records the silenced one under `not_independent` as a `copy_of` the one that stands.
_Avoid_: duplicate, echo, reading (a Claim is a Claim)

**Consensus**:
At least two independent Votes for one Candidate, none for another, and the Candidate inside the commune outline. **Strong consensus** (three Votes, or two with the record median among them) is the tier that fixes data without the Owner.
_Avoid_: confidence score (there is no score, only Votes), ground truth, verified (an Owner reading is recorded as `owner_confirmation` of an open Candidate)

**Review queue**:
The places the engine leaves for the Owner: plain consensus, no consensus, or a move over 25 km.
_Avoid_: backlog, inbox, todo list
