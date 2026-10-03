[English](README.md) | [Français](README.fr.md) | **العربية**

# GeoAlgeria

> حزمة البيانات الجغرافية الجزائرية – 69 ولاية، 551 دائرة، 1,541 بلدية. بأمر `npm install` واحد.

هل لا زلت تنسخ قوائم الولايات من ملفات PDF؟ هل لا زلت تستخدم بيانات عالقة عند 48 ولاية؟ GeoAlgeria هي أول بيانات جغرافية جزائرية قابلة للتثبيت عبر npm ومُتحقق منها بالتكامل المستمر – محدّثة وفق إصلاح 2026. JSON، CSV، GeoJSON، SQL، TypeScript.

[![CI](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml/badge.svg)](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![npm downloads](https://img.shields.io/npm/dm/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![License: see LICENSE](https://img.shields.io/badge/License-MIT%20code%2C%20mixed%20data-green.svg)](LICENSE)

---

## حقائق سريعة

تضم الجزائر **69 ولاية** و**1,541 بلدية**، رسمياً منذ **أبريل 2026**، وتنقسم كل ولاية إلى دوائر. يعكس ذلك إصلاحين إقليميين: القانون 19-12 (2019، أضاف الولايات 49 إلى 58) والقانون رقم 26-06 المؤرخ في 4 أبريل 2026 (أضاف الولايات 59 إلى 69)، المنشور في [*الجريدة الرسمية* رقم 25 بتاريخ 5 أبريل 2026](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf). يُنمذج GeoAlgeria جميع الولايات الـ 69 بعد الإصلاح مع الرموز البريدية والإحداثيات الجغرافية والأسماء ثنائية اللغة. تحتوي هذه النسخة على كامل **1,541 سجل بلدية** و**551 دائرة في مجموعة البيانات**. هذا هو العدد الخاص بهذه المجموعة وليس عدداً رسمياً: لم يُنشر أي عدد وطني رسمي للدوائر بعد إصلاح 2026 (المرسوم 26-206 المؤرخ في 25 مايو 2026 يحدد مقار الدوائر فقط)، والعدد 564 الذي كان هذا الملف يصفه بالرسمي كان يشمل 9 دوائر وهمية ناتجة عن 13 سجل بلدية مكرراً، كما يسجل [سجل التغييرات](CHANGELOG.md) في الإصدار 1.1.2. آخر تحقق: سبتمبر 2026.

**142 من الـ 551 محددة بمرسوم.** المرسوم التنفيذي رقم 26-253 المؤرخ في 15 يوليو 2026، المنشور في *الجريدة الرسمية* رقم 52 بتاريخ 21 يوليو 2026، يحدد البلديات التي ينشطها كل رئيس دائرة في الولايات 3 و 5 و 7 و 12 و 13 و 14 و 17 و 26 و 28 و 32 ومن 59 إلى 69، ويسمي فيها 142 دائرة. ويترك الولايات الـ 48 الأخرى تحت المرسوم رقم 91-306 المؤرخ في 24 أوت 1991، وقوائمها التي تحملها هذه المجموعة تبلغ 409. قراءة الملحق في [`research/_dairas/`](../../research/_dairas/).

---

## لماذا GeoAlgeria؟

سئمت من مجموعات البيانات التي لا تزال تعتقد أن الجزائر تضم 48 ولاية؟ نحن أيضاً.

| الميزة | geoalgeria | leblad | algeria-cities |
|--------|:-:|:-:|:-:|
| جميع الولايات الـ 69 (إصلاح 2026) | ✅ | ❌ (58) | ✅ |
| الدوائر ككيانات مستقلة | ✅ | ❌ | ❌ |
| رموز بريدية لكل بلدية | ✅ | ✅ | ❌ |
| إحداثيات لكل بلدية | ✅ | ❌ | ✅ |
| جاهز للتجارة الإلكترونية (مسطّح، غير مُطبّع) | ✅ | ❌ | ❌ |
| قوالب مناطق التوصيل | ✅ | ❌ | ❌ |
| حزمة npm + TypeScript | ✅ | ✅ | ❌ |
| تصدير SQL (MySQL/PG/SQLite) | ✅ | ❌ | ✅ |
| تحقق CI عند كل commit | ✅ | ❌ | ❌ |
| تصدير GeoJSON | ✅ | ❌ | ✅ |
| ثنائي اللغة عربي + فرنسي | ✅ | ✅ | ✅ |
| آخر تحديث | 2026 | 2021 | 2023 |

مستعد للتجربة؟ انتقل إلى [التثبيت](#التثبيت) أو احصل على [ملف JSON الخام](data/ecommerce/communes.json) مباشرة.

يُشار إليه أيضاً بـ: المقاطعات الجزائرية (ولايات)، الدوائر، البلديات، مدن الجزائر، الرمز البريدي الجزائري، قائمة بلديات الجزائر JSON، Algeria GeoJSON، ولايات 2026، قاعدة بيانات ولايات الجزائر، التقسيم الإداري للجزائر.

---

## لمن هذه الحزمة؟

- **مطورو التجارة الإلكترونية** – نماذج العناوين، تكوين مناطق الشحن، التحقق من الرموز البريدية
- **مهندسو الواجهة الخلفية** – أنشئ قاعدة بياناتك بملف SQL واحد
- **مطورو الواجهة الأمامية** – قوائم منسدلة متتالية (ولاية ← دائرة ← بلدية)
- **محللو نظم المعلومات الجغرافية / البيانات** – GeoJSON مع 1,541 معلماً نقطياً
- **مطورو التكنولوجيا المدنية** – تطبيقات حكومية، بوابات المواطنين
- **الطلبة والباحثون** – بيانات نظيفة، منظمة وموثّقة جيداً

---

## التثبيت

```bash
npm install geoalgeria
```

```javascript
const dz = require('geoalgeria');

dz.wilayas;                    // جميع الولايات الـ 69
dz.communes;                   // جميع البلديات الـ 1,541
dz.dairas;                     // جميع الدوائر الـ 551
dz.ecommerce;                  // مجموعة بيانات مسطّحة لنماذج العناوين
dz.postOffices;                // 3,908 مكاتب بريد الجزائر
dz.atms;                       // 2,026 صراف آلي

dz.getWilaya(16);              // { name_fr: "Alger", name_ar: "الجزائر", ... }
dz.getCommunesByWilaya(16);    // 57 بلدية في الجزائر العاصمة
dz.getDairasByWilaya(16);      // دوائر الجزائر العاصمة
dz.findCommune('Oran');        // البحث بالاسم (فرنسي أو عربي)
dz.findByPostalCode('16000');  // البحث بالرمز البريدي
dz.getPostOfficesByCommune(1731); // مكاتب البريد في بلدية (حسب code_commune)
```

أنواع TypeScript مضمّنة مباشرة.

**تستخدم هذه البيانات في الإنتاج؟** [أخبرنا](https://github.com/yasserstudio/geoalgeria/discussions) – نعرض مشاريع المجتمع في الـ README.

---

## الاستخدام بدون npm

### CDN (بدون تثبيت)

```html
<script>
  fetch('https://cdn.jsdelivr.net/npm/geoalgeria/data/ecommerce/communes.json')
    .then(r => r.json())
    .then(communes => { /* ابنِ قائمتك المنسدلة */ });
</script>
```

### التجارة الإلكترونية / نماذج العناوين

احصل على `data/ecommerce/communes.json` – مسطّح، غير مُطبّع، بدون عمليات ربط:

```json
{
  "id": 541,
  "commune_name_fr": "Ain El Ibel",
  "commune_name_ar": "عين الإبل",
  "daira_name_fr": "Aïn El Ibel",
  "wilaya_code": 17,
  "wilaya_name_fr": "Djelfa",
  "wilaya_name_ar": "الجلفة",
  "postal_code": "17011"
}
```

### تغذية قاعدة البيانات

حمّل `data/sql/full.sql` من هذا المستودع، ثم:

```bash
# PostgreSQL
psql -d mydb -f full.sql

# MySQL
mysql mydb < full.sql

# SQLite
sqlite3 mydb.sqlite < full.sql
```

### نظم المعلومات الجغرافية / الخرائط

حمّل `data/geojson/communes.geojson` من هذا المستودع – GeoJSON قياسي، يعمل مع Leaflet، Mapbox، QGIS، إلخ.

> **ملاحظة:** منذ مراجعة الصحة في الإصدار v2، تحتوي حزمة npm على **JSON وCSV وGeoJSON وSQL**، فملف `data/geojson/communes.geojson` موجود في الحزمة أيضًا. وملف zip المرفق بكل [إصدار GitHub](https://github.com/yasserstudio/geoalgeria/releases) يحمل شجرة `data/` نفسها لمن لا يستخدم npm.

---

## جميع الملفات

| الملف | الصيغة | السجلات | الأنسب لـ |
|-------|--------|---------|-----------|
| `data/algeria.json` | JSON | 69 ولاية + بلديات | الاستخدام بملف واحد |
| `data/wilayas.json` | JSON | 69 | قائمة الولايات فقط |
| `data/dairas.json` | JSON | 551 | قائمة الدوائر مع عدد البلديات |
| `data/name-history.json` | JSON | 210 | الكتابات السابقة لأسماء الولايات والبلديات، مع النص الذي عوّض كل واحدة منها |
| `data/communes_w*.json` | JSON | 1,541 | بيانات البلديات المفصّلة |
| `data/csv/wilayas.csv` | CSV | 69 | جداول البيانات، الاستيراد |
| `data/csv/communes.csv` | CSV | 1,541 | جداول البيانات، الاستيراد |
| `data/geojson/wilayas.geojson` | GeoJSON | 69 | الخرائط، نظم المعلومات الجغرافية |
| `data/geojson/communes.geojson` | GeoJSON | 1,541 | الخرائط، نظم المعلومات الجغرافية |
| `data/sql/full.sql` | SQL | 69 + 1,541 | قاعدة بيانات مُطبّعة |
| `data/ecommerce/communes.json` | JSON | 1,541 | نماذج العناوين، القوائم المنسدلة |
| `data/ecommerce/communes.csv` | CSV | 1,541 | استيراد مسطّح |
| `data/ecommerce/communes.sql` | SQL | 1,541 | قاعدة بيانات بجدول واحد |
| `data/delivery/*.json` | JSON | 69 لكل ناقل | حساب مناطق التوصيل |
| `data/poste/postoffices.json` | JSON | 3,908 | مكاتب البريد (رموز حقيقية، إحداثيات) |
| `data/poste/atms.json` | JSON | 2,026 | مواقع الصرافات الآلية |
| `data/poste/csv/*`، `data/poste/geojson/*` | CSV/GeoJSON | – | بيانات بريدية لجداول البيانات / الخرائط |

> `data/poste/` مصدره [بريد الجزائر](https://baridimap.poste.dz). يُوحَّد `commune_code` ليرتبط بـ `code_commune` لكل بلدية، ويحتفظ `source_commune_code` بقيمة المزوّد الأصلية عندما تختلف.

الحقل `code_commune` هو المعرّف الفريد `WWCC` الوارد في [الرمز الجغرافي الوطني لسنة 2021 الصادر عن الديوان الوطني للإحصائيات](https://www.ons.dz/IMG/pdf/code_geo_2021.pdf). وتحتفظ البلديات التي رُقّيت إلى الولايات 59–69 ببادئة ولايتها الأم وفق تقسيم 2021.

## المخطط

انظر [`data/README.md`](data/README.md) للتوثيق الكامل للحقول.

---

## المساهمة

انظر [CONTRIBUTING.md](https://github.com/yasserstudio/geoalgeria/blob/main/CONTRIBUTING.md). نرحّب بـ:

- تصحيحات البيانات (مع مصادر رسمية)
- تصحيحات رموز البلديات المدعومة بمصدر رسمي
- بيانات مناطق التوصيل من حسابات ناقلين حقيقية (Yalidine، ZR Express، Maystro)
- صيغ تصدير جديدة (XML، YAML، مصفوفات PHP، إلخ.)
- تصحيحات الترجمة والكتابة بالحروف اللاتينية

**أول مساهمة لك؟** ابحث عن المشاكل المُعلّمة بـ `good first issue` – كثير منها يتطلب فقط إضافة إحداثيات بلدية واحدة.

---

## الإصدارات

تستخدم هذه البيانات [الإصدارات الدلالية](https://semver.org/). انظر [CHANGELOG.md](CHANGELOG.md).

---

## منظومة GeoAlgeria

`geoalgeria` هي الطبقة الإدارية الأساسية. مجموعات البيانات المتخصصة تُثبّت بجانبها وترتبط عبر `wilaya_code`:

| الحزمة | المحتوى |
| --- | --- |
| [`@geoalgeria/poste`](https://www.npmjs.com/package/@geoalgeria/poste) | مكاتب البريد والصرافات الآلية (بريد الجزائر) |
| [`@geoalgeria/emploi`](https://www.npmjs.com/package/@geoalgeria/emploi) | وكالات التشغيل (الوكالة الوطنية للتشغيل: AWEM + ALEM) |
| [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) | وكالات ونقاط بيع معتمدة لموبيليس |
| [`@geoalgeria/telecom`](https://www.npmjs.com/package/@geoalgeria/telecom) | تغطية 5G متعددة المشغلين (جيزي، موبيليس، أوريدو) |
| [`@geoalgeria/aviation`](https://www.npmjs.com/package/@geoalgeria/aviation) | المطارات المدنية مع رموز ICAO (الديوان الوطني للطيران المدني) |
| [`@geoalgeria/banques`](https://www.npmjs.com/package/@geoalgeria/banques) | البنوك المرخّصة والمؤسسات والفروع (RIB/SWIFT) |
| [`@geoalgeria/livraison`](https://www.npmjs.com/package/@geoalgeria/livraison) | شركات التوصيل ونقاط الاستلام المُرمّزة جغرافياً |
| [`@geoalgeria/jeunesse`](https://www.npmjs.com/package/@geoalgeria/jeunesse) | مؤسسات الشباب والرياضة (وزارة الشباب) |
| [`@geoalgeria/enseignement-superieur`](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur) | شبكة التعليم العالي – جامعات، مدارس عليا، مدارس عليا للأساتذة، مراكز (وزارة التعليم العالي) |
| [`@geoalgeria/tourisme`](https://www.npmjs.com/package/@geoalgeria/tourisme) | البنية التحتية السياحية – فنادق، معالم سياحية، مواقع تاريخية، منابع حرارية، حدائق وطنية (ASAL، OSM، Wikidata) |
| [`@geoalgeria/formation-professionnelle`](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle) | التكوين المهني – CFPA، INSFP، IFEP، مراكز خاصة (وزارة التكوين المهني / takwin.dz) |
| [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports) | منشآت رياضية – ملاعب، مسابح، ميادين، مضامير (وزارة الشباب والرياضة) |
| [`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy) | محلات جيزي – نقاط بيع مُرمّزة جغرافياً مع الفئة وأوقات العمل (djezzy.dz) |
| [`@geoalgeria/mosquees`](https://www.npmjs.com/package/@geoalgeria/mosquees) | مساجد – تجميع Wikidata + OpenStreetMap، ثنائي اللغة، كل الـ69 ولاية |
| [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante) | المؤسسات الصحية العمومية – EPH، EPSP، EHS، CHU (وزارة الصحة)، ثنائية اللغة، بإحداثيات عبر OSM + Wikidata |
| [`@geoalgeria/cliniques`](https://www.npmjs.com/package/@geoalgeria/cliniques) | العيادات ومرافق الرعاية الجوارية – 1,894 عيادة متعددة الخدمات وقاعة علاج ومركز صحي ومصحة توليد وعيادة خاصة من OpenStreetMap، مُصنَّفة حسب النوع، ثنائية اللغة، 66 ولاية |
| [`@geoalgeria/culture`](https://www.npmjs.com/package/@geoalgeria/culture) | الأطلس الثقافي – مواقع محمية، متاحف، مسارح، مكتبات + مؤسسات ثقافية (وزارة الثقافة)، ثنائي اللغة، كامل الإحداثيات |
| [`@geoalgeria/agriculture`](https://www.npmjs.com/package/@geoalgeria/agriculture) | المؤسسات الفلاحية – مديريات المصالح الفلاحية، محافظات الغابات، معاهد البحث/التكوين، الغرف الفلاحية، الدواوين والمجمعات العمومية (وزارة الفلاحة)، ثنائي اللغة، بإحداثيات |
| [`@geoalgeria/ecoles`](https://www.npmjs.com/package/@geoalgeria/ecoles) | المدارس – 11,855 مدرسة ابتدائية ومتوسطة وثانوية وتحضيرية مُصنَّفة حسب الطور، ثنائية اللغة، كل الـ69 ولاية (OpenStreetMap) |
| [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) | المحطات البرية – 74 محطة SOGRAL عبر 52 ولاية، بإحداثيات مع المساحات وربط بالبلدية/الولاية |
| [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire) | السكك والنقل الحضري – 692 عقدة قطار/ترام/مترو/تلفريك/قمرة (SNTF/SETRAM/SEMA)، تجميع Wikidata + OpenStreetMap، ثنائي اللغة |
| [`@geoalgeria/buses`](https://www.npmjs.com/package/@geoalgeria/buses) | شبكات الحافلات الحضرية – 50 خط ETUSA (الجزائر) مع المحطات الطرفية وعدد المواقف والبلديات والمحطات المخدومة (مستوى الخط v1) |
| [`@geoalgeria/industrie-pharmaceutique`](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique) | مصنّعو الأدوية – 171 مصنّعًا معتمدًا للأدوية والأجهزة الطبية من وزارة الصناعة الصيدلانية، ثنائيو اللغة، مُحدَّدون جغرافيًا |
| [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) | الصيدليات (officines) – 3,797 مُحدَّدة جغرافيًا عبر 67 ولاية من OpenStreetMap، ثنائية اللغة عند التسمية |
| [`@geoalgeria/ooredoo`](https://www.npmjs.com/package/@geoalgeria/ooredoo) | نقاط بيع أوريدو – 572 فضاء أوريدو / متجر مدينة / فضاء خدمات بإحداثيات حقيقية؛ يُكمل ثلاثي الاتصالات |
| [`@geoalgeria/transport`](https://www.npmjs.com/package/@geoalgeria/transport) | مظلة النقل – تثبّت aviation + ferroviaire + gares-routieres + buses في خطوة واحدة |
| [`@geoalgeria/pharma`](https://www.npmjs.com/package/@geoalgeria/pharma) | مظلة الصيدلة – تثبّت industrie-pharmaceutique + pharmacies دفعة واحدة |
| [`@geoalgeria/protection-civile`](https://www.npmjs.com/package/@geoalgeria/protection-civile) | وحدات الحماية المدنية – 880 وحدة من المديرية العامة عبر كل الولايات بأسماء عربية وعنوان/هاتف/فاكس ومستوى صفة، مُحدَّدة جغرافيًا، ربط الولاية وفق إصلاح 2026 |

القائمة الكاملة والمستودع الأحادي: [github.com/yasserstudio/geoalgeria](https://github.com/yasserstudio/geoalgeria).

---

## مشاريع مبنية بهذه البيانات

تستخدم geoalgeria في مشروعك؟ [افتح نقاشاً](https://github.com/yasserstudio/geoalgeria/discussions) وسنعرضه هنا.

---

## الدعم

كل نجمة تساعد المطور الجزائري التالي في إيجاد بيانات نظيفة بدلاً من ملفات PDF معطّلة. **[ضع نجمة لهذا المستودع](https://github.com/yasserstudio/geoalgeria)** إذا وفّر لك الوقت.

وجدت بيانات خاطئة؟ [افتح مشكلة](https://github.com/yasserstudio/geoalgeria/issues/new/choose) – نصلحها خلال 48 ساعة، مضمون.

---

## الرعاية

GeoAlgeria مجاني، شيفرته وتجميعه بترخيص MIT مع جزأين بترخيص ODbL وبيانات بريد الجزائر المنسوخة، جميعها مذكورة أدناه. إذا وفّر لك الوقت، [**ادعم صيانته**](https://github.com/sponsors/yasserstudio) – الرعاية تموّل تحديث البيانات مع كل إصلاح وتوسيع GeoAlgeria نحو *جميع* أنواع البيانات المفتوحة عن الجزائر.

---

## معاينة

شاهد جميع الولايات الـ 69 على خريطة: [`algeria.geojson`](algeria.geojson) (GitHub يعرض هذا تلقائياً)

---

## الأسئلة الشائعة

**كم عدد ولايات الجزائر في 2026؟**
69. الولايات الـ 48 الأصلية، بالإضافة إلى 10 أُضيفت في 2019 (القانون 19-12)، و11 أصبحت رسمية في أبريل 2026 ([القانون رقم 26-06، *الجريدة الرسمية* رقم 25 بتاريخ 5 أبريل 2026](https://www.joradp.dz/FTP/jo-arabe/2026/A2026025.pdf)). تنتهي الفترة الانتقالية في 31 ديسمبر 2026؛ الاستقلالية الكاملة اعتباراً من 1 يناير 2027.

**أين أجد قائمة بجميع بلديات الجزائر بصيغة JSON؟**
هنا – `data/ecommerce/communes.json` يحتوي على جميع البلديات الـ 1,541 بصيغة مسطّحة جاهزة للاستخدام.

**ما هي الولايات الجديدة المضافة في 2026؟**
الولايات 59 إلى 69 (مرقّمة حسب ترتيب رمز الولاية الأم): 59 أفلو (من الأغواط)، 60 بريكة (من باتنة)، 61 القنطرة (من بسكرة)، 62 بئر العاتر (من تبسة)، 63 العريشة (من تلمسان)، 64 قصر الشلالة (من تيارت)، 65 عين وسارة (من الجلفة)، 66 مسعد (من الجلفة)، 67 قصر البخاري (من المدية)، 68 بوسعادة (من المسيلة)، 69 الأبيض سيدي الشيخ (من البيض).

**كيف أحصل على الرموز البريدية الجزائرية بصيغة JSON؟**
ثبّت `geoalgeria` عبر npm أو حمّل `data/ecommerce/communes.json` مباشرة – يربط أسماء البلديات بالفرنسية والعربية برموزها البريدية عبر البلديات الـ 1,541 (5 منها بلا رمز موثّق حتى الآن).

**ما هي أفضل حزمة بيانات جغرافية جزائرية للمطورين؟**
GeoAlgeria هي الخيار الأكثر اكتمالاً في 2026 – هي حزمة npm الوحيدة التي تضم جميع الولايات الـ 69، والرموز البريدية، والإحداثيات، والدوائر، وقوالب مناطق التوصيل في تثبيت واحد. مُتحقق منها بالتكامل المستمر عند كل commit.

**قائمة ولايات الجزائر 2026، أين أجدها؟**
يحتوي GeoAlgeria على 69 ولاية بالأسماء الفرنسية والعربية، والرموز البريدية، والإحداثيات الجغرافية. متوفر بصيغ JSON، CSV، GeoJSON، وSQL. `npm install geoalgeria`

---

## الرخصة والإسناد

**شيفرة** الحزمة بترخيص [MIT](LICENSE)، وكذلك **التجميع**: الولايات والدوائر والبلديات
وأسماؤها ثنائية اللغة والرموز البريدية والرموز الإدارية. مجاني للاستخدام الشخصي والتجاري.

جزءان من البيانات مصدرهما **OpenStreetMap**، وهما **© مساهمو OpenStreetMap** وبترخيص
**[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)** بدلًا من ذلك:

- الـ69 مضلّع حدود ولاية في `data/geojson/wilaya-boundaries.geojson`؛
- 256 من أصل 1,541 إحداثية مركز بلدية، كل واحدة مأخوذة من علاقة `admin_level=8` الخاصة بالبلدية
  نفسها (250 من عقدة `admin_centre`: 56 بتاريخ 2026-09-27 و189 بتاريخ 2026-09-29 و5 بتاريخ
  2026-10-01، و6 من مركز العلاقة في الإصدار 2.1.0)، في كل مكان تظهر فيه هذه القيم.

عند استخدامك أو إعادة نشرك لأيٍّ من هذين الجزأين يجب **إسناد الفضل لمساهمي OpenStreetMap**
وإبقاء القواعد المُشتقّة تحت ترخيصٍ متوافق.

البيانات البريدية المنسوخة في `data/poste/` تخضع لشروط **بريد الجزائر** نفسها، لا لترخيص MIT:
**Data © Algérie Poste; redistributed for reference**، وهي الشروط ذاتها التي تعلنها حزمة
[`@geoalgeria/poste`](https://www.npmjs.com/package/@geoalgeria/poste). تحقّق من بريد الجزائر
للحصول على معلومات رسمية وآنية.

لأن البيانات تخضع لثلاث مجموعات من الشروط، يعلن الـmanifest القيمة
`SEE LICENSE IN LICENSE` بدلًا من تعبير SPDX. الإسناد لكل جزء والصفوف المعنية في [NOTICE](NOTICE).

صُنع بعناية من طرف [Yasser's Studio](https://yasser.studio) | [geoalgeria.com](https://geoalgeria.com)

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/geoalgeria) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

من تطوير [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
