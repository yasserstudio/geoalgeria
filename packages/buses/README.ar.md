[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center" dir="rtl">

# @geoalgeria/buses

**شبكات الحافلات الحضرية في الجزائر، كبيانات جاهزة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

<div dir="rtl">

بيانات مراجعة لخطوط الحافلات الحضرية وشبه الحضرية: **153 خطًا** و**76 مسارًا** و**128 اتجاهًا**
و**1,603 محطة** لدى 14 مشغّلًا.
بصيغ JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **المشغّل (المصدر):** ETUSA – مؤسسة النقل الحضري وشبه الحضري لمدينة الجزائر. ستُضاف مدن/
> مشغّلون آخرون. للمحطات البرية بين الولايات انظر
> [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres)؛
> وللسكك/الترامواي/المترو انظر [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire).

</div>

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";
const all = buses.lines();                    // 153
const etusa = buses.linesByOperator("ETUSA"); // 76
```

<div dir="rtl">

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| الخطوط | **153** | 14 مشغلًا؛ تبقى الخطوط الرسمية بدون مسار متاحة في الدليل |
| المسارات | **76** | مسارات OSM مراجعة |
| الاتجاهات | **128** | علاقات OSM المصدرية |
| المحطات | **1,603** | عقد OSM مع الحفاظ على الأسماء الفارغة |

ترتيب العضويات البالغ عددها 2,685 هو ترتيب أعضاء علاقة OSM الخام ويحمل القيمة
`osm_member_order_unvalidated`؛ وليس ترتيب ركوب متحققًا ولا نستنتج منه المحطات الطرفية.

## المصدر والرخصة

خصائص خطوط ETUSA من **fr.wikipedia** برخصة **CC BY-SA 4.0**. المسارات والاتجاهات والمحطات
من OpenStreetMap برخصة **ODbL 1.0** مع الإسناد **© OpenStreetMap contributors**.
حقائق خطوط 12 مشغلًا المذكورة في [NOTICE](NOTICE) مستخرجة من مصادر المشغلين الرسمية التي لا
تعلن رخصة مفتوحة. تُستخدم خرائط Google الخاصة ببجاية ومخططات المسيلة وصور مسارات سيدي بلعباس للتحقق فقط ولا نعيد نشر هندستها.
تتضمن بيانات سيدي بلعباس قوائم الانطلاق الكاملة المنسوخة من HTML الرسمي المقدم، وتبقى أيام الخدمة غير المذكورة بقيمة `null`.
الشيفرة تحت [MIT](LICENSE)، والتفاصيل في [NOTICE](NOTICE).

[تصفّح كل الحزم →](https://geoalgeria.com/data)

</div>

---

<div dir="rtl">

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)

</div>
