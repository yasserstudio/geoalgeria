[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/ecoles

**مدارس الجزائر، كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ecoles)](https://www.npmjs.com/package/@geoalgeria/ecoles)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/ecoles)](https://www.npmjs.com/package/@geoalgeria/ecoles)
[![License: MIT AND ODbL-1.0](https://img.shields.io/badge/License-MIT%20AND%20ODbL--1.0-green.svg)](LICENSE)

</div>

**11٬855 مدرسة بإحداثيات جغرافية** عبر **69 ولاية** في الجزائر – كلٌّ بإحداثياته،
مُصنَّفة حسب **الطور** (ابتدائي · متوسط/CEM · ثانوي/lycée · تحضيري)، ومعظمها باسمٍ
عربي و/أو فرنسي، مع ربطٍ بالبلدية والولاية. مُستخرَجة من **OpenStreetMap**
ومُقدَّمة بصدقٍ مقابل 29٬702 مؤسسة تعليمية تنشرها وزارة التربية الوطنية نفسها للسنة
الدراسية 2024-2025. متوفرة بصيغ JSON وCSV وGeoJSON وTypeScript. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/ecoles
```

```js
import ecoles from "@geoalgeria/ecoles";

const all = ecoles.ecoles();   // 11٬855 مدرسة بإحداثيات

// ثانويات ولاية معيّنة (ربطٌ على wilaya_code من GeoAlgeria)
const lyceesSetif = all.filter((e) => e.wilaya_code === "19" && e.cycle === "secondaire");

// المدارس المُسمّاة فقط، باسمٍ فرنسي
const named = all.filter((e) => e.name_fr);
```

## ماذا يمكنك أن تبني

- **خرائط وأدلّة المدارس** – إحداثيات على كامل السجلّات الـ11٬855، جاهزة لخريطة أو
  لترتيبٍ حسب أقرب مدرسة.
- **تفصيلٌ حسب الطور** – رشِّح الابتدائي / المتوسط / الثانوي / التحضيري، أو رتِّب
  كثافة المدارس حسب البلدية/الولاية.
- **أدلّة ثنائية اللغة** – آلاف الأسماء بالعربية والفرنسية جنبًا إلى جنب.

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| المدارس | **11٬855** | ✅ الكل | 8٬635 مُسمّاة، 69 ولاية |

**حسب الطور**

| الطور | العدد | المعنى |
| --- | --- | --- |
| `primaire` | 4٬019 | مدرسة ابتدائية (ISCED 1) |
| `moyen` | 2٬378 | متوسطة / CEM (ISCED 2) |
| `secondaire` | 1٬576 | ثانوية / lycée (ISCED 3) |
| `prescolaire` | 268 | تحضيري / روضة (ISCED 0) |
| `autre` | 3٬614 | مدرسة غير محدّدة الطور (بلا اسم، أو اسمٌ بلا كلمة طور) |

> **هذا استخراجٌ من OpenStreetMap، وليس سجلًّا رسميًّا.** التغطية جزئية ومتفاوتة
> بين الولايات – 11٬855 مدرسة مُخرَّطة مقابل 29٬702 مؤسسة تعليمية تنشرها وزارة
> التربية الوطنية على [education.gov.dz](https://www.education.gov.dz) للسنة
> الدراسية 2024-2025، أي نحو 40٪. وهذا المقام رقمٌ إجماليٌّ صادرٌ عن الوزارة
> نفسها، لا تقديرًا منّا. تتغيّر الأعداد مع تعديل OpenStreetMap.

**الطور مُستنتَج.** يأتي من `isced:level` ومن الاسم الفرنسي/العربي – فالمتوسطة
تحمل دائمًا متوسطة/collège، والثانوية ثانوية/lycée، والروضة روضة/préscolaire. أمّا
«مدرسة»/«école» المجرّدة بلا كلمة طور فتُصنَّف `primaire` بحكم العُرف الجزائري؛ وما
تبقّى دون حسمٍ فهو `autre`. تحصل 93٪ من المدارس *المُسمّاة* على طورٍ محدّد.

**حسب النوع (`kind`)** – الـ`kind` هو نوع المؤسسة، *مستقلٌّ* عن الطور، ليتيح ترشيح
(أو عزل) الأماكن الخاصة التي يصنّفها OpenStreetMap تحت `amenity=school`:

| النوع | العدد | المعنى | الطور |
| --- | --- | --- | --- |
| `regular` | 11٬664 | مدرسة/متوسطة/ثانوية/روضة عادية | طورها الحقيقي |
| `formation` | 92 | مركز تكوين مهني | `autre` |
| `coranique` | 40 | مدرسة قرآنية | `autre` |
| `langues` | 24 | مدرسة/معهد لغات | `autre` |
| `special` | 30 | مدرسة للتربية الخاصة (الصم، المكفوفين…) | يحتفظ بطوره |
| `conduite` | 5 | مدرسة تعليم السياقة | `autre` |

الأنواع الأربعة خارج التعليم الأساسي (`formation`/`coranique`/`langues`/`conduite`)
تحمل الطور `autre` – فهي ليست مدارس ابتدائية رغم احتواء اسمها على «école»؛ الـ`kind`
يجعلها قابلة للعثور بدل ضياعها في `autre`.

**كذلك في كل سجلّ:** `isced_levels` (مستويات `isced:level` من OSM، مُطبَّعة كقائمة
مرتّبة مثل `"1;2"` – في 2٬048 سجلًّا)، و`address` (من وسوم `addr:*` – في 2٬626)،
و`sector` (`public`/`private` حيث تشير الخريطة).

## الصيغ

يوفّر حزمة npm صيغة **JSON** (قابلة للاستيراد مباشرة):

```js
import ecoles from "@geoalgeria/ecoles/data/ecoles.json" with { type: "json" };
// أو عبر CDN، دون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/ecoles/data/ecoles.json
```

المُحمِّلات وأشكال السجلّات مُنمّطة بالكامل – تعريفات TypeScript مُضمَّنة في الحزمة:

```ts
import ecoles, { type Ecole } from "@geoalgeria/ecoles";
const all: Ecole[] = ecoles.ecoles();
```

صيغتا **CSV وGeoJSON** موجودتان في المستودع ضمن [`data/`](data) ومُضمَّنتان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  ecoles.json              # 11٬855 مدرسة (مصفوفة)
  metadata.json            # المصادر، الأعداد، التغطية، updated
  csv/ecoles.csv           # المستودع + حزمة الإصدار (ليست في حزمة npm)
  geojson/ecoles.geojson   # معالم نقطية
```

## شكل السجلّ

```json
{
  "id": "16-00275",
  "name": "Lycée Semrouni 1",
  "name_fr": "Lycée Semrouni 1",
  "name_ar": null,
  "wilaya_code": "16",
  "commune_code": "1651",
  "commune": "Ouled Fayet",
  "lat": 36.729359,
  "lng": 2.939451,
  "geo_precision": "approximate",
  "geo_method": "osm_centroid",
  "source": "osm",
  "refs": {
    "osm": "way/1041517830"
  },
  "cycle": "secondaire",
  "cycle_label_fr": "Lycée",
  "cycle_label_ar": "ثانوية",
  "kind": "regular",
  "kind_label_fr": "École ordinaire",
  "kind_label_ar": "مدرسة عادية",
  "isced_levels": null,
  "sector": null,
  "address": null
}
```

`id` مفتاحٌ ثابت `{wilaya_code}-{seq}` يُوَلِّده GeoAlgeria، وهو فريد ضمن هذه
المجموعة؛ ويُحفَظ عنصر OSM المطابق في `refs.osm`. `name` يكون `null` للنقاط غير
المُسمّاة. `cycle` هو الطور و`kind` نوع المؤسسة (انظر أعلاه)، ولكلٍّ منهما
تسميتان ثنائيتا اللغة. `isced_levels` و`address` يأتيان مباشرةً من OSM (`null`
عند غياب الوسوم). `sector` يكون `"public"`/`"private"` فقط عند وجود إشارةٍ
صريحة، وإلّا `null`. `geo_precision` يكون `"exact"` لنقطة مسحية أو `"approximate"`
لمركز مُخطَّط مبنى – ويُحدِّد `geo_method` أيّهما (`osm_node`/`osm_centroid`).
ويُربَط `wilaya_code` بِـ`wilaya_code` من GeoAlgeria.

> **ربط البلدية/الولاية مُستنتَج، لا يأتي من المصدر.** لا يحمل OpenStreetMap الرموز
> الإدارية الجزائرية. يُحدِّد GeoAlgeria أولًا مضلّع الولاية الذي يحتوي النقطة،
> ثم يُلحِق `wilaya_code` و`commune_code` و`commune` وفق أقرب مركز ثقل بلدية
> **داخل تلك الولاية** من مجموعة بلديات
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria). إسناد الولاية قائمٌ
> على الاحتواء المضلّعي؛ أمّا البلدية فأفضل تقدير بالقرب من المركز داخل الحد نفسه.

## أتحتاج إلى التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** – بها تُحوِّل
`commune_code` لمدرسةٍ إلى مُضلَّعٍ أو مركز ثقل. استخدم `@geoalgeria/ecoles` حين
تحتاج إلى المدارس *فقط*.

## المصدر والمنهجية

شغّل `npm run fetch` لإعادة توليد كل المخرجات. يقوم السكربت بِـ:

1. الاستعلام من **OpenStreetMap** (Overpass) عن `amenity=school` و
   `amenity=kindergarten` داخل الجزائر؛
2. **تصنيف الطور** من `isced:level` والاسم الفرنسي/العربي؛
3. إزالة تكرار المدرسة نفسها المُخرَّطة كنقطةٍ ومبنى معًا؛
4. تحديد مضلّع الولاية الذي يحتوي النقطة، ثم إلحاق أقرب مركز ثقل بلدية داخلها.

يُحفَظ الاستخراج الخام ضمن
[`sources/ecoles/`](https://github.com/yasserstudio/geoalgeria/tree/main/sources/ecoles).

## الرخصة والإسناد

**كود** الحزمة تحت رخصة [MIT](LICENSE). أمّا **البيانات** فمن **OpenStreetMap** –
**© مساهمو OpenStreetMap**، تحت رخصة
**[ODbL 1.0](https://www.openstreetmap.org/copyright)**. إذا استخدمت هذه البيانات
أو أعدت توزيعها، فعليك **إسناد الفضل لمساهمي OpenStreetMap** وإبقاء قواعد البيانات
المُشتقّة تحت رخصةٍ متوافقة.

تحقّق من المصادر الرسمية للحصول على معلوماتٍ موثوقة. تُقدَّم هذه البيانات للاستئناس
ولتشغيل [GeoAlgeria](https://geoalgeria.com).

[توثيق الـAPI والحقول →](https://geoalgeria.com/data/docs/ecoles) · [تصفّح كل الحزم →](https://geoalgeria.com/data)

---

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
