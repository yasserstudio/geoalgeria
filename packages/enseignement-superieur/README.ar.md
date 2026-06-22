[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/enseignement-superieur

**كل مؤسسات التعليم العالي في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

110 مؤسسة تعليم عالي عبر الجزائر — **جامعات**، مدارس عليا، مدارس عليا للأساتذة ومراكز
جامعية — كل منها بالاسم الرسمي، **موقعه الإلكتروني الخاص**، **نوع** المؤسسة، ربط
الولاية / البلدية والإحداثيات. المصدر: **وزارة التعليم العالي والبحث العلمي (MESRS)**،
متاح بصيغ JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/enseignement-superieur
```

```js
import es from "@geoalgeria/enseignement-superieur";

const all = es.institutions();                  // 110
const inAlgiers = es.institutionsByWilaya(16);   // مؤسسات الولاية 16
const universities = es.institutionsByType("universite"); // كل الجامعات

// كل سجل يحتوي على lat/lng — ترتيب حسب المسافة، خريطة، أو أقرب حرم جامعي في بضعة أسطر.
```

## ما يمكنك بناؤه

- **البحث عن أقرب جامعة** — إحداثيات على كل سجل، جاهزة للترتيب حسب المسافة.
- **تطبيقات طلابية ومدنية** — رسم خريطة شبكة التعليم العالي حسب الولاية، مع رابط مباشر لموقع كل مؤسسة.
- **خرائط** — طبقة نقاط GeoJSON جاهزة للاستخدام لكامل شبكة التعليم العالي.
- **البحث والتخطيط** — عدد المؤسسات حسب النوع والولاية عبر كامل البلاد.

## المحتوى

| النوع | الرمز | العدد |
| --- | --- | --- |
| جامعة | `universite` | 58 |
| مدرسة عليا | `grande_ecole` | 35 |
| مدرسة عليا للأساتذة | `ens` | 12 |
| مركز جامعي | `centre_universitaire` | 5 |
| **المجموع** | | **110** |

تغطي **51 ولاية**. `wilaya_code` مرتبط بنموذج الولايات في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) (نظام 69 ولاية).

## الأسماء والإحداثيات — المصدر

**هوية** كل سجل مصدرها 100% من الوزارة: `name` و`type` و`website` الرسمي مأخوذة
مباشرة من قائمة الشبكة الجامعية للوزارة (التي تنشر الأسماء **بالفرنسية فقط**).

صفحة الوزارة **لا تتضمن إحداثيات ولا عنوان**، لذا **الجغرافيا مقدمة هنا** وموسومة
بشفافية على كل سجل عبر `geo_precision`:

| `geo_precision` | العدد | ما تمثله الإحداثيات |
| --- | --- | --- |
| `campus` | 61 | ترميز جغرافي من OpenStreetMap للحرم الجامعي المسمى، مع تحقق: أي ترميز يقع في ولاية مختلفة عن اسم المؤسسة يتم رفضه. |
| `commune` | 16 | النقطة المركزية لبلدية المؤسسة، من مجموعة بيانات `geoalgeria` الرئيسية — يُستخدم حين لا يجد OSM الحرم الجامعي بالاسم. |
| `wilaya` | 33 | النقطة المركزية لولاية المؤسسة — الحل البديل حين تكون الولاية فقط هي المعروفة. |

`wilaya_code` و`wilaya_name` و`commune` دائما مطابقة لمجموعة بيانات `geoalgeria` الرئيسية،
لذا فهي موثوقة وتتبع نظام 69 ولاية. الإحداثيات هي طبقة إثراء — دقيقة حسب المستوى
المحدد، وليست موقع حرم جامعي ممسوح. أعد توليدها بـ `npm run geocode`
(OpenStreetMap Nominatim)، ثم `npm run fetch`.

## الصيغ

حزمة npm تحتوي على **JSON** (قابل للاستيراد مباشرة):

```js
import institutions from "@geoalgeria/enseignement-superieur/data/institutions.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/enseignement-superieur/data/institutions.json
```

المحمّلات وبنية السجلات **مُنمّطة** بالكامل — تعريفات TypeScript مضمنة في الحزمة:

```ts
import es, { type Institution } from "@geoalgeria/enseignement-superieur";
const all: Institution[] = es.institutions();
```

ملفات **CSV وGeoJSON** موجودة في المستودع تحت [`data/`](data) ومضمنة في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  institutions.json            # 110 مؤسسة (مصفوفة)
  metadata.json                # المصدر، الإحصائيات، by_type، by_precision، generated_at
  csv/institutions.csv         # المستودع + حزمة الإصدار (غير مضمن في tarball npm)
  geojson/institutions.geojson # كيانات نقطية (110 موضوعة؛ 61 مرمزة جغرافيا على مستوى الحرم، انظر geo_precision)
```

## بنية السجل

```json
{
  "id": 53,
  "name": "Université des sciences et de la technologie d'Alger, Houari Boumediène",
  "type": "universite",
  "type_fr": "Université",
  "website": "http://www.usthb.dz/",
  "commune": "Bab Ezzouar",
  "wilaya_code": "16",
  "wilaya_name": "Alger",
  "lat": 36.7121849,
  "lng": 3.1810204,
  "geo_precision": "campus",
  "source": "https://www.mesrs.dz/en/university-network/"
}
```

صفحة شبكة الوزارة تنشر الأسماء **بالفرنسية فقط**، لذا `name` بالفرنسية؛ للحصول على
أسماء الولايات والبلديات بالعربية، اربط `wilaya_code` بمجموعة بيانات
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). `wilaya_code` مكمّل بصفر إلى
رقمين.

## هل تحتاج التقسيمات الإدارية أيضا؟

إذا كنت تحتاج أيضا الولايات والدوائر والبلديات لإجراء عمليات الربط، استخدم الحزمة
الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — فهي تحتوي على مجموعة بيانات
تقسيم الولايات الكاملة التي يرتبط بها `wilaya_code` هنا. استخدم
`@geoalgeria/enseignement-superieur` حين تحتاج *فقط* بيانات مؤسسات التعليم العالي.

## المصدر

هوية المؤسسات مصدرها **وزارة التعليم العالي والبحث العلمي**، عبر صفحة الشبكة الجامعية
العامة (<https://www.mesrs.dz/en/university-network/>). نفّذ `npm run fetch` لإعادة توليد
كل المخرجات من القائمة المباشرة؛ يقوم الأمر بمطابقة ولاية/بلدية كل سجل مع مجموعة
البيانات الرئيسية وإرفاق بذرة الإحداثيات (`scripts/seeds/coordinates.json`، تُحدّث بـ
`npm run geocode`). يفشل بصوت عال إذا انهار عدد المؤسسات. الإحداثيات مشتقة من
OpenStreetMap — انظر **الأسماء والإحداثيات** أعلاه.

## الترخيص والإسناد

الكود مرخص بـ [MIT](LICENSE). بيانات المؤسسات محفوظة الحقوق للوزارة (**MESRS**)، معاد
توزيعها كمرجع ولتشغيل [GeoAlgeria](https://geoalgeria.com). الإحداثيات محفوظة الحقوق
لمساهمي OpenStreetMap (رخصة ODbL)، مشتقة عبر Nominatim. تحقق من الوزارة ومن كل مؤسسة
للحصول على معلومات رسمية.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/enseignement-superieur) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
