[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center" dir="rtl">

# @geoalgeria/ferroviaire

**النقل بالسكك الحديدية والحضري في الجزائر — كل محطة وموقف، كبيانات جاهزة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ferroviaire)](https://www.npmjs.com/package/@geoalgeria/ferroviaire)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/ferroviaire)](https://www.npmjs.com/package/@geoalgeria/ferroviaire)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

<div dir="rtl">

692 عقدة للنقل بالسكك الحديدية والنقل الحضري في الجزائر — **محطات القطار، محطات الترامواي،
محطات المترو، التلفريك والتلفريك المعلّق** — مع أسماء ثنائية اللغة (فر/عر)، المُشغّل
(SNTF / SETRAM / SEMA)، الخط، الإحداثيات، والربط بالولاية/البلدية. تجميعة من Wikidata و
OpenStreetMap، بصيغ JSON و CSV و GeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **المشغّلون (المصادر):** SNTF (السكك)، SETRAM (الترامواي)، SEMA/EMA (مترو الجزائر).
> أما **المحطات البرية للحافلات** ففي [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres).

</div>

```bash
npm install @geoalgeria/ferroviaire
```

```js
import ferroviaire from "@geoalgeria/ferroviaire";

const all = ferroviaire.stations();               // 692
const trams = ferroviaire.stationsByType("tram");  // 190
const alger = ferroviaire.stationsByWilaya(16);
```

<div dir="rtl">

## المحتوى

| النوع | العدد | المُشغّل |
| --- | --- | --- |
| سكك حديدية (قطار) | **427** | SNTF |
| ترامواي | **190** | SETRAM (7 شبكات) |
| مترو | **41** | SEMA — مترو الجزائر |
| تلفريك | **24** | — |
| تلفريك معلّق | **10** | — |

تغطي **50 ولاية**، وكلها مُحدّدة جغرافيًا. يرتبط `wilaya_code` بنموذج الـ69 ولاية في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## المصدر والرخصة

تجميعة من **Wikidata** (CC0) و**OpenStreetMap** (© مساهمو OpenStreetMap، ODbL 1.0)، مع
المشغّلين **SNTF** و**SETRAM** و**SEMA/EMA**. الشيفرة تحت [MIT](LICENSE)؛ وتبقى بيانات
OSM تحت ODbL — احتفظ بالإسناد. تحقّق من المشغّلين للمعلومات الرسمية.

[تصفّح كل الحزم →](https://geoalgeria.com/data)

</div>

---

<div dir="rtl">

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)

</div>
