# National urban and suburban bus Operator inventory

Local research artifact covering all 69 Algerian Wilayas. It consolidates the legal Operator backbone and three source-audit batches without promoting, publishing, or releasing protected data.

Regenerate with:

```sh
node research/buses/national/build-national-inventory.mjs
```

## Audit summary

- wilaya count: 69
- legal operator established: 58
- legal review needed: 11
- operators with stable ids: 58
- wilayas with operator owned sources: 11
- wilayas with line refs or counts: 12
- wilayas with ordered station evidence: 5
- wilayas with geometry evidence: 3
- wilayas with schedule evidence: 5
- wilayas with live data leads: 5
- wilayas with verified logos: 6
- wilayas with open reuse grants in audited operator sources: 0
- wilayas with conflicts: 16
- wilayas with blockers: 69
- wilayas in reusable package: 8
- reusable package lines: 85
- reusable package shapes: 47
- reusable package stations: 1290

“yes” means observed structured evidence, “lead” means partial, claimed, validation-only, or protected evidence, “no” means unavailable in this audit, and “?” means unknown. Evidence does not imply reuse permission; see each JSON record’s sources, blockers, conflicts, and retained raw evidence.

## Wilaya matrix

Code | Wilaya | Operator ID | Audited sources | Source Line facts | Reusable Lines | Shapes | Stations | Source Station evidence | Source geometry | Schedules | Live | Logo | Blockers
--- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | ---:
01 | Adrar | etus-adrar | 1 | — | — | — | — | ? | ? | ? | no | no | 2
02 | Chlef | etuc-chlef | 1 | 5 | — | — | — | lead | ? | ? | no | no | 3
03 | Laghouat | etusl-laghouat | 0 | — | — | — | — | ? | ? | ? | no | no | 1
04 | Oum El Bouaghi | etus-oeb | 1 | — | — | — | — | ? | ? | ? | no | no | 1
05 | Batna | etu-batna | 0 | — | — | — | — | ? | ? | ? | no | no | 1
06 | Béjaïa | etus-bejaia | 3 | 5 | 5 | — | — | no | lead | ? | lead | yes | 3
07 | Biskra | etu-biskra | 0 | — | — | — | — | ? | ? | ? | no | no | 1
08 | Béchar | etu-bechar | 0 | — | — | — | — | ? | ? | ? | no | no | 1
09 | Blida | etu-blida | 0 | — | — | — | — | ? | ? | ? | no | no | 2
10 | Bouira | etub-bouira | 2 | 1 | — | — | — | yes | ? | lead | no | no | 2
11 | Tamanrasset | etus-tamanrasset | 0 | — | — | — | — | ? | ? | ? | no | no | 2
12 | Tébessa | etu-tebessa | 0 | — | — | — | — | ? | ? | ? | no | no | 1
13 | Tlemcen | etu-tlemcen | 0 | — | — | — | — | ? | ? | ? | no | no | 1
14 | Tiaret | etus-tiaret | 1 | 7 | 7 | 7 | 405 | yes | ? | ? | no | yes | 3
15 | Tizi Ouzou | etusto | 2 | 5 | 5 | 3 | 30 | ? | lead | yes | no | yes | 3
16 | Alger | etusa | 3 | — | 50 | 33 | 593 | no | no | lead | no | no | 3
17 | Djelfa | etu-djelfa | 0 | — | — | — | — | ? | ? | ? | no | no | 1
18 | Jijel | etus-jijel | 2 | — | — | — | — | ? | ? | ? | lead | no | 3
19 | Sétif | etus-setif | 1 | — | 5 | 3 | 229 | ? | ? | ? | lead | no | 2
20 | Saïda | etus-saida | 1 | — | — | — | — | ? | ? | ? | no | no | 1
21 | Skikda | etus-skikda | 2 | — | — | — | — | ? | ? | ? | lead | no | 2
22 | Sidi Bel Abbès | etu-sidi-bel-abbes | 1 | — | 8 | — | — | ? | ? | ? | no | no | 2
23 | Annaba | etus-annaba | 2 | — | — | — | — | ? | no | ? | lead | no | 3
24 | Guelma | etus-guelma | 3 | — | — | — | — | no | no | no | no | no | 2
25 | Constantine | etusc-constantine | 2 | — | — | — | — | no | no | no | no | no | 2
26 | Médéa | etus-medea | 1 | — | — | — | — | no | no | no | no | no | 2
27 | Mostaganem | etus-mostaganem | 0 | — | 1 | 1 | 33 | no | no | no | no | no | 2
28 | M'sila | etus-msila | 1 | — | 4 | — | — | no | no | no | no | no | 2
29 | Mascara | etus-mascara | 3 | 6 | — | — | — | yes | yes | no | no | yes | 3
30 | Ouargla | etus-ouargla | 3 | — | — | — | — | no | no | no | no | no | 2
31 | Oran | etus-oran | 6 | 4 | — | — | — | no | no | no | no | yes | 3
32 | El Bayadh | etus-el-bayadh | 0 | — | — | — | — | no | no | no | no | no | 1
33 | Illizi | etus-illizi | 1 | 4 | — | — | — | no | no | yes | no | no | 2
34 | Bordj Bou Arreridj | etus-bordj-bou-arreridj | 0 | — | — | — | — | no | no | no | no | no | 1
35 | Boumerdès | etus-boumerdes | 0 | — | — | — | — | no | no | no | no | no | 1
36 | El Tarf | etus-el-tarf | 1 | — | — | — | — | no | no | no | no | no | 2
37 | Tindouf | etus-tindouf | 0 | — | — | — | — | no | no | no | no | no | 1
38 | Tissemsilt | etus-tissemsilt | 0 | — | — | — | — | no | no | no | no | no | 1
39 | El Oued | etus-el-oued | 0 | — | — | — | — | no | no | no | no | no | 1
40 | Khenchela | etus-khenchela | 0 | — | — | — | — | no | no | no | no | no | 1
41 | Souk Ahras | etus-souk-ahras | 2 | 10 | — | — | — | no | no | yes | no | yes | 3
42 | Tipaza | etus-tipaza | 2 | 1 | — | — | — | yes | no | no | no | no | 3
43 | Mila | etus-mila | 3 | — | — | — | — | no | no | no | no | no | 3
44 | Aïn Defla | etuad | 2 | — | — | — | — | no | no | no | no | no | 2
45 | Naâma | etus-naama | 1 | — | — | — | — | no | no | no | no | no | 2
46 | Aïn Témouchent | etus-ain-temouchent | 0 | — | — | — | — | no | no | no | no | no | 1
47 | Ghardaïa | etus-ghardaia | 3 | 12 | — | — | — | no | no | no | no | no | 3
48 | Relizane | etus-relizane | 1 | — | — | — | — | no | no | no | no | no | 2
49 | Timimoun | etus-timimoun | 2 | — | — | — | — | no | no | no | no | no | 4
50 | Bordj Badji Mokhtar | etus-bordj-badji-mokhtar | 1 | — | — | — | — | no | no | no | no | no | 3
51 | Ouled Djellal | etus-ouled-djellal | 1 | — | — | — | — | no | no | no | no | no | 3
52 | Béni Abbès | etus-beni-abbes | 1 | — | — | — | — | no | no | no | no | no | 2
53 | In Salah | etus-in-salah | 0 | — | — | — | — | no | no | no | no | no | 2
54 | In Guezzam | etus-in-guezzam | 0 | — | — | — | — | no | no | no | no | no | 2
55 | Touggourt | etus-touggourt | 4 | 3 | — | — | — | no | no | no | no | no | 4
56 | Djanet | etus-djanet | 1 | — | — | — | — | no | no | no | no | no | 2
57 | El M'Ghair | etus-el-mghair | 1 | — | — | — | — | no | no | no | no | no | 2
58 | El Meniaa | etus-el-meniaa | 2 | — | — | — | — | no | no | no | no | no | 2
59 | Aflou | — | 0 | — | — | — | — | no | no | no | no | no | 3
60 | Barika | — | 0 | — | — | — | — | no | no | no | no | no | 3
61 | El Kantara | — | 0 | — | — | — | — | no | no | no | no | no | 3
62 | Bir El Ater | — | 0 | — | — | — | — | no | no | no | no | no | 3
63 | El Aricha | — | 0 | — | — | — | — | no | no | no | no | no | 3
64 | Ksar Chellala | — | 0 | — | — | — | — | no | no | no | no | no | 3
65 | Aïn Oussera | — | 2 | — | — | — | — | no | no | no | no | no | 3
66 | Messaad | — | 1 | — | — | — | — | no | no | no | no | no | 3
67 | Ksar El Boukhari | — | 1 | — | — | — | — | no | no | no | no | no | 2
68 | Bou Saâda | — | 1 | — | — | — | — | no | no | no | no | no | 3
69 | El Abiodh Sidi Cheikh | — | 0 | — | — | — | — | no | no | no | no | no | 3
