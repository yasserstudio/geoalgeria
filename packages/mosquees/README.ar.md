[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/mosquees

**مساجد الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/mosquees)](https://www.npmjs.com/package/@geoalgeria/mosquees)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/mosquees)](https://www.npmjs.com/package/@geoalgeria/mosquees)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**20٬759 مسجدًا بإحداثيات جغرافية** عبر **69 ولاية** في الجزائر — كلٌّ بإحداثياته،
ومعظمها باسمٍ عربي و/أو فرنسي، مع ربطٍ بالبلدية والولاية. **تجميعٌ مجتمعي من
Wikidata وOpenStreetMap**، مُقدَّمٌ بصدقٍ مقابل الإحصاء الوطني لوزارة الشؤون الدينية
والأوقاف (MARW) البالغ نحو 18٬449. متوفر بصيغ JSON وCSV وGeoJSON وTypeScript.
جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/mosquees
```

```js
import mosquees from "@geoalgeria/mosquees";

const all = mosquees.mosquees();   // 20٬759 مسجدًا بإحداثيات جغرافية

// المساجد في ولاية (ربط بـ wilaya_code في GeoAlgeria)
const inSetif = all.filter((m) => m.wilaya_code === "19");

// فقط ما له اسم فرنسي
const named = all.filter((m) => m.name_fr);
```

## ما يمكنك بناؤه

- **خرائط وأدلّة المساجد** — إحداثيات على كل السجلات الـ20٬759، جاهزة للخريطة أو
  للترتيب حسب المسافة.
- **أدلّة ثنائية اللغة** — أكثر من 15 ألف اسمٍ بالعربية و7 آلاف بالفرنسية.
- **تحليل التغطية** — حساب أو ترتيب كثافة المساجد حسب البلدية/الولاية عبر البلاد.

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| المساجد | **20٬759** | ✅ الكل | 19٬783 مُسمّى، 69 ولاية |

**حسب المصدر**

| المصدر | العدد | المعنى |
| --- | --- | --- |
| `wikidata` | 13٬200 | من Wikidata فقط |
| `wikidata+osm` | 5٬897 | في الاثنين، مُطابَق ضمن ~150 م (يضيف OSM اسمًا فرنسيًا / مذهبًا / `osm_id`) |
| `osm` | 1٬662 | مُسجَّل في OpenStreetMap وليس بعد في Wikidata |

> **هذا تجميعٌ وليس سجلًّا رسميًّا.** يوفّر Wikidata تغطيةً وطنيةً شبه كاملة (~19 ألف
> مسجد بإحداثيات، قريبًا من رقم MARW البالغ ~18٬449)؛ ويُضيف OpenStreetMap إحداثيات
> دقيقة وأسماء فرنسية ومذاهب ومساجد يفتقدها Wikidata. تتغيّر الأعداد مع تحرير
> المشروعين — وتعكس كل إعادة بناء الحالة الراهنة للمصادر.

## الصيغ

تتضمّن حزمة npm ملف **JSON** (قابل للاستيراد مباشرة):

```js
import mosquees from "@geoalgeria/mosquees/data/mosquees.json" with { type: "json" };
// أو عبر CDN، دون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/mosquees/data/mosquees.json
```

المُحمِّلات وبنية السجلات **مُوثَّقة الأنواع** بالكامل — تعريفات TypeScript مرفقة في الحزمة:

```ts
import mosquees, { type Mosquee } from "@geoalgeria/mosquees";
const all: Mosquee[] = mosquees.mosquees();
```

ملفّا **CSV وGeoJSON** موجودان في المستودع ضمن [`data/`](data) ومُرفقان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  mosquees.json              # 20٬759 مسجدًا (مصفوفة)
  metadata.json              # المصادر، الأعداد، التغطية، generated_at
  csv/mosquees.csv           # المستودع + الإصدار (ليس في حزمة npm)
  geojson/mosquees.geojson   # معالم نقطية
```

## بنية السجل

```json
{
  "id": "16-0914",
  "source": "wikidata+osm",
  "wikidata": "Q28717404",
  "osm_id": "relation/15870867",
  "name": "مسجد عبد الحميد بن باديس",
  "name_ar": "مسجد عبد الحميد بن باديس",
  "name_fr": "Mosquée Ibn Badis",
  "denomination": "sunni",
  "wilaya_code": "16",
  "commune_code": 1607,
  "commune": "Casbah",
  "lat": 36.779365,
  "lng": 3.05949
}
```

`id` مفتاح ثابت `{wilaya_code}-{seq}` يولّده GeoAlgeria. يربط `wikidata` و`osm_id`
بالكائنات المصدرية. `name` هو أفضل اسم عرضٍ متاح (الفرنسية أولًا، وإلا العربية)
ويكون `null` للنقاط غير المُسمّاة من OSM. يرتبط `wilaya_code` بـ `wilaya_code` في
GeoAlgeria.

> **الربط بالبلدية/الولاية مُستنتَج وليس من المصادر.** لا يحمل Wikidata ولا OSM
> الرموز الإدارية الجزائرية. يُضيف GeoAlgeria حقول `wilaya_code` و`commune_code`
> و`commune` عبر **الربط بأقرب مركز ثقل** لمجموعة بلديات
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria). تعيين الولاية دقيق
> عمليًّا؛ أما البلدية فتقريبية (قرب المركز، لا الاحتواء داخل المضلّع).

## تحتاج التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — بها تحوّل
`commune_code` لمسجدٍ ما إلى مضلّع أو مركز ثقل. استخدم `@geoalgeria/mosquees`
عندما تحتاج المساجد *فقط*.

## المصدر والمنهجية

شغّل `npm run fetch` لإعادة توليد المخرجات. يقوم السكربت بـ:

1. استعلام **Wikidata** (SPARQL) عن كل عنصرٍ هو نوعٌ من *المسجد* (Q32815) يقع في
   الجزائر (P17 = Q262) وله إحداثيّة (P625) — القاعدة الشاملة؛
2. استعلام **OpenStreetMap** (Overpass) عن `amenity=place_of_worship` +
   `religion=muslim` داخل الجزائر؛
3. **دمجهما** — أي مسجد OSM ضمن ~150 م من مسجد Wikidata يُدمَج في ذلك السجل
   (مضيفًا اسمه الفرنسي ومذهبه و`osm_id`)؛ ومساجد OSM بلا تطابق تصبح سجلاتٍ مستقلة؛
4. إلحاق البلدية/الولاية بأقرب مركز ثقل بلدية.

تُحفظ عمليات السحب الخام ضمن
[`research/mosquees/`](https://github.com/yasserstudio/geoalgeria/tree/main/research/mosquees).

## الترخيص والإسناد

**شيفرة** الحزمة بترخيص [MIT](LICENSE). أما **البيانات** فهي تجميع:

- محتوى **Wikidata** بترخيص **CC0** (ملك عام).
- محتوى **OpenStreetMap** **© مساهمو OpenStreetMap**، بترخيص
  **[ODbL 1.0](https://www.openstreetmap.org/copyright)**. عند استخدامك أو إعادة
  نشرك لهذه البيانات يجب **إسناد الفضل لمساهمي OpenStreetMap** وإبقاء القواعد
  المُشتقّة تحت ترخيصٍ متوافق.

تحقّق من المصادر الرسمية للمعلومات الموثوقة. تُقدَّم هذه البيانات للمرجعية ولتشغيل
[GeoAlgeria](https://geoalgeria.com).

[توثيق API والحقول →](https://geoalgeria.com/data/docs/mosquees) · [تصفّح كل الحزم →](https://geoalgeria.com/data)

---

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
