[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/agriculture

**مؤسسات القطاع الفلاحي في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/agriculture)](https://www.npmjs.com/package/@geoalgeria/agriculture)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/agriculture)](https://www.npmjs.com/package/@geoalgeria/agriculture)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# نظرة عامة

196 مؤسسة من القطاع الفلاحي مستخرجة من دليل **وزارة الفلاحة والتنمية الريفية والصيد البحري** — مديريات المصالح الفلاحية، محافظات الغابات، المعاهد التقنية ومراكز البحث، مراكز التكوين، الغرف الفلاحية، الدواوين والمجمعات العمومية — ثنائية اللغة (فرنسي/عربي)، مصنّفة، مع ربط بالولاية/البلدية وإحداثيات.

## التثبيت

```bash
npm install @geoalgeria/agriculture
```

## بداية سريعة

```js
import { agriculture, institutionsByWilaya, institutionsByType } from "@geoalgeria/agriculture";

agriculture().length; // 196

// كل مديريات المصالح الفلاحية (واحدة لكل ولاية)
institutionsByType("dsa").length; // 58

// كل شيء في الجزائر العاصمة (الرمز 16)
institutionsByWilaya(16).map((r) => r.name);
```

## ماذا يمكنك أن تبني

- دليل/محدّد مواقع للمؤسسات الفلاحية حسب الولاية
- دفتر اتصالات للمعاهد والدواوين والمجمعات الوطنية (هاتف/فاكس)
- طبقة خرائطية للبصمة الإدارية للقطاع الفلاحي

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| `agriculture` | 196 | الـ196 كلها | دليل الوزارة، مُحدَّد بمركز البلدية/الولاية |

**حسب الشبكة (`type`)**

| النوع | العدد | المعنى |
| --- | --- | --- |
| `dsa` | 58 | مديريات المصالح الفلاحية (واحدة لكل ولاية) |
| `conservation_forets` | 48 | محافظات الغابات |
| `chambre_agriculture` | 49 | الغرف الفلاحية (+ الغرفة الوطنية) |
| `institut_recherche` | 16 | المعاهد التقنية ومراكز البحث (INRAA، INRF، ITGC، ITDAS…) |
| `centre_formation` | 11 | معاهد ومراكز التكوين (ITMAS/CFATSF/CFVA) |
| `groupe_public` | 10 | المجمعات العمومية (GVAPRO، AGROLOG، GIPLAIT…) |
| `office_public` | 4 | الدواوين العمومية (OAIC، ONIL، ONILEV، ONTA) |

**حسب طريقة تحديد الموقع** (`geo_method`)

| القيمة | العدد | المعنى |
| --- | --- | --- |
| `commune_centroid` | 89 | العنوان يطابق بلدية؛ مركز تلك البلدية |
| `wilaya_centroid` | 107 | لا بلدية في العنوان؛ مركز مقرّ الولاية |

> تغطّي مديريات المصالح الفلاحية كل **58 ولاية**. أما محافظات الغابات (48) والغرف الفلاحية (49) فتستعمل التقسيم القديم لـ**48 ولاية** (ما قبل 2019)، حيث تُدمج ولايات الجنوب في ولاياتها الأم.

## الصيغ

- `data/agriculture.json` — المصفوفة الكاملة (مع أنواع `types/index.d.ts`)
- `data/csv/agriculture.csv` — ملف CSV
- `data/geojson/agriculture.geojson` — `FeatureCollection` (كل السجلات)
- `data/metadata.json` — الأعداد والمصادر وتاريخ التوليد

## كيف بُنيت البيانات

استُخرجت من دليل الوزارة (`madr.gov.dz/contact/دليل-الهاتف/`، النسخة العربية المحدَّثة؛ و`fr.madr.gov.dz/contact/annuaire/` للعناوين الثنائية للفئات)، ثم طُبِّعت إلى رموز الولايات الرسمية، ثم حُدِّدت مواقعها اعتمادًا على مجموعة بلديات geoalgeria. انظر `research/agriculture/` في المستودع.

## حول الدقة

> الأسماء والولاية والعنوان والهاتف/الفاكس **رسمية** (دليل الوزارة). الدليل لا يحتوي على **أي إحداثيات**: يُوضَع كل سجل في مركز البلدية المذكورة في عنوانه، أو — عند تعذّر ذلك — في مركز مقرّ الولاية (انظر `geo_method`؛ قيمة `geo_precision` هي `"approximate"` لكل سجل هنا — لا توجد نقاط مساحية مرصودة). هذه مواقع تقريبية للـ*ولاية/البلدية* وليست نقاطًا مساحية للمباني.

## المصدر والترخيص

بيانات من **وزارة الفلاحة والتنمية الريفية والصيد البحري** — قائمة واقعية للقطاع العمومي، يُعاد توزيعها كمرجع. يستعمل الربط بالولاية/البلدية مجموعة بيانات geoalgeria الأساسية. كود الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح issue: https://github.com/yasserstudio/geoalgeria/issues
