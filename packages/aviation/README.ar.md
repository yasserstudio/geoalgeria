[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/aviation

**كل مطار مدني في الجزائر — كبيانات يمكنك تثبيتها.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

33 مطارا مدنيا عبر الجزائر — بالأسماء الرسمية، **رموز OACI (ICAO)**، العناوين البريدية،
أرقام الهاتف، المواقع الإلكترونية، الإحداثيات الجغرافية (GPS)، والربط بالولاية. المصدر:
ANAC (السلطة الوطنية للطيران المدني)، متوفر بصيغ JSON وCSV وGeoJSON.
جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/aviation
```

```js
import aviation from "@geoalgeria/aviation";

const all = aviation.airports();                 // 33
const algiers = aviation.airportByIcao("DAAG");  // هواري بومدين
const inOran = aviation.airportsByWilaya(31);     // مطارات الولاية 31

// كل سجل يحتوي على إحداثيات — الترتيب حسب المسافة، الخرائط، أو أقرب مطار في بضعة أسطر.
```

## ما يمكنك بناؤه

- **البحث عن أقرب مطار** — إحداثيات في كل سجل، جاهزة للترتيب حسب المسافة.
- **تحويل OACI ↔ مطار** — ربط رموز OACI من بيانات الرحلات بالأسماء وجهات الاتصال والمواقع.
- **السفر والنقل** — ربط ولاية أو نقطة بالمطار الذي يخدمها.
- **الخرائط** — طبقة نقاط GeoJSON جاهزة للاستخدام لشبكة المطارات المدنية بالكامل.

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| المطارات المدنية | **33** | الاسم الرسمي، رمز OACI، العنوان، الهاتف، الموقع الإلكتروني، الإحداثيات |

تغطي **31 ولاية**، كل مطار محدد الإحداثيات. `wilaya_code` مرتبط بنموذج الـ 69 ولاية في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## الصيغ

حزمة npm توفر صيغة **JSON** (قابلة للاستيراد مباشرة):

```js
import airports from "@geoalgeria/aviation/data/airports.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/aviation/data/airports.json
```

أدوات التحميل وأشكال السجلات **مصنّفة بالكامل** — تعريفات TypeScript مضمّنة في الحزمة:

```ts
import aviation, { type Airport } from "@geoalgeria/aviation";
const airports: Airport[] = aviation.airports();
```

صيغتا **CSV وGeoJSON** موجودتان في المستودع ضمن [`data/`](data) ومضمّنتان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  airports.json            # 33 مطارا (مصفوفة)
  metadata.json            # المصدر، الأعداد، generated_at
  csv/airports.csv         # المستودع + حزمة الإصدار (غير مضمّن في tarball npm)
  geojson/airports.geojson # معالم نقطية (جميع الـ 33 محددة الإحداثيات)
```

## شكل السجل

```json
{
  "id": "daag",
  "name": "Aéroport d'Alger – Houari Boumediene",
  "icao": "DAAG",
  "iata": null,
  "address": "Alger BP 164 DAR EL BEIDA",
  "phone": "+21323199230",
  "website": "https://www.aeroportalger.dz/",
  "wilaya_code": "16",
  "lat": 36.69951171485545,
  "lng": 3.210846808533331,
  "source": "https://www.anac.dz/en/carte-des-aeroports-3/"
}
```

`id` هو رمز OACI بأحرف صغيرة. `icao` يطابق دائما النمط `DA__`. `iata` قيمته `null` — تنشر
ANAC رموز OACI فقط (الحقل محجوز للإثراء لاحقا). `wilaya_code` مكمّل بصفر إلى رقمين ويرتبط
بولايات GeoAlgeria؛ بعض السجلات قد تحتوي على `phone` بقيمة `null` حيث لا تذكر ANAC رقما.

## هل تحتاج التقسيمات الإدارية أيضا؟

إذا كنت تحتاج أيضا الولايات والدوائر والبلديات للربط، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — توفر مجموعة بيانات التقسيم
الكاملة للـ 69 ولاية التي يشير إليها `wilaya_code` هنا. استخدم `@geoalgeria/aviation`
عندما تحتاج *فقط* بيانات المطارات.

## المصدر

البيانات من **ANAC — السلطة الوطنية للطيران المدني**، عبر خريطة المطارات العامة
(<https://www.anac.dz/en/carte-des-aeroports-3/>). شغّل `npm run fetch` لإعادة توليد جميع
المخرجات من الخريطة الحية؛ عملية البناء تتبع iframe الخريطة لذا لن تتعطل عند تحديث إصدار
ANAC، وتفشل بوضوح إذا تغيّر عدد المطارات أو تنسيق OACI. يتم تحديد `wilaya_code` عبر أقرب
مركز بلدية من مجموعة بيانات `geoalgeria` (الحزمة الرئيسية توفر مراكز البلديات وليس مضلعات
الحدود).

## الترخيص والإسناد

الكود مرخّص بموجب [MIT](LICENSE). البيانات الأساسية © **ANAC**، معاد توزيعها كمرجع ولتشغيل
[GeoAlgeria](https://geoalgeria.com). تحقق من ANAC للحصول على معلومات رسمية ومحدّثة.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/aviation) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
