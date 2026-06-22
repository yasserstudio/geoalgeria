[English](README.md) | **Français** | [العربية](README.ar.md)

<div align="center">

# @geoalgeria/banques

**Toutes les banques d'Algérie — sous forme de données installables.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/banques)](https://www.npmjs.com/package/@geoalgeria/banques)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Les **21 banques** et **8 établissements financiers** agréés par la Banque
d'Algérie — avec noms FR/AR, le **`bank_code`** RIB à 3 chiffres, le type de
propriété (publique / étrangère / privée nationale) + **groupe de contrôle**,
**SWIFT/BIC**, site web, adresse du siège social et rattachement à la wilaya.
Compilé à partir de la liste officielle de la Banque d'Algérie (Journal Officiel
n° 9, 6 février 2026) et du site de chaque établissement. Fait partie de
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/banques
```

```js
import banques from "@geoalgeria/banques";

banques.banks();              // 21 banques agréées
banques.institutions();       // 8 établissements financiers
banques.all();                // 29, banques en premier
banques.byId("BNA");          // → Banque Nationale d'Algérie (par id ou acronyme)
```

## Contenu

| Jeu de données | Nombre | Notes |
| --- | --- | --- |
| Banques | **21** | 7 publiques · 14 à capitaux étrangers — code banque RIB, nom FR/AR, propriété + groupe, pays, SWIFT/BIC, siège |
| Établissements financiers | **8** | crédit-bail, refinancement et crédit mutuel (non-dépôt) |
| Agences | **1 704** | **les 21 banques** — nom, adresse, téléphone, wilaya, coordonnées ; 1 213 géocodées ; **67/69 wilayas** |

Chaque enregistrement porte un `wilaya_code` (siège social) rattaché au modèle
69 wilayas de [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## Provenance et transparence

- Le **registre** est la liste agréée actuelle de la Banque d'Algérie, vérifiée à
  21 banques + 8 établissements (Ziraat Bankası, agréée en janvier 2025, est la
  banque la plus récente).
- Les champs non confirmables par une source officielle sont **`null`**, jamais
  devinés — la plupart des banques étrangères ne publient pas de nom arabe ; les
  établissements financiers n'ont pas de SWIFT/BIC ; quelques adresses de siège
  sont approximatives et pourront être affinées.
- Les valeurs SWIFT/BIC correspondent aux variantes siège (`…XXX`).
- Les **coordonnées des agences** ne sont conservées que si elles se situent en
  Algérie (et, pour les banques dont le localisateur se contente de géocoder les
  adresses, concordent avec la wilaya déclarée de l'agence) ; sinon le point est
  supprimé et la wilaya conservée — jamais de coordonnée devinée. Les pages de
  localisation sont récupérées avec la vérification TLS désactivée (`curl -k`)
  car plusieurs hôtes bancaires `.dz` servent des certificats invalides.
- **Banques sans coordonnées** (BNH, HBTF, Fransabank, BEA, SGA) : ces agences
  sont livrées avec `lat`/`lng` `null` et une wilaya déduite de la localité en
  fin d'adresse. Le localisateur d'**AGB** est protégé par un défi anti-bot :
  ses 63 agences sont capturées via un navigateur headless et rafraîchies
  manuellement ; **Arab Bank** ne publie que des points au niveau ville (nom +
  coordonnées, sans adresse). **BDL** et **Trust Bank** proviennent des
  Google My Maps (KML) publiés par chaque banque ; **Citibank**, **HSBC** et
  **Ziraat** correspondent à leur bureau unique à Alger.
- **`bank_code`** est le _code banque_ RIB à 3 chiffres (positions 5–7 de
  l'IBAN), vérifié contre des tables de codes banque indépendantes — il n'existe
  pas de registre officiel public unique. BNH et Ziraat (toutes deux nouvellement
  agréées) n'ont pas encore de code publié → `null`. Les établissements
  financiers, n'étant pas des établissements de dépôt, ne portent pas de
  `bank_code`.

## Feuille de route (ce paquet)

Le registre est la première couche ; les **agences** couvrent désormais
**les 21 banques / 1 704 agences** (67/69 wilayas). Chaque banque publie son
réseau via un localisateur différent — Joomla `com_mymaplocations`,
WordPress store-locator / extensions cartographiques, bundle Vite SPA, pages
ASP.NET/TYPO3, JSON intégré, Google My Maps KML — les banques sont donc ajoutées
un extracteur à la fois (voir `scripts/fetch.mjs`). Les localisateurs sans
coordonnées livrent `lat`/`lng` `null` (wilaya déduite de l'adresse) ; lorsque
les coordonnées d'une source ne concordent pas avec la wilaya déclarée de
l'agence, elles sont supprimées plutôt que livrées erronées. Encore à venir sous
le même `@geoalgeria/banques` :

- **DAB/GAB** — là où les banques publient des localisateurs ; honnêteté assumée
  sur la complétude, l'Algérie n'ayant pas de répertoire public unique de DAB.

## Formats

`banks.json` et `institutions.json` s'importent directement ; des miroirs
**CSV** se trouvent sous [`data/csv/`](data/csv) et sont inclus dans chaque
[release GitHub](https://github.com/yasserstudio/geoalgeria/releases). Les
chargeurs et les formes d'enregistrement sont entièrement **typés**.

## Avertissement

`@geoalgeria/banques` est un jeu de données ouvert **indépendant**. Il n'est
**ni affilié à, ni approuvé par, ni lié à** la Banque d'Algérie ou à toute
banque ou établissement listé ; leurs noms, acronymes et codes **SWIFT/BIC**
appartiennent à leurs propriétaires respectifs et ne sont utilisés qu'à des fins
d'identification. Les données sont compilées à partir de sources publiques et
fournies **« en l'état », sans garantie** — elles peuvent être incomplètes ou
obsolètes. **Vérifiez le `bank_code` / SWIFT-BIC et les détails des agences
auprès de la source officielle avant tout usage financier, de paiement, KYC ou
de conformité.** Rien ici ne constitue un conseil financier ou juridique. Pour
signaler une erreur ou demander une correction/suppression,
[ouvrez un ticket](https://github.com/yasserstudio/geoalgeria/issues/new/choose).

Conditions complètes : voir le [**DISCLAIMER**](https://github.com/yasserstudio/geoalgeria/blob/main/DISCLAIMER.md) du projet.

## Licence

**Code** (chargeurs, types) : [MIT](LICENSE). **Données** : données factuelles
publiques (listes réglementaires + localisateur public de chaque établissement),
redistribuées à titre de référence ; l'attribution est appréciée, et vous restez
responsable des conditions des sources originales.

[Documentation API et référence des champs →](https://geoalgeria.com/data/docs/banques) · [Parcourir tous les paquets →](https://geoalgeria.com/data)

---

Fait par [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
