[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/cliniques

**عيادات الجزائر ومرافق الرعاية الجوارية، كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/cliniques)](https://www.npmjs.com/package/@geoalgeria/cliniques)
[![License: MIT AND ODbL-1.0](https://img.shields.io/badge/License-MIT%20AND%20ODbL--1.0-green.svg)](LICENSE)

</div>

**1٬880 مرفق رعاية بإحداثيات جغرافية** عبر **66 ولاية**، كلٌّ بإحداثياته، مُصنَّفة
حسب **النوع** (عيادة متعددة الخدمات · قاعة علاج · مركز صحي · مصحة توليد · عيادة)،
ومعظمها باسمٍ عربي و/أو فرنسي، مع ربطٍ بالبلدية والولاية. مُستخرَجة من
**OpenStreetMap**. هذه هي **الطبقة المجتمعية** لقطاع الصحة: سجلّ وزارة الصحة
(CHU/EPH/EHS/EPSP) مُستثنى هنا عمدًا وموجود في
[`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante). متوفرة
بصيغ JSON وCSV وGeoJSON وTypeScript. جزء من
[GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/cliniques
```

```js
import cliniques from "@geoalgeria/cliniques";

const all = cliniques.cliniques();   // 1٬880 مرفق رعاية بإحداثيات

// الطبقة العمومية الجوارية في ولايةٍ معيّنة
const proximite = cliniques.cliniquesByWilaya("16")
  .filter((c) => c.type === "polyclinique" || c.type === "salle_de_soins");

// المرافق التي تُعلن خدمة استعجالات
const urgences = all.filter((c) => c.emergency);
```

## ماذا يمكنك أن تبني

- **أدلّة «رعاية قريبة منّي»**، إحداثيات على كامل السجلّات الـ1٬880، جاهزة لخريطة
  أو لترتيبٍ حسب المسافة.
- **خرائط تغطية الرعاية الجوارية**، بعدّ العيادات المتعددة الخدمات وقاعات العلاج
  لكل بلدية أو ولاية، وهي المرافق التي يقصدها الجزائريون أوّلًا.
- **أدلّة ثنائية اللغة**، آلاف الأسماء العربية والفرنسية جنبًا إلى جنب، مع الهاتف
  وأوقات العمل والتخصّص حيثما حملتها الخريطة.

## ما بداخلها

| مجموعة البيانات | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| مرافق الرعاية | **1٬880** | ✅ كلها | 1٬604 مُسمّاة، 66 ولاية |

**حسب النوع**

| النوع | العدد | المعنى |
| --- | --- | --- |
| `clinique` | 1٬098 | عيادة / مصحة، غالبها خاص |
| `polyclinique` | 411 | عيادة متعددة الخدمات، الطبقة العمومية الجوارية |
| `salle_de_soins` | 206 | قاعة علاج / مستوصف |
| `centre_sante` | 137 | مركز صحي / مركز علاج |
| `maternite` | 28 | مصحة توليد / دار الأمومة |

> **هذا استخراج من OpenStreetMap، وليس سجلًّا رسميًّا.** التغطية جزئية ومتفاوتة
> بين الولايات، وثلاث ولايات (54 عين قزام، 62 بئر العاتر، 63 العريشة) لا تحمل أي
> مرفقٍ مُخرَّط. لا يوجد مصدر رسمي يُحصي هذه الفئة، لذا لا تنشر الحزمة **أي نسبة
> تغطية**: وزارة الصحة تنشر أعدادًا للطبقة السجلّية التي تستثنيها هذه الحزمة، ولا
> سجلّ عمومي يُحصي العيادات الخاصة. تتغيّر الأرقام مع تحرير الخريطة.

> **لا تُعيد هذه الحزمة نشر أي عنصر OSM تنشره [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante)، ولا يجوز جمع الاثنتين.**
> `sante` هي الطبقة *السجلّية*: 695 مؤسسة عمومية (CHU، EPH، EHS، EPSP) من وزارة
> الصحة. وهذه الحزمة هي الطبقة *المجتمعية*. 121 سجلًّا من `sante` يُشير إلى عنصر
> OSM بمُعرِّفه، وكل عنصرٍ منها مُستبعَد هنا **بحكم البناء**، فلا يُنشَر مكانٌ
> مرّتين تحت العنصر نفسه. ولنكن دقيقين فيما لا يضمنه ذلك: سجلّات `sante` الأخرى
> البالغة 574 لا تحمل أي إشارة إلى OSM، لذا قد تظهر المؤسسة الفيزيائية نفسها في
> الحزمتين بإحداثيات ومُعرِّفات مختلفة دون أي آلية تكشف ذلك. الاثنتان تصفان
> طبقتين مختلفتين، فجمع 695 إلى 1٬880 لا يَعُدّ شيئًا حقيقيًّا.

**النوع مُستنتَج من الاسم.** العيادة المتعددة الخدمات تُسمّي نفسها
polyclinique/عيادة متعددة الخدمات، وقاعة العلاج قاعة علاج/مستوصف/dispensaire،
والمركز الصحي مركز صحي/centre de soins. والترتيب مهم: تُختبَر كلمات المرفق *قبل*
كلمة «مستشفى»/hôpital المجرّدة، لأن المُخرِّطين الجزائريين يستعملونها للمرافق
الجوارية أيضًا (10 سجلّات تحمل الصيغتين معًا). وكلمة «عيادة»/«مصحة»/clinique
المجرّدة تُعَدّ كلمة مرفقٍ أيضًا، برتبةٍ دون الأنواع الثلاثة المحدَّدة. وما تبقّى
يُصنَّف `clinique`، بما فيه الـ276 نقطة غير مُسمّاة الموسومة `clinic`، والوسم وحده
يكفي لتعريفها كمرفق رعاية.

**ما استُبعِد، ولماذا.** يُرجِع الاستخراج 2٬936 عنصرًا من OSM، يُسقَط منها 990 قبل
أي إصدار:

| المُستبعَد | العدد | السبب |
| --- | --- | --- |
| `hopital` | 359 | مستشفى / المؤسسة الاستشفائية / hôpital / EPH / EHS / EHU / مركز مكافحة السرطان، الطبقة السجلّية (`@geoalgeria/sante`) |
| `unnamed_hospital` | 239 | بلا اسمٍ إطلاقًا *و* موسوم مستشفى، فلا يمكن تمييزه عن الطبقة السجلّية |
| `sante_overlap` | 89 | العنصر نفسه ينشره سجلّ **استشفائي** (CHU/EPH/EHS) في `@geoalgeria/sante`، مهما كان اسمه هنا. أما العناصر التي يشير إليها سجلّ *EPSP* فلا تُستبعَد: الإشارة هناك مرساة جغرافية على مقرّ المؤسسة، والعنصر المقصود غالبًا مرفق يجب أن تحمله هذه الحزمة |
| `cabinet` | 96 | عيادة فردية: كلمة cabinet، أو اسمٌ ليس إلا اسم طبيب (Dr X، الطبيب …) |
| `epsp_entity` | 92 | المؤسسة العمومية للصحة الجوارية كهيئة إدارية (مرافقها تبقى) |
| `hospital_subfeature` | 58 | جزء من مستشفى مُخرَّط على حدة: مدخل، مصلحة، «Service de radiologie»، أو «استعجالات» مجرّدة |
| `pharmacie` | 6 | صيدلية، تتبع [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) |
| `chu` | 15 | المركز الاستشفائي الجامعي |
| `institut_pasteur` | 3 | معهد بحثٍ لا مرفق رعاية |
| `paramedical` | 2 | مدرسة التكوين شبه الطبي، تكوين لا رعاية |

تُستعلَم المستشفيات عمدًا رغم أن أيًّا منها لا يُنشَر: هي السبيل الوحيد للوصول إلى
مرافق الرعاية الموسومة `amenity=hospital`.

**المؤسسات الاستشفائية الخاصة تبقى، عن قصد.** فـ«EHP» أي المؤسسة الاستشفائية
الخاصة هي *عيادة خاصة*، وهي بالضبط فئة هذه الحزمة، لذا يسبق اختبار الملكية كل
أنماط السجلّ، وتدخل هذه السجلّات بنوع `clinique` وقطاع `private`. ولهذا يهم
الترتيب: يجب ألّا تُقرأ EHP (خاصة) على أنها EPH (عمومية).

**القطاع لا يُؤكَّد إلا بإشارة.** `public` عندما يحمل OSM وسم `operator:type`
(بما فيه `university`، فالمؤسسة الاستشفائية الجامعية مُشغِّل عمومي)، أو بنيويًّا
للنوعين `polyclinique` و`salle_de_soins` (وهما مرفقان عموميان بحكم تعريفهما في
المنظومة الجزائرية)؛ و`private` عند `operator:type=private` أو اسمٍ يحمل
privé/خاصة يُقرأ عبر كل وسوم الاسم، إذ قد لا يحمل السجلّ إشارته إلا في `name:en`.
629 سجلًّا عمومي، و67 خاص، ويبقى الـ1٬184 الباقي `null`. معظم العيادات خاصة في
الواقع، لكن الخريطة لا تقول ذلك، فلا يدّعي الحقل معرفته.

**وعلى كل سجلّ أيضًا:** `speciality` (من `healthcare:speciality`، على 158)،
و`address` (من وسوم `addr:*`، على 634)، و`phone` (على 106)، و`opening_hours`
(على 166)، و`emergency` (`true` على الـ68 سجلًّا الموسومة `emergency=yes`، ولا
تكون `false` أبدًا: صمت الخريطة ليس نفيًا لوجود استعجالات).

## الصيغ

تُقدِّم حزمة npm ملف **JSON** (قابل للاستيراد مباشرةً):

```js
import cliniques from "@geoalgeria/cliniques/data/cliniques.json" with { type: "json" };
// أو عبر CDN، بلا تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/cliniques/data/cliniques.json
```

المُحمِّلات وأشكال السجلّات مُوصَّفة بالكامل بِـ**TypeScript**:

```ts
import cliniques, { type Clinique } from "@geoalgeria/cliniques";
const all: Clinique[] = cliniques.cliniques();
```

**CSV وGeoJSON** موجودان في المستودع تحت [`data/`](data) ومُرفقان بكل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  cliniques.json              # 1٬880 مرفق رعاية (مصفوفة)
  metadata.json               # المصادر والأعداد والتغطية وتاريخ التحديث
  csv/cliniques.csv           # المستودع + حزمة الإصدار (ليست في حزمة npm)
  geojson/cliniques.geojson   # معالم نقطية
```

## شكل السجلّ

```json
{
  "id": "02-00006",
  "name": "عيادة متعددة الخدمات",
  "name_fr": null,
  "name_ar": "عيادة متعددة الخدمات",
  "wilaya_code": "02",
  "commune_code": "0207",
  "commune": "Beni Haoua",
  "lat": 36.530021,
  "lng": 1.58226,
  "geo_precision": "exact",
  "geo_method": "osm_node",
  "source": "osm",
  "refs": {
    "osm": "node/4144869592"
  },
  "type": "polyclinique",
  "type_label_fr": "Polyclinique",
  "type_label_ar": "عيادة متعددة الخدمات",
  "sector": "public",
  "speciality": null,
  "address": null,
  "phone": "027753479",
  "opening_hours": "24/7",
  "emergency": null
}
```

`id` مفتاح ثابت `{wilaya_code}-{seq}` يُولِّده GeoAlgeria، فريد داخل هذه المجموعة؛
ويُحفَظ عنصر OSM المُطابِق في `refs.osm`. و`name` هو أفضل اسم عرضٍ متاح ويكون
`null` للنقاط غير المُسمّاة، ويعنونها التطبيق بِـ`type` عندئذٍ. ويحمل `type`
تسميتين ثنائيتي اللغة. و`speciality` و`address` و`phone` و`opening_hours` تأتي
مباشرةً من OSM (`null` عند غياب الوسوم). و`sector` يكون `"public"`/`"private"`
فقط عند وجود إشارة، وإلّا `null`. و`geo_precision` يكون `"exact"` لنقطة مسحية أو
`"approximate"` لمركز مُخطَّط مبنى (1٬059 و821 على التوالي). ويُربَط `wilaya_code`
بِـ`wilaya_code` من GeoAlgeria.

> **ربط البلدية/الولاية مُستنتَج، لا يأتي من المصدر.** لا يحمل OpenStreetMap
> الرموز الإدارية الجزائرية. يُلحِق GeoAlgeria `wilaya_code` بِـ**الاحتواء
> المضلَّعي** مقابل حدود الولايات الـ69، ثم `commune_code` و`commune` بأقرب مركز
> ثقل **داخل تلك الولاية**، فلا يعبر الربط حدود ولايةٍ أبدًا. إسناد الولاية دقيقٌ
> عمليًّا؛ أمّا البلدية فأفضل تقدير.

## أتحتاج إلى التقسيمات الإدارية أيضًا؟

للولايات والدوائر والبلديات، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)**، بها تُحوِّل
`commune_code` لمرفقٍ إلى مُضلَّعٍ أو مركز ثقل. استخدم `@geoalgeria/cliniques` حين
تحتاج إلى مرافق الرعاية *فقط*.

## المصدر والمنهجية

شغّل `npm run fetch` لإعادة توليد كل المخرجات. يقوم السكربت بِـ:

1. الاستعلام من **OpenStreetMap** (Overpass) عن `amenity`/`healthcare=clinic`
   و`healthcare=centre` و`amenity`/`healthcare=hospital` داخل الجزائر؛
2. **تصنيف كل سجلّ** من الاسم الفرنسي والعربي، مع استبعاد الطبقة السجلّية
   والعيادات الفردية والمدارس شبه الطبية (انظر الجدول أعلاه)؛
3. إزالة تكرار المرفق نفسه المُخرَّط كنقطةٍ ومبنى معًا؛
4. إلحاق الولاية بالاحتواء المضلَّعي والبلدية بأقرب مركز ثقلٍ داخلها.

يُحفَظ الاستخراج الخام ضمن
[`sources/cliniques/`](https://github.com/yasserstudio/geoalgeria/tree/main/sources/cliniques).

## الرخصة والإسناد

**كود** الحزمة تحت رخصة [MIT](LICENSE). أمّا **البيانات** فمن **OpenStreetMap**:
**© مساهمو OpenStreetMap**، تحت رخصة
**[ODbL 1.0](https://www.openstreetmap.org/copyright)**. إذا استخدمت هذه البيانات
أو أعدت توزيعها، فعليك **إسناد الفضل لمساهمي OpenStreetMap** وإبقاء قواعد البيانات
المُشتقّة تحت رخصةٍ متوافقة.

تحقّق من المصادر الرسمية للحصول على معلوماتٍ موثوقة. تُقدَّم هذه البيانات للاستئناس
ولتشغيل [GeoAlgeria](https://geoalgeria.com).

[توثيق الـAPI والحقول →](https://geoalgeria.com/data/docs/cliniques) · [تصفّح كل الحزم →](https://geoalgeria.com/data)

---

من صنع [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
