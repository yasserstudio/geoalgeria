[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/pharma

**القطاع الصيدلاني في الجزائر — بتثبيت واحد.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/pharma)](https://www.npmjs.com/package/@geoalgeria/pharma)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

حزمة جامعة تُعيد تصدير مجموعات بيانات الصيدلة في GeoAlgeria، لتثبّتها كلها دفعة واحدة. جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/pharma
```

```js
import pharma from "@geoalgeria/pharma";

pharma.industrie.manufacturers();   // مصنّعو الأدوية والأجهزة الطبية (سجل الوزارة)
pharma.pharmacies.pharmacies();     // الصيدليات (OpenStreetMap)

// أو استيراد عضو مباشرةً:
import { pharmacies } from "@geoalgeria/pharma";
```

## الأعضاء

| مساحة الاسم | الحزمة | المحتوى |
| --- | --- | --- |
| `industrie` | [`@geoalgeria/industrie-pharmaceutique`](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique) | مصنّعو الأدوية (PP) والأجهزة الطبية (DM) المعتمدون (وزارة الصناعة الصيدلانية) |
| `pharmacies` | [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) | الصيدليات (OpenStreetMap) |

> قد تنضمّ مكوّنات أخرى للقطاع لاحقًا (مثل طبقة مخابر التحاليل عند توفّر تغطية مفتوحة كافية). تثبيت `@geoalgeria/pharma` يبقيك على المجموعة الكاملة.

## المصدر والترخيص

كل عضو يحمل مصدره ونسبته الخاصة (انظر README الخاص به) — سجل الوزارة لـ `industrie`، وOpenStreetMap (ODbL) لـ `pharmacies`. شيفرة الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح مسألة: https://github.com/yasserstudio/geoalgeria/issues
