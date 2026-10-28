[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/enseignement-superieur

**كل مؤسسات التعليم العالي في الجزائر، كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/enseignement-superieur)](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

187 مؤسسة تعليم عالي عبر الجزائر – **جامعات**، مدارس عليا، مدارس عليا للأساتذة، مراكز
جامعية، **المؤسسات الخاصة المرخصة**، والمؤسسات **التابعة لوزارات أخرى** (الدفاع، الصحة،
الثقافة…) التي تشرف عليها وزارة التعليم العالي بيداغوجيا – كل منها باسمها (فرنسي و/أو عربي)،
**نوع** المؤسسة، **قطاعها**، الوزارة المشرفة، **موقعه الإلكتروني الخاص**، ربط الولاية /
البلدية والإحداثيات. المصدر: **وزارة التعليم العالي والبحث العلمي (MESRS)**، متاح بصيغ
JSON وCSV وGeoJSON. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/enseignement-superieur
```

```js
import es from "@geoalgeria/enseignement-superieur";

const all = es.institutions();                  // 187
const inAlgiers = es.institutionsByWilaya(16);   // مؤسسات الولاية 16
const universities = es.institutionsByType("universite"); // كل الجامعات
const privates = es.institutionsBySector("private");      // المؤسسات الخاصة الـ 19

// كل سجل يحتوي على lat/lng – ترتيب حسب المسافة، خريطة، أو أقرب حرم جامعي في بضعة أسطر.
```

## ما يمكنك بناؤه

- **البحث عن أقرب جامعة** – إحداثيات على كل سجل، جاهزة للترتيب حسب المسافة.
- **تطبيقات طلابية ومدنية** – رسم خريطة شبكة التعليم العالي حسب الولاية، فصل القطاع العام عن الخاص، رابط مباشر لموقع كل مؤسسة.
- **خرائط** – طبقة نقاط GeoJSON جاهزة للاستخدام لكامل شبكة التعليم العالي.
- **البحث والتخطيط** – عدد المؤسسات حسب النوع والقطاع والوزارة المشرفة والولاية عبر كامل البلاد.

## المحتوى

| النوع | الرمز | العدد |
| --- | --- | --- |
| جامعة | `universite` | 59 |
| مدرسة عليا | `grande_ecole` | 110 |
| مدرسة عليا للأساتذة | `ens` | 13 |
| مركز جامعي | `centre_universitaire` | 5 |
| **المجموع** | | **187** |

حسب **القطاع**: 168 عام · 19 خاص مرخص. من بين المؤسسات العامة، 50 تابعة **لوزارات أخرى**
تشرف عليها وزارة التعليم العالي بيداغوجيا – اقرأ `supervisory_ministry` (مثل `"وزارة الصحة"`
للـ 25 معهد طبي حليف، `"وزارة الدفاع الوطني"` للـ 16 مدرسة عسكرية)، وهي `null` للشبكة
نفسها.

تغطي **51 ولاية**. `wilaya_code` مرتبط بنموذج الولايات في
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria) (نظام 69 ولاية).

## الأسماء والإحداثيات – المصدر

**هوية** كل سجل مصدرها 100% من الوزارة. `name` (الفرنسية) و`website` للشبكة العامة تأتي من قائمة
الوزارة؛ المؤسسات الخاصة والتابعة لوزارات أخرى تُنشر بالعربية فقط، لذا تحمل `name_ar` مع `name: null`.
`name_ar` أيضا **مملوء بأثر رجعي** للشبكة العامة (ربط عبر الموقع) – موجود على ~93% من جميع السجلات.

صفحة الوزارة **لا تتضمن إحداثيات ولا عنوان**، لذا **الجغرافيا مقدمة هنا** وموسومة
بشفافية على كل سجل عبر `geo_method` (التفصيل) و`geo_precision` (`"exact"` لـ `campus`،
و`"approximate"` لـ `commune`/`wilaya`):

| `geo_method` | العدد | `geo_precision` | ما تمثله الإحداثيات |
| --- | --- | --- | --- |
| `campus` | 80 | `exact` | نقطة من OpenStreetMap خاصة بحرم هذه المؤسسة، مع تحقق: أي ترميز يقع في ولاية مختلفة عن اسم المؤسسة يتم رفضه. |
| `commune` | 15 | `approximate` | النقطة المركزية لبلدية المؤسسة، من مجموعة بيانات `geoalgeria` الرئيسية، يُستخدم حين لا يحدد أي مصدر مفتوح موقع الحرم نفسه، أو، منذ مراجعة 2026-10-28، حين لا يكون لنقطة حرم جديدة إلا مصدر مفتوح واحد (يشترط `docs/adr/0001` مصدرين). تستند معظم نقاط `campus` كل منها إلى قراءة واحدة من OpenStreetMap؛ وحالة مراجعة كل سجل في `research/enseignement-superieur/`. |
| `wilaya` | 92 | `approximate` | النقطة المركزية لولاية المؤسسة، الحل البديل حين تكون الولاية فقط هي المعروفة. تقع هنا تقريبا كل مؤسسة خاصة/تابعة لوزارات أخرى، لأن المصدر لا ينشر عناوين لها. |

`wilaya_code` و`commune` دائما مطابقان لمجموعة بيانات `geoalgeria` الرئيسية، لذا فهما موثوقان
ويتبعان نظام 69 ولاية (`commune_code` يساوي `null` حاليا في جميع السجلات – الوزارة لا توفر رمز
بلدية). الإحداثيات هي طبقة إثراء – دقيقة حسب المستوى المحدد، وليست موقع حرم جامعي ممسوح. أعد
توليدها بـ `npm run geocode` (OpenStreetMap Nominatim)، ثم `npm run fetch`.

## الصيغ

حزمة npm تحتوي على **JSON** (قابل للاستيراد مباشرة):

```js
import institutions from "@geoalgeria/enseignement-superieur/data/institutions.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/enseignement-superieur/data/institutions.json
```

المحمّلات وبنية السجلات **مُنمّطة** بالكامل – تعريفات TypeScript مضمنة في الحزمة:

```ts
import es, { type Institution } from "@geoalgeria/enseignement-superieur";
const all: Institution[] = es.institutions();
```

ملفات **CSV وGeoJSON** موجودة في المستودع تحت [`data/`](data) ومضمنة في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  institutions.json            # 187 مؤسسة (مصفوفة)
  metadata.json                # المصادر، الإحصائيات، by_type، by_sector، by_geo_method، updated
  retired-ids.json             # معرفات لا يجوز لأي سجل أن يحملها مجددًا، وكل واحد منها يُحوّل إلى المعرف الذي يحمل المؤسسة الآن
  csv/institutions.csv         # المستودع + حزمة الإصدار (غير مضمن في tarball npm)
  geojson/institutions.geojson # كيانات نقطية (187 موضوعة؛ 80 مرمزة جغرافيا على مستوى الحرم، انظر geo_method)
```

## بنية السجل

```json
{
  "id": "00053",
  "name": "Université des sciences et de la technologie d'Alger, Houari Boumediène",
  "name_ar": "جامعة الجزائر هواري بومدين للعلوم و التكنولوجيا",
  "wilaya_code": "16",
  "commune_code": null,
  "commune": "Bab Ezzouar",
  "lat": 36.7121849,
  "lng": 3.1810204,
  "geo_precision": "exact",
  "geo_method": "campus",
  "source": "mesrs",
  "type": "universite",
  "type_label_fr": "Université",
  "sector": "public",
  "supervisory_ministry": null,
  "website": "http://www.usthb.dz/"
}
```

`id` سلسلة نصية ثابتة مكمّلة بأصفار يُسندها GeoAlgeria (مصدر الوزارة لا ينشر أي معرّف)، فريدة ضمن
هذه المجموعة. `name` باللغة الفرنسية (شبكة الوزارة) أو `null` للمؤسسات الخاصة/التابعة لوزارات
أخرى المنشورة بالعربية فقط – استخدم `name ?? name_ar` للحصول على علامة العرض. للحصول على أسماء
الولايات والبلديات بالعربية، اربط `wilaya_code` بمجموعة بيانات
[`geoalgeria`](https://www.npmjs.com/package/geoalgeria). `wilaya_code` مكمّل بصفر إلى رقمين؛
`commune_code` يساوي `null` حاليا في جميع السجلات. `geo_precision` تساوي `"exact"` لنقطة حرم
جامعي حقيقية أو `"approximate"` لمركز بلدية/ولاية – ويحدد `geo_method` أيّهما. `source` مفتاح
مصدر داخل `metadata.sources[]`، وليس رابطًا: `"mesrs"` لسجل مأخوذ من قائمة الشبكة الجامعية،
و`"bac-2026"` لسجل أورده ملف التوجيه الجامعي لبكالوريا 2026، و`"mesrs+bac-2026"` حين تورد القائمة السجل
ويورد ملف التوجيه اسمه الحالي. انظر **المصدر** أدناه للمنشورات الفعلية.

## هل تحتاج التقسيمات الإدارية أيضا؟

إذا كنت تحتاج أيضا الولايات والدوائر والبلديات لإجراء عمليات الربط، استخدم الحزمة
الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** – فهي تحتوي على مجموعة بيانات
تقسيم الولايات الكاملة التي يرتبط بها `wilaya_code` هنا. استخدم
`@geoalgeria/enseignement-superieur` حين تحتاج *فقط* بيانات مؤسسات التعليم العالي.

## المصدر

هوية المؤسسات مصدرها **وزارة التعليم العالي والبحث العلمي**، عبر صفحة الشبكة الجامعية العامة
– [القائمة الإنجليزية](https://www.mesrs.dz/en/university-network/) لأسماء الشبكة الفرنسية
و[القائمة بالعربية](https://www.mesrs.dz/reseau-universitaire-ar/) للأسماء العربية
والمؤسسات الخاصة + التابعة لوزارات أخرى التي تحذفها الصفحة الإنجليزية. نفّذ `npm run fetch`
لإعادة توليد كل المخرجات من القائمتين المباشرتين؛ يقوم الأمر بمطابقة ولاية/بلدية كل سجل
مع مجموعة البيانات الرئيسية وإرفاق بذرة الإحداثيات (`scripts/seeds/coordinates.json`، تُحدّث
بـ `npm run geocode`). يفشل بصوت عال إذا انهار عدد المؤسسات. الإحداثيات مشتقة من
OpenStreetMap – انظر **الأسماء والإحداثيات** أعلاه.

**ملف التوجيه الجامعي لبكالوريا 2026**: *Moyennes minimales BAC 2026 (suite à la première
phase)*، [المنشور في ملف PDF من 350 صفحة](https://www.esi.dz/wp-content/uploads/2026/07/BAC-2026-Fichier-des-moyennes-minimales-apres-phase-1.pdf)،
وهو يسمي كل مؤسسة توجّه إليها الوزارة الناجحين الجدد، بكود المؤسسة الخاص بالوزارة نفسها. وهو
يصف الشبكة كما هي اليوم، فيضيف **12 مؤسسة** تحذفها صفحة الشبكة، و**الاسم الحالي لمؤسستين**
لا تزال الصفحة تسميهما باسم أقدم، **وخلافة واحدة**: المدرسة الوطنية العليا للتكنولوجيات
المتقدمة (`P05`)، التي جعلها المرسوم التنفيذي 22-398 خليفة للمدرستين الجزائريتين اللتين
حلّهما، وما زالت صفحة الشبكة تسردهما منفردتين؛ لذلك يخرج سجلاهما ويُحوّل معرفاهما
إلى المدرسة الجديدة في `data/retired-ids.json`. والمحفوظ منه في المستودع هو إسقاط آمن حقوقيا لسطور
المؤسسات، `sources/enseignement-superieur/bac-2026.json`: كود المؤسسة والاسم الفرنسي الرسمي
فقط، دون المعدلات الدنيا لكل شعبة ودون ملف PDF نفسه، مع تسجيل رابط الملف وبصمته SHA-256 وحجمه
وعدد صفحاته في بيان الالتقاط. وهذا الإسقاط هو **المرجع** للاسم الفرنسي لهذه السجلات:
`scripts/bac-2026.mjs` يرفض أي اسم في `scripts/seeds/bac-2026.json` لا يطابق، بعد التبسيط،
السطر الذي نشرته الوزارة تحت ذلك الكود، حتى يتمكن ملف البذرة من إعادة الحركات والأحرف
الكبيرة التي يفقدها الملف المكتوب بالحروف الكبيرة، دون أن يُدخل اسما من عنده.

## الترخيص والإسناد

الكود مرخص بـ [MIT](LICENSE). بيانات المؤسسات محفوظة الحقوق للوزارة (**MESRS**)، معاد
توزيعها كمرجع ولتشغيل [GeoAlgeria](https://geoalgeria.com). الإحداثيات محفوظة الحقوق
لمساهمي OpenStreetMap (رخصة ODbL)، مشتقة عبر Nominatim. تحقق من الوزارة ومن كل مؤسسة
للحصول على معلومات رسمية.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/enseignement-superieur) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

من إنجاز [Yasser's studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [support@yasser.studio](mailto:support@yasser.studio)

المشروع مجاني ويبقى كذلك، والاستوديو نفسه ينجز لعملائه خرائط ومواقع ويب وتطبيقات هاتف وبيانات مفتوحة.
