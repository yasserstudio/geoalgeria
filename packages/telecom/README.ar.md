[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/telecom

**تغطية شبكات الهاتف المحمول في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/telecom)](https://www.npmjs.com/package/@geoalgeria/telecom)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**2,798 نقطة تغطية 5G** عبر الجزائر، منشورة من خرائط التغطية الخاصة
بالمشغلين — **جيزي (1,001)** و**موبيليس (1,621)** و**أوريدو (176)** — كل
نقطة بإحداثياتها وربطها بالولاية/البلدية. متوفرة بصيغ JSON وCSV وGeoJSON
وTypeScript. جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/telecom
```

```js
import telecom from "@geoalgeria/telecom";

const sites = telecom.coverage();                       // جميع النقاط (2,798)
const djezzy = telecom.coverageByOperator("djezzy");    // 1,001
const mobilis = telecom.coverageByOperator("mobilis");  // 1,621
const ooredoo = telecom.coverageByOperator("ooredoo");  // 176

// تغطية 5G في ولاية (ربط عبر wilaya_code الخاص بـ GeoAlgeria)
const inAlger = sites.filter((s) => s.wilaya_code === "16");
```

المحملات وأشكال السجلات **مُنمّطة** بالكامل:

```ts
import telecom, { type CoverageSite } from "@geoalgeria/telecom";
const sites: CoverageSite[] = telecom.coverage("5G");
```

## ما يمكنك بناؤه

- **أدوات فحص تغطية 5G** — "هل توجد تغطية 5G بالقرب مني / في ولايتي؟"
- **مقارنة بين المشغلين** — بصمة جيزي / موبيليس / أوريدو لكل ولاية/بلدية.
- **خرائط** — طبقات نقاط GeoJSON جاهزة للاستخدام لنشر شبكة 5G.

## المحتوى

| المشغل | النقاط | الدقة | خريطة المصدر |
| --- | --- | --- | --- |
| جيزي | **1,001** | موقع خلية | djezzy5g.dz |
| موبيليس | **1,621** | موقع خلية | mobilis.dz/map/5g |
| أوريدو | **176** | بلدية مغطاة | ooredoo.dz |

تغطي **58 ولاية** (بما في ذلك الولايات الجديدة مثل تيميمون وعين صالح
وتقرت).

> **ما هي النقطة:** كل سجل هو نقطة منشورة على خريطة تغطية 5G الخاصة
> بالمشغل. جيزي وموبيليس ينشران مواقع **الخلايا**؛ أوريدو ينشر نقاطًا على
> **مستوى البلدية** داخل البلديات المغطاة (بعض البلديات تحتوي على عدة نقاط).
> الدوائر المعروضة على تلك الخرائط ذات نصف قطر ثابت للعرض، **وليست قياسًا
> فعليًا لتغطية الترددات الراديوية** — اعتبرها نقاط *تواجد* 5G وليس مضلعات
> تغطية.

## التنظيم (قابل للتوسع)

التغطية مُنظمة حسب **التقنية**، بحيث تكون إضافة جيل جديد عملية إضافية
بحتة — لا إعادة تسمية:

```
data/
  coverage/5g/
    sites.json          # مدمج — جميع المشغلين
    djezzy.json  mobilis.json  ooredoo.json
  csv/coverage/5g/sites.csv          # المستودع + حزمة الإصدار (غير مضمن في حزمة npm)
  geojson/coverage/5g/sites.geojson  # كيانات نقطية
  metadata.json         # المصادر، التقنيات، عدد النقاط لكل مشغل، generated_at
```

حزمة npm تحتوي على **JSON**؛ ملفات CSV/GeoJSON مضمنة في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases).

## شكل السجل

```json
{
  "id": "djezzy-ba5a8250cb",
  "technology": "5G",
  "operator": "djezzy",
  "name": "Ain benian ville",
  "address": "AIN BENIAN",
  "commune": null,
  "commune_ar": null,
  "commune_code": null,
  "wilaya_code": "16",
  "lat": 36.7898,
  "lng": 2.91341,
  "source": "https://www.djezzy5g.dz/map.html"
}
```

`id` هو مفتاح حتمي بصيغة `{operator}-{coordinate-hash}`، ثابت عبر عمليات
إعادة الجلب. `wilaya_code` يرتبط بـ `wilaya_code` الخاص بـ GeoAlgeria.
الحقول التي لا يوفرها مشغل معين تكون `null` (جيزي ليس لديه بلدية؛ موبيليس
لديه البلدية بالفرنسية/العربية لكن بدون عنوان؛ أوريدو لديه اسم البلدية
فقط). بالنسبة لأوريدو، `name` هو اسم البلدية المغطاة.

## هل تحتاج التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — فهي التي تتيح
لك تحويل `wilaya_code` إلى مضلع أو اسم.

## المصدر وإعادة التوليد

البيانات مأخوذة من خريطة تغطية 5G العامة لكل مشغل. نفّذ `npm run fetch`
لإعادة توليد جميع المخرجات: يفك تشفير كتلة العلامات المشفرة لجيزي، ويقرأ
نقطة الوصول JSON لموبيليس، ويقرأ نقطة وصول البلديات المغطاة لأوريدو عبر
جلسة متصفح حقيقية (موقع أوريدو يُصادق نفسه؛ هذه الخطوة تتطلب أداة
[`agent-browser`](https://www.npmjs.com/package/agent-browser) في `PATH`).
يتم تطبيع كل شيء في مخطط واحد مع حل `wilaya_code` إلى رموز GeoAlgeria.
المشغلون يستخدمون نظام 58 ولاية. الكتابة تتم بالكامل أو لا تتم على
الإطلاق، فلا يقوم مشغل فاشل أبدًا بالكتابة فوق بيانات صالحة ومؤكدة
بمجموعة جزئية.

## الترخيص والإسناد

الشفرة البرمجية مرخصة بموجب [MIT](LICENSE). البيانات الأساسية ملك المشغلين
المعنيين (**جيزي**، **موبيليس**، **أوريدو**)، أُعيد توزيعها كمرجع ولتشغيل
[GeoAlgeria](https://geoalgeria.com). نشر شبكة 5G مستمر — كل عملية إعادة
بناء تعكس ما تظهره خرائط المشغلين حاليًا؛ تحقق من المشغلين للحصول على
معلومات رسمية ومحدّثة.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/telecom) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
