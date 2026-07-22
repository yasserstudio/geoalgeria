<div align="center">

[English](README.md) | [Français](README.fr.md) | **العربية**

<a href="https://geoalgeria.com"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo/geoalgeria-logo-horizontal-white.png"><img src="./assets/brand/logo/geoalgeria-logo-horizontal.png" alt="جيو الجزائر — GeoAlgeria" width="280"></picture></a>

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
| **تغطية 5G** | 2,798 | مواقع 5G لجيزي + موبيليس + أوريدو — [`@geoalgeria/telecom`](packages/telecom) |
| **المطارات المدنية** | 33 | ANAC: أسماء، رموز ICAO، معلومات اتصال، إحداثيات — [`@geoalgeria/aviation`](packages/aviation) |
| **البنوك والفروع** | 1,704 | كل البنوك الـ 21 المعتمدة + 8 مؤسسات مالية؛ فروع مع أكواد RIB/SWIFT، الملكية، الإحداثيات — [`@geoalgeria/banques`](packages/banques) |
| **شركات التوصيل** | 411 | 16 ناقلًا + 411 نقطة استلام في 61 ولاية (Yalidine، Guepex، Anderson، Noest، Maystro) — [`@geoalgeria/livraison`](packages/livraison) |
| **مؤسسات الشباب** | 2,334 | دور الشباب، مركّبات رياضية من الدرجة الأولى، قاعات متعددة الاستخدامات، دور إيواء، مراكز ثقافية وعلمية وأكثر في 58 ولاية (وزارة الشباب والرياضة) — [`@geoalgeria/jeunesse`](packages/jeunesse) |
| **منشآت رياضية** | 5,141 | ملاعب، حمامات سباحة، مجالات من الدرجة الأولى، مضمارات العاب القوى، ملاعب وأكثر (27 نوع) في 58 ولاية (وزارة الشباب والرياضة) — [`@geoalgeria/sports`](packages/sports) |
| **التعليم العالي** | 177 | جامعات، مدارس عليا، مدارس عليا للأساتذة، مراكز + 19 مؤسسة خاصة و48 تابعة لوزارات أخرى في 51 ولاية، مع المواقع الرسمية (وزارة التعليم العالي) — [`@geoalgeria/enseignement-superieur`](packages/enseignement-superieur) |
| **السياحة** | 4,348 | 1,602 فندق، 1,248 معلم سياحي، 1,184 موقع تاريخي، 282 منبع حراري (ASAL)، 32 حديقة وطنية — [`@geoalgeria/tourisme`](packages/tourisme) |
| **التكوين المهني** | 1,932 | 856 CFPA + 182 INSFP + 723 مؤسسة خاصة معتمدة + 58 DFEP + أكثر في 58 ولاية (وزارة التكوين المهني / takwin.dz) — [`@geoalgeria/formation-professionnelle`](packages/formation-professionnelle) |
| **المساجد** | 20,759 | تجميع Wikidata + OpenStreetMap — أسماء عربية وفرنسية، المذهب، كل الـ69 ولاية — [`@geoalgeria/mosquees`](packages/mosquees) |
| **محلات جيزي** | 128 | محلات بيع مُحدّدة جغرافيًا مع الفئة وأوقات العمل والربط بالبلدية/الولاية (djezzy.dz) — [`@geoalgeria/djezzy`](packages/djezzy) |
| **المؤسسات الصحية** | 695 | EPH · EPSP · EHS · CHU من وزارة الصحة — ثنائية اللغة، 600 بإحداثيات عبر OSM + Wikidata — [`@geoalgeria/sante`](packages/sante) |
| **وحدات الحماية المدنية** | 880 | وحدات الإطفاء والإنقاذ التابعة للمديرية العامة للحماية المدنية على كامل التراب — مُسمّاة بالعربية، بعنوان/هاتف/فاكس، وبمستوى الصفة، كلها بإحداثيات، مصدر رسمي أوّلي (dgpc.dz)، مع ربط الولاية وفق إصلاح 2026 — [`@geoalgeria/protection-civile`](packages/protection-civile) |
| **المواقع الثقافية** | 1083 | مواقع محمية، متاحف، مسارح، مكتبات + مؤسسات ثقافية من وزارة الثقافة — ثنائية اللغة، كلها بإحداثيات، 66 ولاية — [`@geoalgeria/culture`](packages/culture) |
| **المؤسسات الفلاحية** | 196 | مديريات المصالح الفلاحية، محافظات الغابات، معاهد البحث/التكوين، الغرف الفلاحية، الدواوين والمجمعات العمومية من وزارة الفلاحة — ثنائية اللغة، بإحداثيات، 58 ولاية — [`@geoalgeria/agriculture`](packages/agriculture) |
| **المدارس** | 11,830 | مدارس ابتدائية ومتوسطات وثانويات ورياض أطفال مُصنَّفة حسب الطور من OpenStreetMap — ثنائية اللغة، كل الـ69 ولاية — [`@geoalgeria/ecoles`](packages/ecoles) |
| **المحطات البرية** | 74 | محطات سوقرال البرية عبر 51 ولاية — الأسماء، العناوين، المساحات، الإحداثيات — [`@geoalgeria/gares-routieres`](packages/gares-routieres) |
| **السكك والنقل الحضري** | 692 | عُقَد القطار والترامواي والمترو والتلفريك (SNTF / SETRAM / SEMA) — تجميعة Wikidata + OSM، ثنائية اللغة، 50 ولاية — [`@geoalgeria/ferroviaire`](packages/ferroviaire) |
| **خطوط الحافلات الحضرية** | 50 | ETUSA (الجزائر) — المحطتان الطرفيتان، عدد المواقف، البلديات والمحطات المخدومة — [`@geoalgeria/buses`](packages/buses) |
| **الصيدليات** | 3٬790 | صيدليات (officines) مُحدَّدة جغرافيًا من OpenStreetMap، ثنائية اللغة عند التسمية، مربوطة بالبلدية/الولاية — [`@geoalgeria/pharmacies`](packages/pharmacies) |
| **مصنّعو الأدوية** | 171 | مصنّعون معتمدون للأدوية والأجهزة الطبية من سجل وزارة الصناعة الصيدلانية، مُحدَّدون جغرافيًا — [`@geoalgeria/industrie-pharmaceutique`](packages/industrie-pharmaceutique) |
| **نقاط بيع أوريدو** | 572 | فضاءات أوريدو ومتاجر المدينة وفضاءات الخدمات بإحداثيات حقيقية، مربوطة بالبلدية/الولاية (ooredoo.dz) — [`@geoalgeria/ooredoo`](packages/ooredoo) |

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
| [`packages/djezzy`](packages/djezzy) | [`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy) | محلات جيزي — 128 محل بيع مُحدّد جغرافيًا من djezzy.dz، مع الفئة وأوقات العمل والربط بالبلدية/الولاية |
| [`packages/mosquees`](packages/mosquees) | [`@geoalgeria/mosquees`](https://www.npmjs.com/package/@geoalgeria/mosquees) | مساجد الجزائر — 20,759 مُحدّدة جغرافيًا، تجميع Wikidata + OpenStreetMap بأسماء عربية وفرنسية ومذهب وربط بالبلدية/الولاية |
| [`packages/sante`](packages/sante) | [`@geoalgeria/sante`](https://www.npmjs.com/package/@geoalgeria/sante) | المؤسسات الصحية العمومية — 695 من وزارة الصحة (EPH، EPSP، EHS، CHU)، ثنائية اللغة، بإحداثيات عبر OSM + Wikidata مع ربط بالبلدية/الولاية |
| [`packages/culture`](packages/culture) | [`@geoalgeria/culture`](https://www.npmjs.com/package/@geoalgeria/culture) | الأطلس الثقافي — 1083 موقعًا من وزارة الثقافة (مواقع محمية، متاحف، مسارح، مكتبات، مؤسسات ثقافية)، ثنائية اللغة، كاملة الإحداثيات مع ربط بالبلدية/الولاية |
| [`packages/agriculture`](packages/agriculture) | [`@geoalgeria/agriculture`](https://www.npmjs.com/package/@geoalgeria/agriculture) | المؤسسات الفلاحية — 196 من وزارة الفلاحة موزعة على 7 شبكات (مديريات المصالح الفلاحية، محافظات الغابات، معاهد البحث/التكوين، الغرف الفلاحية، الدواوين والمجمعات العمومية)، ثنائية اللغة، بإحداثيات مع ربط بالبلدية/الولاية |
| [`packages/ecoles`](packages/ecoles) | [`@geoalgeria/ecoles`](https://www.npmjs.com/package/@geoalgeria/ecoles) | المدارس — 11,830 مدرسة وروضة من OpenStreetMap، مُصنَّفة حسب الطور (ابتدائي/متوسط/ثانوي/تحضيري)، ثنائية اللغة، كل الـ69 ولاية، مع ربط بالبلدية/الولاية |
| [`packages/gares-routieres`](packages/gares-routieres) | [`@geoalgeria/gares-routieres`](https://www.npmjs.com/package/@geoalgeria/gares-routieres) | المحطات البرية — 74 محطة سوقرال عبر 51 ولاية، بإحداثيات ومساحات وربط بالبلدية/الولاية |
| [`packages/ferroviaire`](packages/ferroviaire) | [`@geoalgeria/ferroviaire`](https://www.npmjs.com/package/@geoalgeria/ferroviaire) | السكك والنقل الحضري — 692 عقدة قطار/ترامواي/مترو/تلفريك (SNTF/SETRAM/SEMA)، تجميعة Wikidata + OSM، ثنائية اللغة |
| [`packages/buses`](packages/buses) | [`@geoalgeria/buses`](https://www.npmjs.com/package/@geoalgeria/buses) | شبكات الحافلات الحضرية — 50 خط ETUSA (الجزائر) مع المحطتين الطرفيتين والمواقف والبلديات والمحطات المخدومة (مستوى الخط، v1) |
| [`packages/industrie-pharmaceutique`](packages/industrie-pharmaceutique) | [`@geoalgeria/industrie-pharmaceutique`](https://www.npmjs.com/package/@geoalgeria/industrie-pharmaceutique) | مصنّعو الأدوية — 171 مصنّعًا معتمدًا للأدوية (PP) والأجهزة الطبية (DM) من سجل وزارة الصناعة الصيدلانية، ثنائيو اللغة، مُحدَّدون إلى مركز البلدية/الولاية |
| [`packages/pharmacies`](packages/pharmacies) | [`@geoalgeria/pharmacies`](https://www.npmjs.com/package/@geoalgeria/pharmacies) | الصيدليات (officines) — 3٬790 مُحدَّدة جغرافيًا عبر 67 ولاية من OpenStreetMap، ثنائية اللغة عند التسمية، مع الهاتف/الساعات/dispensing عند توفّرها والربط بالبلدية/الولاية |
| [`packages/protection-civile`](packages/protection-civile) | [`@geoalgeria/protection-civile`](https://www.npmjs.com/package/@geoalgeria/protection-civile) | وحدات الحماية المدنية (الإطفاء والإنقاذ) — 880 وحدة تابعة للمديرية العامة للحماية المدنية على كامل التراب، مُسمّاة بالعربية، بعنوان/هاتف/فاكس ومستوى صفة، كلها بإحداثيات، مصدر رسمي أوّلي (dgpc.dz)؛ الولاية مُعاد اشتقاقها على حدود ما بعد إصلاح 2026 الـ69 |
| [`packages/ooredoo`](packages/ooredoo) | [`@geoalgeria/ooredoo`](https://www.npmjs.com/package/@geoalgeria/ooredoo) | نقاط بيع أوريدو — 572 فضاء أوريدو / متجر مدينة / فضاء خدمات بإحداثيات حقيقية والربط بالبلدية/الولاية (ooredoo.dz)؛ يُكمل ثلاثي الاتصالات |
| [`packages/transport`](packages/transport) | [`@geoalgeria/transport`](https://www.npmjs.com/package/@geoalgeria/transport) | مظلة — تثبّت aviation + ferroviaire + gares-routieres + buses دفعة واحدة |
| [`packages/pharma`](packages/pharma) | [`@geoalgeria/pharma`](https://www.npmjs.com/package/@geoalgeria/pharma) | مظلة — تثبّت industrie-pharmaceutique + pharmacies دفعة واحدة |

[تصفح جميع الحزم →](https://geoalgeria.com/data) · [توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs)

## عقد البيانات

منذ الإصدار **v2.0.0**، تتشارك جميع الحزم القطاعية عقد تسجيل مرجعيًا واحدًا، مُعرّفًا في الحزمة الداخلية [`@geoalgeria/schema`](packages/schema) — وهي تبعية تطوير (dev dependency) يستخدمها مولّد كل حزمة، وغير منشورة على npm إطلاقًا.

كل سجل يتبع الشكل نفسه:

- `wilaya_code` عبارة عن **سلسلة نصية** مُصفَّرة البادئة (`"16"`)؛ والربط بالبلدية يتم عبر `commune_code` + `commune`؛ والإحداثيات هي `lat` / `lng` (رقمان معًا، أو `null` معًا).
- المعرّفات الخارجية مجمّعة تحت `refs` (`osm`، `wikidata`، …).
- `geo_precision` يأخذ حصرًا القيم `exact | approximate | null` — و`null` فقط عند غياب الإحداثيات — مع طريقة الترميز الجغرافي في `geo_method`.

تُرافقها أدوات قابلة للقراءة آليًا: فهرس جذري [`index.json`](index.json)، وواصف `schema.org/Dataset` (`dataset-metadata.json`) في كل حزمة، و69 مضلّع حدود للولايات في الحزمة الأساسية ضمن [`data/geojson/wilaya-boundaries.geojson`](packages/dataset/data/geojson/wilaya-boundaries.geojson) (بجودة العرض).

حزمتان تسبقان العقد ولا تزالان تُصدِّران أشكال v1 — مجموعة البيانات الأساسية `geoalgeria` و[`@geoalgeria/telecom`](packages/telecom) (المميَّزتان بـ `schema_version: null` في الفهرس).

هل تنقل حزمة؟ انظر [`packages/schema/MIGRATING.md`](packages/schema/MIGRATING.md).

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
