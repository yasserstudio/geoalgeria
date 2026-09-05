[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center" dir="rtl">

# @geoalgeria/gares-routieres

**كل المحطات البرية للحافلات في الجزائر، كبيانات جاهزة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/gares-routieres)](https://www.npmjs.com/package/@geoalgeria/gares-routieres)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/gares-routieres)](https://www.npmjs.com/package/@geoalgeria/gares-routieres)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

<div dir="rtl">

74 محطة برية للنقل بين الولايات عبر الجزائر – مع الأسماء الرسمية والعناوين والإحداثيات
والمساحات والربط بالولاية/البلدية. المصدر **سوقرال (SOGRAL)**، المؤسسة العمومية المسيّرة
للمحطات البرية، بصيغ JSON و CSV و GeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **يُعرف أيضًا بـ:** شبكة سوقرال. سوقرال هو *المصدر*؛ الحزمة مُسمّاة حسب المجال
> (`gares-routieres`) ويمكن العثور عليها عبر الكلمة المفتاحية `sogral`.

</div>

```bash
npm install @geoalgeria/gares-routieres
```

```js
import gares from "@geoalgeria/gares-routieres";

const all = gares.stations();                 // 74
const alger = gares.stationById("16-01");
const setif = gares.stationsByWilaya(19);
```

<div dir="rtl">

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| المحطات البرية | **74** | الاسم الرسمي، العنوان، الإحداثيات، المساحات |

تغطي **52 ولاية**، وكلها مُحدّدة جغرافيًا. يرتبط `wilaya_code` بنموذج الـ69 ولاية في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

## المصدر

البيانات من **سوقرال – EPE SOGRAL Spa**، اعتمادًا على نسخة سجل سوقرال التي جُلبت من
`live.sogral.com` بتاريخ 2026/07/01؛ وقد توقّف هذا الموقع عن العمل. أُعيد التحقق في
2026/08/28 من قيم `refs.mahatati_agency` الـ73، وطابقت جميعها قائمة محطات المغادرة
العلنية في [محطتي](https://mahatati.sogral.com/). تبقى عين صالح المحطة الوحيدة التي
لا تظهر كمحطة مغادرة. يُحدّد `wilaya_code`/`commune` عبر أقرب مركز بلدية من مجموعة
`geoalgeria`.

## الرخصة والإسناد

الشيفرة تحت رخصة [MIT](LICENSE). البيانات ملك © **سوقرال**، يُعاد نشرها للاستئناس ولدعم
[GeoAlgeria](https://geoalgeria.com). تحقّق من سوقرال للمعلومات الرسمية والمحدّثة.

[تصفّح كل الحزم →](https://geoalgeria.com/data)

</div>

---

<div dir="rtl">

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)

</div>
