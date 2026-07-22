[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/protection-civile

**وحدات الحماية المدنية في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/protection-civile)](https://www.npmjs.com/package/@geoalgeria/protection-civile)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

# نظرة عامة

**880 وحدة للحماية المدنية** موزّعة على كل الولايات، مباشرةً من **مجموعة بيانات المديرية العامة للحماية المدنية** (dgpc.dz) — كل وحدة باسم عربي وعنوان وهاتف وفاكس ومستوى صفة (`statut`) وإحداثية DGPC حقيقية. هذا مصدر **رسمي أوّلي**: المديرية العامة هي المصدر الموثوق «هذه الوحدة موجودة هنا».

## التثبيت

```bash
npm install @geoalgeria/protection-civile
```

## بداية سريعة

```js
import {
  units,
  unitById,
  unitsByWilaya,
  unitsByStatut,
  metadata,
} from "@geoalgeria/protection-civile";

units().length; // 880
unitsByWilaya(16).length; // الجزائر العاصمة
unitsByStatut("UNITE PRINCIPALE").length;
unitById("16-001")?.commune;
metadata().wilayas_covered; // 69
```

## المحتوى

| المجموعة | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| `protection-civile` | 880 | الكل | DGPC (dgpc.dz)، مُموقَعة، ربط الولاية وفق إصلاح 2026 |

**حسب مستوى الصفة (`statut`):** UNITE SECONDAIRE 444 · POSTE AVANCE 146 · UNITE DE SECTEUR 132 · UNITE PRINCIPALE 62 · SIEGE DE DIRECTION WILAYA 58 · POSTE DE SECOURS ROUTIER 20 · UNITE MARINE 15 · U.N D'INSTRUCTION ET D'INTERVENTION 1 · DIRECTION GENERALE 1 · CELLULE DE SECURITE 1

كل وحدة تحمل `tel` و`fax` و`address`؛ **777** بلدية طُوبِقت بالاسم، والباقي بأقرب مركز.

## الصيغ

- `data/protection-civile.json` — المصفوفة الكاملة (مُنمّطة عبر `types/index.d.ts`)
- `data/csv/protection-civile.csv` — CSV مسطّح
- `data/geojson/protection-civile.geojson` — `FeatureCollection`
- `data/metadata.json` — الأعداد والمصادر وتاريخ التوليد

## الدقة والتغطية

> **هذه الشبكة الكاملة التي تنشرها المديرية العامة — 880 وحدة.** كل وحدة تحمل إحداثية DGPC حقيقية؛ بضع نقاط متطابقة موسومة بأمانة `approximate` (`geo_precision`)، والباقي `exact`. لا يوجد اسم فرنسي في المصدر، لذا لا يُشتقّ `name_fr` — لا شيء يُترجَم آليًا. البلدية مطابقة بالاسم (بأفضل جهد)؛ **الولاية مُعاد اشتقاقها من الهندسة** وموثوقة.
>
> `cod_wilaya` الأصلي للمديرية العامة سابق لإصلاح 2026 ويُحفظ فقط في `refs.dgpc_wilaya`. استخدم `wilaya_code` (الرمز ما بعد الإصلاح المشتقّ من الهندسة) لأي ربط بالولاية.

## المصدر والترخيص

البيانات © **المديرية العامة للحماية المدنية (DGPC)** — محتوى رسمي عمومي، مُعاد توزيعه هنا للمرجعية. **لا يوجد ترخيص مفتوح**؛ يُعامَل كقائمة عمومية واقعية مع نسبة المصدر إلى المديرية العامة. الربط بالولاية/البلدية يستخدم مجموعة بيانات geoalgeria الأساسية. شيفرة الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح مسألة: https://github.com/yasserstudio/geoalgeria/issues
