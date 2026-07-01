[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center" dir="rtl">

# @geoalgeria/buses

**شبكات الحافلات الحضرية في الجزائر — كبيانات جاهزة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/buses)](https://www.npmjs.com/package/@geoalgeria/buses)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

<div dir="rtl">

**خطوط** الحافلات الحضرية في الجزائر — المحطتان الطرفيتان، عدد المواقف، والبلديات والمحطات
التي يخدمها كل خط. مجموعة بيانات **متعددة المشغّلين**؛ تُصدر النسخة الأولى **50 خطًّا لإيتوزا
(ETUSA)** بالجزائر العاصمة. بصيغتي JSON و CSV. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

> **المشغّل (المصدر):** ETUSA — مؤسسة النقل الحضري وشبه الحضري لمدينة الجزائر. ستُضاف مدن/
> مشغّلون آخرون. للمحطات البرية بين الولايات انظر
> [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres)؛
> وللسكك/الترامواي/المترو انظر [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire).

</div>

```bash
npm install @geoalgeria/buses
```

```js
import buses from "@geoalgeria/buses";
const all = buses.lines();                    // 50
const etusa = buses.linesByOperator("ETUSA"); // 50
```

<div dir="rtl">

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| خطوط الحافلات الحضرية | **50** | ETUSA (الجزائر) — المحطتان الطرفيتان، عدد المواقف، البلديات والمحطات المخدومة |

> **النطاق (v1):** خصائص على مستوى الخط فقط. أما **الهندسة الجغرافية** لكل موقف/خط
> (OSM `route=bus`) فمؤجّلة إلى **v1.1** (تغطية OSM الموسومة بـETUSA ضعيفة حاليًا).
> تغطي 50 من ~122 خطًّا لركّاب ETUSA. `wilaya_code` = `16` (الجزائر).

## المصدر والرخصة

بيانات الخطوط من **fr.wikipedia** (مقالات خطوط ETUSA) — برخصة **CC BY-SA 4.0** (الإسناد +
المشاركة بالمثل). المشغّل: **ETUSA**. شيفرة الحزمة تحت [MIT](LICENSE)؛ وتَرِث بيانات الخطوط
رخصة CC BY-SA. تحقّق من ETUSA للخطوط الرسمية والمحدّثة.

[تصفّح كل الحزم →](https://geoalgeria.com/data)

</div>

---

<div dir="rtl">

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)

</div>
