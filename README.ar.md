<div align="center">

[English](README.md) | [Français](README.fr.md) | **العربية**

# جيو الجزائر (GeoAlgeria)

<sub>من</sub><br>
<a href="https://yasser.studio"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/yasser-studio-logo-white.svg"><img src="./assets/yasser-studio-logo.svg" alt="Yasser's Studio" height="28"></picture></a>

**قاعدة البيانات المفتوحة للجزائر — ثبّتها بدلًا من جمعها يدويًا.**

المرجع المفتوح للتقسيمات الإدارية والبيانات الجغرافية والخدمية في الجزائر.

[![CI](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml/badge.svg)](https://github.com/yasserstudio/geoalgeria/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![npm downloads](https://img.shields.io/npm/dm/geoalgeria)](https://www.npmjs.com/package/geoalgeria)
[![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/geoalgeria)](https://www.jsdelivr.com/package/npm/geoalgeria)
[![GitHub stars](https://img.shields.io/github/stars/yasserstudio/geoalgeria?style=flat)](https://github.com/yasserstudio/geoalgeria)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

كل قواعد البيانات المتاحة عن الجزائر على الإنترنت لا تزال تذكر **48 ولاية**. الجزائر لديها **69 ولاية منذ أبريل 2026**. جيو الجزائر قاعدة البيانات المفتوحة الأكثر اكتمالًا للتقسيمات الإدارية الجزائرية بعد إصلاح 2026 — مع الرموز البريدية الحقيقية لبريد الجزائر، الإحداثيات الجغرافية الدقيقة، الأسماء ثنائية اللغة، مكاتب البريد والصرّافات الآلية — متوفرة بصيغ JSON، CSV، GeoJSON، SQL و TypeScript. أمر `npm install` واحد، رخصة MIT، يتم التحقق منها آليًا عبر CI عند كل تغيير.

```bash
npm install geoalgeria
```

```js
const dz = require("geoalgeria");

dz.wilayas;                       // جميع الولايات الـ69
dz.getCommunesByWilaya(16);       // 57 بلدية في الجزائر العاصمة
dz.findByPostalCode("16000");     // → بلدية، دائرة، ولاية
dz.getPostOfficesByCommune(1731); // مكاتب بريد الجزائر الحقيقية
```

## المحتوى

| | العدد | |
|---|---|---|
| **الولايات** | 69 | (إصلاحات 2019 + 2026) |
| **الدوائر** | 555 | كيانات من المستوى الأول |
| **البلديات** | 1,528 | ثنائية اللغة فر/عر، رموز بريدية، إحداثيات |
| **مكاتب البريد** | 3,908 | رموز بريد الجزائر الحقيقية، إحداثيات |
| **الصرّافات الآلية** | 2,026 | شبكة GAB لبريد الجزائر |
| **وكالات التشغيل** | 331 | الوكالة الوطنية للتشغيل: 58 AWEM + 273 ALEM — [`@geoalgeria/emploi`](packages/emploi) |
| **شبكة موبيليس** | 12,345 | 165 وكالة + 12,180 نقطة بيع — [`@geoalgeria/mobilis`](packages/mobilis) |
| **تغطية 5G** | 1,681 | مواقع 5G لجيزي + موبيليس + أوريدو — [`@geoalgeria/telecom`](packages/telecom) |
| **المطارات المدنية** | 33 | ANAC: أسماء، رموز ICAO، معلومات اتصال، إحداثيات — [`@geoalgeria/aviation`](packages/aviation) |
| **البنوك والفروع** | 1,704 | كل البنوك الـ 21 المعتمدة + 8 مؤسسات مالية؛ فروع مع أكواد RIB/SWIFT، الملكية، الإحداثيات — [`@geoalgeria/banques`](packages/banques) |
| **شركات التوصيل** | 411 | 16 ناقلًا + 411 نقطة استلام في 61 ولاية (Yalidine، Guepex، Anderson، Noest، Maystro) — [`@geoalgeria/livraison`](packages/livraison) |
| **مؤسسات الشباب** | 2,334 | دور الشباب، مركّبات رياضية من الدرجة الأولى، قاعات متعددة الاستخدامات، دور إيواء، مراكز ثقافية وعلمية وأكثر في 58 ولاية (وزارة الشباب والرياضة) — [`@geoalgeria/jeunesse`](packages/jeunesse) |
| **منشآت رياضية** | 5,141 | ملاعب، حمامات سباحة، مجالات من الدرجة الأولى، مضمارات العاب القوى، ملاعب وأكثر (27 نوع) في 58 ولاية (وزارة الشباب والرياضة) — [`@geoalgeria/sports`](packages/sports) |
| **التعليم العالي** | 177 | جامعات، مدارس عليا، مدارس عليا للأساتذة، مراكز + 19 مؤسسة خاصة و48 تابعة لوزارات أخرى في 51 ولاية، مع المواقع الرسمية (وزارة التعليم العالي) — [`@geoalgeria/enseignement-superieur`](packages/enseignement-superieur) |
| **السياحة** | 4,348 | 995 فندق، 1,248 معلم سياحي، 1,184 موقع تاريخي، 282 منبع حراري (ASAL)، 32 حديقة وطنية — [`@geoalgeria/tourisme`](packages/tourisme) |
| **التكوين المهني** | 1,932 | 856 CFPA + 182 INSFP + 723 مؤسسة خاصة معتمدة + 58 DFEP + أكثر في 58 ولاية (وزارة التكوين المهني / takwin.dz) — [`@geoalgeria/formation-professionnelle`](packages/formation-professionnelle) |

الصيغ: **JSON · CSV · GeoJSON · SQL · TypeScript**. حزمة npm تتضمن JSON فقط للحفاظ على الحجم الخفيف؛ CSV/GeoJSON/SQL متوفرة في كل [إصدار GitHub](https://github.com/yasserstudio/geoalgeria/releases).

> محدّثة وفق **القانون رقم 26-06** (التنظيم الإقليمي الجديد)، [*الجريدة الرسمية* رقم 25 بتاريخ 5 أبريل 2026](https://www.joradp.dz/FTP/jo-arabe/2026/A2026040.pdf) — بالإضافة إلى إصلاح 2019 (القانون 19-12).

## لماذا جيو الجزائر؟

| | geoalgeria | leblad | algeria-cities |
|---|:---:|:---:|:---:|
| جميع الولايات الـ69 (إصلاح 2026) | ✅ | ❌ (58) | ✅ |
| الدوائر ككيانات مستقلة | ✅ | ❌ | ❌ |
| رموز بريدية حقيقية لبريد الجزائر | ✅ | ~ | ❌ |
| إحداثيات لكل بلدية | ✅ | ❌ | ✅ |
| مكاتب البريد والصرّافات | ✅ | ❌ | ❌ |
| جاهز للتجارة الإلكترونية | ✅ | ❌ | ❌ |
| npm + أنواع TypeScript | ✅ | ✅ | ❌ |
| تصدير GeoJSON / SQL | ✅ | ❌ | ✅ |
| تحقق CI آلي عند كل تغيير | ✅ | ❌ | ❌ |
| آخر تحديث | **2026** | 2021 | 2023 |

[شاهد المقارنة الكاملة ←](https://geoalgeria.com/compare)

## لمن هذا المشروع

- **التجارة الإلكترونية / الدفع عند الاستلام** — تسلسل عناوين ولاية ← دائرة ← بلدية، التحقق من الرموز البريدية، وتهيئة مناطق الشحن المطابقة لما يستخدمه الناقلون فعليًا.
- **الخرائط ونظم المعلومات الجغرافية** — GeoJSON جاهز مع 1,528 بلدية، مصمم بشكل صحيح عبر الإصلاحين.
- **المجتمع المدني، البحث العلمي، ومشاريع البيانات** — بيانات مرجعية نظيفة، منظمة، موثقة المصدر ومُصدَّرة بدلًا من ملفات PDF.
- **أي شيء يتعلق بالجزائر** — تثبيت واحد، الأنواع مضمّنة.

## الحزم

| الحزمة | npm | الوصف |
| --- | --- | --- |
| [`packages/dataset`](packages/dataset) | [`geoalgeria`](https://www.npmjs.com/package/geoalgeria) | الولايات، الدوائر، البلديات + بيانات بريدية موحّدة |
| [`packages/poste`](packages/poste) | [`@geoalgeria/poste`](https://www.npmjs.com/package/@geoalgeria/poste) | مكاتب البريد والصرّافات الآلية لبريد الجزائر |
| [`packages/emploi`](packages/emploi) | [`@geoalgeria/emploi`](https://www.npmjs.com/package/@geoalgeria/emploi) | وكالات التشغيل (AWEM + ALEM) للوكالة الوطنية للتشغيل |
| [`packages/mobilis`](packages/mobilis) | [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) | وكالات موبيليس ونقاط البيع المعتمدة |
| [`packages/telecom`](packages/telecom) | [`@geoalgeria/telecom`](https://www.npmjs.com/package/@geoalgeria/telecom) | تغطية 5G متعددة المشغلين (جيزي، موبيليس، أوريدو) |
| [`packages/aviation`](packages/aviation) | [`@geoalgeria/aviation`](https://www.npmjs.com/package/@geoalgeria/aviation) | المطارات المدنية من ANAC — أسماء، رموز ICAO، إحداثيات |
| [`packages/banques`](packages/banques) | [`@geoalgeria/banques`](https://www.npmjs.com/package/@geoalgeria/banques) | كل البنوك الـ 21 المعتمدة + المؤسسات المالية و1,704 فروع (RIB، SWIFT، الملكية، الإحداثيات) |
| [`packages/livraison`](packages/livraison) | [`@geoalgeria/livraison`](https://www.npmjs.com/package/@geoalgeria/livraison) | سجل شركات التوصيل + 411 نقطة استلام وتغطية لكل ناقل (Yalidine، Guepex، Anderson، Noest، Maystro) |
| [`packages/jeunesse`](packages/jeunesse) | [`@geoalgeria/jeunesse`](https://www.npmjs.com/package/@geoalgeria/jeunesse) | مؤسسات الشباب لوزارة الشباب والرياضة (2,334 في 58 ولاية) |
| [`packages/sports`](packages/sports) | [`@geoalgeria/sports`](https://www.npmjs.com/package/@geoalgeria/sports) | منشآت رياضية لوزارة الشباب والرياضة — 5,141 في 58 ولاية، 27 نوع، مع السعة والوصول بسهولة والإحداثيات |
| [`packages/enseignement-superieur`](packages/enseignement-superieur) | [`@geoalgeria/enseignement-superieur`](https://www.npmjs.com/package/@geoalgeria/enseignement-superieur) | شبكة التعليم العالي لوزارة التعليم العالي — جامعات، مدارس عليا، مدارس عليا للأساتذة ومراكز + 19 مؤسسة خاصة و48 تابعة لوزارات أخرى (177)، مع المواقع الرسمية والإحداثيات |
| [`packages/tourisme`](packages/tourisme) | [`@geoalgeria/tourisme`](https://www.npmjs.com/package/@geoalgeria/tourisme) | البنية التحتية السياحية — 4,348 فندق ومعلم سياحي وموقع تاريخي ومنبع حراري وحديقة وطنية (ASAL، OSM، Wikidata) |
| [`packages/formation-professionnelle`](packages/formation-professionnelle) | [`@geoalgeria/formation-professionnelle`](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle) | التكوين المهني — 1,932 CFPA، INSFP، IFEP، IEP، DFEP ومراكز خاصة من وزارة التكوين المهني (takwin.dz)، مع السعة والإقامة والإحداثيات |

[تصفح جميع الحزم →](https://geoalgeria.com/data) · [توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs)

## الاستخدام بدون npm

```html
<!-- عبر CDN jsDelivr، بدون تثبيت -->
<script>
  fetch("https://cdn.jsdelivr.net/npm/geoalgeria/data/ecommerce/communes.json")
    .then((r) => r.json())
    .then((communes) => { /* ابنِ قائمتك المنسدلة */ });
</script>
```

تفضّل الملفات؟ حمّل **CSV / GeoJSON / SQL** من الحزمة المضغوطة في أي [إصدار GitHub](https://github.com/yasserstudio/geoalgeria/releases)، أو تصفح [`packages/dataset/data/`](packages/dataset/data).

## ما القادم

GeoAlgeria ليست تصديرًا لمرة واحدة. الهدف هو أن تصبح **المصدر** المفتوح المرجعي والمحدّث باستمرار لبيانات الجزائر — يُحافَظ على تحديثها مع كل إصلاح إداري، و**تتوسع لتشمل أنواعًا أخرى من بيانات الجزائر كلما توفرت المصادر**. التقسيمات الإدارية والبيانات البريدية/المصرفية هي البداية فقط.

تابع أو ضع ⭐ للمشروع، و[افتح نقاشًا](https://github.com/yasserstudio/geoalgeria/discussions) لطلب مجموعة بيانات.

## المساهمة

التصحيحات والإضافات مرحب بها — انظر [CONTRIBUTING.md](CONTRIBUTING.md). المساهمات الأولى الجيدة تحتاج عادة فقط رابط مصدر أو إحداثية بلدية مفقودة. وجدت بيانات خاطئة؟ [افتح issue](https://github.com/yasserstudio/geoalgeria/issues/new/choose).

## الإصدارات

إصدار دلالي لكل حزمة، مؤتمت مع [Changesets](https://github.com/changesets/changesets). انظر [`RELEASING.md`](RELEASING.md) و `CHANGELOG.md` لكل حزمة.

## الرعاية

GeoAlgeria مجانية ومرخصة MIT. إذا وفّرت لك الوقت، [**ادعم صيانتها**](https://github.com/sponsors/yasserstudio) — ذلك يموّل تحديث البيانات وتوسيع التغطية.

## الترخيص والإخلاء

**الكود:** [MIT](LICENSE). **البيانات:** مجمّعة من مصادر رسمية عامة (*الجريدة الرسمية*، بريد الجزائر، الوكالة الوطنية للتشغيل، ANAC، الموقع العام لكل مشغل/مؤسسة) ومعاد توزيعها للمرجع.

GeoAlgeria هو **مشروع مستقل — غير تابع لأي جهة حكومية أو هيئة تنظيمية أو مشغّل أو مؤسسة يشير إليها ولا معتمد منها**؛ أسماؤها وعلاماتها ملك لأصحابها. البيانات مقدمة **«كما هي»، بدون ضمان — تحقق من المصدر الرسمي** قبل الاعتماد عليها، خاصة للاستخدامات المالية والمصرفية وKYC والامتثال. الشروط الكاملة: **[DISCLAIMER](DISCLAIMER.md)**.

---

<div align="center">

إذا وفّرت عليك جيو الجزائر ساعات من البحث وتجميع البيانات، **[ضع لها ⭐](https://github.com/yasserstudio/geoalgeria)** — هذا يساعد المطور الجزائري التالي في إيجاد بيانات نظيفة.

<a href="https://yasser.studio"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/yasser-studio-logo-white.svg"><img src="./assets/yasser-studio-logo.svg" alt="Yasser's Studio" height="44"></picture></a>

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [geoalgeria.com](https://geoalgeria.com) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)

</div>
