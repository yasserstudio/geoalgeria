[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/sante

**المؤسسات الصحية العمومية في الجزائر، كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sante)](https://www.npmjs.com/package/@geoalgeria/sante)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

**668 مؤسسة صحية عمومية** عبر **58 ولاية** لها مديرية للصحة – المؤسسات العمومية
الاستشفائية (EPH)، ومؤسسات الصحة الجوارية (EPSP)، والمؤسسات الاستشفائية المتخصصة
(EHS)، والمراكز الاستشفائية الجامعية (CHU) من **وزارة الصحة (MSP)**، ثنائية اللغة
عربي/فرنسي، **597 منها بإحداثيات** (121 بنقطة دقيقة من OpenStreetMap/Wikidata،
و11 مُتحقَّق منها يدويًا، و465 بمركز ثقل البلدية) مع ربطٍ بالبلدية والولاية. متوفر بصيغ JSON وCSV
وGeoJSON وTypeScript. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **الطبقة المجتمعية موجودة في [`@geoalgeria/cliniques`](https://www.npmjs.com/package/@geoalgeria/cliniques)، ولا يجوز جمع الاثنين أبدًا.**
> هذه الحزمة هي طبقة *السجل*: المؤسسات العمومية التي تسيّرها وزارة الصحة، سجل
> رسمي ومغلق. أما `cliniques` فهي الطبقة *المجتمعية*: 1,917 عيادة متعددة
> الخدمات وقاعة علاج ومركز صحي ومصحة توليد وعيادة، رسمها متطوعو OpenStreetMap،
> وهي جزئية بطبيعتها. كل عنصر OSM يشير إليه سجل من هنا مستبعَد هناك بحكم
> البناء، فلا يُنشر أي مكان مرتين تحت العنصر نفسه، لكن الاثنتين تصفان طبقتين
> مختلفتين من منظومة الصحة، وجمع 668 مع 1,917 لا يعدّ شيئًا حقيقيًا.

```bash
npm install @geoalgeria/sante
```

```js
import sante from "@geoalgeria/sante";

const all = sante.sante();              // 668 مؤسسة

// المستشفيات العمومية في ولاية (ربط بـ wilaya_code في GeoAlgeria)
const ephAlger = all.filter((e) => e.wilaya_code === "16" && e.type === "eph");

// فقط ما له إحداثيات، جاهز للخريطة
const mappable = all.filter((e) => e.lat != null);
```

## ما يمكنك بناؤه

- **أدلّة ومحدّدات مواقع المستشفيات والعيادات** – إحداثيات على 597 من أصل 668
  سجلًّا، جاهزة للخريطة أو للبحث عن الأقرب.
- **أدلّة صحية ثنائية اللغة** – أسماء عربية وفرنسية، والنوع الرسمي والولاية لكل
  مؤسسة.
- **تحليل التغطية والتخطيط** – حساب المؤسسات حسب النوع لكل بلدية/ولاية عبر البلاد.

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| المؤسسات الصحية | **668** | 597 بإحداثيات | 58 ولاية، 590 ثنائية اللغة |

**حسب النوع**

| النوع | العدد | المعنى |
| --- | --- | --- |
| `eph` | 257 | المؤسسة العمومية الاستشفائية |
| `epsp` | 284 | المؤسسة العمومية للصحة الجوارية |
| `ehs` | 103 | المؤسسة الاستشفائية المتخصصة |
| `chu` | 19 | المركز الاستشفائي الجامعي |
| `hopital` | 5 | مستشفى عمومي آخر |

**حسب دقّة الإحداثيات** (`geo_precision`)

| القيمة | العدد | المعنى |
| --- | --- | --- |
| `exact` | 132 | نقطة دقيقة: مرفق في OSM أو Wikidata ضمن البلدية، أو موقع مُتحقَّق منه يدويًا |
| `approximate` | 465 | مركز ثقل بلدية المؤسسة |
| `null` | 71 | لم تُربط البلدية – بلا إحداثيات (`lat`/`lng` أيضًا `null`) |

**حسب طريقة الحصول على الإحداثية** (`geo_method`)

| القيمة | العدد | المعنى |
| --- | --- | --- |
| `osm_point` | 118 | نقطة دقيقة من مرفق في OpenStreetMap ضمن البلدية |
| `wikidata_point` | 3 | نقطة دقيقة من مرفق في Wikidata ضمن البلدية |
| `commune_centroid` | 465 | مركز ثقل بلدية المؤسسة (تقريبي) |
| `owner_verified` | 11 | موقع قرأه مالك المشروع على الخريطة، عبر سجل التصحيحات المراجَعة |
| `null` | 71 | لا توجد طريقة – السجل بلا إحداثيات |

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

المُحمِّلات وبنية السجلات **مُوثَّقة الأنواع** بالكامل – تعريفات TypeScript مرفقة في الحزمة:

```ts
import sante, { type HealthEstablishment } from "@geoalgeria/sante";
const all: HealthEstablishment[] = sante.sante();
```

ملفّا **CSV وGeoJSON** موجودان في المستودع ضمن [`data/`](data) ومُرفقان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  sante.json              # 668 مؤسسة (مصفوفة)
  metadata.json           # المصادر، الأعداد، التغطية، updated
  retired-ids.json        # معرّفات محجوزة إلى الأبد، وإلى أين انتقلت بياناتها
  csv/sante.csv           # المستودع + الإصدار (ليس في حزمة npm)
  geojson/sante.geojson   # معالم نقطية (السجلات ذات الإحداثيات)
```

## بنية السجل

```json
{
  "id": "01-ehs-02",
  "name": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "name_fr": "Etablissement Hospitalier Spécialisé Psychiatrie Adrar",
  "name_ar": "المؤسسة الاستشفائية المتخصصة في الأمراض العقلية أدرار",
  "wilaya_code": "01",
  "commune_code": "0101",
  "commune": "Adrar",
  "lat": 27.875834,
  "lng": -0.307533,
  "geo_precision": "exact",
  "geo_method": "osm_point",
  "source": "msp",
  "refs": {
    "osm": "way/432370657",
    "msp": "3588"
  },
  "type": "ehs",
  "type_label_fr": "Établissement Hospitalier Spécialisé",
  "type_label_ar": "المؤسسة الاستشفائية المتخصصة",
  "sector": "public",
  "slug": "etablissement-hospitalier-specialise-psychiatrie-adrar"
}
```

`id` مفتاح ثابت `{wilaya_code}-{type}-{seq}` يولّده GeoAlgeria (لا تنشر الوزارة
رمزًا) – قيمة مبهمة، فريدة ضمن `sante.json`. `name` هو الاسم الفرنسي إن وُجد،
وإلا العربي. يُشتقّ `type` من العنوان، و`wilaya_code` من وسم الوزارة. `sector`
يساوي `"public"` لكامل سجل الوزارة، وهو لا يضم أي مؤسسة خاصة؛ أما المرافق
الخاصة التي يرسمها OpenStreetMap فتوجد في
[`@geoalgeria/cliniques`](https://www.npmjs.com/package/@geoalgeria/cliniques).
يساوي `source` دائمًا `"msp"` (سجل وزارة الصحة)؛ يحمل `refs`
معرّفات المصادر المساهِمة – دائمًا `msp`، إضافة إلى `msp_twin` عندما ينشر السجل
المؤسسة نفسها مرة ثانية باللغة الأخرى، وإضافة إلى `osm` أو `wikidata` عند
رفع الإحداثية إلى نقطة دقيقة. تكون `geo_precision` إما `"exact"` أو
`"approximate"` أو `null`؛ ويبيّن `geo_method` كيفية الحصول على الإحداثية
(`osm_point`، أو `wikidata_point`، أو `commune_centroid`، أو `owner_verified`،
أو `null`). تكون
`lat`/`lng`/`geo_precision`/`geo_method` كلّها `null` معًا للسجلات الـ71 التي
تعذّر ربط بلديتها.

> **الإحداثيات والبلدية مُستنتَجة وليست من الوزارة.** تَسرد وزارة الصحة الأسماء
> والنوع والولاية فقط. يربط GeoAlgeria موقع كل مؤسسة ببلدية من مجموعة
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) ضمن ولايتها
> (`commune` و`commune_code` ومركز ثقل)، ثم يرفع الإحداثية إلى نقطة دقيقة عندما
> يوجد مستشفى أو عيادة في OpenStreetMap أو Wikidata ضمن البلدية نفسها. الولاية
> دقيقة؛ أما البلدية والإحداثيات فتقريبية.

## تحتاج التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** – بها تحوّل
`commune_code` لمؤسسةٍ ما إلى مضلّع أو مركز ثقل. استخدم `@geoalgeria/sante` عندما
تحتاج المؤسسات الصحية *فقط*.

## المصدر والمنهجية

شغّل `npm run fetch` لإعادة توليد المخرجات. يقوم السكربت بـ:

1. سحب سجل مؤسسات **وزارة الصحة** من واجهة WordPress REST في `sante.gov.dz`
   (`healthinstitution`)، بالفرنسية والعربية، كلٌّ موسوم بولايته؛
2. اشتقاق **النوع** من كل عنوان و**مزاوجة** البطاقتين الفرنسية والعربية في سجلٍ
   ثنائي اللغة. تمرّ المزاوجة بالموقع، ثم ببلدية مشتركة بلا التباس، ثم بعادة
   السجل في نشر البطاقتين تحت معرّفَين متتاليَين. وهذه الخطوة الأخيرة تحتاج أكثر
   من التجاور، إذ إنّ 42.9% فقط من البطاقات الفرنسية لها بطاقة عربية عند id+1:
   يجب أن يتوافق الاسمان كذلك على هيكل صامت، وهو ما تشترك فيه فعلًا الكتابتان
   الفرنسية والعربية لاسم واحد، ويبقى المرشَّح الملتبس سجلَّين بدل التخمين.
   تُكتب كل قرار، بما في ذلك كل رفض وسببه، في
   [`quality/sante-twin-recovery.json`](https://github.com/yasserstudio/geoalgeria/blob/main/quality/sante-twin-recovery.json).
   ويذكر السجل البطاقتين: `refs.msp` بطاقته الأساسية (الفرنسية) و`refs.msp_twin`
   البطاقة العربية، فيؤدي المعرّفان كلاهما إليه؛
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

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)
