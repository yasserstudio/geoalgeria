# Transport sector — landscape & sources (Algeria)

Recon + staging notes for the GeoAlgeria **Transport** sector. Assembled
2026-07-01 from operator sites the user surfaced + the parent ministry. Nothing
built yet — this indexes the `research/` data staged for future packages.

## Parent authority — Ministère des Transports (`mt.gov.dz`)

The institutional anchor for the whole sector (oversees every operator below).

- **Not reachable from foreign networks.** DNS resolves (`41.110.2.151`, Algérie
  Télécom gov range) but TCP times out on 80/443 — `.gov.dz` geo-blocks non-DZ IPs.
  (The parastatal operator sites — sogral.dz, setram.dz, metro-eldjazair.dz — are on
  commercial hosting and *do* respond.)
- Recovered its **site map via the Wayback Machine** (`mt-gov-dz-wayback-home.html`,
  WordPress). Page IDs for a future harvest **on an Algerian network** (or user-paste):
  | Section | URL |
  | --- | --- |
  | **Organismes sous tutelles** (entities under supervision — the key directory) | `mt.gov.dz/?page_id=2709` |
  | Organigramme | `?page_id=3913` |
  | Transport ferroviaire | `?page_id=3443` |
  | Transport urbain et routier | `?page_id=3439` |
  | Transport aérien | `?page_id=3762` · `portail.mt.gov.dz/service.php?id=6` |
  | Also | Statistiques · Bilan du secteur · Plan d'actions 2020–2024 · Conjoncture (quarterly) |
- **Blocked now:** the "Organismes sous tutelles" page (2709) is 403/404 on Wayback and
  unreachable live. That page is the authoritative list of transport public entities —
  the basis for a potential `@geoalgeria/transport` **institutional directory** (mirrors
  `banques` institutions / MADR `agriculture`). Capture it on a DZ network or have the
  user paste it. Known tutelle entities to verify against it: SNTF, SNTF-filiales,
  SETRAM, EMA/SEMA, ETUSA, SOGRAL, ANAC, EGSA (Alger/Oran/Constantine airport mgmt),
  port authorities (EPAL etc.), ENTMV/Air Algérie, ENACTA, EMA. **Do not ship from
  memory — verify against page 2709.**

## Operators researched this session (staged in `research/`)

| Folder | Operator / scope | Mode | Data staged | Reachable? |
| --- | --- | --- | --- | --- |
| `gares-routieres/` | **SOGRAL** — Sté de gestion des gares routières | intercity **bus stations** | 74 stations **cleaned** (coords 71/74, live API) + AR/FR names | ✅ live JSON API |
| `ferroviaire/` | **SNTF** (rail) · **SEMA/EMA** (metro) · **SETRAM** (tram) | rail · metro · tram **nodes** | WD 695 nodes · SETRAM 172 tram stations ×7 nets · SEMA 19 metro · SNTF status map | ✅ WD/OSM/setram.dz/metro-eldjazair.dz |
| `buses/` | **ETUSA** — transport urbain d'Alger *(first of many operators)* | urban **bus lines** + téléphériques | 50 lines parsed (termini, stops, communes) + company facts | ⚠️ via fr.wikipedia (no official feed) |

Also already **shipped** in this sector: `@geoalgeria/aviation` (ANAC, 33 airports).

## Sector map (mode → owner/source → GeoAlgeria home)

Names follow [`.agents/NAMING.md`](../../.agents/NAMING.md): domain-named, operator
is the *source*. `@geoalgeria/transport` is the sector **umbrella** (re-exports members).

- **Air** → ANAC / EGSA → `@geoalgeria/aviation` ✅ shipped
- **Heavy rail** → SNTF → `@geoalgeria/ferroviaire` (planned)
- **Metro** → SEMA/EMA → `ferroviaire` (metro layer)
- **Tram** → SETRAM → `ferroviaire` (tram layer)
- **Intercity bus stations** → SOGRAL → `@geoalgeria/gares-routieres` (planned, data ready)
- **Urban bus networks** → ETUSA (+ more cities later) → `@geoalgeria/buses` (multi-operator; heavier — needs OSM geometry)
- **Ports & maritime** → EPAL etc. / ENTMV → `@geoalgeria/ports` (backlog)
- **Institutional directory** → Ministry "organismes sous tutelles" → `@geoalgeria/transport-institutions`? (needs page 2709)
- **Sector umbrella** → re-exports the above → `@geoalgeria/transport`

## Next steps (when a build is greenlit)
1. `gares-routieres` is the most build-ready (clean, authoritative, self-contained).
2. `ferroviaire` — merge WD + OSM + SETRAM + SEMA into one cleaned node set.
3. Capture ministry page 2709 (DZ network / user-paste) to decide on a
   `transport-institutions` directory.
4. `buses` (ETUSA + more operators) — later; needs OSM `route=bus` geometry.
