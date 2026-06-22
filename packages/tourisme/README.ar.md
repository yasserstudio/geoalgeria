[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/tourisme

**البنية التحتية السياحية في الجزائر — كبيانات يمكنك تثبيتها.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/tourisme)](https://www.npmjs.com/package/@geoalgeria/tourisme)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/tourisme)](https://www.npmjs.com/package/@geoalgeria/tourisme)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

4,348 موقعا سياحيا محدد الإحداثيات عبر 69 ولاية في الجزائر — **فنادق**، معالم سياحية،
مواقع تاريخية، ينابيع حرارية ومساحات محمية — كل منها بإحداثياته، وربطه بالولاية،
وإسناد المصدر. المصادر: **ASAL Geoportail** (الينابيع الحرارية)، **OpenStreetMap** (الفنادق،
المعالم السياحية، المواقع التاريخية، الحدائق) و**Wikidata** (المواقع التراثية، المتاحف،
الحدائق). متوفر بصيغ JSON وCSV وGeoJSON.
جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/tourisme
```

```js
import tourisme from "@geoalgeria/tourisme";

const everything = tourisme.all();               // 4,348
const hotels = tourisme.lodging();               // 1,602
const springs = tourisme.thermalSprings();        // 282
const inTipaza = tourisme.byWilaya(42);           // كل المواقع السياحية في الولاية 42
const ruins = tourisme.byLayer("historic");       // 1,184 موقع تاريخي

// كل سجل يحتوي على إحداثيات — الترتيب حسب المسافة، الخرائط، أو أقرب موقع في بضعة أسطر.
```

## ما يمكنك بناؤه

- **تطبيقات سياحية** — دليل قابل للبحث للفنادق والمعالم السياحية والمواقع التاريخية حسب الولاية.
- **البحث عن أقرب موقع** — إحداثيات في كل سجل، جاهزة للترتيب حسب المسافة.
- **الخرائط** — طبقات نقاط GeoJSON جاهزة للاستخدام لشبكة السياحة بالكامل.
- **أدلة الينابيع الحرارية** — درجة الحرارة، التدفق، الارتفاع والتركيبة المعدنية لـ 282 ينبوعا.
- **التراث والثقافة** — مواقع تاريخية ومعالم أثرية ومواقع أثرية مرتبطة بـ Wikipedia/Wikidata.

## المحتوى

| الطبقة | الدالة | العدد | ملاحظات |
| --- | --- | --- | --- |
| الإقامة | `lodging()` | **1,602** | فنادق، نزل، بيوت ضيافة، شاليهات، ملاجئ جبلية |
| المعالم السياحية | `attractions()` | **1,248** | متاحف، مطلات، كهوف، شلالات، حدائق حيوان |
| التاريخي | `historic()` | **1,184** | مواقع أثرية، أطلال، نصب تذكارية، حصون، قلاع |
| الينابيع الحرارية | `thermalSprings()` | **282** | درجة الحرارة، التدفق، الارتفاع، المعدنية |
| الحدائق | `parks()` | **32** | حدائق وطنية، محميات طبيعية، مساحات محمية |
| **المجموع** | `all()` | **4,348** | |

تغطي **69 ولاية**. `wilaya_code` مرتبط بنموذج الـ 69 ولاية في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## الصيغ

حزمة npm توفر صيغة **JSON** (قابلة للاستيراد مباشرة):

```js
import lodging from "@geoalgeria/tourisme/data/lodging.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/tourisme/data/lodging.json
```

أدوات التحميل وأشكال السجلات **مصنّفة بالكامل** — تعريفات TypeScript مضمّنة في الحزمة:

```ts
import tourisme, { type Lodging, type ThermalSpring } from "@geoalgeria/tourisme";
const hotels: Lodging[] = tourisme.lodging();
const springs: ThermalSpring[] = tourisme.thermalSprings();
```

صيغتا **CSV وGeoJSON** موجودتان في المستودع ضمن [`data/`](data) ومضمّنتان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  lodging.json            # 1,602 إقامة
  attractions.json        # 1,248 معلم سياحي
  historic.json           # 1,184 موقع تاريخي
  thermal-springs.json    # 282 ينبوع حراري
  parks.json              # 32 حديقة
  metadata.json           # المصادر، الأعداد، التغطية
  csv/                    # ملفات CSV (المستودع + حزمة الإصدار، غير مضمّنة في tarball npm)
  geojson/                # معالم GeoJSON
```

## شكل السجل

**الإقامة** — فنادق، نزل، بيوت ضيافة:

```json
{
  "name": "عريان الراس",
  "name_ar": "عريان الراس تسابيت",
  "type": "alpine_hut",
  "wilaya_code": "01",
  "lat": 28.4162728,
  "lng": -0.2620846,
  "source": "OpenStreetMap",
  "osm_id": 8107956617,
  "id": 1
}
```

`type` يأخذ إحدى القيم: `hotel`، `hostel`، `guest_house`، `apartment`، `chalet`، `motel`،
`alpine_hut`. حقول اختيارية: `stars`، `rooms`، `phone`، `website`، `address`، `name_fr`.

**ينبوع حراري** — مصدره ASAL Geoportail، مع الخصائص الفيزيائية:

```json
{
  "id": 1,
  "name": "FORAGE DAR OUAD",
  "type": "forage",
  "temperature_c": 32,
  "debit_l_s": 15,
  "altitude_m": 423,
  "minerality": "BICARBONATEE CALCIQUE",
  "wilaya_code": "43",
  "wilaya_name": "CONSTANTINE",
  "commune_name": "BENI H'MIDENE",
  "lat": 36.4625,
  "lng": 6.4827778,
  "source": "ASAL geoportail"
}
```

`type` يأخذ إحدى القيم: `hammam`، `ain`، `source`، `forage`. الخصائص الفيزيائية
(`temperature_c`، `debit_l_s`، `altitude_m`، `minerality`) مأخوذة مباشرة من مجموعة
بيانات ASAL.

`wilaya_code` مكمّل بصفر إلى رقمين في جميع الطبقات ويرتبط بولايات GeoAlgeria.

## هل تحتاج التقسيمات الإدارية أيضا؟

إذا كنت تحتاج أيضا الولايات والدوائر والبلديات للربط، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — توفر مجموعة بيانات التقسيم
الكاملة للـ 69 ولاية التي يشير إليها `wilaya_code` هنا. استخدم `@geoalgeria/tourisme`
عندما تحتاج *فقط* البيانات السياحية.

## المصدر

البيانات من ثلاثة مصادر:

- **ASAL Geoportail** — الينابيع الحرارية (درجة الحرارة، التدفق، الارتفاع، التركيبة المعدنية).
  بيانات حكومية عامة.
- **OpenStreetMap** — الفنادق، المعالم السياحية، المواقع التاريخية والحدائق. مرخّصة بموجب
  [ODbL](https://opendatacommons.org/licenses/odbl/).
- **Wikidata** — المواقع التراثية، المتاحف وبيانات الحدائق الوصفية. مرخّصة بموجب
  [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## الترخيص والإسناد

الكود مرخّص بموجب [MIT](LICENSE). البيانات الأساسية:

- الينابيع الحرارية: بيانات حكومية عامة (ASAL).
- الطبقات من OSM: © مساهمو OpenStreetMap، [ODbL](https://opendatacommons.org/licenses/odbl/).
- السجلات من Wikidata: [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

معاد توزيعها كمرجع ولتشغيل [GeoAlgeria](https://geoalgeria.com). تحقق من المصادر الأصلية
للحصول على معلومات رسمية ومحدّثة.

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
