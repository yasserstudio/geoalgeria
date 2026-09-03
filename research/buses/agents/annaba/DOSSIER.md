# Annaba - ETUS Annaba bus network research dossier

Wilaya 23. Operator `etus-annaba` in
[`operator-registry.json`](../../operator-registry.json).
Research date **2026-09-03**. Web search and fetch only; no live vehicle or
position endpoint was called, no token was used.

## Findings

- **[seen]** **No line list was found, from any source, in any language.** Not one
  Annaba bus line number or terminus pair could be attributed to ETUS Annaba. This
  dossier's `lines.json` is deliberately an empty array.
- **[seen]** ETUS Annaba has **no website**. `etus23.dz` does not resolve, although
  the analogous `etus22.dz/CF/Horaires.php` serves a real line-and-times page for
  Sidi Bel Abbès. Searches surface no other domain.
- **[seen]** The operator Facebook page (id **100063517660926**) is confirmed to
  exist and to carry the name الشركة الوطنية للنقل الحضري و الشبه الحضري عنابة /
  ETUS Annaba, but is **login-walled** to a fetcher - title only, no posts. This
  repeats the 2026-09-03 operator-source check result.
- **[seen] New lead:** the **Direction des transports de la wilaya d'Annaba**
  official page, id **61553735315894**. Also login-walled. DTW pages publish
  line-opening decisions, which is the shape of evidence that unblocked Aïn Defla.
- **[seen] New and important:** an **official-family app exists** -
  **`com.deeper.etus.annaba`** ("Etus Annaba", **Deeper Tech / deepertech.dz**,
  v1.0.0, 2024-06-19, 10,000+ installs). Deeper Tech builds the `com.deeper.etus.*`
  apps that Algerian coverage describes as the public transport company's own
  (com.deeper.etus.souk for Souk Ahras is documented as created by the public
  urban transport institution; com.deeper.etus.aindf exists for Aïn Defla). The
  registry currently records only the weaker `org.busannaba.manager` lead. The
  store text names ETUS Annaba buses and a fare-payment function but lists no lines.
- **[seen]** A third artefact, **"Safer Annaba - سافر عنابة"** (Safer DZ, 2021),
  self-describes as an automated management service for Annaba public transport
  "par des Maps interactifs". If any line graph for Annaba has been digitised, it
  is in that app or in `com.deeper.etus.annaba`. Neither was probed beyond its
  store listing.
- **[seen]** Network context from local press: **Kouche Noureddine station** works the
  semi-urban routes toward Sidi Amar, El Hadjar and Dhraa Errich; **Souidani Boudjemaa
  station** works the urban buses. Annaba, El Bouni, El Hadjar and Sidi Amar form one
  continuous agglomeration.
- **[seen]** OSM contributes no identity: seven relations, all with no ref, name,
  operator, network or stops. See [`osm-match.md`](./osm-match.md).

## Best identity source

**None exists yet.** Ranked by expected value if opened:

1. **`com.deeper.etus.annaba`** - an operator-family app with 10k+ installs almost
   certainly ships a line list in its assets or its API. This is the strongest lead
   and it is a **static** one: the Aïn Defla precedent
   ([AIN-DEFLA-APP-AUDIT.md](../../AIN-DEFLA-APP-AUDIT.md)) shows the workflow -
   audit the APK statically, read the bundled line data, never call the live
   position endpoint.
2. **Facebook page 100063517660926**, read by the project owner while logged in.
3. **DTW Annaba page 61553735315894**, same method.
4. **"Safer Annaba"** app, static audit, as a cross-check only (third party).

## Gaps

Everything. No refs, no termini, no count of lines, no geometry, no stops, no fares,
no hours. Not even the size of the network is known - unlike Constantine, where press
states 12.

## Recommended decision

**Exclude Annaba from `@geoalgeria/buses` for now. Do not publish anything.**
This confirms and does not weaken the 2026-09-03 EXPANSION decision.

Actions worth taking, in order:
- Add `com.deeper.etus.annaba` (Deeper Tech) and DTW page id `61553735315894` to
  `etus-annaba` in `operator-registry.json` as discovery leads, and note that the
  Deeper Tech family is plausibly first-party rather than third-party.
- Run the Aïn Defla-style **static APK audit** on `com.deeper.etus.annaba`. That is
  the single action most likely to produce a real Annaba line list, and it stays
  inside the project's rules as long as no live endpoint is called.
- Do not publish the seven OSM relations under the ETUS Annaba name. Untagged
  semi-urban routes out of Kouche Noureddine are not evidence of the operator.
