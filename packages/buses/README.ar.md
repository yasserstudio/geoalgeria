[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center" dir="rtl">

# @geoalgeria/buses

**شبكات الحافلات الحضرية في الجزائر، كبيانات جاهزة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

<div dir="rtl">

بيانات مراجعة لخطوط الحافلات الحضرية وشبه الحضرية: **85 خطًا** و**47 مسارًا** و**83 اتجاهًا**
و**1,290 محطة** لدى ثمانية مشغّلين: ETUSA وETUS Tiaret وETUSTO وETUS Béjaïa وETUS M'Sila وETUS Sidi Bel Abbès وETUS Setif وETUS Mostaganem.
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
const all = buses.lines();                    // 85
const etusa = buses.linesByOperator("ETUSA"); // 50
```

<div dir="rtl">

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| الخطوط | **85** | 50 ETUSA و8 ETUS Sidi Bel Abbès و7 ETUS Tiaret و5 ETUSTO و5 ETUS Béjaïa و5 ETUS Setif و4 ETUS M'Sila وخط ETUS Mostaganem |
| المسارات | **47** | مسارات OSM مراجعة |
| المحطات | **1,290** | عقد OSM مع الحفاظ على الأسماء الفارغة |

ترتيب العضويات البالغ عددها 2,105 هو ترتيب أعضاء علاقة OSM الخام ويحمل القيمة
`osm_member_order_unvalidated`؛ وليس ترتيب ركوب متحققًا ولا نستنتج منه المحطات الطرفية.

## المصدر والرخصة

خصائص خطوط ETUSA من **fr.wikipedia** برخصة **CC BY-SA 4.0**. المسارات والاتجاهات والمحطات
من OpenStreetMap برخصة **ODbL 1.0** مع الإسناد **© OpenStreetMap contributors**.
حقائق خطوط ETUS Tiaret وETUSTO وETUS Béjaïa وETUS M'Sila وETUS Sidi Bel Abbès وETUS Setif مستخرجة من مصادر المشغلين الرسمية التي لا
تعلن رخصة مفتوحة. تُستخدم خرائط Google الخاصة ببجاية ومخططات المسيلة وصور مسارات سيدي بلعباس للتحقق فقط ولا نعيد نشر هندستها.
تتضمن بيانات سيدي بلعباس قوائم الانطلاق الكاملة المنسوخة من HTML الرسمي المقدم، وتبقى أيام الخدمة غير المذكورة بقيمة `null`.
الشيفرة تحت [MIT](LICENSE)، والتفاصيل في [NOTICE](NOTICE).

[تصفّح كل الحزم →](https://geoalgeria.com/data)

</div>

---

<div dir="rtl">

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)

</div>
