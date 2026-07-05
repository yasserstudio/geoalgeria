[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/ooredoo

**شبكة نقاط بيع أوريدو الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ooredoo)](https://www.npmjs.com/package/@geoalgeria/ooredoo)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# نظرة عامة

572 نقطة بيع لأوريدو موزّعة على **63 ولاية** — فضاءات أوريدو (EO)، ومتاجر المدينة (CSO)، وفضاءات الخدمات (ESO) — من واجهة تحديد المواقع الخاصة بالمتعامل، لكلٍّ منها **إحداثيات حقيقية** وربط بالولاية/البلدية. يكمل ثلاثي الاتصالات مع [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) و[`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy).

## التثبيت

```bash
npm install @geoalgeria/ooredoo
```

## بداية سريعة

```js
import { stores, storesByType, storesByWilaya, metadata } from "@geoalgeria/ooredoo";

stores().length; // 572
storesByType("ESO").length; // 436
storesByWilaya(16).map((r) => r.name); // الجزائر العاصمة
metadata().wilayas_covered; // 63
```

## المحتوى

| النوع | العدد | المعنى |
| --- | --- | --- |
| `EO` | 100 | فضاء أوريدو |
| `ESO` | 436 | فضاء خدمات أوريدو |
| `CSO` | 36 | متجر أوريدو |

الإحداثيات: الكل 572 بدقّة `exact`.

## الصيغ

- `data/stores.json` — المصفوفة الكاملة (مُنمّطة عبر `types/index.d.ts`)
- `data/csv/stores.csv` — CSV مسطّح
- `data/geojson/stores.geojson` — `FeatureCollection`
- `data/metadata.json` — الأعداد والمصادر وتاريخ التوليد

## الدقة

> الأسماء والأنواع والإحداثيات من **المتعامل** (`geo_precision: "exact"`). الولاية دقيقة فعليًا (من النقطة المُعايَنة)؛ والبلدية أقرب مركز (بأفضل جهد). بما أنّ الواجهة تصنّف النقاط وفق تقسيم 48 ولاية القديم، يُعاد اشتقاق الولاية/البلدية من الإحداثيات إلى تقسيم 69 ولاية الحالي؛ وتُحفظ ولاية المتعامل المُعلنة في `operator_wilaya`.

## المصدر والترخيص

البيانات © **أوريدو الجزائر**، يُعاد نشرها كمرجع (بنفس وضع `@geoalgeria/mobilis` / `@geoalgeria/djezzy`). الربط بالولاية/البلدية يستخدم مجموعة بيانات geoalgeria الأساسية. شيفرة الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح مسألة: https://github.com/yasserstudio/geoalgeria/issues
