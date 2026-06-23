[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/jeunesse

**جميع مؤسسات الشباب في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/jeunesse)](https://www.npmjs.com/package/@geoalgeria/jeunesse)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

2,334 مؤسسة شباب عبر الجزائر — **دور الشباب**، المركبات الرياضية الجوارية،
القاعات متعددة الرياضات، نزل الشباب، مراكز العلوم والمراكز الثقافية، مخيمات الشباب والمزيد — لكل
مؤسسة اسمها، **نوعها**، عنوانها، قدرتها الاستيعابية، حالتها التشغيلية، إمكانية الوصول للأشخاص ذوي الإعاقة (PMR)،
المساحات المبنية والأرضية، البلدية / الدائرة / الولاية، والإحداثيات الجغرافية. المصدر: **نظام المعلومات الجغرافية لوزارة الشباب والرياضة (sig.mjs.gov.dz)** — نفس
النظام الرسمي خلف الحزمة الشقيقة [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports).
متوفر بصيغ JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/jeunesse
```

```js
import jeunesse from "@geoalgeria/jeunesse";

const all = jeunesse.institutions();                 // ~2,334
const inAlgiers = jeunesse.institutionsByWilaya(16);  // مؤسسات الولاية 16
const houses = jeunesse.institutionsByType("MJ");     // جميع دور الشباب

// كل سجل يحتوي على lat/lng — ترتيب حسب المسافة، عرض على خريطة، أو إيجاد أقرب مؤسسة بأسطر قليلة.
```

## ما يمكنك بناؤه

- **البحث عن أقرب مركز شباب** — إحداثيات على كل سجل، جاهزة للترتيب حسب المسافة.
- **تطبيقات مدنية وشبابية** — عرض دور الشباب والمركبات الرياضية والمراكز الثقافية حسب الولاية على الخريطة، مرشحة حسب الطاقة الاستيعابية أو حالة التشغيل.
- **خرائط** — طبقة نقاط GeoJSON جاهزة للاستخدام لكامل شبكة مؤسسات الشباب.
- **البحث والتخطيط** — كثافة المؤسسات حسب النوع والولاية، تحليل الطاقة الاستيعابية، عمليات تدقيق إمكانية الوصول (PMR) وحالة التشغيل.

## المحتوى

| النوع | الرمز | العدد |
| --- | --- | --- |
| دار الشباب | `MJ` | 960 |
| مركب رياضي جواري | `CSP` | 694 |
| قاعة متعددة الرياضات | `SPA` | 295 |
| نزل الشباب | `AJ` | 241 |
| مخيم الشباب | `CJ` | 54 |
| مركز الترفيه العلمي | `CLS` | 46 |
| بيت الشباب | `FJ` | 22 |
| مركز ثقافي | `CC` | 19 |
| وحدة استقبال | `BA` | 3 |
| **المجموع** | | **2,334** |

تغطي **58 ولاية**، وكل مؤسسة مُحددة جغرافيًا. `wilaya_code` مرتبط بنموذج الولايات في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

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
  institutions.json            # ~2,334 مؤسسة (مصفوفة)
  metadata.json                # المصدر، الأعداد، by_type، generated_at
  csv/institutions.csv         # المستودع + حزمة الإصدار (غير مضمّن في tarball npm)
  geojson/institutions.geojson # معالم نقطية (جميعها مُحددة جغرافيًا)
```

## شكل السجل

```json
{
  "id": 1,
  "name": "Auberge de jeunes El amir Abdelkader, Sbaa",
  "name_ar": "دار الشباب الأمير عبد القادر",
  "type_code": "AJ",
  "type_fr": "Auberge de jeunes",
  "type_ar": "نزل الشباب",
  "address": "sabaa, tsabit, adrar",
  "commune": "SEBAA",
  "daira": "TSABIT",
  "wilaya_code": "01",
  "wilaya_name": "ADRAR",
  "capacity": 50,
  "year": 2012,
  "operational": true,
  "pmr": true,
  "surface_built_m2": 3600,
  "surface_land_m2": 3600,
  "lat": 28.2186,
  "lng": -0.173,
  "source": "https://sig.mjs.gov.dz/dashboard/viewer"
}
```

يُنشر النظام الأسماء **بالفرنسية** ؛ `name_ar` هو الاسم العربي **المُتمّم** من خريطة الوزارة العمومية التاريخية
من خلال المطابقة الجغرافية الأقرب (≤ 200 م، مع التحقّق من النوع حتى لا يُنسب اسم مبنى مجاور) — موجود على ~59% من السجلات،
`null` حيث لا توجد مطابقة موثوقة. `name` هو `null` لـ ~5% من السجلات التي تتركها المصدر فارغة؛
`commune` و`daira` و`wilaya_name` بالفرنسية (أحرف كبيرة، كما مُنشرة). للحصول على قائمة كاملة
بتقسيمات الولايات والبلديات بالفرنسية، اربط `wilaya_code` بمجموعة بيانات
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). `wilaya_code` مُكمَّل بصفر على خانتين
وهو `≤ 58` (المصدر سابق لإصلاح الـ 69 ولاية)؛ ويبقى متوافقًا مع نموذج الولايات في GeoAlgeria.

## البنية التحتية الرياضية أيضًا؟

للملاعب والحمامات الشباب والمسارات والملاعب والمزيد من مؤسسات الرياضة **الرياضية** في الجزائر (من نفس نظام المعلومات الجغرافية لوزارة الشباب والرياضة)،
راجع الحزمة الشقيقة
**[`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports)**. استخدم
`@geoalgeria/jeunesse` لمؤسسات الشباب؛ استخدم `@geoalgeria/sports` لالبنية التحتية الرياضية.

## هل تحتاج التقسيم الإداري أيضًا؟

إذا كنت بحاجة أيضًا إلى الولايات والدوائر والبلديات للربط، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — فهي توفر مجموعة بيانات
التقسيم الإداري الكاملة التي يرتبط بها `wilaya_code` هنا.

## المصدر

البيانات مصدرها **وزارة الشباب والرياضة**، عبر نظام المعلومات الجغرافية العمومي
(<https://sig.mjs.gov.dz/dashboard/viewer>). نفّذ `npm run fetch` لإعادة توليد
جميع المخرجات من النظام الحي؛ عملية البناء تحل كل اسم ولاية بالفرنسية إلى رمز الولاية الرسمي،
وتُصلح السجلات ذات الإحداثيات المعكوسة، وتتمّم الأسماء العربية من الخريطة التاريخية، وتحذف السجلات القليلة
ذات الإحداثيات الوهمية/خارج الحدود (`metadata.dropped`). تفشل العملية بوضوح إذا انهار عدد المؤسسات أو ظهر نوع معروف.

## الترخيص والإسناد

الكود مرخّص بموجب [MIT](LICENSE). البيانات الأساسية © **وزارة الشباب والرياضة**،
مُعاد توزيعها كمرجع ولتشغيل [GeoAlgeria](https://geoalgeria.com). تحقق من الوزارة للحصول على معلومات
رسمية ومحدّثة.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/jeunesse) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
