# @geoalgeria/cliniques: sources (clinics & proximity-care facilities)

> **Canonical package:** `@geoalgeria/cliniques` (domain-named, per `.agents/NAMING.md`).
> **Source:** OpenStreetMap, credited in `metadata.sources` + README, discoverable via
> **keywords** (`clinics`, `cliniques`, `polyclinique`, `sante`, `healthcare`).

The health sector has two disjoint tiers, and this package is the second one:

- **registry tier** (`@geoalgeria/sante`): 695 public establishments (CHU, EPH,
  EHS, EPSP) from the Ministry of Health. Official, closed, enumerable.
- **community tier** (this package): the proximity structures and private
  clinics that no open register lists. OSM is the only path to them.

The tiers describe different populations of place and must never be summed. The
generator enforces the split at classification time: every record that reads as a
registry establishment is excluded with a logged count.

## Source: OpenStreetMap (Overpass), sole source

Public, unauthenticated Overpass API. Query (see `packages/cliniques/scripts/fetch.mjs`):

```
[out:json][timeout:300];
area["ISO3166-1"="DZ"][admin_level=2]->.dz;
(
  node["amenity"="clinic"](area.dz);       way["amenity"="clinic"](area.dz);       relation["amenity"="clinic"](area.dz);
  node["healthcare"="clinic"](area.dz);    way["healthcare"="clinic"](area.dz);    relation["healthcare"="clinic"](area.dz);
  node["healthcare"="centre"](area.dz);    way["healthcare"="centre"](area.dz);    relation["healthcare"="centre"](area.dz);
  node["amenity"="hospital"](area.dz);     way["amenity"="hospital"](area.dz);     relation["amenity"="hospital"](area.dz);
  node["healthcare"="hospital"](area.dz);  way["healthcare"="hospital"](area.dz);  relation["healthcare"="hospital"](area.dz);
);
out center tags;
```

`amenity=doctors` is deliberately **not** queried: that is the private-practice
cabinet universe, out of scope.

**Why hospitals are queried but never shipped.** Algerian mappers routinely file
a polyclinique or a salle de soins under `amenity=hospital` and name it مستشفى.
The hospital selectors are the only way to reach those clinic-class records; the
actual hospitals are then dropped by the classifier. An element matching several
selectors comes back once per match, so the pull is de-duplicated by osm type/id
before anything else.

Live sizing (2026-08-08): **2,936** elements (1,424 node / 1,501 way / 11
relation), `timestamp_osm_base` **2026-08-08T15:00:36Z**, mirror `overpass-api.de`
(first attempt 504'd, second succeeded). Sanity floor `OSM_MIN` = 2000; a mirror
returning less is treated as partial and the next one is tried. The raw pull is
captured to `sources/cliniques/osm.json` at build time (committed, per
`sources/README.md`; offline rebuild via `npm run fetch -- --cache`).

## Method

0. **Registry-overlap guard, before any name is read.** @geoalgeria/sante
   references 121 OSM elements by id (`refs.osm`, all `geo_method: osm_point`).
   An element in that set IS a registry record already published there, whatever
   it calls itself here, so it is excluded as `sante_overlap`. This is the only
   exclusion in the pipeline that no unusual name can defeat, and it is what
   makes the disjointness claim mechanical rather than a hope: 120 of the 121
   appear in this pull and all 120 are dropped. It is deliberately narrow, and
   the README says so: sante's other 574 records carry no OSM reference, so the
   same physical establishment can still appear in both packages under different
   coordinates, with nothing able to detect it.
1. **Classification** over the normalized FR+AR name (Latin accents folded,
   Arabic hamza/alef/harakat folded), in this order:
   1. `chu` excludes unconditionally.
   2. out of scope whoever owns them: `paramedical` (école paramédicale),
      `pharmacie` (belongs to @geoalgeria/pharmacies), `institut_pasteur`,
      `cabinet` (the literal word), `hospital_subfeature` (an entrance, a ward,
      "Service de radiologie", "bloc opératoire", a bare "urgences"), and
      `cabinet` again for practices named only for their practitioner
      ("Dr X Dentiste", الطبيب …).
   3. an explicitly **private** establishment is KEPT, before any registry
      pattern runs.
   4. the named registry tiers exclude: `EPH` written `\be\.?p\.?h\.?p?\b` so
      "E.P.H" and "EPHP" are caught too, `EHS`, `EHU`, and the centres
      anti-cancer, which are EHS by statute however they name themselves.
   5. the facility types match: `polyclinique` → `salle_de_soins` →
      `centre_sante`, then the weaker bare word "clinique"/عيادة/مصحة.
   6. the **bare** word hôpital/hospital/مستشفى, plus the folded Arabic stem
      `استشفاي` (الاستشفائية/الاستشفائي, the Arabic name of the same EPH/EHS
      establishments) and the live typo `hoplital`, then excludes.
   7. `maternite`, then the EPSP administrative entity, then `clinique`.

   Three orderings carry the weight, and each exists because of real records:

   - **Steps 5 and 6 are split.** The bare hospital word is used colloquially for
     proximity structures, and 10 records name themselves both ways (e.g.
     `way/414758997` "Polyclinique des consultations spécialisées Boudghène" with
     `name:ar=مستشفى بودغن`; `node/4449247890` "المستشفى الجواري متعدد الخدمات"
     with `name:fr=Polyclinique`). An explicit facility word settles what the
     place is. Conversely a mother-child hospital (مستشفى الأمومة والتوليد)
     carries no facility word, so step 6 still drops it before `maternite` can
     claim it.
   - **Step 3 runs before step 4.** An "EHP" (établissement hospitalier privé) is
     a *clinique privée*, exactly this package's population, and must never be
     read as an "EPH" (public). 5 records come in this way:
     `node/13337090629` (EHP Hasnaoui), `way/981696649` (المؤسسة الاستشفائية
     الخاصة عبير الكوثر), `way/783039982` (les Amandiers), `way/186941040`
     (Hôpital privé), `node/4772483821` (المؤسسة الاستشفائية الخاصة البسمة).
   - **The EPSP entity check is last**, so a facility that merely names its parent
     EPSP ("Polyclinique EPSP", "قاعة العلاج الخلوفي جيلالي (EPSP)") keeps its
     own type.

   The practitioner and sub-feature patterns are guarded: they only fire when no
   facility word is present, so "Polyclinique Dr Benali dentaire" and "Urgences
   médicales El Achour" survive, and the practitioner pattern additionally skips
   anything carrying the hospital word so "Hôpital Docteur Benzarjeb" is filed as
   a hospital rather than as a doctor's practice.
2. **Sector**: `public` from `operator:type` (including `university`: an EHU is a
   public teaching operator), or structurally for `polyclinique`/`salle_de_soins`
   (public structures by definition in the Algerian system); `private` from
   `operator:type=private` or a privé/خاصة name, read over the **full** name
   haystack because a record can carry its only ownership signal in `name:en`
   ("Hasnaoui Private Hospital"). The phrase الاحتياجات الخاصة (special needs) is
   stripped first: it contains the ownership word خاص and says nothing about
   ownership (`37-00005`). `مصحة` is checked **last** and only as a fallback,
   because it is also just the word for "clinic" and appears in public names
   (المصحة الجوارية المتعددة الخدمات). Otherwise `null`: most cliniques are
   private in practice, but the map does not say so.
3. **Enrichment**: `speciality` (`healthcare:speciality`, 158), `address` from
   `addr:*` (634), `phone` (106), `opening_hours` (166), `emergency` (`true` on
   the 68 tagged `emergency=yes`, never `false`). Names are strictly
   script-routed (name_ar always Arabic, name_fr always Latin).
4. **De-dup**: the same facility mapped as both a node and a building outline is
   collapsed (identical name within ~40 m, then an exact-coordinate pass).
5. **Admin linkage**: OSM carries no Algerian codes, so linkage uses the shared
   boundary-safe `attachCommune` from `scripts/lib/build-utils.mjs`: `wilaya_code`
   by point-in-polygon against the 69 wilaya boundaries, then `commune`/
   `commune_code` as the nearest centroid **within that wilaya**. The join cannot
   cross a wilaya boundary.

## First build, 2026-08-08

- **2,936** elements pulled → **990** excluded → 1,946 classified in → **1,880**
  after de-dup (66 same-name-within-40m, 0 exact-coincident).
- Excluded: `hopital` 359, `unnamed_hospital` 239, `sante_overlap` 120,
  `cabinet` 96, `epsp_entity` 92, `hospital_subfeature` 58, `chu` 15,
  `pharmacie` 6, `institut_pasteur` 3, `paramedical` 2.
- Types: `clinique` 1,098 · `polyclinique` 411 · `salle_de_soins` 206 ·
  `centre_sante` 137 · `maternite` 28.
- Sector: 629 public, 67 private, 1,184 unasserted.
- 1,604 named / 276 unnamed; 66 wilayas (54 In Guezzam, 62 Bir El Ater and
  63 El Aricha have no mapped facility).
- Precision: 1,059 exact (surveyed node) / 821 approximate (building centroid).

## Coverage framing

No coverage percentage is published, and `estimatedUniverse` is `null` on
purpose. The Ministry of Health's published counts describe the registry tier
this package excludes, and no public register enumerates private clinics or the
proximity structures at facility level. Dividing by either would produce a
number that does not describe these records. The README says so in all three
locales instead of inventing a denominator.

## Next (roadmap)

The `clinique` residual (1,098) still mixes genuinely different things: private
clinics, dialysis and imaging centres, medical laboratories, school-health units.
A sub-type pass would need either richer `healthcare:speciality` tagging upstream
or a reviewed list. Coverage growth depends on OSM contributions; the wilayas at
zero are the obvious first target.
