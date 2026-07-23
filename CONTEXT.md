# GeoAlgeria Data

The shared glossary for the GeoAlgeria data monorepo, the open, install-don't-scrape dataset for Algeria. This file pins the project's canonical vocabulary; it is a glossary only, not a spec. Use these terms (and avoid the listed alternatives) in issue titles, ADRs, package descriptions, and code.

## Language

### Administrative divisions

**Wilaya**:
A first-level administrative division of Algeria (province). There are 69 as of April 2026 (up from 48), each identified by a number.
_Avoid_: province, governorate, state

**Daira**:
A second-level division that groups communes within a wilaya (district).
_Avoid_: district, sub-prefecture, arrondissement

**Commune**:
The smallest administrative unit (municipality); the level a postal code resolves to.
_Avoid_: municipality, baladiya, town

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

### Transport

**Station**:
A single point on a transport network, a train station, tram/metro stop, aerial-tramway/gondola station, or intercity bus station (gare routière). Mode-neutral.
_Avoid_: node, stop, halt
_Note_: the ferroviaire dataset currently ships these as `node`; that is a known divergence to reconcile toward this term.

**Line**:
A route on a transport network (bus, rail, tram).
_Avoid_: route, service

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
_Avoid_: fetched, scraped, synced

**Geometry confidence**:
How honest a coordinate is: `exact` (a real per-facility point → a Pin) vs `approximate` (a commune/wilaya centroid → a Dot) vs `null` (there is no coordinate at all → neither). Coarse-grained in `geo_precision`, which is null if and only if `lat`/`lng` are null; method detail (`osm_node`, `commune_centroid`) lives in `geo_method`, null on those same records because no method produced a point.
_Avoid_: accuracy, precision score
