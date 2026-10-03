# Commune centres against their OSM chef-lieu node: the report (2026-09-29 pull)

A **report, not a gate**. Until 2026-09-29 a test failed any commune centre more
than 1 km from its recorded OSM seat, with 496 pinned exceptions. The Owner's
decision the same day (private tracker #170) replaced it: the standing guard
enforces containment
(`test/commune-centre-in-commune.test.mjs`), and the distance to the seat is
measured here instead.

Why. Our centre and the OSM `admin_centre` node are two hand-placed claims about
one town, so a delta between them says the two sources disagree, not that ours is
wrong. The median over all 1537 compared rows is
**180 m**, and a rule needing 496 exceptions was measuring that
disagreement. Containment is a fact about one claim on its own: a centre outside
its own commune is wrong whatever the node says, and that is how the 189
corrections of this batch were decided.

- Seat reference: `osm-seat-reference.json` (Overpass `timestamp_osm_base`
  2026-09-29T12:54:47Z)
- Licence: ODbL 1.0, (c) OpenStreetMap contributors
- Regenerate: `node scripts/build-commune-boundary-cache.mjs --write`

## Bands, after the 189 corrections

| Band | Communes |
| --- | --- |
| over 300 m | 595 |
| over 1 km | 234 |
| over 5 km | 36 |
| median | 180 m |
| largest | 94922 m (Tinerkouk, 4905) |

The `In own commune` column is the guard's question. A row over 1 km that still
answers **no** is a defect with incomplete evidence, listed in
`containment-exceptions.json`; a row that answers yes is a disagreement.

## Over 1 km, by delta

| Code | Commune | Wilaya | Delta (m) | In own commune | OSM relation |
| --- | --- | --- | --- | --- | --- |
| 4905 | Tinerkouk | 49 | 94922 | **no** | 4171625 |
| 647 | Ait-Smail | 6 | 39716 | **no** | 4112875 |
| 514 | Bitam | 60 | 31255 | yes | 5177042 |
| 1713 | M'Liliha | 17 | 26434 | yes | 6533522 |
| 1441 | Faïdja | 14 | 25878 | yes | 6545425 |
| 2921 | El Menaouer | 29 | 16193 | **no** | 6668173 |
| 4126 | Zouabi | 41 | 14618 | **no** | 6663213 |
| 1215 | El Ogla El Melha | 62 | 14504 | yes | 6618847 |
| 2434 | Djeballah Khemissi | 24 | 12761 | **no** | 6537634 |
| 2836 | Bir Foda | 68 | 12684 | yes | 5514983 |
| 3217 | Cheguig | 32 | 11799 | yes | 6533978 |
| 648 | Boukhelifa | 6 | 11444 | **no** | 4112950 |
| 3819 | Tamellahet | 38 | 11273 | **no** | 6534593 |
| 2237 | Oued Sebaa | 22 | 10731 | yes | 6661995 |
| 532 | Béni Fedhala El Hakania | 5 | 10649 | **no** | 5195901 |
| 4418 | Hassania | 44 | 9732 | yes | 2740818 |
| 3304 | Bordj Omar Driss | 33 | 9721 | yes | 4174331 |
| 1407 | Sidi Bakhti | 14 | 9471 | yes | 6545445 |
| 2832 | Khetouti Sed El Djir | 28 | 9377 | yes | 6547242 |
| 557 | El Hassi | 5 | 9229 | **no** | 5209309 |
| 3808 | Sidi Lantri | 38 | 9163 | yes | 6534591 |
| 2941 | Gharrous | 29 | 8910 | **no** | 5349395 |
| 2829 | Maarif | 28 | 8672 | yes | 6547248 |
| 515 | Abdelkader Azil | 60 | 8619 | **no** | 5160749 |
| 538 | Taxlent | 5 | 8168 | yes | 5147557 |
| 2840 | Souamaa | 28 | 7440 | **no** | 6547262 |
| 3021 | El Borma | 30 | 6997 | yes | 6542938 |
| 716 | El Feïdh | 7 | 6405 | yes | 4120767 |
| 1039 | Maamora | 10 | 6178 | yes | 3278688 |
| 1226 | Bedjene | 12 | 6104 | yes | 6618827 |
| 635 | Beni K'sila | 6 | 6045 | yes | 4067904 |
| 521 | Tigherghar | 5 | 5842 | **no** | 5200635 |
| 539 | Gosbat | 5 | 5583 | yes | 5175666 |
| 1823 | Khiri Oued Adjoul | 18 | 5544 | **no** | 6669727 |
| 2658 | Ouled Antar | 67 | 5449 | yes | 2522974 |
| 913 | Benkhelil | 9 | 5011 | yes | 3823981 |
| 3623 | Hammam Beni Salah | 36 | 4901 | yes | 1614443 |
| 2411 | Bendjarah | 24 | 4889 | yes | 6537625 |
| 2843 | Slim | 68 | 4842 | yes | 5514905 |
| 4113 | Ouled Moumen | 41 | 4800 | yes | 6663202 |
| 646 | Tamridjet | 6 | 4694 | yes | 1283404 |
| 3220 | Tousmouline | 32 | 4525 | yes | 6533993 |
| 2622 | Ouled Hellal | 67 | 4501 | yes | 2518403 |
| 1411 | Sebt | 14 | 4489 | yes | 6545434 |
| 4831 | Souk El Had | 48 | 4458 | yes | 6559422 |
| 2916 | Sidi Boussaid | 29 | 4453 | yes | 6668189 |
| 554 | Zana El Beïda | 5 | 4330 | yes | 5226646 |
| 3606 | Ain El Assel | 36 | 4268 | yes | 1614560 |
| 2810 | Ouled Madhi | 28 | 4164 | yes | 6547255 |
| 3807 | Melaab | 38 | 4105 | yes | 6534587 |
| 4605 | Bouzedjar | 46 | 4093 | yes | 6535202 |
| 2732 | Hassiane | 27 | 3993 | yes | 6660567 |
| 928 | Ain Romana | 9 | 3952 | yes | 2620528 |
| 2641 | Aïn Ouksir | 67 | 3897 | yes | 2897101 |
| 224 | Chettia | 2 | 3841 | yes | 4542228 |
| 1722 | Selmana | 66 | 3828 | yes | 6533527 |
| 2711 | Kheir-Eddine | 27 | 3733 | yes | 5757184 |
| 1947 | Ouled Sabor | 19 | 3685 | yes | 1617605 |
| 1554 | Iflissen | 15 | 3483 | yes | 4285481 |
| 1523 | Zekri | 15 | 3243 | yes | 4285366 |
| 2612 | Ouled Brahim | 26 | 3083 | yes | 2587075 |
| 917 | Souhane | 9 | 3081 | yes | 3830116 |
| 1316 | Zenata | 13 | 3056 | yes | 6666586 |
| 2915 | Makhda | 29 | 3030 | yes | 6668178 |
| 3621 | Ain Kerma | 36 | 2995 | yes | 1614523 |
| 605 | Chellata | 6 | 2990 | yes | 4069657 |
| 2716 | Sidi-Lakhdar | 27 | 2988 | yes | 6660580 |
| 3428 | El Annasseur | 34 | 2955 | yes | 4484791 |
| 228 | Labiod Medjadja | 2 | 2953 | yes | 5126924 |
| 2130 | Filfila | 21 | 2936 | yes | 5174375 |
| 2614 | Sidi Ziane | 26 | 2936 | yes | 2898796 |
| 4321 | Minar Zarza | 43 | 2914 | yes | 2155363 |
| 4232 | Sidi Ghiles | 42 | 2852 | yes | 2318188 |
| 1045 | Oued El Berdi | 10 | 2851 | yes | 3403611 |
| 4217 | Ain Tagourait | 42 | 2839 | yes | 2305516 |
| 1527 | Ait-Yahia | 15 | 2814 | yes | 2175824 |
| 1907 | Draa-Kebila | 19 | 2814 | **no** | 1625410 |
| 3816 | Larbaa | 38 | 2805 | yes | 6534583 |
| 2807 | Khoubana | 68 | 2775 | yes | 6547243 |
| 3103 | Bir El Djir | 31 | 2770 | yes | 2078699 |
| 1529 | Maatkas | 15 | 2660 | yes | 4293796 |
| 513 | Djerma | 5 | 2646 | yes | 5229598 |
| 2706 | Hassi Mameche | 27 | 2637 | yes | 5752722 |
| 4323 | Terrai Bainen | 43 | 2600 | yes | 2254248 |
| 1906 | Ain-Roua | 19 | 2598 | yes | 1625347 |
| 1503 | Akbil | 15 | 2589 | yes | 4288635 |
| 4320 | Derrahi Bousselah | 43 | 2583 | yes | 2163225 |
| 3430 | Ain Tesra | 34 | 2577 | yes | 4484871 |
| 523 | Fesdis | 5 | 2569 | yes | 4633179 |
| 235 | Beni Bouattab | 2 | 2547 | yes | 2785325 |
| 3102 | Gdyel | 31 | 2534 | yes | 4270862 |
| 4122 | Ragouba | 41 | 2520 | yes | 6663204 |
| 2242 | Belarbi | 22 | 2514 | yes | 6661976 |
| 3433 | Rabta | 34 | 2469 | yes | 4475556 |
| 118 | Sali | 1 | 2466 | yes | 4171618 |
| 1904 | Ouled Si Ahmed | 19 | 2439 | yes | 4307666 |
| 1015 | El Hachimia | 10 | 2366 | yes | 3403218 |
| 3301 | Illizi | 33 | 2344 | yes | 4174334 |
| 2239 | Sehala Thaoura | 22 | 2340 | yes | 6662000 |
| 645 | Dra El Caid | 6 | 2305 | yes | 4112846 |
| 3510 | Isser | 35 | 2275 | yes | 4273316 |
| 4823 | Kalaa | 48 | 2273 | yes | 6559400 |
| 1646 | Zeralda | 16 | 2257 | yes | 241408 |
| 1635 | Tessala El Merdja | 16 | 2252 | yes | 540604 |
| 3520 | Ouled Moussa | 35 | 2229 | yes | 3596000 |
| 5103 | Besbes | 51 | 2208 | yes | 4120758 |
| 1501 | Tizi-Ouzou | 15 | 2174 | yes | 3081643 |
| 5207 | El Ouata | 52 | 2139 | yes | 6530991 |
| 1633 | Les Eucalyptus | 16 | 2135 | yes | 157532 |
| 1530 | Ait Boumahdi | 15 | 2133 | yes | 4289197 |
| 631 | Taskriout | 6 | 2126 | yes | 4112874 |
| 1005 | Kadiria | 10 | 2117 | yes | 3459499 |
| 2659 | Bouaïchoune | 26 | 2106 | yes | 2548192 |
| 1539 | Ait-Aissa-Mimoun | 15 | 2097 | yes | 3080944 |
| 2307 | Cheurfa | 23 | 2070 | yes | 1616091 |
| 618 | Fenaia Il Maten | 6 | 2065 | yes | 4067950 |
| 733 | Khangat Sidi Nadji | 7 | 2041 | yes | 4120774 |
| 1016 | Aomar | 10 | 2039 | yes | 3422623 |
| 4507 | Asla | 45 | 2016 | yes | 6544115 |
| 306 | Hassi R'Mel | 3 | 2004 | yes | 6546023 |
| 731 | El Ghrous | 7 | 1999 | yes | 4120768 |
| 1626 | Djasr Kasentina | 16 | 1998 | yes | 2711708 |
| 3118 | El Braya | 31 | 1896 | yes | 4270378 |
| 712 | M'Chounèche | 7 | 1877 | yes | 4120777 |
| 2715 | Nekmaria | 27 | 1871 | yes | 6660572 |
| 412 | Ain Kercha | 4 | 1863 | yes | 4470516 |
| 1508 | Timizart | 15 | 1842 | yes | 3274799 |
| 405 | El Amiria | 4 | 1820 | yes | 3669980 |
| 1341 | Sidi Djillali | 63 | 1804 | yes | 6666589 |
| 3218 | Sidi Amar | 32 | 1801 | yes | 6533989 |
| 652 | Boudjellil | 6 | 1764 | yes | 4069763 |
| 1604 | Mohamed Belouzdad | 16 | 1760 | yes | 157175 |
| 1427 | Frenda | 14 | 1753 | yes | 6545426 |
| 2828 | Ouled Mansour | 28 | 1743 | yes | 6547256 |
| 1644 | Ain Benian | 16 | 1714 | yes | 542350 |
| 3204 | Brézina | 32 | 1714 | yes | 6533977 |
| 1555 | Boudjima | 15 | 1703 | yes | 3274166 |
| 2822 | Sidi Ameur | 68 | 1703 | yes | 6547259 |
| 5803 | Hassi Gara | 58 | 1689 | yes | 5118975 |
| 2205 | Telagh | 22 | 1688 | yes | 6662015 |
| 5104 | Sidi Khaled | 51 | 1657 | yes | 4120785 |
| 3911 | Debila | 39 | 1656 | yes | 5139056 |
| 3532 | Boudouaou El Bahri | 35 | 1650 | yes | 3018662 |
| 3121 | Hassi Mefsoukh | 31 | 1637 | yes | 4270902 |
| 503 | Maafa | 5 | 1634 | yes | 5195796 |
| 222 | Abou El Hassane | 2 | 1625 | yes | 4844288 |
| 3101 | Oran | 31 | 1612 | yes | 1259562 |
| 3506 | Baghlia | 35 | 1593 | yes | 4274938 |
| 5509 | Temacine | 55 | 1591 | yes | 6542943 |
| 817 | Abadla | 8 | 1590 | yes | 6530985 |
| 2601 | Médéa | 26 | 1539 | yes | 2563082 |
| 1515 | Beni-Aissi | 15 | 1537 | yes | 4291589 |
| 1628 | Hydra | 16 | 1525 | yes | 545879 |
| 3109 | Ain Turk | 31 | 1523 | yes | 1259773 |
| 3811 | Khemisti | 38 | 1501 | yes | 6534581 |
| 3429 | Tassamert | 34 | 1494 | yes | 4424736 |
| 2502 | Hamma Bouziane | 25 | 1493 | yes | 4434597 |
| 1434 | Mechraa Sfa | 14 | 1491 | yes | 6545431 |
| 1043 | Ath Mansour | 10 | 1481 | yes | 3390977 |
| 542 | Barika | 60 | 1450 | yes | 5176213 |
| 1719 | Sidi Ladjel | 65 | 1429 | yes | 6533529 |
| 2131 | Cheraia | 21 | 1428 | yes | 6407346 |
| 4601 | Ain Temouchent | 46 | 1427 | yes | 6535198 |
| 3404 | Mansoura | 34 | 1420 | yes | 4474340 |
| 5512 | Megarine | 55 | 1416 | yes | 6542940 |
| 1109 | Ain Amguel | 11 | 1407 | yes | 4175370 |
| 3403 | Bordj Zemmoura | 34 | 1404 | yes | 4424825 |
| 4611 | Chentouf | 46 | 1402 | yes | 6535204 |
| 520 | Ouled Sellem | 5 | 1400 | yes | 4727888 |
| 1417 | Sidi Abdelghani | 14 | 1395 | yes | 6545442 |
| 229 | Oued Fodda | 2 | 1393 | yes | 2789469 |
| 3004 | Hassi Messaoud | 30 | 1372 | yes | 6542939 |
| 410 | Ouled Hamla | 4 | 1369 | yes | 4432661 |
| 2111 | Beni Zid | 21 | 1351 | **no** | 6543282 |
| 3104 | Hassi Bounif | 31 | 1347 | yes | 2079112 |
| 2201 | Sidi Bel-Abbes | 22 | 1333 | yes | 2361464 |
| 4828 | Mendes | 48 | 1322 | yes | 6559407 |
| 547 | Teniet El Abed | 5 | 1320 | yes | 5201404 |
| 406 | Sigus | 4 | 1319 | yes | 3669909 |
| 3419 | Hasnaoua | 34 | 1315 | yes | 4472187 |
| 3701 | Tindouf | 37 | 1310 | yes | 4101596 |
| 1566 | Assi-Youcef | 15 | 1309 | yes | 4293167 |
| 2628 | Sidi Zahar | 26 | 1308 | yes | 2898797 |
| 1937 | El Ouricia | 19 | 1304 | yes | 1618273 |
| 1654 | Douira | 16 | 1297 | yes | 540605 |
| 3108 | Marsat El Hadjadj | 31 | 1291 | yes | 3170951 |
| 4814 | Djidiouia | 48 | 1289 | yes | 6559366 |
| 1524 | Ouaguenoun | 15 | 1271 | yes | 3080287 |
| 724 | Ourlal | 7 | 1266 | yes | 4120783 |
| 2306 | Oued El Aneb | 23 | 1262 | yes | 1616122 |
| 5002 | Timiaouine | 50 | 1254 | yes | 4171623 |
| 2724 | Souaflia | 27 | 1253 | yes | 6660582 |
| 922 | Oued Djer | 9 | 1236 | yes | 2614832 |
| 624 | Adekar | 6 | 1224 | yes | 4067907 |
| 721 | Tolga | 7 | 1220 | yes | 4120787 |
| 5502 | Blidet Amor | 55 | 1218 | yes | 6542935 |
| 1516 | Beni Zmenzer | 15 | 1217 | yes | 4292527 |
| 1219 | Ouenza | 12 | 1193 | yes | 6618848 |
| 4708 | Zelfana | 47 | 1182 | yes | 4874098 |
| 1642 | Rouiba | 16 | 1181 | yes | 157480 |
| 4901 | Timimoun | 49 | 1169 | yes | 4171624 |
| 4506 | Moghrar | 45 | 1167 | yes | 6544123 |
| 2223 | Ras El Ma | 22 | 1165 | yes | 6661998 |
| 3407 | El Achir | 34 | 1152 | yes | 4474509 |
| 4124 | Oued Kebrit | 41 | 1150 | yes | 6663199 |
| 4105 | Ouled Driss | 41 | 1149 | yes | 6663201 |
| 4416 | Rouina | 44 | 1148 | yes | 2756568 |
| 902 | Chebli | 9 | 1139 | yes | 3827714 |
| 2925 | Ain Frass | 29 | 1129 | yes | 5581838 |
| 711 | Sidi Okba | 7 | 1112 | yes | 4120786 |
| 3514 | Chabet El Ameur | 35 | 1110 | yes | 4273200 |
| 1956 | Guelta Zerka | 19 | 1108 | yes | 1618503 |
| 927 | Guerrouaou | 9 | 1100 | yes | 3827421 |
| 2509 | Ouled Rahmoun | 25 | 1097 | yes | 4437575 |
| 2918 | Ain Fekan | 29 | 1092 | yes | 5482554 |
| 4405 | Hammam-Righa | 44 | 1090 | yes | 2625844 |
| 1946 | Beni-Mouhli | 19 | 1088 | yes | 1625369 |
| 1826 | Bordj T'har | 18 | 1072 | yes | 6669719 |
| 3116 | Bousfer | 31 | 1068 | yes | 4267270 |
| 2721 | Ain-Sidi Cherif | 27 | 1066 | yes | 6660564 |
| 2301 | Annaba | 23 | 1065 | yes | 1616109 |
| 1558 | Ait Khellili | 15 | 1051 | yes | 4285690 |
| 4213 | Sidi-Amar | 42 | 1047 | yes | 2312607 |
| 723 | Lichana | 7 | 1046 | yes | 4120775 |
| 2405 | Tamlouka | 24 | 1043 | yes | 6537650 |
| 3507 | Sidi Daoud | 35 | 1042 | yes | 4274575 |
| 1507 | Irdjen | 15 | 1037 | yes | 4285909 |
| 603 | Feraoun | 6 | 1036 | yes | 4112903 |
| 3533 | Ouled Hedadj | 35 | 1031 | yes | 4272376 |
| 1652 | El Achour | 16 | 1029 | yes | 544815 |
| 4505 | Sfissifa | 45 | 1029 | yes | 6544125 |
| 702 | Oumache | 7 | 1023 | yes | 4120782 |
| 4709 | Sebseb | 47 | 1022 | yes | 5012624 |
| 4701 | Ghardaia | 47 | 1013 | yes | 4503228 |
