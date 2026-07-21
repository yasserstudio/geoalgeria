[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/industrie-pharmaceutique

**المصنّعون الصيدلانيون المعتمدون في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/industrie-pharmaceutique)](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# نظرة عامة

171 **مصنّعًا** صيدلانيًا معتمدًا من سجل التصنيع لدى **وزارة الصناعة الصيدلانية** (اعتماد التصنيع، محدّث في 28/06/2026) — مصنّعو الأدوية (PP)، ومصنّعو الأجهزة الطبية (DM)، والمنتجون المختلطون — ثنائيو اللغة (فرنسي/عربي)، مصنّفون حسب الطبيعة، مع ربط بالولاية/البلدية وإحداثيات.

## التثبيت

```bash
npm install @geoalgeria/industrie-pharmaceutique
```

## بداية سريعة

```js
import {
  manufacturers,
  manufacturersByNature,
  manufacturersByWilaya,
  metadata,
} from "@geoalgeria/industrie-pharmaceutique";

manufacturers().length; // 171
manufacturersByNature("pp").length; // 120 (أدوية)
manufacturersByWilaya(16).map((r) => r.name); // الجزائر العاصمة
metadata().wilayas_covered; // 25
```

## المحتوى

| الطبيعة | العدد | المعنى |
| --- | --- | --- |
| `pp` | 120 | منتجات صيدلانية — مصنّعو الأدوية |
| `dm` | 48 | أجهزة طبية — مصنّعو الأجهزة |
| `mixte` | 3 | كلاهما (PP + DM) |

**طريقة تحديد الإحداثيات** (`geo_method`): `commune_centroid` (126) · `wilaya_centroid` (45).
جميع السجلات الـ171 تحمل `geo_precision: "approximate"` (لا يتضمّن السجل إحداثيات حقيقية؛
كل نقطة هي مركز جغرافي، وليست دقيقة أبدًا).

## الصيغ

- `data/industrie-pharmaceutique.json` — المصفوفة الكاملة (مُنمّطة عبر `types/index.d.ts`)
- `data/csv/industrie-pharmaceutique.csv` — CSV مسطّح
- `data/geojson/industrie-pharmaceutique.geojson` — `FeatureCollection`
- `data/metadata.json` — الأعداد والمصادر وتاريخ التوليد

## حول الدقة

> أسماء المتعاملين وطبيعة PP/DM **رسمية** (سجل الوزارة). لا يتضمّن السجل أي إحداثيات: يوضَع كل سجلّ عند مركز بلديته المُحدَّدة، أو — عند معرفة الولاية فقط — عند مركز الولاية (انظر `geo_method`؛ قيمة `geo_precision` هي `"approximate"` لكل سجل).
هذه مواقع تقريبية للولاية/البلدية، وليست نقاطًا مساحية للمصنع.
>
> **التغطية:** 171 من ~186 مؤسسة تصنيع معتمدة مُموقَعة هنا. الباقون إمّا مناولون من الباطن (بلا موقع خاص) أو مصنّعو أجهزة صغار جدًا بلا عنوان قابل للتحديد — حُذفوا بدل تحديدهم تخمينًا. المستوردون وتجار الجملة ومؤسسات الاستغلال والترويج سجلات منفصلة لدى الوزارة، غير مُدرَجة هنا.

## المصدر والترخيص

بيانات من سجل التصنيع لدى **وزارة الصناعة الصيدلانية** — قائمة واقعية من القطاع العام، يُعاد نشرها كمرجع. الربط بالولاية/البلدية عبر مجموعة بيانات geoalgeria الأساسية. شيفرة الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح مسألة: https://github.com/yasserstudio/geoalgeria/issues
