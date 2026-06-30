[English](README.md) | [Français](README.fr.md) | **العربية**

# GeoAlgeria

> حزمة البيانات الجغرافية الجزائرية — 69 ولاية، 555 دائرة، 1,528 بلدية. بأمر `npm install` واحد.

هل لا زلت تنسخ قوائم الولايات من ملفات PDF؟ هل لا زلت تستخدم بيانات عالقة عند 48 ولاية؟ GeoAlgeria هي أول بيانات جغرافية جزائرية قابلة للتثبيت عبر npm ومُتحقق منها بالتكامل المستمر — محدّثة وفق إصلاح 2026. JSON، CSV، GeoJSON، SQL، TypeScript.

[![CI](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml/badge.svg)](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![npm downloads](https://img.shields.io/npm/dm/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## حقائق سريعة

تضم الجزائر **69 ولاية**، **564 دائرة**، و**1,541 بلدية**، رسمياً منذ **أبريل 2026**. يعكس ذلك إصلاحين إقليميين: القانون 19-12 (2019، أضاف الولايات 49 إلى 58) والقانون رقم 26-06 المؤرخ في 4 أبريل 2026 (أضاف الولايات 59 إلى 69)، المنشور في [*الجريدة الرسمية* رقم 25 بتاريخ 5 أبريل 2026](https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf). يُنمذج GeoAlgeria جميع الولايات الـ 69 بعد الإصلاح مع الرموز البريدية والإحداثيات الجغرافية والأسماء ثنائية اللغة. تحتوي هذه النسخة على **1,528 سجل بلدية** و**555 دائرة**: تم حذف مجموعة من السجلات التي تحتوي على مشاكل في البيانات المصدرية، والمطابقة نحو العدد الرسمي 1,541 جارية (انظر [سجل التغييرات](CHANGELOG.md)). آخر تحقق: يونيو 2026.

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

- **مطورو التجارة الإلكترونية** — نماذج العناوين، تكوين مناطق الشحن، التحقق من الرموز البريدية
- **مهندسو الواجهة الخلفية** — أنشئ قاعدة بياناتك بملف SQL واحد
- **مطورو الواجهة الأمامية** — قوائم منسدلة متتالية (ولاية ← دائرة ← بلدية)
- **محللو نظم المعلومات الجغرافية / البيانات** — GeoJSON مع 1,528 معلماً نقطياً
- **مطورو التكنولوجيا المدنية** — تطبيقات حكومية، بوابات المواطنين
- **الطلبة والباحثون** — بيانات نظيفة، منظمة وموثّقة جيداً

---

## التثبيت

```bash
npm install geoalgeria
```

```javascript
const dz = require('geoalgeria');

dz.wilayas;                    // جميع الولايات الـ 69
dz.communes;                   // جميع البلديات الـ 1,528
dz.dairas;                     // جميع الدوائر الـ 555
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

**تستخدم هذه البيانات في الإنتاج؟** [أخبرنا](https://github.com/yasserstudio/geoalgeria/discussions) — نعرض مشاريع المجتمع في الـ README.

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

احصل على `data/ecommerce/communes.json` — مسطّح، غير مُطبّع، بدون عمليات ربط:

```json
{
  "id": 586,
  "commune_name_fr": "Aïn El Ibel",
  "commune_name_ar": "عين الإبل",
  "daira_name_fr": "Aïn El Ibel",
  "wilaya_code": 17,
  "wilaya_name_fr": "Djelfa",
  "wilaya_name_ar": "الجلفة",
  "postal_code": "17001"
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

حمّل `data/geojson/communes.geojson` من هذا المستودع — GeoJSON قياسي، يعمل مع Leaflet، Mapbox، QGIS، إلخ.

> **ملاحظة:** حزمة npm تحتوي على ملفات JSON فقط (للحفاظ على خفة الحجم). تصديرات **CSV وGeoJSON وSQL** موجودة في المستودع تحت `data/` ومرفقة كملف zip مع كل [إصدار GitHub](https://github.com/yasserstudio/geoalgeria/releases).

---

## جميع الملفات

| الملف | الصيغة | السجلات | الأنسب لـ |
|-------|--------|---------|-----------|
| `data/algeria.json` | JSON | 69 ولاية + بلديات | الاستخدام بملف واحد |
| `data/wilayas.json` | JSON | 69 | قائمة الولايات فقط |
| `data/dairas.json` | JSON | 555 | قائمة الدوائر مع عدد البلديات |
| `data/communes_w*.json` | JSON | 1,528 | بيانات البلديات المفصّلة |
| `data/csv/wilayas.csv` | CSV | 69 | جداول البيانات، الاستيراد |
| `data/csv/communes.csv` | CSV | 1,528 | جداول البيانات، الاستيراد |
| `data/geojson/wilayas.geojson` | GeoJSON | 69 | الخرائط، نظم المعلومات الجغرافية |
| `data/geojson/communes.geojson` | GeoJSON | 1,528 | الخرائط، نظم المعلومات الجغرافية |
| `data/sql/full.sql` | SQL | 69 + 1,528 | قاعدة بيانات مُطبّعة |
| `data/ecommerce/communes.json` | JSON | 1,528 | نماذج العناوين، القوائم المنسدلة |
| `data/ecommerce/communes.csv` | CSV | 1,528 | استيراد مسطّح |
| `data/ecommerce/communes.sql` | SQL | 1,528 | قاعدة بيانات بجدول واحد |
| `data/delivery/*.json` | JSON | 69 لكل ناقل | حساب مناطق التوصيل |
| `data/poste/postoffices.json` | JSON | 3,908 | مكاتب البريد (رموز حقيقية، إحداثيات) |
| `data/poste/atms.json` | JSON | 2,026 | مواقع الصرافات الآلية |
| `data/poste/csv/*`، `data/poste/geojson/*` | CSV/GeoJSON | — | بيانات بريدية لجداول البيانات / الخرائط |

> `data/poste/` مصدره [بريد الجزائر](https://baridimap.poste.dz). `commune_code` يرتبط بـ `code_commune` لكل بلدية.

## المخطط

انظر [`data/README.md`](data/README.md) للتوثيق الكامل للحقول.

---

## المساهمة

انظر [CONTRIBUTING.md](https://github.com/yasserstudio/geoalgeria/blob/main/CONTRIBUTING.md). نرحّب بـ:

- تصحيحات البيانات (مع مصادر رسمية)
- إحداثيات البلديات الناقصة (20 متبقية)
- بيانات مناطق التوصيل من حسابات ناقلين حقيقية (Yalidine، ZR Express، Maystro)
- صيغ تصدير جديدة (XML، YAML، مصفوفات PHP، إلخ.)
- تصحيحات الترجمة والكتابة بالحروف اللاتينية

**أول مساهمة لك؟** ابحث عن المشاكل المُعلّمة بـ `good first issue` — كثير منها يتطلب فقط إضافة إحداثيات بلدية واحدة.

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
| [`@geoalgeria/enseignement-superieur`](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur) | شبكة التعليم العالي — جامعات، مدارس عليا، مدارس عليا للأساتذة، مراكز (وزارة التعليم العالي) |
| [`@geoalgeria/tourisme`](https://www.npmjs.com/package/@geoalgeria/tourisme) | البنية التحتية السياحية — فنادق، معالم سياحية، مواقع تاريخية، منابع حرارية، حدائق وطنية (ASAL، OSM، Wikidata) |
| [`@geoalgeria/formation-professionnelle`](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle) | التكوين المهني — CFPA، INSFP، IFEP، مراكز خاصة (وزارة التكوين المهني / takwin.dz) |
| [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports) | منشآت رياضية — ملاعب، مسابح، ميادين، مضامير (وزارة الشباب والرياضة) |
| [`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy) | محلات جيزي — نقاط بيع مُرمّزة جغرافياً مع الفئة وأوقات العمل (djezzy.dz) |
| [`@geoalgeria/mosquees`](https://www.npmjs.com/package/@geoalgeria/mosquees) | مساجد — تجميع Wikidata + OpenStreetMap، ثنائي اللغة، كل الـ69 ولاية |
| [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante) | المؤسسات الصحية العمومية — EPH، EPSP، EHS، CHU (وزارة الصحة)، ثنائية اللغة، بإحداثيات عبر OSM + Wikidata |
| [`@geoalgeria/culture`](https://www.npmjs.com/package/@geoalgeria/culture) | الأطلس الثقافي — مواقع محمية، متاحف، مسارح، مكتبات + مؤسسات ثقافية (وزارة الثقافة)، ثنائي اللغة، كامل الإحداثيات |
| [`@geoalgeria/agriculture`](https://www.npmjs.com/package/@geoalgeria/agriculture) | المؤسسات الفلاحية — مديريات المصالح الفلاحية، محافظات الغابات، معاهد البحث/التكوين، الغرف الفلاحية، الدواوين والمجمعات العمومية (وزارة الفلاحة)، ثنائي اللغة، بإحداثيات |

القائمة الكاملة والمستودع الأحادي: [github.com/yasserstudio/geoalgeria](https://github.com/yasserstudio/geoalgeria).

---

## مشاريع مبنية بهذه البيانات

تستخدم geoalgeria في مشروعك؟ [افتح نقاشاً](https://github.com/yasserstudio/geoalgeria/discussions) وسنعرضه هنا.

---

## الدعم

كل نجمة تساعد المطور الجزائري التالي في إيجاد بيانات نظيفة بدلاً من ملفات PDF معطّلة. **[ضع نجمة لهذا المستودع](https://github.com/yasserstudio/geoalgeria)** إذا وفّر لك الوقت.

وجدت بيانات خاطئة؟ [افتح مشكلة](https://github.com/yasserstudio/geoalgeria/issues/new/choose) — نصلحها خلال 48 ساعة، مضمون.

---

## الرعاية

GeoAlgeria مجاني وتحت رخصة MIT. إذا وفّر لك الوقت، [**ادعم صيانته**](https://github.com/sponsors/yasserstudio) — الرعاية تموّل تحديث البيانات مع كل إصلاح وتوسيع GeoAlgeria نحو *جميع* أنواع البيانات المفتوحة عن الجزائر.

---

## معاينة

شاهد جميع الولايات الـ 69 على خريطة: [`algeria.geojson`](algeria.geojson) (GitHub يعرض هذا تلقائياً)

---

## الأسئلة الشائعة

**كم عدد ولايات الجزائر في 2026؟**
69. الولايات الـ 48 الأصلية، بالإضافة إلى 10 أُضيفت في 2019 (القانون 19-12)، و11 أصبحت رسمية في أبريل 2026 ([القانون رقم 26-06، *الجريدة الرسمية* رقم 25 بتاريخ 5 أبريل 2026](https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf)). تنتهي الفترة الانتقالية في 31 ديسمبر 2026؛ الاستقلالية الكاملة اعتباراً من 1 يناير 2027.

**أين أجد قائمة بجميع بلديات الجزائر بصيغة JSON؟**
هنا — `data/ecommerce/communes.json` يحتوي على جميع البلديات الـ 1,528 بصيغة مسطّحة جاهزة للاستخدام.

**ما هي الولايات الجديدة المضافة في 2026؟**
الولايات 59 إلى 69 (مرقّمة حسب ترتيب رمز الولاية الأم): 59 أفلو (من الأغواط)، 60 بريكة (من باتنة)، 61 القنطرة (من بسكرة)، 62 بئر العاتر (من تبسة)، 63 العريشة (من تلمسان)، 64 قصر الشلالة (من تيارت)، 65 عين وسارة (من الجلفة)، 66 مسعد (من الجلفة)، 67 قصر البخاري (من المدية)، 68 بوسعادة (من المسيلة)، 69 الأبيض سيدي الشيخ (من البيض).

**كيف أحصل على الرموز البريدية الجزائرية بصيغة JSON؟**
ثبّت `geoalgeria` عبر npm أو حمّل `data/ecommerce/communes.json` مباشرة — يحتوي على 1,528 رمز بريدي مرتبط بأسماء البلديات بالفرنسية والعربية.

**ما هي أفضل حزمة بيانات جغرافية جزائرية للمطورين؟**
GeoAlgeria هي الخيار الأكثر اكتمالاً في 2026 — هي حزمة npm الوحيدة التي تضم جميع الولايات الـ 69، والرموز البريدية، والإحداثيات، والدوائر، وقوالب مناطق التوصيل في تثبيت واحد. مُتحقق منها بالتكامل المستمر عند كل commit.

**قائمة ولايات الجزائر 2026 — أين أجدها؟**
يحتوي GeoAlgeria على 69 ولاية بالأسماء الفرنسية والعربية، والرموز البريدية، والإحداثيات الجغرافية. متوفر بصيغ JSON، CSV، GeoJSON، وSQL. `npm install geoalgeria`

---

## الرخصة

MIT — مجاني للاستخدام الشخصي والتجاري.

صُنع بعناية من طرف [Yasser's Studio](https://yasser.studio) | [geoalgeria.com](https://geoalgeria.com)

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/geoalgeria) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

من تطوير [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
