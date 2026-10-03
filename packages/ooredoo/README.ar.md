[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/ooredoo

**شبكة نقاط بيع أوريدو الجزائر، كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/ooredoo)](https://www.npmjs.com/package/@geoalgeria/ooredoo)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

# نظرة عامة

572 نقطة بيع لأوريدو موزّعة على **63 ولاية** – فضاءات أوريدو (EO)، ومتاجر المدينة (CSO)، وفضاءات الخدمات (ESO) – من واجهة تحديد المواقع الخاصة بالمتعامل، لكلٍّ منها **إحداثيات حقيقية** وربط بالولاية/البلدية. يكمل ثلاثي الاتصالات مع [`@geoalgeria/mobilis`](https://www.npmjs.com/package/@geoalgeria/mobilis) و[`@geoalgeria/djezzy`](https://www.npmjs.com/package/@geoalgeria/djezzy).

## التثبيت

```bash
npm install @geoalgeria/ooredoo
```

## بداية سريعة

```js
import { stores, storesByType, storesByWilaya, metadata } from "@geoalgeria/ooredoo";

stores().length; // 572
storesByType("ESO").length; // 436
storesByWilaya(16).map((r) => r.name); // الجزائر العاصمة
metadata().wilayas_covered; // 63
```

## المحتوى

| النوع | العدد | المعنى |
| --- | --- | --- |
| `EO` | 100 | فضاء أوريدو |
| `ESO` | 436 | فضاء خدمات أوريدو |
| `CSO` | 36 | متجر أوريدو |

الإحداثيات: 572 مُموقَعة (548 بدقّة `exact`، و24 بدقّة `approximate`).

## الصيغ

- `data/stores.json` – المصفوفة الكاملة (مُنمّطة عبر `types/index.d.ts`)
- `data/csv/stores.csv` – CSV مسطّح
- `data/geojson/stores.geojson` – `FeatureCollection`
- `data/metadata.json` – الأعداد والمصادر وتاريخ التوليد

## الدقة

> الأسماء والأنواع والإحداثيات من **المتعامل** (`geo_method: "operator_api"`). الإحداثيات بدقّة `geo_precision: "exact"` لـ548 نقطة بيع، وبدقّة `"approximate"` لـ24 نقطة: 19 إحداثيّتها المصدرية أقل من 3 خانات عشرية، و5 نقاط (`16-001` و`16-052` و`31-001` و`48-001` و`67-002`) يناقض إحداثيّها في الواجهة كلًّا من الولاية التي يعلنها أوريدو للنقطة واسم النقطة وعنوانها، فأُسنِدت إلى نقطة بلديتها (`geo_method: "commune_centroid"`). وتحتفظ هذه النقاط الخمس بمعرّفها الأول، فبادئة `id` فيها هي الولاية التي وقع فيها الإحداثي الخاطئ لا `wilaya_code`؛ ويُتعامل مع `id` بوصفه معرّفًا مبهمًا. الولاية دقيقة فعليًا (من النقطة المُعايَنة)؛ والبلدية أقرب مركز (بأفضل جهد). بما أنّ الواجهة تصنّف النقاط وفق تقسيم 48 ولاية القديم، يُعاد اشتقاق الولاية/البلدية من الإحداثيات إلى تقسيم 69 ولاية الحالي؛ وتُحفظ ولاية المتعامل المُعلنة في `operator_wilaya`.

## المصدر والترخيص

البيانات © **أوريدو الجزائر**، يُعاد نشرها كمرجع (بنفس وضع `@geoalgeria/mobilis` / `@geoalgeria/djezzy`). الربط بالولاية/البلدية يستخدم مجموعة بيانات geoalgeria الأساسية. شيفرة الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح مسألة: https://github.com/yasserstudio/geoalgeria/issues
