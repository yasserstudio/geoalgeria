[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/mobilis

**شبكة مبيعات موبيليس في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/mobilis)](https://www.npmjs.com/package/@geoalgeria/mobilis)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/mobilis)](https://www.npmjs.com/package/@geoalgeria/mobilis)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**165 وكالة تجارية** (*Agence Mobilis*) و**12 180 نقطة بيع معتمدة**
(*points de vente agréés*) لـ**موبيليس** (ATM Mobilis)، المتعامل العمومي
للهاتف النقال في الجزائر. تتضمن الوكالات الاسم والعنوان بالفرنسية والعربية مع
إحداثيات جغرافية؛ أما نقاط البيع فتتضمن الاسم والعنوان والبلدية. متوفر بصيغ
JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/mobilis
```

```js
import mobilis from "@geoalgeria/mobilis";

const agences = mobilis.agences();   // 165 وكالة موبيليس بإحداثيات جغرافية
const pdv = mobilis.pdv();           // 12 180 نقطة بيع معتمدة
const all = mobilis.all();           // الكل (الوكالات أولاً)

// الوكالات في ولاية (ربط بـ wilaya_code في GeoAlgeria)
const inOran = agences.filter((a) => a.wilaya_code === "31");

// نقاط البيع في بلدية
const inBabEzzouar = pdv.filter((p) => p.commune === "BAB EZZOUAR");
```

## ما يمكنك بناؤه

- **محدد مواقع الوكالات** — إحداثيات لكل وكالة من الـ165، جاهزة للترتيب حسب
  المسافة أو العرض على الخريطة.
- **التغطية حسب البلدية** — نقاط البيع مرتبطة ببلديتها، مما يتيح إحصاء أو
  ترتيب تواجد موبيليس حسب البلدية/الولاية.
- **أدلة ثنائية اللغة** — اسم وعنوان الوكالة بالفرنسية والعربية.

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| الوكالات (*Agence Mobilis*) | **165** | ✅ جميعها 165 | ثنائية اللغة FR/AR، 56/58 ولاية |
| نقاط البيع المعتمدة | **12 180** | ❌ لا توجد | اسم FR + عنوان + بلدية |

> نقاط البيع هي **دليل على مستوى البلدية** — المصدر لا يوفر إحداثيات لها.
> لرسمها على الخريطة، يمكنك تجميعها حسب مراكز البلديات (ربط `commune` مع
> بلديات [`geoalgeria`](https://www.npmjs.com/package/geoalgeria)) أو ترميز
> العناوين جغرافيًا بنفسك.

## الصيغ

حزمة npm توفر **JSON** (قابل للاستيراد مباشرة):

```js
import agences from "@geoalgeria/mobilis/data/agences.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/mobilis/data/agences.json
```

المحمّلات وهياكل السجلات **مُنمَّطة** بالكامل — تعريفات TypeScript مضمّنة في الحزمة:

```ts
import mobilis, { type Agence, type Pdv } from "@geoalgeria/mobilis";
const agences: Agence[] = mobilis.agences();
```

ملفات **CSV وGeoJSON** موجودة في المستودع تحت [`data/`](data) ومضمّنة في كل
[إصدار GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  agences.json              # 165 وكالة (مصفوفة)
  pdv.json                  # 12 180 نقطة بيع (مصفوفة)
  metadata.json             # المصدر، العدادات، generated_at
  csv/agences.csv           # المستودع + حزمة الإصدار (ليست في tarball npm)
  csv/pdv.csv
  geojson/agences.geojson   # معالم نقطية (الوكالات فقط)
```

> الوكالات فقط هي المرمّزة جغرافيًا، لذا يوجد `agences.geojson` فقط. نقاط
> البيع لا تحتوي على `lat`/`lng` ولا يتم تصديرها كـ GeoJSON.

## هياكل السجلات

**وكالة (*Agence Mobilis*)**

```json
{
  "id": "01-001",
  "code": "12237",
  "type": "agence",
  "name": "Agence Commerciale Adrar",
  "name_ar": "الوكالة التجارية أدرار",
  "address": "Rue de l'indépendance, Adrar",
  "address_ar": "شارع الإستقلال، أدرار.",
  "wilaya_code": "01",
  "lat": 27.877829,
  "lng": -0.274316
}
```

**نقطة بيع معتمدة**

```json
{
  "id": "01-001",
  "code": "2955",
  "type": "pdv",
  "name": "PDV LIBRAIRIE GAFA ABDERRAHMANE",
  "address": "RUE 17 OCTOBRE CITE 20 AOUT N 03",
  "commune": "ADRAR",
  "wilaya_code": "01",
  "lat": null,
  "lng": null
}
```

`id` هو مفتاح مستقر بصيغة `{wilaya_code}-{seq}` يولّده GeoAlgeria (seq مرتب
حسب معرّف المصدر). معرّف موبيليس الخاص محفوظ في `code`. يرتبط `wilaya_code`
بـ`wilaya_code` في GeoAlgeria.

## هل تحتاج التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — بها تحوّل
`commune` نقطة البيع إلى مضلع أو مركز. استخدم `@geoalgeria/mobilis` إذا كنت
تحتاج *فقط* شبكة موبيليس.

## المصدر

البيانات مصدرها محدد مواقع المتاجر لـ**موبيليس**
(<https://mobilis.dz/mapagence>). لا توجد واجهة برمجة موثقة — يستدعي المحدد
بضع نقاط نهاية JSON خلف ترويسة `X-Requested-With`، والموقع محمي بجدار حماية
WAF. شغّل `npm run fetch` لإعادة توليد جميع المخرجات: يهيئ جلسة، يمر على 58
ولاية لكلتا الفئتين، يحلل سلاسل الإحداثيات `"lat, lng"` (مع معالجة الصفوف
ذات الفاصلة العشرية)، ويعيد تطبيع رموز الولايات. تسجل موبيليس البيانات وفق
**نظام 58 ولاية**، لذا تظهر الولايات الجديدة 59–69 حاليًا تحت ولايتها الأم —
كما هو الحال مع بيانات بريد الجزائر والوكالة الوطنية للتشغيل.

## الترخيص والإسناد

الكود مرخص بـ[MIT](LICENSE). البيانات الأساسية محفوظة الحقوق © **ATM Mobilis**،
مُعاد توزيعها كمرجع ولتغذية [GeoAlgeria](https://geoalgeria.com). تحقق من
موبيليس للحصول على معلومات رسمية ومحدّثة. قائمة نقاط البيع تتغير مع دخول
وخروج الموزعين — كل إعادة بناء تعكس ما يعرضه المحدد في تلك اللحظة.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/mobilis) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

من تطوير [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
