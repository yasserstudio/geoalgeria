[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/jeunesse

**جميع مؤسسات الشباب والرياضة في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

2,076 مؤسسة شباب ورياضة عبر الجزائر — **دور الشباب**، المركبات الرياضية،
القاعات متعددة الرياضات، نزل الشباب، المراكز الثقافية، مخيمات الشباب والمزيد — لكل
مؤسسة اسمها الرسمي بالعربية، **نوع** المؤسسة، البلدية / الدائرة / الولاية، والإحداثيات الجغرافية.
المصدر: **وزارة الشباب**، متوفر بصيغ JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/jeunesse
```

```js
import jeunesse from "@geoalgeria/jeunesse";

const all = jeunesse.institutions();              // 2,076
const inAlgiers = jeunesse.institutionsByWilaya(16); // مؤسسات الولاية 16
const houses = jeunesse.institutionsByType("MJ");  // جميع دور الشباب

// كل سجل يحتوي على lat/lng — ترتيب حسب المسافة، عرض على خريطة، أو إيجاد أقرب مؤسسة بأسطر قليلة.
```

## ما يمكنك بناؤه

- **البحث عن أقرب دار شباب** — إحداثيات على كل سجل، جاهزة للترتيب حسب المسافة.
- **تطبيقات مدنية وشبابية** — عرض دور الشباب والمركبات الرياضية والمراكز الثقافية حسب الولاية على الخريطة.
- **خرائط** — طبقة نقاط GeoJSON جاهزة للاستخدام لكامل شبكة الشباب والرياضة.
- **البحث والتخطيط** — كثافة المؤسسات حسب النوع والولاية عبر كامل التراب الوطني.

## المحتوى

| النوع | الرمز | العدد |
| --- | --- | --- |
| دار الشباب | `MJ` | 833 |
| مركب رياضي جواري | `CS` | 577 |
| قاعة متعددة الرياضات | `SPA` | 297 |
| نزل الشباب | `AJ` | 193 |
| مركز ثقافي | `CC` | 58 |
| مخيم الشباب | `CJ` | 51 |
| مركز الترفيه العلمي | `CLS` | 35 |
| نادي الشباب | `CLJ` | 29 |
| مسبح جواري | `PAL` | 3 |
| **المجموع** | | **2,076** |

تغطي **50 ولاية**، وكل مؤسسة مُحددة جغرافيًا. `wilaya_code` مرتبط بنموذج الولايات في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). المصدر ينشر أقل من العدد الكامل
للولايات؛ الولايات الثمانية غير الموجودة في خريطة الوزارة غائبة من المصدر الأصلي، ولم تُحذف هنا.

## الصيغ

حزمة npm توفر ملف **JSON** (قابل للاستيراد مباشرة):

```js
import institutions from "@geoalgeria/jeunesse/data/institutions.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/jeunesse/data/institutions.json
```

أدوات التحميل وأشكال السجلات **مُعرَّفة الأنواع** بالكامل — تعريفات TypeScript مضمّنة في الحزمة:

```ts
import jeunesse, { type Institution } from "@geoalgeria/jeunesse";
const all: Institution[] = jeunesse.institutions();
```

صيغتا **CSV وGeoJSON** موجودتان في المستودع تحت [`data/`](data) ومرفقتان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  institutions.json            # 2,076 مؤسسة (مصفوفة)
  metadata.json                # المصدر، الأعداد، by_type، generated_at
  csv/institutions.csv         # المستودع + حزمة الإصدار (غير مضمّن في tarball npm)
  geojson/institutions.geojson # معالم نقطية (جميع 2,076 مُحددة جغرافيًا)
```

## شكل السجل

```json
{
  "id": 4,
  "name": "دار الشباب خير الدين",
  "type_code": "MJ",
  "type_ar": "دار الشباب",
  "type_fr": "Maison de jeunes",
  "commune": "تقرت",
  "daira": "تقرت",
  "wilaya_code": "55",
  "wilaya_name": "تقرت",
  "lat": 33.10933,
  "lng": 6.07068,
  "source": "https://youthconnect.mjeunesse.gov.dz/institutions-map"
}
```

تنشر الوزارة الأسماء **بالعربية فقط**، لذا `name` و`commune` و`daira` و`wilaya_name`
بالعربية؛ `type_fr` هو تسمية إرشادية بالفرنسية للنوع. للحصول على أسماء الولايات والبلديات
بالفرنسية، اربط `wilaya_code` بمجموعة بيانات [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).
`wilaya_code` مُكمَّل بصفر على خانتين وهو `<= 58` (المصدر سابق لإصلاح الـ 69 ولاية)؛
ويبقى متوافقًا مع نموذج الولايات في GeoAlgeria.

## هل تحتاج التقسيم الإداري أيضًا؟

إذا كنت بحاجة أيضًا إلى الولايات والدوائر والبلديات للربط، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — فهي توفر مجموعة بيانات
التقسيم الإداري الكاملة التي يرتبط بها `wilaya_code` هنا. استخدم `@geoalgeria/jeunesse`
عندما تحتاج *فقط* بيانات مؤسسات الشباب والرياضة.

## المصدر

البيانات مصدرها **وزارة الشباب**، عبر خريطة المؤسسات العمومية
(<https://youthconnect.mjeunesse.gov.dz/institutions-map>). نفّذ `npm run fetch` لإعادة توليد
جميع المخرجات من الخريطة الحية؛ عملية البناء تعتمد على ربط البلدية بالولاية الخاص بالوزارة،
وتُصلح السجلات ذات الإحداثيات المعكوسة أو المفقودة الإشارة (نقطة غربية مُخزَّنة بدون إشارة
السالب — انظر `metadata.sign_corrected`)، وتحذف السجلات القليلة ذات الإحداثيات الوهمية
(`metadata.dropped`). تفشل العملية بوضوح إذا انهار عدد المؤسسات أو ظهر رمز نوع غير معروف.

## الترخيص والإسناد

الكود مرخّص بموجب [MIT](LICENSE). البيانات الأساسية ملك **وزارة الشباب**، مُعاد توزيعها
كمرجع ولتشغيل [GeoAlgeria](https://geoalgeria.com). تحقق من الوزارة للحصول على معلومات
رسمية ومحدّثة.

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
