[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/livraison

**ناقلو التوصيل في الجزائر ومكاتب التوقف الخاصة بهم — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/livraison)](https://www.npmjs.com/package/@geoalgeria/livraison)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

طبقة التوصيل والدفع عند الاستلام / التجارة الإلكترونية للجزائر، في ثلاثة أجزاء: **سجل**
ناقلي التوصيل، **411 مكتب توقف مُحدد الإحداثيات** عبر 61 ولاية، و**تغطية كل ناقل**.
يُوزَّع بصيغ JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/livraison
```

```js
import livraison from "@geoalgeria/livraison";

const all = livraison.carriers();                    // 16 ناقل
const yalidine = livraison.carrierById("yalidine");  // ناقل واحد
const inAlgiers = livraison.stopdesksByWilaya(16);    // مكاتب التوقف في الولاية 16
const guepexDesks = livraison.stopdesksByCarrier("guepex");
const reach = livraison.coverageByCarrier("yalidine"); // الولايات المخدومة

// كل مكتب توقف يحتوي على إحداثيات lat/lng — أقرب مكتب أو خريطة أو ترتيب بالمسافة في بضعة أسطر.
```

## ما يمكنك بناؤه

- **أقرب مكتب توقف** — إحداثيات على كل مكتب توقف، جاهزة للترتيب حسب المسافة.
- **منتقي نقاط الاستلام عند الدفع** — عرض مكاتب ناقل معين في ولاية المشتري.
- **مقارنة الناقلين** — سجل يوضح من يعمل، ونموذج عمله (مكتب توقف مقابل توصيل للمنزل)، ودعم الدفع عند الاستلام.
- **خرائط** — طبقة نقاط GeoJSON جاهزة للاستخدام لشبكة مكاتب التوقف المفتوحة بالكامل.

## المحتوى

| مجموعة البيانات | العدد | مُحدد الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| الناقلون (`carriers.json`) | **16** | — | سجل: الاسم، الموقع، النموذج، الدفع عند الاستلام، النطاق، انفتاح البيانات، API |
| مكاتب التوقف (`stopdesks.json`) | **411** | ✅ الكل | id، المشغّل، الاسم، العنوان، البلدية، `wilaya_code`، lat/lng |
| التغطية (`coverage.json`) | **9** | — | حضور مكاتب التوقف لكل ناقل (ولاية/بلدية) |

تمتد مكاتب التوقف عبر **61 ولاية**، جميعها محددة الإحداثيات. `wilaya_code` يرتبط بنموذج
الـ 69 ولاية في [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

### ملاحظة حول التغطية والشفافية

يوجد في الجزائر أكثر من 90 شركة توصيل، لكن القليل منها فقط ينشر مواقع وكالاته
بشكل مفتوح. **السجل** يغطي المشهد (الناقلون الرئيسيون وما يقدمه كل منهم)؛ أما
**الطبقة المحددة الإحداثيات** فتغطي الناقلين الذين ينشرون مواقعهم بشكل مفتوح:

- **منظومة Yalidine + Guepex** — Yalidine وGuepex والمشغّلون الذين يستخدمون
  شبكتهم المشتركة (EasyAndSpeed، WeCanServices، SpeedMail، Zimou Express)؛
- **Anderson** و**Noest** و**Maystro**، ثلاث شبكات مستقلة، كل منها محدد الإحداثيات
  من رابط Google Maps الموجود على بطاقات وكالاتها (الوكالات التي تكون روابطها مفقودة
  أو غير قابلة للحل أو تشير إلى ولاية مختلفة عن المُعلنة على البطاقة يتم استبعادها).

ناقلون مثل ZR Express وDHD وDHL وAramex يحتفظون بقوائم وكالاتهم خلف تطبيقات أو
تسجيلات دخول أو واجهات برمجة مرخصة، لذا يظهرون في السجل بـ `open_agency_data: "none"`
بدون مكاتب توقف هنا. التغطية تمثل *حضور مكاتب التوقف* للناقلين ذوي البيانات المفتوحة،
وليست ادعاءً بشأن نطاق التوصيل للمنزل.

## الصيغ

حزمة npm توزع **JSON** (قابل للاستيراد مباشرة):

```js
import carriers from "@geoalgeria/livraison/data/carriers.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/livraison/data/stopdesks.json
```

المُحمّلات وأشكال السجلات **مُنمَّطة** بالكامل — تعريفات TypeScript مضمّنة في الحزمة:

```ts
import livraison, { type StopDesk } from "@geoalgeria/livraison";
const desks: StopDesk[] = livraison.stopdesks();
```

ملفات **CSV وGeoJSON** موجودة في المستودع تحت [`data/`](data) ومُرفقة في كل
[إصدار GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  carriers.json             # 16 ناقل (سجل)
  stopdesks.json            # 411 مكتب توقف محدد الإحداثيات (مصفوفة)
  coverage.json             # 9 صفوف تغطية لكل ناقل
  metadata.json             # المصادر، الأعداد، generated_at
  csv/                      # المستودع + حزمة الإصدار (ليست في tarball npm)
    carriers.csv
    stopdesks.csv
    coverage.csv
  geojson/stopdesks.geojson # معالم نقطية (كل الـ 411 محددة الإحداثيات)
```

## أشكال السجلات

```json
// stopdesks.json
{
  "id": "160101",
  "operator": "guepex",
  "name": "Agence Sacré-Cœur",
  "address": "116 Didouche Mourad, Sacré Cœur, Alger",
  "commune": "Alger Centre",
  "wilaya_code": 16,
  "lat": 36.7635831801555,
  "lng": 3.0471151913967005,
  "sources": ["guepex", "yalidine"]
}
```

```json
// carriers.json
{
  "id": "yalidine",
  "name": "Yalidine Express",
  "website": "https://yalidine-express.com.dz",
  "type": "both",
  "cod": true,
  "scope": "domestic",
  "open_agency_data": "geocoded",
  "api": "documented",
  "in_stopdesks": true,
  "stopdesk_count": 93,
  "stopdesk_wilaya_count": 54,
  "notes": "Largest COD network; publishes an open geocoded stop-desk table."
}
```

`operator` في مكتب التوقف يرتبط بـ `carriers[].id`. `wilaya_code` يرتبط بولايات
GeoAlgeria. `sources` يسرد التغذيات المفتوحة التي تتضمن المكتب —
`["yalidine","guepex"]` عندما تتطابق خرائط الشبكة، أو `["anderson"]` لوكالة Anderson.

## هل تحتاج أيضًا إلى التقسيمات الإدارية؟

إذا كنت تحتاج أيضًا إلى الولايات والدوائر والبلديات لإجراء عمليات الربط، استخدم
الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — فهي توفر مجموعة بيانات
الـ 69 ولاية الكاملة التي يرتبط بها `wilaya_code` هنا. استخدم `@geoalgeria/livraison`
عندما تحتاج *فقط* إلى بيانات التوصيل.

## المصادر

مكاتب التوقف مصدرها الناقلون الذين ينشرون بيانات وكالاتهم بشكل مفتوح:

- **Yalidine** (<https://yalidine-express.com.dz/nos-agences/>) و**Guepex**
  (<https://www.guepex.dz/public/data/agences.json>) يتشاركان شبكة ترحيل فدرالية
  ومعرّفات مكاتب توقف مشتركة، لذا يتم دمج سجلاتهم وإزالة التكرار حسب المعرّف.
- **Anderson** (<https://anderson-ecommerce.com>) و**Noest** (<https://noest-dz.com>)
  و**Maystro** (<https://maystro-delivery.com/Coverage.html>) يسرد كل منهم وكالاته
  مع رابط Google Maps لكل بطاقة؛ يقوم البناء بحل كل رابط إلى موقع الوكالة (الوكالات
  التي تكون روابطها مفقودة أو غير قابلة للحل أو تشير إلى ولاية مختلفة عن المُعلنة
  على البطاقة يتم استبعادها).

سجل الناقلين مُجمَّع من [CourierDZ](https://github.com/PiteurStudio/CourierDZ) ومواقع
الناقلين وأبحاث GeoAlgeria. شغّل `npm run fetch` لإعادة توليد جميع المخرجات من
المصادر الحية؛ يفشل البناء بوضوح إذا انهار عدد أي مصدر أو ظهر ناقل غير معروف.
`wilaya_code` يُحدَّد بأقرب مركز ثقل بلدية من مجموعة بيانات `geoalgeria`.

## الترخيص والإسناد

الشيفرة مرخصة بموجب [MIT](LICENSE). بيانات مكاتب التوقف © الناقلون المعنيون؛
سجل الناقلين مُجمَّع من طرف GeoAlgeria. يُعاد توزيعها كمرجع ولتشغيل
[GeoAlgeria](https://geoalgeria.com). تحقق من كل ناقل للحصول على معلومات رسمية
ومحدّثة.

---

Made by [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
