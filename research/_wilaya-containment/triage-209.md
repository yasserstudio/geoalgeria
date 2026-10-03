# Triage of the 358 records outside their declared wilaya

Issue: [yasserstudio/geoalgeria.com#209](https://github.com/yasserstudio/geoalgeria.com/issues/209). Companion to
[`README.md`](README.md) (why the guard exists and what it measures) and
[`record-exceptions.json`](record-exceptions.json) (the list the guard holds the data to).

## Method

Every record is asked two questions no single source answers.

1. **Geometry.** Is the coordinate inside the unsimplified OpenStreetMap outline of the commune the
   record names, and if the record names no commune, inside the shipped polygon of the wilaya it
   declares? That is `test/lib/wilaya-containment.mjs`, unchanged.
2. **The registry.** Which wilaya does the commune registry put that commune in today, and which
   wilaya was it in before the reform? That is `packages/dataset/data/wilayas.json` and the three
   commune files, which carry loi 26-06 of 4 April 2026 with décret présidentiel 26-206 (wilayas
   59-69) and loi 19-12 of 11 December 2019 (wilayas 49-58).

A record is corrected only where both answers agree and the published label is the one that is
wrong. Nothing here is corrected from a nearest-centre re-join, and no id changes.

## Categories

| Category | Records | What it means | What was done |
| --- | --- | --- | --- |
| **b** stale wilaya | 55 | the declared wilaya is the pre-reform mother of the wilaya the coordinate is in, and the commune the coordinate is in is one a reform moved to the daughter wilaya. 50 of them are the 2026 reform (wilayas 59-69); 5 are the 2019 one (Béni Abbès 52 and In Guezzam 54), the same defect under the earlier law | **fixed**: one reviewed decision per record in `quality/overrides/<package>.json`, the ledger `CONTRIBUTING.md` routes an evidence-backed correction of a generated package to. `writePackageV2` reapplies it on every emit and refuses if the source's own value has moved, so a re-fetch cannot silently revert it. Re-derived from the registry and the outlines by `test/reform-stale-209.test.mjs` |
| **c** near-border noise | 136 | within the shipped outline's own error of the boundary it declares (250 m for an OpenStreetMap commune outline, 3400 m for a display-grade wilaya polygon, the median vertex gap), or the commune has no OpenStreetMap relation at all | left, documented. Correcting these would be correcting the outlines, which is #171 territory |
| **d** ambiguous | 167 | the coordinate and the source's own wilaya/commune text disagree and no reform explains it, or the coordinate is too rounded to join on | left, listed. Only the source (a ministry register, an operator's list) can say which of the two claims is wrong |

There is no category **a** row here. A coordinate this repository could prove wrong and replace from an
independent source did not turn up: every remaining disagreement is either a label the reform explains
(**b**, fixed), an artefact of our own outlines (**c**), or a source conflict we cannot adjudicate
without the source (**d**). Nulling a coordinate was considered for the 11 rows whose coordinate is a
whole-degree or two-decimal placeholder and rejected: a rounded coordinate is a weaker claim than no
coordinate but still a true one, and dropping it would retire a geocode consumers already use.

## The 55 corrected (category b)

| Record | Package | Declared | Published now | Commune | Reform |
| --- | --- | --- | --- | --- | --- |
| `03-02` | emploi | 03 Laghouat | 59 Aflou | 0319 Aflou | 2026 (law 26-06 / decree 26-206) |
| `05-02` | emploi | 05 Batna | 60 Barika | 0542 Barika | 2026 (law 26-06 / decree 26-206) |
| `07-02` | emploi | 07 Biskra | 61 El Kantara | 0717 El Kantara | 2026 (law 26-06 / decree 26-206) |
| `12-02` | emploi | 12 Tébessa | 62 Bir El Ater | 1202 Bir El Ater | 2026 (law 26-06 / decree 26-206) |
| `14-03` | emploi | 14 Tiaret | 64 Ksar Chellala | 1429 Ksar Chellala | 2026 (law 26-06 / decree 26-206) |
| `17-02` | emploi | 17 Djelfa | 65 Aïn Ouessara | 1731 Aïn Ouessara | 2026 (law 26-06 / decree 26-206) |
| `17-03` | emploi | 17 Djelfa | 65 Aïn Ouessara | 1708 Birine | 2026 (law 26-06 / decree 26-206) |
| `17-05` | emploi | 17 Djelfa | 66 Messaad | 1717 Messaad | 2026 (law 26-06 / decree 26-206) |
| `17-07` | emploi | 17 Djelfa | 65 Aïn Ouessara | 1719 Sidi Ladjel | 2026 (law 26-06 / decree 26-206) |
| `17-08` | emploi | 17 Djelfa | 65 Aïn Ouessara | 1720 Had Sahary | 2026 (law 26-06 / decree 26-206) |
| `26-02` | emploi | 26 Médéa | 67 Ksar El Boukhari | 2635 Ksar El Boukhari | 2026 (law 26-06 / decree 26-206) |
| `26-05` | emploi | 26 Médéa | 67 Ksar El Boukhari | 2651 Boughezoul | 2026 (law 26-06 / decree 26-206) |
| `26-07` | emploi | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `26-08` | emploi | 26 Médéa | 67 Ksar El Boukhari | 2604 Aïn Boucif | 2026 (law 26-06 / decree 26-206) |
| `28-02` | emploi | 28 M'Sila | 68 Bou Saâda | 2820 Bou Saada | 2026 (law 26-06 / decree 26-206) |
| `28-05` | emploi | 28 M'Sila | 68 Bou Saâda | 2841 Aïn El Meleh | 2026 (law 26-06 / decree 26-206) |
| `32-03` | emploi | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `00728` | jeunesse | 14 Tiaret | 64 Ksar Chellala | 1439 Serguine | 2026 (law 26-06 / decree 26-206) |
| `01268` | jeunesse | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `01283` | jeunesse | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `01403` | jeunesse | 28 M'Sila | 68 Bou Saâda | 2846 Oultem | 2026 (law 26-06 / decree 26-206) |
| `01554` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `01558` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3214 Chellala | 2026 (law 26-06 / decree 26-206) |
| `01559` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3214 Chellala | 2026 (law 26-06 / decree 26-206) |
| `01561` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3213 Boussemghoun | 2026 (law 26-06 / decree 26-206) |
| `01563` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3213 Boussemghoun | 2026 (law 26-06 / decree 26-206) |
| `01565` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3214 Chellala | 2026 (law 26-06 / decree 26-206) |
| `01570` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `01574` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `01582` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3214 Chellala | 2026 (law 26-06 / decree 26-206) |
| `01583` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3213 Boussemghoun | 2026 (law 26-06 / decree 26-206) |
| `01584` | jeunesse | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3214 Chellala | 2026 (law 26-06 / decree 26-206) |
| `11610` | poste | 28 M'Sila | 68 Bou Saâda | 2839 Menaâ | 2026 (law 26-06 / decree 26-206) |
| `14908` | poste | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `01663` | sports | 14 Tiaret | 64 Ksar Chellala | 1439 Serguine | 2026 (law 26-06 / decree 26-206) |
| `01666` | sports | 14 Tiaret | 64 Ksar Chellala | 1439 Serguine | 2026 (law 26-06 / decree 26-206) |
| `02725` | sports | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `02769` | sports | 26 Médéa | 67 Ksar El Boukhari | 2657 El Ouinet | 2026 (law 26-06 / decree 26-206) |
| `02775` | sports | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `02776` | sports | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `02777` | sports | 26 Médéa | 67 Ksar El Boukhari | 2618 Chelalet El Adhaoura | 2026 (law 26-06 / decree 26-206) |
| `03396` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `03398` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `03400` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3213 Boussemghoun | 2026 (law 26-06 / decree 26-206) |
| `03401` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3214 Chellala | 2026 (law 26-06 / decree 26-206) |
| `03404` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3213 Boussemghoun | 2026 (law 26-06 / decree 26-206) |
| `03406` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3214 Chellala | 2026 (law 26-06 / decree 26-206) |
| `03407` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `03416` | sports | 32 El Bayadh | 69 El Abiodh Sidi Cheikh | 3207 El Abiodh Sidi Cheikh | 2026 (law 26-06 / decree 26-206) |
| `mobilis-27904a9e47` | telecom | 11 Tamanrasset | 54 In Guezzam | 5402 Tin Zouatine | 2019 (law 19-12) |
| `attraction-310` | tourisme | 08 Béchar | 52 Béni Abbès | 5206 Tabelbala | 2019 (law 19-12) |
| `attraction-312` | tourisme | 08 Béchar | 52 Béni Abbès | 5206 Tabelbala | 2019 (law 19-12) |
| `lodging-238` | tourisme | 08 Béchar | 52 Béni Abbès | 5206 Tabelbala | 2019 (law 19-12) |
| `lodging-239` | tourisme | 08 Béchar | 52 Béni Abbès | 5206 Tabelbala | 2019 (law 19-12) |
| `thermal-spring-36` | tourisme | 26 Médéa | 67 Ksar El Boukhari | 2657 El Ouinet | 2026 (law 26-06 / decree 26-206) |

## The 167 left for the owner (category d)

Each needs its own source re-checked; none can be settled from geometry alone.

| Record | Package | Declared | Coordinate is in | Out by | Why it is not decided here |
| --- | --- | --- | --- | --- | --- |
| `agb-tebessa` | banques | 12 | 62 | 6917 m | its coordinate is too rounded to join on (kept_low_precision), so geometry cannot settle the wilaya |
| `badr-281` | banques | 67 | 65 | 6555 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `cnep-73` | banques | 38 | 44 | 5547 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `19-bcp-08` | culture | 19 / 1958 | 43 / 4308 | 537 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `46-bcp-01` | culture | 46 / 4623 | - | 2302 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `06-00094` | ecoles | 06 / 0629 | 06 | 256 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `06-00155` | ecoles | 06 / 0629 | 06 | 276 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-00086` | ecoles | 16 / 1636 | 16 | 336 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-00302` | ecoles | 16 / 1655 | 16 / 1651 | 531 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `16-00396` | ecoles | 16 / 1614 | 16 | 1236 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-00863` | ecoles | 16 / 1636 | 16 | 500 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-00864` | ecoles | 16 / 1636 | 16 | 512 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-00865` | ecoles | 16 / 1636 | 16 | 392 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-00866` | ecoles | 16 / 1636 | 16 | 495 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `35-00047` | ecoles | 35 / 3527 | 35 / 3528 | 984 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `31-04` | emploi | 31 | 29 | 8969 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `35-04` | emploi | 35 | 10 | 6294 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `06-006` | ferroviaire | 06 / 0629 | 06 | 291 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-0415` | mosquees | 16 / 1614 | 16 | 1248 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-0453` | mosquees | 16 / 1635 | 16 | 808 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-0568` | mosquees | 16 / 1636 | 16 | 280 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-0721` | mosquees | 16 / 1636 | 16 | 290 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-0723` | mosquees | 16 / 1614 | 16 | 1384 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-0904` | mosquees | 16 / 1614 | 16 | 1061 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `21-0252` | mosquees | 21 / 2135 | 18 / 1809 | 2140 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `60-0089` | mosquees | 60 / 0542 | 60 / 514 | 2678 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `16-053` | ooredoo | 16 / 1651 | 16 / 1623 | 585 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `16-00079` | pharmacies | 16 / 1614 | 16 | 1142 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `16-00663` | pharmacies | 16 / 1614 | 16 | 1090 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1034` | poste | 16 / 1603 | 16 / 1602 | 562 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1126` | poste | 05 / 0546 | 05 / 504 | 887 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1134` | poste | 08 / 0809 | 08 / 817 | 3325 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1172` | poste | 55 / 5508 | 55 / 5511 | 343 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1179` | poste | 17 / 1725 | 17 / 1712 | 1338 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1184` | poste | 55 / 5513 | 57 / 5704 | 58103 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1329` | poste | 09 / 0911 | 09 / 928 | 741 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1330` | poste | 14 / 1401 | 14 / 1403 | 2107 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1522` | poste | 16 / 1631 | 16 / 1619 | 581 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1619` | poste | 04 / 0409 | 04 / 402 | 3050 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1669` | poste | 66 / 1722 | 66 / 1717 | 976 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1698` | poste | 13 / 1304 | 13 / 1336 | 4853 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `17` | poste | 17 / 1701 | 17 / 1723 | 66535 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `1922` | poste | 30 / 3004 | 30 / 3012 | 1677 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2182` | poste | 27 / 2712 | 27 / 2729 | 1935 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2370` | poste | 15 / 1539 | 15 / 1524 | 332 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2380` | poste | 05 / 0501 | 05 / 558 | 20044 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2403` | poste | 29 / 2936 | 29 / 2931 | 277 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2413` | poste | 10 / 1024 | 10 / 1001 | 28717 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2515` | poste | 51 / 5102 | 51 / 5101 | 43338 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2525` | poste | 07 / 0715 | 07 / 716 | 2939 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2532` | poste | 16 / 1626 | 16 / 1618 | 1889 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2533` | poste | 05 / 0520 | 05 / 534 | 339 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2923` | poste | 15 / 1524 | 15 / 1504 | 1964 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `2961` | poste | 16 / 1632 | 16 / 1623 | 711 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3042` | poste | 66 / 1718 | 66 / 1724 | 6078 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3044` | poste | 02 / 0203 | 02 / 231 | 1337 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3049` | poste | 16 / 1613 | 16 / 1615 | 406 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3152` | poste | 15 / 1524 | 15 / 1504 | 1207 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3177` | poste | 16 / 1647 | 16 / 1646 | 467 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3266` | poste | 05 / 0525 | 05 / 551 | 405 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3334` | poste | 36 / 3608 | 36 / 3610 | 573 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3366` | poste | 26 / 2601 | 26 / 2602 | 1018 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3406` | poste | 46 / 4608 | 46 / 4622 | 568 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3407` | poste | 46 / 4620 | 46 / 4617 | 9360 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3409` | poste | 46 / 4620 | 46 / 4617 | 1836 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `352` | poste | 12 / 1220 | 62 / 1215 | 3594 m | commune label "EL MA EL BIODH" neither matches nor resolves against El Ogla El Melha (1215) |
| `3591` | poste | 09 / 0916 | 09 / 928 | 1776 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3613` | poste | 09 / 0907 | 09 / 901 | 1339 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3802` | poste | 40 / 4001 | 40 / 4015 | 766 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3824` | poste | 23 / 2301 | 23 / 2303 | 5707 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3874` | poste | 25 / 2510 | 25 / 2506 | 1510 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3892` | poste | 16 / 1601 | 16 / 1602 | 376 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3979` | poste | 23 / 2301 | 23 / 2305 | 7685 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `3984` | poste | 31 / 3101 | 31 / 3103 | 1549 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `4053` | poste | 45 / 4501 | 45 / 4502 | 6807 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `4060` | poste | 09 / 0901 | 09 / 907 | 422 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `4073` | poste | 33 / 3301 | 33 / 3306 | 69278 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `4126` | poste | 45 / 4501 | 45 / 4503 | 29050 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `4129` | poste | 09 / 0901 | 09 / 907 | 2014 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `448` | poste | 39 / 3901 | 39 / 3920 | 4372 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `529` | poste | 21 / 2101 | 21 / 2137 | 539 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `620` | poste | 07 / 0716 | 07 / 715 | 628 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `671` | poste | 33 / 3306 | 33 / 3304 | 536 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `780` | poste | 14 / 1413 | 14 / 1403 | 908 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `06-019` | protection-civile | 06 / 0612 | 06 / 618 | 3248 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `08-008` | protection-civile | 08 / 0802 | 08 / 809 | 22 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `10-005` | protection-civile | 10 / 1026 | 10 / 1016 | 375 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `10-014` | protection-civile | 10 / 1021 | 10 / 1036 | 2284 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `10-026` | protection-civile | 10 / 1043 | 10 / 1006 | 441 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `14-002` | protection-civile | 14 / 1434 | 14 / 1414 | 8450 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `19-010` | protection-civile | 19 / 1909 | 19 / 1922 | 1148 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `19-015` | protection-civile | 19 / 1941 | 19 / 1936 | 607 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `31-010` | protection-civile | 31 / 3120 | 31 / 3114 | 931 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `31-022` | protection-civile | 31 / 3117 | 31 / 3105 | 663 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `31-025` | protection-civile | 31 / 3115 | 31 / 3109 | 269 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `32-009` | protection-civile | 32 / 3221 | 32 / 3212 | 92490 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `32-011` | protection-civile | 32 / 3217 | 32 / 3203 | 630 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `33-007` | protection-civile | 33 / 3306 | 33 / 3304 | 483 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `34-003` | protection-civile | 34 / 3428 | 34 / 3401 | 278 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `39-006` | protection-civile | 39 / 3903 | 39 / 3926 | 2437 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `39-010` | protection-civile | 39 / 3913 | 39 / 3911 | 608 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `42-003` | protection-civile | 42 / 4230 | 42 / 4217 | 800 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `49-003` | protection-civile | 49 / 4903 | 49 / 4905 | 15776 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `53-001` | protection-civile | 53 / 5303 | 53 / 5301 | 74288 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `53-003` | protection-civile | 53 / 5301 | 53 / 5302 | 24955 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `55-005` | protection-civile | 55 / 5504 | 55 / 5501 | 1667 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `55-006` | protection-civile | 55 / 5504 | 55 / 5501 | 2886 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `68-001` | protection-civile | 68 / 2839 | 68 / 2842 | 721 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `18-epsp-06` | sante | 18 / 1804 | 18 / 1803 | 380 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `49-epsp-02` | sante | 49 / 4905 | 49 / 4910 | 53312 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `00271` | sports | 59 / 0319 | 59 / 324 | 13074 m | coordinate too rounded to join on (fewer than three decimals), so geometry cannot settle it |
| `00276` | sports | 59 / 0319 | 59 / 324 | 12761 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `00278` | sports | 59 / 0319 | 59 / 316 | 10476 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `00285` | sports | 59 / 0324 | 59 / 316 | 22561 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `00308` | sports | 59 / 0319 | 59 / 316 | 10863 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `00724` | sports | 05 | 60 | 9185 m | its own commune label "OULED SI SLIMANE" is commune 553 (wilaya 5), while the coordinate is inside Barika (542) |
| `01205` | sports | 10 | 35 | 7702 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `01835` | sports | 66 / 1717 | 66 / 1729 | 14311 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `02802` | sports | 26 | 67 | 6495 m | its coordinate is too rounded to join on (kept_low_precision), so geometry cannot settle the wilaya |
| `djezzy-32aefc70ba` | telecom | 25 | 04 | 7444 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `djezzy-59dc53c9b7` | telecom | 25 | 21 | 31394 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `djezzy-5d8495c6eb` | telecom | 25 | 21 | 17850 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `djezzy-92e58f3ae0` | telecom | 21 | 25 | 23808 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `djezzy-96a6ff5021` | telecom | 19 | 60 | 27527 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `djezzy-a8d0001832` | telecom | 25 | 04 | 29560 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `djezzy-b8506d10dd` | telecom | 19 | 60 | 27241 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `djezzy-d3b41f54b5` | telecom | 21 | 24 | 3720 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-1112` | tourisme | 03 | 47 | 35447 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-347` | tourisme | 15 | 06 | 4082 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-353` | tourisme | 15 | 06 | 4028 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-354` | tourisme | 15 | 06 | 4500 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-593` | tourisme | 43 | 19 | 22208 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-604` | tourisme | 46 | 31 | 6377 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-728` | tourisme | 56 | 33 | 22039 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-730` | tourisme | 56 | 33 | 5201 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-820` | tourisme | 58 | 30 | 10764 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `attraction-826` | tourisme | 61 | 07 | 4682 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-1064` | tourisme | 43 | 25 | 4384 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-1112` | tourisme | 64 | 17 | 10291 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-128` | tourisme | 43 | 19 | 23609 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-133` | tourisme | 43 | 25 | 4378 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-147` | tourisme | 56 | 33 | 21340 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-148` | tourisme | 56 | 33 | 20503 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-149` | tourisme | 56 | 33 | 22887 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-171` | tourisme | 56 | 33 | 17165 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-172` | tourisme | 56 | 33 | 18193 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-390` | tourisme | 41 | 04 | 4967 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-472` | tourisme | 39 | 30 | 13626 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-475` | tourisme | 52 | 49 | 158721 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-477` | tourisme | 56 | 11 | 4573 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-65` | tourisme | 16 | 35 | 28403 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `historic-773` | tourisme | 15 | 06 | 3954 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `lodging-1601` | tourisme | 69 | 45 | 9121 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `lodging-840` | tourisme | 21 | 23 | 5277 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `park-15` | tourisme | 07 | 39 | 27767 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-1` | tourisme | 43 | 25 | 4382 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-100` | tourisme | 55 | 30 | 11142 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-114` | tourisme | 12 | 41 | 6683 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-139` | tourisme | 69 | 45 | 8349 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-150` | tourisme | 55 | 30 | 13223 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-16` | tourisme | 02 | 44 | 6113 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-236` | tourisme | 04 | 40 | 4976 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-250` | tourisme | 20 | 32 | 17471 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-269` | tourisme | 55 | 30 | 16714 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-279` | tourisme | 04 | 40 | 4762 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-44` | tourisme | 12 | 41 | 4945 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |
| `thermal-spring-74` | tourisme | 14 | 48 | 6799 m | coordinate and the source's own wilaya/commune text disagree with no reform to explain it; only the source can settle which is wrong |

## The 136 left as outline noise (category c)

| Record | Package | Declared | Kind | Out by | Reason |
| --- | --- | --- | --- | --- | --- |
| `cnep-117` | banques | 19 | outside_declared_wilaya_polygon | 3283 m | 3283 m outside the boundary it declares, inside the outline's own error |
| `trustbank-agenceoran` | banques | 31 | outside_declared_wilaya_polygon | 1601 m | 1601 m outside the boundary it declares, inside the outline's own error |
| `06-00033` | cliniques | 06 / 0629 | outside_own_commune_outline | 247 m | 247 m outside the boundary it declares, inside the outline's own error |
| `21-00030` | cliniques | 21 / 2131 | outside_own_commune_outline | 3 m | 3 m outside the boundary it declares, inside the outline's own error |
| `16-00022` | ecoles | 16 / 1607 | outside_own_commune_outline | 6 m | 6 m outside the boundary it declares, inside the outline's own error |
| `16-00168` | ecoles | 16 / 1653 | outside_own_commune_outline | 1 m | 1 m outside the boundary it declares, inside the outline's own error |
| `16-00338` | ecoles | 16 / 1607 | outside_own_commune_outline | 6 m | 6 m outside the boundary it declares, inside the outline's own error |
| `35-010` | ferroviaire | 35 / 3528 | outside_own_commune_outline | 43 m | 43 m outside the boundary it declares, inside the outline's own error |
| `06-0032` | mosquees | 06 / 0629 | outside_own_commune_outline | 79 m | 79 m outside the boundary it declares, inside the outline's own error |
| `06-0418` | mosquees | 06 / 0629 | outside_own_commune_outline | 68 m | 68 m outside the boundary it declares, inside the outline's own error |
| `16-0178` | mosquees | 16 / 1622 | outside_own_commune_outline | 6 m | 6 m outside the boundary it declares, inside the outline's own error |
| `16-0673` | mosquees | 16 / 1613 | outside_own_commune_outline | 4 m | 4 m outside the boundary it declares, inside the outline's own error |
| `21-0002` | mosquees | 21 / 2119 | outside_own_commune_outline | 8 m | 8 m outside the boundary it declares, inside the outline's own error |
| `31-0509` | mosquees | 31 / 3120 | outside_own_commune_outline | 15 m | 15 m outside the boundary it declares, inside the outline's own error |
| `06-00036` | pharmacies | 06 / 0629 | outside_own_commune_outline | 144 m | 144 m outside the boundary it declares, inside the outline's own error |
| `09-00027` | pharmacies | 09 / 0907 | outside_own_commune_outline | 19 m | 19 m outside the boundary it declares, inside the outline's own error |
| `16-00071` | pharmacies | 16 / 1608 | outside_own_commune_outline | 1 m | 1 m outside the boundary it declares, inside the outline's own error |
| `16-00168` | pharmacies | 16 / 1652 | outside_own_commune_outline | 11 m | 11 m outside the boundary it declares, inside the outline's own error |
| `16-00327` | pharmacies | 16 / 1609 | outside_own_commune_outline | 8 m | 8 m outside the boundary it declares, inside the outline's own error |
| `14761` | poste | 20 | outside_declared_wilaya_polygon | 7 m | 7 m outside the boundary it declares, inside the outline's own error |
| `1165` | poste | 16 / 1622 | outside_own_commune_outline | 22 m | 22 m outside the boundary it declares, inside the outline's own error |
| `1343` | poste | 55 / 5512 | outside_own_commune_outline | 74 m | 74 m outside the boundary it declares, inside the outline's own error |
| `1347` | poste | 09 / 0901 | outside_own_commune_outline | 28 m | 28 m outside the boundary it declares, inside the outline's own error |
| `1656` | poste | 23 / 2311 | outside_own_commune_outline | 22 m | 22 m outside the boundary it declares, inside the outline's own error |
| `1787` | poste | 16 / 1601 | outside_own_commune_outline | 163 m | 163 m outside the boundary it declares, inside the outline's own error |
| `1815` | poste | 35 / 3537 | outside_own_commune_outline | 9 m | 9 m outside the boundary it declares, inside the outline's own error |
| `1829` | poste | 16 / 1615 | outside_own_commune_outline | 11 m | 11 m outside the boundary it declares, inside the outline's own error |
| `1943` | poste | 23 / 2305 | outside_own_commune_outline | 84 m | 84 m outside the boundary it declares, inside the outline's own error |
| `2094` | poste | 42 / 4222 | outside_own_commune_outline | 163 m | 163 m outside the boundary it declares, inside the outline's own error |
| `2246` | poste | 29 / 2932 | outside_own_commune_outline | 19 m | 19 m outside the boundary it declares, inside the outline's own error |
| `2275` | poste | 16 / 1601 | outside_own_commune_outline | 153 m | 153 m outside the boundary it declares, inside the outline's own error |
| `2337` | poste | 19 / 1932 | outside_own_commune_outline | 113 m | 113 m outside the boundary it declares, inside the outline's own error |
| `2694` | poste | 16 / 1601 | outside_own_commune_outline | 13 m | 13 m outside the boundary it declares, inside the outline's own error |
| `3029` | poste | 16 / 1616 | outside_own_commune_outline | 6 m | 6 m outside the boundary it declares, inside the outline's own error |
| `3030` | poste | 16 / 1626 | outside_own_commune_outline | 146 m | 146 m outside the boundary it declares, inside the outline's own error |
| `3032` | poste | 16 / 1602 | outside_own_commune_outline | 101 m | 101 m outside the boundary it declares, inside the outline's own error |
| `3096` | poste | 31 / 3117 | outside_own_commune_outline | 64 m | 64 m outside the boundary it declares, inside the outline's own error |
| `3103` | poste | 10 / 1019 | outside_own_commune_outline | 205 m | 205 m outside the boundary it declares, inside the outline's own error |
| `3129` | poste | 16 / 1645 | outside_own_commune_outline | 56 m | 56 m outside the boundary it declares, inside the outline's own error |
| `3285` | poste | 43 / 4301 | outside_own_commune_outline | 109 m | 109 m outside the boundary it declares, inside the outline's own error |
| `3437` | poste | 32 / 3211 | outside_own_commune_outline | 8 m | 8 m outside the boundary it declares, inside the outline's own error |
| `354` | poste | 44 / 4412 | outside_own_commune_outline | 13 m | 13 m outside the boundary it declares, inside the outline's own error |
| `3750` | poste | 16 / 1643 | outside_own_commune_outline | 4 m | 4 m outside the boundary it declares, inside the outline's own error |
| `3924` | poste | 03 / 0308 | outside_own_commune_outline | 58 m | 58 m outside the boundary it declares, inside the outline's own error |
| `564` | poste | 08 / 0802 | outside_own_commune_outline | 42 m | 42 m outside the boundary it declares, inside the outline's own error |
| `588` | poste | 10 / 1029 | outside_own_commune_outline | 29 m | 29 m outside the boundary it declares, inside the outline's own error |
| `791` | poste | 23 / 2306 | outside_own_commune_outline | 25 m | 25 m outside the boundary it declares, inside the outline's own error |
| `13-015` | protection-civile | 13 / 1350 | outside_own_commune_outline | 187 m | 187 m outside the boundary it declares, inside the outline's own error |
| `15-006` | protection-civile | 15 / 1535 | outside_own_commune_outline | 154 m | 154 m outside the boundary it declares, inside the outline's own error |
| `16-022` | protection-civile | 16 / 1630 | outside_own_commune_outline | 50 m | 50 m outside the boundary it declares, inside the outline's own error |
| `16-036` | protection-civile | 16 / 1611 | outside_own_commune_outline | 172 m | 172 m outside the boundary it declares, inside the outline's own error |
| `16-048` | protection-civile | 16 / 1622 | outside_own_commune_outline | 210 m | 210 m outside the boundary it declares, inside the outline's own error |
| `31-001` | protection-civile | 31 / 3101 | outside_own_commune_outline | 33 m | 33 m outside the boundary it declares, inside the outline's own error |
| `47-009` | protection-civile | 47 / 4710 | outside_own_commune_outline | 80 m | 80 m outside the boundary it declares, inside the outline's own error |
| `48-003` | protection-civile | 48 / 4828 | outside_own_commune_outline | 113 m | 113 m outside the boundary it declares, inside the outline's own error |
| `48-011` | protection-civile | 48 / 4825 | outside_own_commune_outline | 198 m | 198 m outside the boundary it declares, inside the outline's own error |
| `01608` | sports | 64 / 1429 | outside_own_commune_outline | 30 m | 30 m outside the boundary it declares, inside the outline's own error |
| `01902` | sports | 65 / 1731 | outside_own_commune_outline | 126 m | 126 m outside the boundary it declares, inside the outline's own error |
| `03466` | sports | 34 | outside_declared_wilaya_polygon | 307 m | 307 m outside the boundary it declares, inside the outline's own error |
| `03469` | sports | 34 | outside_declared_wilaya_polygon | 225 m | 225 m outside the boundary it declares, inside the outline's own error |
| `03476` | sports | 34 | outside_declared_wilaya_polygon | 225 m | 225 m outside the boundary it declares, inside the outline's own error |
| `03526` | sports | 34 | outside_declared_wilaya_polygon | 440 m | 440 m outside the boundary it declares, inside the outline's own error |
| `04150` | sports | 41 | outside_declared_wilaya_polygon | 646 m | 646 m outside the boundary it declares, inside the outline's own error |
| `04184` | sports | 41 | outside_declared_wilaya_polygon | 262 m | 262 m outside the boundary it declares, inside the outline's own error |
| `04493` | sports | 44 | outside_declared_wilaya_polygon | 532 m | 532 m outside the boundary it declares, inside the outline's own error |
| `04556` | sports | 45 | outside_declared_wilaya_polygon | 195 m | 195 m outside the boundary it declares, inside the outline's own error |
| `djezzy-273569c0a9` | telecom | 19 | outside_declared_wilaya_polygon | 1492 m | 1492 m outside the boundary it declares, inside the outline's own error |
| `djezzy-9af394aaf4` | telecom | 16 | outside_declared_wilaya_polygon | 103 m | 103 m outside the boundary it declares, inside the outline's own error |
| `djezzy-c0af943238` | telecom | 16 | outside_declared_wilaya_polygon | 15 m | 15 m outside the boundary it declares, inside the outline's own error |
| `djezzy-ca8bbb1642` | telecom | 25 | outside_declared_wilaya_polygon | 2662 m | 2662 m outside the boundary it declares, inside the outline's own error |
| `attraction-1137` | tourisme | 15 | outside_declared_wilaya_polygon | 1139 m | 1139 m outside the boundary it declares, inside the outline's own error |
| `attraction-1138` | tourisme | 15 | outside_declared_wilaya_polygon | 811 m | 811 m outside the boundary it declares, inside the outline's own error |
| `attraction-1213` | tourisme | 55 | outside_declared_wilaya_polygon | 264 m | 264 m outside the boundary it declares, inside the outline's own error |
| `attraction-264` | tourisme | 04 | outside_declared_wilaya_polygon | 2375 m | 2375 m outside the boundary it declares, inside the outline's own error |
| `attraction-415` | tourisme | 16 | outside_declared_wilaya_polygon | 173 m | 173 m outside the boundary it declares, inside the outline's own error |
| `attraction-463` | tourisme | 21 | outside_declared_wilaya_polygon | 2090 m | 2090 m outside the boundary it declares, inside the outline's own error |
| `attraction-468` | tourisme | 21 | outside_declared_wilaya_polygon | 1746 m | 1746 m outside the boundary it declares, inside the outline's own error |
| `attraction-689` | tourisme | 56 | outside_declared_wilaya_polygon | 715 m | 715 m outside the boundary it declares, inside the outline's own error |
| `attraction-821` | tourisme | 59 | outside_declared_wilaya_polygon | 2249 m | 2249 m outside the boundary it declares, inside the outline's own error |
| `attraction-829` | tourisme | 68 | outside_declared_wilaya_polygon | 206 m | 206 m outside the boundary it declares, inside the outline's own error |
| `attraction-898` | tourisme | 15 | outside_declared_wilaya_polygon | 2322 m | 2322 m outside the boundary it declares, inside the outline's own error |
| `historic-1037` | tourisme | 34 | outside_declared_wilaya_polygon | 1432 m | 1432 m outside the boundary it declares, inside the outline's own error |
| `historic-1038` | tourisme | 34 | outside_declared_wilaya_polygon | 1510 m | 1510 m outside the boundary it declares, inside the outline's own error |
| `historic-1040` | tourisme | 34 | outside_declared_wilaya_polygon | 1991 m | 1991 m outside the boundary it declares, inside the outline's own error |
| `historic-1041` | tourisme | 34 | outside_declared_wilaya_polygon | 1199 m | 1199 m outside the boundary it declares, inside the outline's own error |
| `historic-1042` | tourisme | 34 | outside_declared_wilaya_polygon | 1208 m | 1208 m outside the boundary it declares, inside the outline's own error |
| `historic-1088` | tourisme | 47 | outside_declared_wilaya_polygon | 2485 m | 2485 m outside the boundary it declares, inside the outline's own error |
| `historic-1123` | tourisme | 09 | outside_declared_wilaya_polygon | 645 m | 645 m outside the boundary it declares, inside the outline's own error |
| `historic-1155` | tourisme | 31 | outside_declared_wilaya_polygon | 1956 m | 1956 m outside the boundary it declares, inside the outline's own error |
| `historic-129` | tourisme | 43 | outside_declared_wilaya_polygon | 1802 m | 1802 m outside the boundary it declares, inside the outline's own error |
| `historic-132` | tourisme | 43 | outside_declared_wilaya_polygon | 1805 m | 1805 m outside the boundary it declares, inside the outline's own error |
| `historic-157` | tourisme | 56 | outside_declared_wilaya_polygon | 715 m | 715 m outside the boundary it declares, inside the outline's own error |
| `historic-177` | tourisme | 56 | outside_declared_wilaya_polygon | 3189 m | 3189 m outside the boundary it declares, inside the outline's own error |
| `historic-310` | tourisme | 07 | outside_declared_wilaya_polygon | 2207 m | 2207 m outside the boundary it declares, inside the outline's own error |
| `historic-437` | tourisme | 34 | outside_declared_wilaya_polygon | 1472 m | 1472 m outside the boundary it declares, inside the outline's own error |
| `historic-438` | tourisme | 34 | outside_declared_wilaya_polygon | 1382 m | 1382 m outside the boundary it declares, inside the outline's own error |
| `historic-439` | tourisme | 34 | outside_declared_wilaya_polygon | 2004 m | 2004 m outside the boundary it declares, inside the outline's own error |
| `historic-440` | tourisme | 34 | outside_declared_wilaya_polygon | 1976 m | 1976 m outside the boundary it declares, inside the outline's own error |
| `historic-479` | tourisme | 58 | outside_declared_wilaya_polygon | 349 m | 349 m outside the boundary it declares, inside the outline's own error |
| `historic-525` | tourisme | 06 | outside_declared_wilaya_polygon | 1470 m | 1470 m outside the boundary it declares, inside the outline's own error |
| `historic-625` | tourisme | 22 | outside_declared_wilaya_polygon | 812 m | 812 m outside the boundary it declares, inside the outline's own error |
| `historic-651` | tourisme | 31 | outside_declared_wilaya_polygon | 927 m | 927 m outside the boundary it declares, inside the outline's own error |
| `historic-684` | tourisme | 47 | outside_declared_wilaya_polygon | 2477 m | 2477 m outside the boundary it declares, inside the outline's own error |
| `historic-942` | tourisme | 06 | outside_declared_wilaya_polygon | 331 m | 331 m outside the boundary it declares, inside the outline's own error |
| `historic-953` | tourisme | 06 | outside_declared_wilaya_polygon | 1615 m | 1615 m outside the boundary it declares, inside the outline's own error |
| `historic-954` | tourisme | 06 | outside_declared_wilaya_polygon | 338 m | 338 m outside the boundary it declares, inside the outline's own error |
| `historic-955` | tourisme | 06 | outside_declared_wilaya_polygon | 1673 m | 1673 m outside the boundary it declares, inside the outline's own error |
| `historic-994` | tourisme | 15 | outside_declared_wilaya_polygon | 86 m | 86 m outside the boundary it declares, inside the outline's own error |
| `lodging-124` | tourisme | 06 | outside_declared_wilaya_polygon | 1377 m | 1377 m outside the boundary it declares, inside the outline's own error |
| `lodging-126` | tourisme | 06 | outside_declared_wilaya_polygon | 551 m | 551 m outside the boundary it declares, inside the outline's own error |
| `lodging-1458` | tourisme | 46 | outside_declared_wilaya_polygon | 359 m | 359 m outside the boundary it declares, inside the outline's own error |
| `lodging-1574` | tourisme | 65 | outside_declared_wilaya_polygon | 1670 m | 1670 m outside the boundary it declares, inside the outline's own error |
| `lodging-301` | tourisme | 10 | outside_declared_wilaya_polygon | 955 m | 955 m outside the boundary it declares, inside the outline's own error |
| `lodging-341` | tourisme | 12 | outside_declared_wilaya_polygon | 1375 m | 1375 m outside the boundary it declares, inside the outline's own error |
| `lodging-431` | tourisme | 15 | outside_declared_wilaya_polygon | 1031 m | 1031 m outside the boundary it declares, inside the outline's own error |
| `lodging-432` | tourisme | 15 | outside_declared_wilaya_polygon | 2381 m | 2381 m outside the boundary it declares, inside the outline's own error |
| `lodging-439` | tourisme | 15 | outside_declared_wilaya_polygon | 2229 m | 2229 m outside the boundary it declares, inside the outline's own error |
| `lodging-443` | tourisme | 15 | outside_declared_wilaya_polygon | 2386 m | 2386 m outside the boundary it declares, inside the outline's own error |
| `lodging-705` | tourisme | 17 | outside_declared_wilaya_polygon | 62 m | 62 m outside the boundary it declares, inside the outline's own error |
| `park-12` | tourisme | 36 | outside_declared_wilaya_polygon | 2855 m | 2855 m outside the boundary it declares, inside the outline's own error |
| `park-29` | tourisme | 15 | outside_declared_wilaya_polygon | 242 m | 242 m outside the boundary it declares, inside the outline's own error |
| `park-6` | tourisme | 15 | outside_declared_wilaya_polygon | 325 m | 325 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-116` | tourisme | 10 | outside_declared_wilaya_polygon | 637 m | 637 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-117` | tourisme | 10 | outside_declared_wilaya_polygon | 637 m | 637 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-135` | tourisme | 38 | outside_declared_wilaya_polygon | 513 m | 513 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-162` | tourisme | 43 | outside_declared_wilaya_polygon | 44 m | 44 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-164` | tourisme | 18 | outside_declared_wilaya_polygon | 1875 m | 1875 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-17` | tourisme | 10 | outside_declared_wilaya_polygon | 637 m | 637 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-174` | tourisme | 46 | outside_declared_wilaya_polygon | 77 m | 77 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-219` | tourisme | 41 | outside_declared_wilaya_polygon | 1141 m | 1141 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-225` | tourisme | 10 | outside_declared_wilaya_polygon | 637 m | 637 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-227` | tourisme | 29 | outside_declared_wilaya_polygon | 1412 m | 1412 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-31` | tourisme | 15 | outside_declared_wilaya_polygon | 2677 m | 2677 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-43` | tourisme | 36 | outside_declared_wilaya_polygon | 1886 m | 1886 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-45` | tourisme | 10 | outside_declared_wilaya_polygon | 637 m | 637 m outside the boundary it declares, inside the outline's own error |
| `thermal-spring-92` | tourisme | 51 | outside_declared_wilaya_polygon | 135 m | 135 m outside the boundary it declares, inside the outline's own error |

## Counts by package

| Package | Total | b fixed | c noise | d ambiguous |
| --- | --- | --- | --- | --- |
| banques | 5 | 0 | 2 | 3 |
| cliniques | 2 | 0 | 2 | 0 |
| culture | 2 | 0 | 0 | 2 |
| ecoles | 13 | 0 | 3 | 10 |
| emploi | 19 | 17 | 0 | 2 |
| ferroviaire | 2 | 0 | 1 | 1 |
| jeunesse | 15 | 15 | 0 | 0 |
| mosquees | 14 | 0 | 6 | 8 |
| ooredoo | 1 | 0 | 0 | 1 |
| pharmacies | 7 | 0 | 5 | 2 |
| poste | 85 | 2 | 28 | 55 |
| protection-civile | 33 | 0 | 9 | 24 |
| sante | 2 | 0 | 0 | 2 |
| sports | 34 | 15 | 10 | 9 |
| telecom | 13 | 1 | 4 | 8 |
| tourisme | 111 | 5 | 66 | 40 |
| **total** | **358** | **55** | **136** | **167** |
