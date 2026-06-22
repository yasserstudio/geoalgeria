[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/poste

**كل مكاتب بريد وأجهزة الصراف الآلي لبريد الجزائر — كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/poste)](https://www.npmjs.com/package/@geoalgeria/poste)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/poste)](https://www.npmjs.com/package/@geoalgeria/poste)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

3,908 مكتب بريد و2,026 جهاز صراف آلي عبر الجزائر — مع **أكواد بريدية حقيقية**، وأسماء ثنائية اللغة (فرنسية / عربية)، وإحداثيات GPS، وربط بالبلدية/الولاية. مصدرها بريد الجزائر، متوفرة بصيغ JSON وCSV وGeoJSON. جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/poste
```

```js
import poste from "@geoalgeria/poste";

const offices = poste.postOffices();   // 3,908
const atms = poste.atms();             // 2,026

// مكاتب البريد في بلدية (ربط عبر code_commune الخاص بـ GeoAlgeria)
const inAdrar = offices.filter((o) => o.commune_code === "0101");

// أقرب صراف آلي؟ كل سجل يحتوي على lat/lng للحسابات.
```

## ما يمكنك بناؤه

- **التحقق من الأكواد البريدية والبحث عنها** — كل مكتب يحمل `postal_code` الحقيقي الخاص به.
- **محددات مواقع المكاتب / أجهزة الصراف الآلي** — إحداثيات على (تقريبًا) كل سجل، جاهزة للترتيب حسب المسافة أو العرض على الخريطة.
- **التكنولوجيا المالية والخدمات اللوجستية** — مطابقة العناوين مع أقرب مكتب بريد أو صراف آلي.
- **خرائط** — طبقات نقاط GeoJSON جاهزة للاستخدام لشبكة البريد بالكامل.

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| مكاتب البريد | **3,908** | كل مكتب بكوده البريدي الخاص (`postal_code`) |
| أجهزة الصراف الآلي | **2,026** | شبكة GAB لبريد الجزائر |

## الصيغ

حزمة npm تحتوي على **JSON** (قابلة للاستيراد مباشرة):

```js
import offices from "@geoalgeria/poste/data/postoffices.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/poste/data/postoffices.json
```

المحمّلات وأشكال السجلات **مُنمّطة** بالكامل — تعريفات TypeScript مضمنة في الحزمة:

```ts
import poste, { type PostOffice, type Atm } from "@geoalgeria/poste";
const offices: PostOffice[] = poste.postOffices();
```

ملفات **CSV وGeoJSON** موجودة في المستودع تحت [`data/`](data) ومضمنة في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  postoffices.json            # 3,908 مكتب (مصفوفة)
  atms.json                   # 2,026 صراف آلي (مصفوفة)
  metadata.json               # المصدر، الأعداد، generated_at
  csv/postoffices.csv         # المستودع + حزمة الإصدار (غير مضمن في حزمة npm)
  csv/atms.csv
  geojson/postoffices.geojson # كيانات نقطية (سجلات ذات إحداثيات)
  geojson/atms.geojson
```

> GeoJSON يتضمن فقط السجلات التي تحتوي على إحداثيات — عدد قليل من المكاتب
> وأجهزة الصراف الآلي لا تُبلّغ عن `lat`/`lng` وتُحذف منه (لكنها تبقى في
> JSON/CSV). سجلات أجهزة الصراف الآلي لا تحتوي على `commune_code`
> (واجهة API المصدر لا توفره).

## أشكال السجلات

**مكتب بريد**

```json
{
  "id": 1,
  "name": "ADRAR RP",
  "name_ar": "أدرار م ر",
  "class": "CE",
  "postal_code": "01000",
  "address": "ADRAR CENTRE RUE DES MARYTIM",
  "commune_code": "0101",
  "commune_fr": "ADRAR",
  "commune_ar": "أدرار",
  "wilaya_code": "01",
  "wilaya_fr": "ADRAR",
  "wilaya_ar": "أدرار",
  "lat": 27.8708439,
  "lng": -0.2871417
}
```

`class` هو تصنيف المكتب (`CE`، `R1`–`R4`، `HC`، `GA`). `commune_code` هو
كود البلدية المكون من 4 أرقام الخاص ببريد الجزائر، والذي يرتبط بـ `code_commune`
الخاص بـ GeoAlgeria.

**جهاز صراف آلي** — نفس الشكل، مُعرّف بـ `id`/`name`/`postal_code`/`wilaya_*` مع `lat`/`lng`؛ بدون `commune_code`.

## هل تحتاج التقسيمات الإدارية أيضًا؟

إذا كنت تحتاج أيضًا الولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — فهي تدمج
بيانات البريد هذه وتوفر `postOffices` / `atms` إلى جانب مجموعة بيانات
التقسيمات الكاملة. استخدم `@geoalgeria/poste` عندما تحتاج *فقط* البيانات
البريدية/المصرفية.

## المصدر

البيانات مصدرها **بريد الجزائر** عبر واجهة API العامة لـ BaridiMap
(<https://baridimap.poste.dz>). نفّذ `npm run fetch` لإعادة توليد جميع
المخرجات من واجهة API المباشرة؛ نفس العملية تعكس البيانات في حزمة `geoalgeria`
حتى لا يحدث اختلاف بينهما أبدًا (هذه الحزمة هي المصدر المرجعي). أعد التشغيل
دوريًا — BaridiMap لا يزال يصنف المكاتب وفق نظام 58 ولاية، لذا الولايات
الجديدة 59–69 تظهر حاليًا تحت ولاياتها الأم.

## الترخيص والإسناد

الشفرة البرمجية مرخصة بموجب [MIT](LICENSE). البيانات الأساسية © **بريد الجزائر**،
أُعيد توزيعها كمرجع ولتشغيل [GeoAlgeria](https://geoalgeria.com). تحقق من
بريد الجزائر للحصول على معلومات رسمية ومحدّثة.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/poste) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

من تطوير [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
