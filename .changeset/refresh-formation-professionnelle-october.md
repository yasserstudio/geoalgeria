---
"@geoalgeria/formation-professionnelle": minor
---

Refresh formation-professionnelle from takwin.dz, retrieved 2026-10-25: 1,963 establishments from 1,932, and 1,961 geocoded from 1,921.

The June capture needed 59 calls, one per training directorate, and the portal had answered every non-browser client with a WAF block page since. This one ran over an Algerian connection, where a single call to the bare `puball` endpoint returns the whole network. 33 establishments are new and 2 the portal no longer lists under the accreditation they held.

**Far more real coordinates.** The portal had left one or both axes at its sentinel zero for 557 records in June; it now publishes a point for most of them. 1,681 establishments sit on takwin.dz's own point (1,362 before), so the commune-centroid placements drop to 249 from 511 and the wilaya-centroid ones to 31 from 35. Only 2 records are left unplaced, down from 11. The new points are the portal's own, shipped `exact` / `takwin` exactly as the old ones were, except for 15 the number itself disproves (too few decimals, or whole arcminutes with the seconds dropped), which read `approximate`.

**Ids follow the ministry's own accreditation code.** The portal rewrote 1,788 Arabic names, correcting the spacing it had run together, adding ` - ` separators, fixing typos, and relisting eight establishments under a brand instead of an owner's name. None of them moved. The id carry key is the MFEP accreditation code plus the establishment type, so none of that touches an id: 1,930 of the 1,932 published records keep the id they shipped under, including all 1,769 whose name changed only in spacing and the 17 whose name was rewritten further.

**Two retirements, both reserved for good in `data/retired-ids.json`.** Code 3907A1, an annexe CFPA in Nakhla, is absent from the capture, so `01624` is retired. Accreditation 15634 in Tizi Ouzou changed hands: June listed Asirem School, with its own phone, email, Facebook page, address, capacity, surface and a curriculum of sewing, hairdressing and childcare assistance; October lists High Fly School with a different name in both languages, a different email, and none of the rest. Nothing the portal publishes connects the two, so `00591` is retired rather than carried onto a different business, and High Fly School ships as a new record. The decision and its evidence are recorded in the fetcher's reviewed carry-key exceptions.

33 new ids, `01933` to `01965`, minted above every id the package has ever used so that no new establishment lands in a published or retired slot. Every id stays the flat 5-digit string the types and the README document.

**Type mix.** CFPA 857 (856), private accredited centers 754 (723), annexe CFPA 69 (70); INSFP, DFEP, IEP, IFEP, INFEP and the other annexes unchanged.
