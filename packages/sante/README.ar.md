[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/sante

**المؤسسات الصحية العمومية في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**695 مؤسسة صحية عمومية** عبر **58 ولاية** لها مديرية للصحة — المؤسسات العمومية
الاستشفائية (EPH)، ومؤسسات الصحة الجوارية (EPSP)، والمؤسسات الاستشفائية المتخصصة
(EHS)، والمراكز الاستشفائية الجامعية (CHU) من **وزارة الصحة (MSP)**، ثنائية اللغة
عربي/فرنسي، **600 منها بإحداثيات** عبر OpenStreetMap وWikidata مع ربطٍ
بالبلدية والولاية. متوفر بصيغ JSON وCSV وGeoJSON وTypeScript. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sante
```

```js
import sante from "@geoalgeria/sante";

const all = sante.sante();              // 695 مؤسسة

// المستشفيات العمومية في ولاية (ربط بـ wilaya_code في GeoAlgeria)
const ephAlger = all.filter((e) => e.wilaya_code === "16" && e.type === "eph");

// فقط ما له إحداثيات، جاهز للخريطة
const mappable = all.filter((e) => e.lat != null);
```

## ما يمكنك بناؤه

- **أدلّة ومحدّدات مواقع المستشفيات والعيادات** — إحداثيات على 600 من أصل 695
  سجلًّا، جاهزة للخريطة أو للبحث عن الأقرب.
- **أدلّة صحية ثنائية اللغة** — أسماء عربية وفرنسية، والنوع الرسمي والولاية لكل
  مؤسسة.
- **تحليل التغطية والتخطيط** — حساب المؤسسات حسب النوع لكل بلدية/ولاية عبر البلاد.

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| المؤسسات الصحية | **695** | 600 بإحداثيات | 58 ولاية، 563 ثنائية اللغة |

**حسب النوع**

| النوع | العدد | المعنى |
| --- | --- | --- |
| `eph` | 270 | المؤسسة العمومية الاستشفائية |
| `epsp` | 292 | المؤسسة العمومية للصحة الجوارية |
| `ehs` | 108 | المؤسسة الاستشفائية المتخصصة |
| `chu` | 20 | المركز الاستشفائي الجامعي |
| `hopital` | 5 | مستشفى عمومي آخر |

**حسب دقّة الإحداثيات** (`geo_precision`)

| القيمة | العدد | المعنى |
| --- | --- | --- |
| `osm_point` | 121 | نقطة دقيقة من مرفق في OpenStreetMap ضمن البلدية |
| `wikidata_point` | 3 | نقطة دقيقة من مرفق في Wikidata ضمن البلدية |
| `commune_centroid` | 476 | مركز ثقل بلدية المؤسسة (تقريبي) |
| `none` | 95 | لم تُربط البلدية — بلا إحداثيات |

> **السجل رسمي؛ أما الإحداثيات فأفضل ما أمكن.** الأسماء والنوع والولاية من وزارة
> الصحة. لا تنشر الوزارة إحداثيات، فيستنتجها GeoAlgeria (انظر *المصدر والمنهجية*).
> تتغيّر الأعداد مع تحديثات الوزارة وOpenStreetMap وWikidata.

## الصيغ

تتضمّن حزمة npm ملف **JSON** (قابل للاستيراد مباشرة):

```js
import sante from "@geoalgeria/sante/data/sante.json" with { type: "json" };
// أو عبر CDN، دون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/sante/data/sante.json
```

المُحمِّلات وبنية السجلات **مُوثَّقة الأنواع** بالكامل — تعريفات TypeScript مرفقة في الحزمة:

```ts
import sante, { type HealthEstablishment } from "@geoalgeria/sante";
const all: HealthEstablishment[] = sante.sante();
```

ملفّا **CSV وGeoJSON** موجودان في المستودع ضمن [`data/`](data) ومُرفقان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  sante.json              # 695 مؤسسة (مصفوفة)
  metadata.json           # المصادر، الأعداد، التغطية، generated_at
  csv/sante.csv           # المستودع + الإصدار (ليس في حزمة npm)
  geojson/sante.geojson   # معالم نقطية (السجلات ذات الإحداثيات)
```

## بنية السجل

```json
{
  "id": "01-ehs-02",
  "name": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "name_ar": "المؤسسة الاستشفائية المتخصصة في الأمراض العقلية أدرار",
  "name_fr": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "type": "ehs",
  "type_label_fr": "Établissement Hospitalier Spécialisé",
  "type_label_ar": "المؤسسة الاستشفائية المتخصصة",
  "sector": "public",
  "wilaya": "Adrar",
  "wilaya_ar": "أدرار",
  "wilaya_code": "01",
  "commune": "Adrar",
  "commune_code": 101,
  "source": "msp+osm",
  "geo_precision": "osm_point",
  "wikidata": null,
  "osm_id": "way/432370657",
  "msp_id": 3588,
  "slug": "etablissement-hospitalier-specialise-psychiatrie-adrar",
  "lat": 27.875834,
  "lng": -0.307533
}
```

`id` مفتاح ثابت `{wilaya_code}-{type}-{seq}` يولّده GeoAlgeria (لا تنشر الوزارة
رمزًا). `name` هو الاسم الفرنسي إن وُجد، وإلا العربي. يُشتقّ `type` من العنوان،
و`wilaya` من وسم الوزارة. `sector` يساوي `"public"` لكامل سجل الوزارة (العيادات
الخاصة، عند إضافتها، ستحمل `"private"`). يبيّن `source` السجلات المساهِمة، و
`geo_precision` مصدر الإحداثية. تكون `lat`/`lng` بقيمة `null` للسجلات الـ95 التي
تعذّر ربط بلديتها.

> **الإحداثيات والبلدية مُستنتَجة وليست من الوزارة.** تَسرد وزارة الصحة الأسماء
> والنوع والولاية فقط. يربط GeoAlgeria موقع كل مؤسسة ببلدية من مجموعة
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) ضمن ولايتها
> (`commune` و`commune_code` ومركز ثقل)، ثم يرفع الإحداثية إلى نقطة دقيقة عندما
> يوجد مستشفى أو عيادة في OpenStreetMap أو Wikidata ضمن البلدية نفسها. الولاية
> دقيقة؛ أما البلدية والإحداثيات فتقريبية.

## تحتاج التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — بها تحوّل
`commune_code` لمؤسسةٍ ما إلى مضلّع أو مركز ثقل. استخدم `@geoalgeria/sante` عندما
تحتاج المؤسسات الصحية *فقط*.

## المصدر والمنهجية

شغّل `npm run fetch` لإعادة توليد المخرجات. يقوم السكربت بـ:

1. سحب سجل مؤسسات **وزارة الصحة** من واجهة WordPress REST في `sante.gov.dz`
   (`healthinstitution`)، بالفرنسية والعربية، كلٌّ موسوم بولايته؛
2. اشتقاق **النوع** من كل عنوان و**مزاوجة** البطاقتين الفرنسية والعربية في سجلٍ
   ثنائي اللغة؛
3. ربط **الموقع ببلدية** من مجموعة `geoalgeria` ضمن ولايته (`commune` و
   `commune_code` ومركز ثقل)؛
4. استعلام **Wikidata** (SPARQL، المستشفيات) و**OpenStreetMap** (Overpass،
   `amenity=hospital`/`clinic`، `healthcare=*`) و**رفع** الإحداثية إلى نقطة دقيقة
   عند وجود واحدة ضمن البلدية.

تُحفظ عمليات السحب الخام ضمن
[`research/sante/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/sante).

## الترخيص والإسناد

**شيفرة** الحزمة بترخيص [MIT](LICENSE). أما **البيانات** فهي تجميع:

- سجل **وزارة الصحة** (الأسماء والنوع والولاية) قائمة واقعية للقطاع العام.
- **الإحداثيات** مُستنتَجة من **Wikidata** (**CC0**، ملك عام) ومن
  **OpenStreetMap** (**© مساهمو OpenStreetMap**، بترخيص
  **[ODbL 1.0](https://www.openstreetmap.org/copyright)**). عند استخدامك أو إعادة
  نشرك لهذه البيانات يجب **إسناد الفضل لمساهمي OpenStreetMap** وإبقاء القواعد
  المُشتقّة تحت ترخيصٍ متوافق.

تحقّق من المصادر الرسمية للمعلومات الموثوقة. تُقدَّم هذه البيانات للمرجعية ولتشغيل
[GeoAlgeria](https://geoalgeria.com).

[توثيق API والحقول →](https://geoalgeria.com/data/docs/sante) · [تصفّح كل الحزم →](https://geoalgeria.com/data)

---

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
