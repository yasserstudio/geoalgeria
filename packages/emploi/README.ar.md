[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/emploi

**كل وكالات التشغيل العمومية في الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/emploi)](https://www.npmjs.com/package/@geoalgeria/emploi)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/emploi)](https://www.npmjs.com/package/@geoalgeria/emploi)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

**58 AWEM** (وكالات التشغيل الولائية) و**273 ALEM** (وكالات التشغيل المحلية)
التابعة للوكالة الوطنية للتشغيل **ANEM** — كل واحدة بعنوانها، هاتفها، فاكسها،
بريدها الإلكتروني، مسؤولها، والإحداثيات الجغرافية.
متوفرة بصيغ JSON وCSV وGeoJSON. جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/emploi
```

```js
import emploi from "@geoalgeria/emploi";

const awem = emploi.awem();         // 58 وكالة ولائية
const alem = emploi.alem();         // 273 وكالة محلية
const all = emploi.agencies();      // جميع الـ 331 (AWEM أولاً)

// الوكالات في ولاية (ربط عبر wilaya_code الخاص بـ GeoAlgeria)
const inAlger = all.filter((a) => a.wilaya_code === "16");

// البحث عن وكالة محلية بالاسم
const reggane = alem.filter((a) => a.name.includes("REGGANE"));
```

## ما يمكنك بناؤه

- **محددات مواقع الوكالات** — إحداثيات على (تقريباً) كل سجل، جاهزة للترتيب حسب المسافة أو العرض على خريطة.
- **أدلة الاتصال** — هاتف، فاكس، بريد إلكتروني ومسؤول لكل وكالة.
- **خرائط** — طبقات نقاط GeoJSON جاهزة للاستخدام لشبكة التشغيل بأكملها.

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| AWEM (وكالات التشغيل الولائية) | **58** | واحدة لكل ولاية |
| ALEM (وكالات التشغيل المحلية) | **273** | مكاتب دون مستوى الولاية، مسمّاة حسب المحلّة |

## الصيغ

حزمة npm تحتوي على **JSON** (قابل للاستيراد مباشرة):

```js
import alem from "@geoalgeria/emploi/data/alem.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/emploi/data/alem.json
```

أدوات التحميل وأشكال السجلات **مُنمّطة** بالكامل — تعريفات TypeScript مضمّنة في الحزمة:

```ts
import emploi, { type Awem, type Alem } from "@geoalgeria/emploi";
const local: Alem[] = emploi.alem();
```

**CSV وGeoJSON** موجودة في المستودع تحت [`data/`](data) ومُضمّنة في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  awem.json               # 58 وكالة ولائية (مصفوفة)
  alem.json               # 273 وكالة محلية (مصفوفة)
  metadata.json           # المصادر، الأعداد، updated
  csv/awem.csv            # المستودع + حزمة الإصدار (غير مضمّن في tarball npm)
  csv/alem.csv
  geojson/awem.geojson    # معالم نقطية (سجلات بإحداثيات)
  geojson/alem.geojson
```

> GeoJSON يتضمّن فقط السجلات التي تحتوي على إحداثيات — وكالتان ALEM لا تملكان
> `lat`/`lng` وتم حذفهما هناك (لكنهما موجودتان في JSON/CSV).

## هيكل السجلات

**ALEM (وكالة محلية)**

```json
{
  "id": "01-02",
  "name": "ALEM REGGANE",
  "wilaya_code": "01",
  "commune_code": null,
  "commune": null,
  "lat": 26.71627,
  "lng": 0.17441,
  "geo_precision": "exact",
  "geo_method": "anem",
  "source": "anem",
  "type": "ALEM",
  "code": "0102",
  "address": "Hai Saada - Reggane",
  "phone": "(049) 320 - 373",
  "fax": "(049) 320 - 372",
  "email": "alem.reggane@anem.dz",
  "manager": "BELHADJ ABBELKADER"
}
```

`id` هو مفتاح ثابت بصيغة `{wilaya_code}-{seq}` مُولّد بواسطة GeoAlgeria، وهو
فريد ضمن مجموعة `agencies()` المدمجة (معرّفات AWEM لا تحتوي أبداً على شرطة،
بينما معرّفات ALEM تحتوي عليها دائماً) — `code` الخاص بـ ANEM محفوظ أيضاً لكنه
مفقود في بعض السجلات وغير فريد، لذا يُفضّل استخدام `id`. حقلا `commune_code`
و`commune` يساويان `null` حالياً في كل السجلات — مصدر ANEM لا يحدّد إلا الولاية،
وليس البلدية. `wilaya_code` يربط مع `wilaya_code` الخاص بـ GeoAlgeria.

**AWEM (وكالة ولائية)** — نفس الهيكل، `id` = `wilaya_code` المكوّن من رقمين،
مع `name` / `address` / `phone` / `manager` و`lat`/`lng`.

## تحتاج التقسيمات الإدارية أيضاً؟

للولايات والدوائر والبلديات (والبيانات البريدية)، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)**. استخدم
`@geoalgeria/emploi` عندما تحتاج *فقط* شبكة وكالات التشغيل.

## المصدر

البيانات مصدرها **ANEM** (الوكالة الوطنية للتشغيل) عبر بوابتها الخرائطية
(<https://www.anem.dz/#/portail-carto>). لا توجد واجهة برمجية عامة — الوكالات
مدمجة في حزمة JavaScript الخاصة بالبوابة. شغّل `npm run fetch` لإعادة توليد جميع
المخرجات: يعيد اكتشاف الحزمة الحالية، يستخرج مجموعتي البيانات، يصحح انعكاس
`X`=lat / `Y`=lng في المصدر، ويُوحّد أكواد الولايات. تصنّف ANEM الوكالات وفق
**نظام 58 ولاية**، لذا تظهر الولايات الجديدة 59-69 حالياً تحت ولايتها الأم.

## الترخيص والإسناد

الكود مرخّص بموجب [MIT](LICENSE). البيانات الأساسية هي © **ANEM**، مُعاد توزيعها
كمرجع ولتغذية [GeoAlgeria](https://geoalgeria.com). تحقّق من ANEM للحصول على
معلومات رسمية ومحدّثة.

حقل `manager` يحتوي على اسم مسؤول الوكالة كما هو منشور، حرفياً، على البوابة
العامة لـ ANEM — وهو ليس بيانات خاصة. كل إعادة بناء تعكس ما تعرضه ANEM
حالياً؛ إذا أزالوه، يُحذف هنا أيضاً.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/emploi) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

من تطوير [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
