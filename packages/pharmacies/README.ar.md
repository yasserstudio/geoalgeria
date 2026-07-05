[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/pharmacies

**صيدليات الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/pharmacies)](https://www.npmjs.com/package/@geoalgeria/pharmacies)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# نظرة عامة

3٬790 صيدلية موزّعة على **67 ولاية**، من **OpenStreetMap** — كل سجلّ مُموقَع جغرافيًا، ثنائي اللغة (فرنسي/عربي) عند وجود اسم، مع الهاتف وساعات العمل ومؤشّر `dispensing` حيثما توفّر في OSM، إضافةً إلى الربط بالولاية/البلدية.

## التثبيت

```bash
npm install @geoalgeria/pharmacies
```

## بداية سريعة

```js
import {
  pharmacies,
  pharmacyById,
  pharmaciesByWilaya,
  metadata,
} from "@geoalgeria/pharmacies";

pharmacies().length; // 3790
pharmaciesByWilaya(16).length; // الجزائر العاصمة
pharmacyById("16-00001")?.commune;
metadata().wilayas_covered; // 67
```

## المحتوى

| المجموعة | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| `pharmacies` | 3٬790 | الكل | OpenStreetMap، مُموقَع، مربوط بالولاية/البلدية |

- **مسمّاة:** 2٬459 · **بهاتف:** 146 · **بساعات عمل:** 255 · **بعنوان:** 1٬159 · **بمؤشّر `dispensing`:** 524

## الصيغ

- `data/pharmacies.json` — المصفوفة الكاملة (مُنمّطة عبر `types/index.d.ts`)
- `data/csv/pharmacies.csv` — CSV مسطّح
- `data/geojson/pharmacies.geojson` — `FeatureCollection`
- `data/metadata.json` — الأعداد والمصادر وتاريخ التوليد

## الدقة والتغطية

> **التغطية جزئية.** 3٬790 صيدلية مُرسَّمة في OpenStreetMap مقابل ما يُقدَّر بنحو **~11٬000 صيدلية** على المستوى الوطني (رتبة قدرٍ تقريبية — لا يوجد سجل رسمي مفتوح؛ بوابة المجلس الوطني للصيادلة خارج الخدمة). التغطية متفاوتة بين الولايات وأكثف في الشمال — هذه مجموعة يحرّرها المجتمع، **وليست سجلًّا رسميًا**.
>
> الإحداثيات نقاط OSM (مُعايَنة) أو مراكز مبانٍ (`geo_precision`). البلدية أقرب مركز (بأفضل جهد)؛ الولاية دقيقة فعليًا. الأسماء والهواتف والساعات موجودة فقط حيث أدرجها مساهم في OSM.

## المصدر والترخيص

البيانات © **مساهمو OpenStreetMap**، بترخيص **ODbL 1.0**. أي إعادة توزيع يجب أن تنسب المصدر إلى OpenStreetMap وتبقى تحت ODbL. الربط بالولاية/البلدية يستخدم مجموعة بيانات geoalgeria الأساسية. شيفرة الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح مسألة: https://github.com/yasserstudio/geoalgeria/issues
