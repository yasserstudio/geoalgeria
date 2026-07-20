[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/sports

**كل المنشآت الرياضية في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/sports)](https://www.npmjs.com/package/@geoalgeria/sports)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

5,141 منشأة رياضية عبر الجزائر — **ملاعب جوارية**، ملاعب كرة قدم، مسابح، قاعات
متخصصة، مضامير ألعاب القوى، ملاعب تنس، مراكز فروسية، قواعد بحرية وغيرها — كل منشأة
تتضمن الاسم، **نوع** المنشأة، العنوان، البلدية / الدائرة / الولاية، السعة، حالة
التشغيل، إمكانية الوصول لذوي الاحتياجات الخاصة، المساحة المبنية والأرضية، سنة
الاستلام والإحداثيات الجغرافية. المصدر: **نظام المعلومات الجغرافية لوزارة الشباب
والرياضة (sig.mjs.gov.dz)**. متوفر بصيغ JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/sports
```

```js
import sports from "@geoalgeria/sports";

const الكل = sports.facilities();                    // 5,141
const فيوهران = sports.facilitiesByWilaya(31);       // منشآت ولاية 31
const المسابح = sports.facilitiesByType("P25");      // كل مسابح 25 م
```

## ماذا يمكنك بناؤه

- **البحث عن أقرب مسبح / ملعب** — إحداثيات على كل سجل، جاهزة للترتيب حسب المسافة.
- **تطبيقات رياضية ومدنية** — خرائط الملاعب والمسابح والقاعات حسب الولاية والنوع والحالة.
- **خرائط** — طبقة GeoJSON نقطية جاهزة لشبكة المنشآت الرياضية بأكملها.
- **البحث والتخطيط** — كثافة المنشآت حسب النوع، تحليل السعة، تدقيق حالة التشغيل.

## المحتوى

| النوع | الرمز | العدد |
| --- | --- | --- |
| ملعب رياضي جواري | `TSP` | 3,292 |
| ساحة لعب كرة قدم | `AJF` | 437 |
| قاعة OMS | `SOMS` | 340 |
| قاعة متخصصة | `SS` | 191 |
| حوض سباحة | `BN` | 159 |
| مسبح 25 م | `P25` | 158 |
| مسبح جواري | `PP` | 103 |
| ملعب كرة قدم | `TF` | 83 |
| ملعب كرة قدم (ستاد) | `SF` | 79 |
| ملعب OMS | `STOMS` | 76 |
| مضمار ألعاب القوى | `PA` | 45 |
| ملعب بيتانك | `BL` | 39 |
| ملعب تنس | `CT` | 31 |
| وحدة إيواء وعلاج واسترجاع | `UHR` | 23 |
| مسبح 50 م | `P50` | 20 |
| ملعب ألعاب القوى (ستاد) | `SA` | 16 |
| مركز فروسية | `CE` | 11 |
| قاعدة بحرية | `BNA` | 8 |
| مركب رياضي | `CXS` | 7 |
| ساحة ألعاب ترفيهية | `AJL` | 5 |
| ميدان رماية | `CDT` | 5 |
| مركز تجمع وتحضير | `CRP` | 4 |
| مدرسة المواهب الشابة | `EJT` | 3 |
| ملعب ريبليك | `TR` | 3 |
| مركز تكوين جهوي | `CFR` | 1 |
| مؤسسة للتربية البدنية والرياضية | `EPS` | 1 |
| ملعب كبير | `GS` | 1 |
| **المجموع** | | **5,141** |

تغطية **58 ولاية**، كل منشأة بإحداثيات جغرافية — 5,008 منها بنقطة `exact`، و133
المتبقية `approximate`. `wilaya_code` مرتبط بنموذج الولايات في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## المصدر

البيانات من **وزارة الشباب والرياضة**، عبر نظام المعلومات الجغرافية العمومي
(<https://sig.mjs.gov.dz/dashboard/viewer>). نفّذ `npm run fetch` لإعادة توليد البيانات
من النظام المباشر.

## الترخيص والإسناد

الكود مرخص [MIT](LICENSE). البيانات حقوق النشر © **وزارة الشباب والرياضة**، معاد توزيعها
كمرجع لـ [GeoAlgeria](https://geoalgeria.com). تحقق من الوزارة للمعلومات الرسمية المحدثة.

[توثيق API →](https://geoalgeria.com/data/docs/sports) · [كل الحزم →](https://geoalgeria.com/data)

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
