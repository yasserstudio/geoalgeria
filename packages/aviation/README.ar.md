[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/aviation

**كل مطار مدني في الجزائر، كبيانات يمكنك تثبيتها.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/aviation)](https://www.npmjs.com/package/@geoalgeria/aviation)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

36 مطارا مدنيا عبر الجزائر، بالأسماء الرسمية، **رموز OACI (ICAO) وIATA**، العناوين البريدية،
أرقام الهاتف، المواقع الإلكترونية، الإحداثيات الجغرافية (GPS)، والربط بالولاية. المصدر:
ANAC (السلطة الوطنية للطيران المدني)، مع رموز IATA وثلاثة مطارات غائبة عن خريطة ANAC مأخوذة
من OurAirports. متوفر بصيغ JSON وCSV وGeoJSON.
جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/aviation
```

```js
import aviation from "@geoalgeria/aviation";

const all = aviation.airports();                 // 36
const algiers = aviation.airportByIcao("DAAG");  // هواري بومدين، iata "ALG"
const byIata = aviation.airportByIata("TLM");     // تلمسان، من تدفق رحلات
const inOran = aviation.airportsByWilaya(31);     // مطارات الولاية 31

// كل سجل يحتوي على إحداثيات – الترتيب حسب المسافة، الخرائط، أو أقرب مطار في بضعة أسطر.
```

## ما يمكنك بناؤه

- **البحث عن أقرب مطار** – إحداثيات في كل سجل، جاهزة للترتيب حسب المسافة.
- **تحويل OACI/IATA ↔ مطار**: ربط أي من الرمزين، من تدفق رحلات أو نظام حجز أو جدول مواعيد، بالأسماء وجهات الاتصال والمواقع.
- **السفر والنقل** – ربط ولاية أو نقطة بالمطار الذي يخدمها.
- **الخرائط** – طبقة نقاط GeoJSON جاهزة للاستخدام لشبكة المطارات المدنية بالكامل.

## المحتوى

| مجموعة البيانات | العدد | ملاحظات |
| --- | --- | --- |
| المطارات المدنية | **36** | الاسم الرسمي، رمزا OACI وIATA، العنوان، الهاتف، الموقع الإلكتروني، الإحداثيات |
| الخطوط الجوية المباشرة | **122** | خطوط اتجاهية مع المشغّل والحالة ومستوى الإثبات والمصدر |
| الخطوط الجوية المخطّطة | **2** | معلن عنها ولم تبدأ بعد؛ مجموعة منفصلة، وليست حالة |

تغطي **33 ولاية**، كل مطار محدد الإحداثيات ويحمل رمز IATA. `wilaya_code` مرتبط بنموذج الـ 69
ولاية في [`geoalgeria`](https://www.npmjs.com/package/geoalgeria).

33 من أصل 36 مأخوذة من خريطة ANAC نفسها. أما الثلاثة الأخرى، حاسي الرمل (`HRM`) والمشرية
(`MZW`) والأغواط (`LOO`)، فهي غائبة عنها ومأخوذة من OurAirports، لذا تحمل
`source: "ourairports"` وبدون حقول اتصال.

## الصيغ

حزمة npm توفر صيغة **JSON** (قابلة للاستيراد مباشرة):

```js
import airports from "@geoalgeria/aviation/data/airports.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/aviation/data/airports.json
```

أدوات التحميل وأشكال السجلات **مصنّفة بالكامل** – تعريفات TypeScript مضمّنة في الحزمة:

```ts
import aviation, { type Airport } from "@geoalgeria/aviation";
const airports: Airport[] = aviation.airports();
```

صيغتا **CSV وGeoJSON** موجودتان في المستودع ضمن [`data/`](data) ومضمّنتان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  airports.json            # 36 مطارا (مصفوفة)
  metadata.json            # المصادر، الأعداد، الترخيص، updated
  csv/airports.csv         # المستودع + حزمة الإصدار (غير مضمّن في tarball npm)
  geojson/airports.geojson # معالم نقطية (جميع الـ 36 محددة الإحداثيات)
```

## شكل السجل

```json
{
  "id": "daag",
  "name": "Aéroport d’Alger – Houari Boumediene",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": null,
  "lat": 36.69951171485545,
  "lng": 3.210846808533331,
  "geo_precision": "exact",
  "geo_method": "source_point",
  "source": "anac",
  "refs": { "icao": "DAAG", "iata": "ALG" },
  "icao": "DAAG",
  "iata": "ALG",
  "address": "Alger BP 164 DAR EL BEIDA",
  "phone": "+21323199230",
  "website": "https://www.aeroportalger.dz/"
}
```

`id` هو رمز OACI بأحرف صغيرة. `icao` يطابق دائما النمط `DA[A-Z]{2}`. `iata` يحمل رمز IATA،
مملوءا في السجلات الـ 36 كلها لكنه يبقى من نوع nullable حتى لا يكون مطار بلا رمز مخصص كسرا
للعقد. `wilaya_code` مكمّل بصفر إلى رقمين ويرتبط بولايات GeoAlgeria؛ هذه المجموعة تغطي مستوى
الولاية فقط، لذا `commune_code` و`commune` قيمتهما دائما `null`. كل نقطة تأتي مباشرة من
الإحداثية التي ينشرها مصدرها، لذا `geo_precision` قيمتها دائما `"exact"` و`geo_method` قيمتها
دائما `"source_point"`: لا شيء هنا قيمة احتياطية أو تخفيض دقة. `source` هو مفتاح قصير يُحلّ في
`metadata.sources[]`، إما `"anac"` أو `"ourairports"`، و`refs` يكرر `icao` و`iata` في المستوى
الأعلى. سجل ANAC واحد (`dabs`، تبسة) لديه `phone` بقيمة `null` حيث لا تذكر ANAC رقما؛ وسجلات
OurAirports الثلاثة لديها `address` و`phone` و`website` بقيمة `null`، وهي حقول لا ينشرها
OurAirports.

## هل تحتاج التقسيمات الإدارية أيضا؟

إذا كنت تحتاج أيضا الولايات والدوائر والبلديات للربط، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** – توفر مجموعة بيانات التقسيم
الكاملة للـ 69 ولاية التي يشير إليها `wilaya_code` هنا. استخدم `@geoalgeria/aviation`
عندما تحتاج *فقط* بيانات المطارات.

## المصدر

البيانات من **ANAC – السلطة الوطنية للطيران المدني**، عبر خريطة المطارات العامة
(<https://www.anac.dz/en/carte-des-aeroports-3/>). شغّل `npm run fetch` لإعادة توليد جميع
المخرجات من الخريطة الحية؛ عملية البناء تتبع iframe الخريطة لذا لن تتعطل عند تحديث إصدار
ANAC، وتفشل بوضوح إذا تغيّر عدد المطارات أو تنسيق OACI. يتم تحديد `wilaya_code` عبر أقرب
مركز بلدية من مجموعة بيانات `geoalgeria` (الحزمة الرئيسية توفر مراكز البلديات وليس مضلعات
الحدود).

لا تنشر ANAC سوى رموز OACI وتغفل ثلاثة مطارات، لذا تقرأ عملية البناء نفسها أيضا ملف
`airports.csv` الخاص بـ**[OurAirports](https://ourairports.com/data/)** والموضوع في الملك
العام. تُربط رموز IATA عبر رمز OACI، ولأن تطابق الرمز وحده ليس دليلا على أن السطرين يصفان
المكان نفسه، تُؤكَّد كل عملية ربط مقابل إحداثية ANAC نفسها وتفشل عملية البناء عند تجاوز 5 كم.
الفارق المرصود يتراوح بين 0.31 و2.15 كم، وأقصاه ورقلة (`DAUU`/`OGX`)، التي يحمل مدخلها في
OurAirports اسم مطار عين البيضاء بدل اسم المدينة.

المصدران كلاهما وثيقتان حيّتان، لذا يحمل كل مدخل في `metadata.sources[]` حقل `snapshot`:
الرابط الذي جرى تحميله فعليا، وبصمة SHA-256 لبايتاته، وحجمه، و`Last-Modified` حين ينشره
المصدر. `retrieved` يسجّل متى طلبنا؛ و`snapshot` يسجّل ما حصلنا عليه. يمكنك التحقق بنفسك عبر
`curl -sL <snapshot.url> | shasum -a 256`. هو إثبات وليس تثبيتا: تغيّر المصدر لا يُفشل
عملية البناء أبدا.

## الترخيص والإسناد

الكود مرخّص بموجب [MIT](LICENSE). سجلات ANAC © **ANAC**، معاد توزيعها كمرجع ولتشغيل
[GeoAlgeria](https://geoalgeria.com)؛ أما رموز IATA والمطارات الثلاثة الإضافية فمن
OurAirports، التي تضع بياناتها في الملك العام. تحقق من ANAC للحصول على معلومات رسمية
ومحدّثة.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/aviation) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
