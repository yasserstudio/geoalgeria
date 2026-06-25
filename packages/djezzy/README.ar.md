[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/djezzy

**شبكة محلات جيزي في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/djezzy)](https://www.npmjs.com/package/@geoalgeria/djezzy)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/djezzy)](https://www.npmjs.com/package/@geoalgeria/djezzy)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**128 محلًّا** لـ**جيزي** (Optimum Telecom Algérie)، أحد متعاملي الهاتف النقال
الثلاثة في الجزائر — كل محل بإحداثيات جغرافية، مع فئته وعنوانه وأوقات عمله ورمز
الافتتاح وربطه بالبلدية والولاية. متوفر بصيغ JSON وCSV وGeoJSON وTypeScript.
جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/djezzy
```

```js
import djezzy from "@geoalgeria/djezzy";

const boutiques = djezzy.boutiques();   // 128 محل جيزي بإحداثيات جغرافية

// المحلات في ولاية (ربط بـ wilaya_code في GeoAlgeria)
const inAlgiers = boutiques.filter((b) => b.wilaya_code === "16");

// المحلات حسب الفئة
const flagships = boutiques.filter((b) => b.category === "A");
```

## ما يمكنك بناؤه

- **أدلّة المحلات** — إحداثيات على كل محل من المحلات الـ128، جاهزة للترتيب حسب
  المسافة أو للعرض على خريطة.
- **التغطية حسب الولاية** — كل محل مرتبط ببلديته وولايته، فيمكنك حساب أو ترتيب
  حضور جيزي عبر الولايات الـ63 المغطّاة.
- **مقارنة المتعاملين** — اربط مع
  [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) عبر
  `wilaya_code` لمقارنة شبكات التوزيع متعاملًا بمتعامل.

## المحتوى

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| المحلات | **128** | ✅ الكل (128) | الفئة A/B/C، أوقات العمل، 63 ولاية |

## الصيغ

تتضمّن حزمة npm ملف **JSON** (قابل للاستيراد مباشرة):

```js
import boutiques from "@geoalgeria/djezzy/data/boutiques.json" with { type: "json" };
// أو عبر CDN، دون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/djezzy/data/boutiques.json
```

المُحمِّلات وبنية السجلات **مُوثَّقة الأنواع** بالكامل — تعريفات TypeScript مرفقة في الحزمة:

```ts
import djezzy, { type Boutique } from "@geoalgeria/djezzy";
const boutiques: Boutique[] = djezzy.boutiques();
```

ملفّا **CSV وGeoJSON** موجودان في المستودع ضمن [`data/`](data) ومُرفقان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  boutiques.json              # 128 محلًّا (مصفوفة)
  metadata.json               # المصدر، الأعداد، generated_at
  csv/boutiques.csv           # المستودع + الإصدار (ليس في حزمة npm)
  geojson/boutiques.geojson   # معالم نقطية
```

## بنية السجل

```json
{
  "id": "16-001",
  "code": "Z56",
  "type": "boutique",
  "name": "ADRAR",
  "category": "C",
  "address": "Groupe 74, Prés souk Dinar Tayeb, Adrar.",
  "hours": "08H00 - 18H00",
  "code_ouverture": null,
  "wilaya_code": "01",
  "commune_code": 101,
  "commune": "Adrar",
  "lat": 27.87194,
  "lng": -0.28569
}
```

`id` مفتاح ثابت `{wilaya_code}-{seq}` يولّده GeoAlgeria. يُحفظ رمز المحل الخاص
بجيزي في `code`. يرتبط `wilaya_code` بـ `wilaya_code` في GeoAlgeria.

> **الربط بالبلدية/الولاية مُستنتَج وليس من المصدر.** ينشر جيزي إحداثيات وعنوانًا
> دون أي رموز إدارية. يُضيف GeoAlgeria حقول `wilaya_code` و`commune_code`
> و`commune` عبر **الربط بأقرب مركز ثقل** لمجموعة بلديات
> [`geoalgeria`](https://www.npmjs.com/package/geoalgeria). تعيين الولاية دقيق
> عمليًّا؛ أما البلدية فتقريبية (قرب المركز، لا الاحتواء داخل المضلّع).

## تحتاج التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — بها تحوّل
`commune_code` لمحلٍّ ما إلى مضلّع أو مركز ثقل. استخدم `@geoalgeria/djezzy` عندما
تحتاج شبكة جيزي *فقط*.

## المصدر

تأتي البيانات من دليل محلات **جيزي**
(<https://www.djezzy.dz/nos-boutiques/>). تُضمّن الصفحة القائمة الكاملة كمصفوفة
JSON مُرمّزة بكيانات HTML — دون أي واجهة برمجية منفصلة. شغّل `npm run fetch`
لإعادة توليد المخرجات: يقرأ السكربت كائنات المحلات، ويتحقق من وقوع الإحداثيات
داخل الجزائر، ويُلحق الربط الإداري بأقرب مركز ثقل بلدية.

## الترخيص والإسناد

الشيفرة بترخيص [MIT](LICENSE). البيانات الأساسية © **Optimum Telecom Algérie
(جيزي)**، يُعاد نشرها للمرجعية ولتشغيل [GeoAlgeria](https://geoalgeria.com). تحقّق
من جيزي للحصول على المعلومات الرسمية والآنية. تتغيّر قائمة المحلات مع الافتتاحات
والإغلاقات — وتعكس كل إعادة بناء ما يعرضه الدليل حاليًّا.

[توثيق API والحقول →](https://geoalgeria.com/data/docs/djezzy) · [تصفّح كل الحزم →](https://geoalgeria.com/data)

---

من إنجاز [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
