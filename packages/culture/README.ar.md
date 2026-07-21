[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/culture

**الأطلس الثقافي للجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/culture)](https://www.npmjs.com/package/@geoalgeria/culture)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/culture)](https://www.npmjs.com/package/@geoalgeria/culture)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**1083 موقعًا ثقافيًا** عبر **66 ولاية من أصل 69 في الجزائر** — الممتلكات الثقافية
المحمية، والمتاحف، والمسارح، والمكتبات، والمؤسسات الثقافية (دور وقصور الثقافة،
وقاعات السينما، ومديريات الثقافة، ومدارس الفنون) من أطلس *خريطة التراث الثقافي
الجزائري* التابع لـ**وزارة الثقافة**، **ثنائية اللغة 100%** عربي/فرنسي و**كاملة
الإحداثيات** (كل موقع يحمل إحداثية مصدرية). متوفر بصيغ JSON وCSV وGeoJSON
وTypeScript. جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/culture
```

```js
import culture from "@geoalgeria/culture";

const all = culture.culture();          // 1083 موقعًا ثقافيًا

// المتاحف في ولاية (ربط بـ wilaya_code في GeoAlgeria)
const museesAlger = all.filter((p) => p.wilaya_code === "16" && p.type === "museum");

// فقط الممتلكات الثقافية المحمية، جاهزة للخريطة
const patrimoine = all.filter((p) => p.category === "heritage");

// المواقع ذات الجولة الافتراضية 360°
const visites = all.filter((p) => p.has_virtual_tour);
```

## ما يمكنك بناؤه

- **خرائط ثقافية والبحث عن الأقرب** — لكلٍّ من المواقع الـ1083 إحداثيات، جاهزة
  للخريطة أو لميزة «بالقرب مني».
- **أدلّة ثقافية ثنائية اللغة** — أسماء عربية وفرنسية، والنوع الرسمي والولاية لكل
  موقع؛ مع تصفية التراث مقابل المؤسسات العاملة.
- **تطبيقات التراث والسياحة** — المواقع المحمية والمتاحف والجولات الافتراضية 360°،
  مربوطة بالبلدية/الولاية لتحديد المسارات وتحليل التغطية.

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| المواقع الثقافية | **1083** | 1083 بإحداثيات | 66 ولاية، ثنائية اللغة 100%، 22 بجولة 360° |

**حسب الفئة**

| الفئة | العدد | المعنى |
| --- | --- | --- |
| `heritage` | 943 | مواقع محمية، متاحف، مسارح، مكتبات |
| `establishment` | 140 | مؤسسات ثقافية عاملة ومديريات |

**حسب النوع**

| النوع | العدد | المعنى |
| --- | --- | --- |
| `protected-cultural-property` | 580 | ممتلك ثقافي محمي — نصب/موقع محمي |
| `library` | 257 | مكتبة المطالعة العمومية |
| `museum` | 48 | متحف |
| `theatre` | 45 | مسرح |
| `museum-moudjahid` | 13 | متحف المجاهد |
| `cultural-house` | 51 | دار الثقافة |
| `cultural-directorate` | 33 | مديرية الثقافة / ديوان |
| `cinema` | 20 | قاعة سينما / سينماتيك |
| `cultural-center` | 15 | مركز ثقافي / بحثي |
| `arts-school` | 15 | مدرسة الفنون — الفنون الجميلة / معهد |
| `cultural-palace` | 6 | قصر الثقافة |

> **الأطلس رسمي؛ أما الإحداثيات فأفضل ما أمكن.** الأسماء والنوع والإحداثيات وعلامة
> الـ360° من بوابة وزارة الثقافة. الولاية دقيقة؛ أما البلدية فمُستنتَجة (انظر
> *المصدر والمنهجية*). تتغيّر الأعداد مع تحديثات البوابة.

## الصيغ

تتضمّن حزمة npm ملف **JSON** (قابل للاستيراد مباشرة):

```js
import culture from "@geoalgeria/culture/data/culture.json" with { type: "json" };
// أو عبر CDN، دون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/culture/data/culture.json
```

المُحمِّلات وبنية السجلات **مُوثَّقة الأنواع** بالكامل — تعريفات TypeScript مرفقة في الحزمة:

```ts
import culture, { type CulturalSite } from "@geoalgeria/culture";
const all: CulturalSite[] = culture.culture();
```

ملفّا **CSV وGeoJSON** موجودان في المستودع ضمن [`data/`](data) ومُرفقان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  culture.json              # 1083 موقعًا ثقافيًا (مصفوفة)
  metadata.json             # المصادر، الأعداد، التغطية، الترخيص، تاريخ التحديث
  csv/culture.csv           # المستودع + الإصدار
  geojson/culture.geojson   # معالم نقطية (كل السجلات)
```

## بنية السجل

```json
{
  "id": "16-museum-03",
  "name": "Musée national Public d'art moderne et contemporain",
  "name_fr": "Musée national Public d'art moderne et contemporain",
  "name_ar": "المتحف العمومي الوطني للفن الحديث و المعاصر",
  "wilaya_code": "16",
  "commune_code": "1607",
  "commune": "Casbah",
  "lat": 36.777301,
  "lng": 3.057572,
  "geo_precision": "exact",
  "geo_method": "source_point",
  "source": "patrimoine",
  "refs": {
    "patrimoine": "817"
  },
  "type": "museum",
  "category": "heritage",
  "type_label_fr": "Musée",
  "type_label_ar": "متحف",
  "has_virtual_tour": true,
  "url": "https://cartes.patrimoineculturelalgerien.org/fr/node/101",
  "slug": "musee-national-public-d-art-moderne-et-contemporain"
}
```

`id` مفتاح ثابت `{wilaya_code}-{type_code}-{seq}`، فريد ضمن هذا الملف — يُعامَل
كمعرّف معتم (opaque). `name` هو الاسم الفرنسي إن وُجد، وإلا العربي. `type` هو
طبقة الموقع على البوابة، و`category` يجمع الأنواع الـ11 في `heritage` مقابل
`establishment`. `has_virtual_tour` يساوي `true` للمواقع الـ22 ذات الجولة 360°.
`geo_precision` يساوي `"exact"` لـ1067 سجلًا و`"approximate"` لـ16 — لكل موقع
إحداثية، لكن 16 منها لا تبلغ عتبة الدقة اللازمة لـ`"exact"`. `geo_method`
يساوي `"source_point"` لكل سجل: الإحداثية هي النقطة التي تنشرها البوابة نفسها،
وليست مركز ثقل مُشتقًا. `refs.patrimoine` هو معرّف الموقع على البوابة.

> **الولاية دقيقة؛ أما البلدية فمُستنتَجة.** لا تزال البوابة تصنّف بعض المواقع تحت
> رموز ولايات ما قبل 2019؛ يعيد GeoAlgeria إسناد كل موقع إلى التقسيم الحالي البالغ
> 69 ولاية بمطابقة إحداثيته لأقرب مركز ثقل بلدية في
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) (الذي يوفّر أيضًا
> `commune`/`commune_code`). البلدية تقريبية (الحزمة الرئيسية توفّر مراكز ثقل لا
> مضلّعات حدود).

## تحتاج التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — بها تحوّل
`commune_code` لموقعٍ ما إلى مضلّع أو مركز ثقل. استخدم `@geoalgeria/culture` عندما
تحتاج المواقع الثقافية *فقط*.

## المصدر والمنهجية

شغّل `npm run fetch` لإعادة توليد المخرجات. يقوم السكربت بـ:

1. قراءة الأطلس الثقافي ثنائي اللغة المُنسَّق (المُجمَّع والمُترجَم من بوابة
   `cartes.patrimoineculturelalgerien.org` التابعة لوزارة الثقافة — كتالوجا
   البوابة الفرنسي والعربي مجموعتا عُقَد منفصلتان، تُوحَّدان بتقارب الإحداثيات
   وتُترجَمان لسدّ الفجوات الثنائية)؛
2. **إعادة إسناد** كل موقع إلى التقسيم الحالي البالغ 69 ولاية وربط
   `commune`/`commune_code` به بمطابقته لأقرب مركز ثقل بلدية في `geoalgeria`؛
3. إسناد معرّفات ثابتة، وإزالة العُقَد المكرّرة، وإنتاج JSON وCSV وGeoJSON
   والبيانات الوصفية.

المصدر المُنسَّق وملاحظات الاستخراج تحت
[`research/patrimoine/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/patrimoine).

## الترخيص والإسناد

**شيفرة** الحزمة بترخيص [MIT](LICENSE). أما **البيانات** فهي قائمة واقعية عمومية
من بوابة التراث الثقافي لـ**وزارة الثقافة** (الأسماء والأنواع والإحداثيات وجولات
360° كما نُشرت). ربط البلدية/الولاية مُستنتَج من المجموعة الإدارية
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

تحقّق من المصادر الرسمية للمعلومات الموثوقة. تُقدَّم هذه البيانات للمرجعية ولتشغيل
[GeoAlgeria](https://geoalgeria.com).

[توثيق API والحقول →](https://geoalgeria.com/data/docs/culture) · [تصفّح كل الحزم →](https://geoalgeria.com/data)

---

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
