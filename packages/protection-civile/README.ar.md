[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/protection-civile

**وحدات الحماية المدنية في الجزائر، كبيانات قابلة للتثبيت.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/protection-civile)](https://www.npmjs.com/package/@geoalgeria/protection-civile)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/protection-civile)](https://www.npmjs.com/package/@geoalgeria/protection-civile)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)

</div>

# نظرة عامة

**880 وحدة للحماية المدنية** موزّعة على كل الولايات، مباشرةً من **مجموعة بيانات المديرية العامة للحماية المدنية** (dgpc.dz)، كل وحدة باسم عربي وعنوان وهاتف وفاكس ومستوى صفة (`statut`) وإحداثية DGPC حقيقية. هذا مصدر **رسمي أوّلي**: المديرية العامة هي المصدر الموثوق «هذه الوحدة موجودة هنا».

## التثبيت

```bash
npm install @geoalgeria/protection-civile
```

## بداية سريعة

```js
import {
  units,
  unitById,
  unitsByWilaya,
  unitsByStatut,
  metadata,
} from "@geoalgeria/protection-civile";

units().length; // 880
unitsByWilaya(16).length; // الجزائر العاصمة
unitsByStatut("UNITE PRINCIPALE").length;
unitById("16-001")?.commune;
metadata().wilayas_covered; // 69
```

## ماذا يمكنك أن تبني

- مُحدِّد مواقع أو طبقة خريطة للحماية المدنية / الإنقاذ والإطفاء في الجزائر
- تحليل تغطية الاستجابة للطوارئ حسب الولاية
- طبقة أساس تُوصَل بنشرات المديرية العامة الحيّة

## المحتوى

| المجموعة | العدد | الإحداثيات | ملاحظات |
| --- | --- | --- | --- |
| `protection-civile` | 880 | الكل | DGPC (dgpc.dz)، مُموقَعة، ربط الولاية وفق إصلاح 2026 |

**حسب مستوى الصفة (`statut`):** UNITE SECONDAIRE 444 · POSTE AVANCE 146 · UNITE DE SECTEUR 132 · UNITE PRINCIPALE 62 · SIEGE DE DIRECTION WILAYA 58 · POSTE DE SECOURS ROUTIER 20 · UNITE MARINE 15 · U.N D'INSTRUCTION ET D'INTERVENTION 1 · DIRECTION GENERALE 1 · CELLULE DE SECURITE 1

كل وحدة تحمل `tel` و`fax` و`address`؛ **780** بلدية طُوبِقت بالاسم، والباقي بأقرب مركز.

## الصيغ

- `data/protection-civile.json`، المصفوفة الكاملة (مُنمّطة عبر `types/index.d.ts`)
- `data/csv/protection-civile.csv`، CSV مسطّح
- `data/geojson/protection-civile.geojson`، `FeatureCollection`
- `data/metadata.json`، الأعداد والمصادر وتاريخ التوليد

## كيف تُبنى البيانات

تُنزَّل من GeoJSON الخاص بالمديرية العامة (`dgpc.dz/dgpc2/unite.geojson`). تبدأ الإحداثيات من `x`/`y` العشري لكل معلم؛ ويستبدل سجل مراجعة محمي ست نقاط خشنة بإحداثيات وحدات موثقة من OpenStreetMap، مع حفظ روابط الأدلة العامة في السجلات المصححة. يُشتقّ `wilaya_code` بنقطة-في-مضلّع مقابل حدود الـ69 ولاية بعد إصلاح 2026، ثم **يُوفَّق مع `cod_wilaya` الخاص بالمديرية العامة** (سابق للإصلاح، الرموز `"01".."58"`): الوحدات الواقعة الآن ضمن الولايات الإحدى عشرة الجديدة لعام 2026 تحمل رمزها الجديد الصحيح (الهندسة `59..69`)، لكن حين تتعارض الهندسة ورمز المديرية العامة بين رموز ما قبل الإصلاح، وحدة حدودية أخطأ في تصنيفها محيط مبسَّط بدقة `~150 م`، يفوز الرمز الرسمي للمديرية العامة وتُعاد مطابقة البلدية هناك. يُحفَظ رمز المديرية العامة حرفيًا في `refs.dgpc_wilaya` كإيصال. البلدية بأفضل جهد، يُطابَق الاسم العربي `commune_1` مع مجموعة بلديات geoalgeria ضمن الولاية المحسومة (احتياطيًا أقرب مركز). أعِد البناء بـ `npm run fetch` (أو `--cache` من `sources/protection-civile/dgpc-units.json`)، ثم شغّل `npm run review`.

> **خطر معروف، مفاتيح النقل.** تُنقَل المعرّفات العمومية المستقرّة عبر عمليات إعادة البناء بواسطة `objectid` الخاص بالمديرية العامة (`refs.dgpc`)، وهو معرّف بديل بأسلوب ArcGIS قد تعيد المديرية العامة ترقيمه من جهتها. تُسجِّل إعادة البناء عدّاد النقل؛ الانخفاض المفاجئ عن ~880 يعني أنّ البديل أُعيد ترقيمه، قارِن المعرّفات قبل الالتزام بدل تركها تُعاد صياغتها.

## الدقة والتغطية

> **هذه الشبكة الكاملة التي تنشرها المديرية العامة، 880 وحدة.** صُححت ست نقاط DGPC خشنة بإحداثيات وحدات مدعومة بالأدلة؛ وبقيت 23 نقطة متطابقة أو مشتقة من مركز مضلع أو خشنة غير محسومة موسومة بأمانة `approximate`، بينما 857 نقطة `exact`. لا يوجد اسم فرنسي في المصدر، لذا لا يُشتقّ `name_fr`، لا شيء يُترجَم آليًا. البلدية مطابقة بالاسم (بأفضل جهد)؛ **الولاية مُشتقّة من الهندسة ثم مُدقَّقة مع رمز المديرية العامة**: التعارضات بين رموز ما قبل الإصلاح (وحدة حدودية أخطأ في تصنيفها محيط مبسَّط) تُحسَم إلى الرمز الرسمي للمديرية العامة.
>
> `cod_wilaya` الأصلي للمديرية العامة سابق لإصلاح 2026 ويُحفظ فقط في `refs.dgpc_wilaya`. استخدم `wilaya_code` (الرمز ما بعد الإصلاح المشتقّ من الهندسة) لأي ربط بالولاية.

## المصدر والترخيص

سجلات DGPC © **المديرية العامة للحماية المدنية**: محتوى رسمي عمومي مُعاد توزيعه هنا للمرجعية، من دون ترخيص مفتوح معلن. أدلة الإحداثيات المراجَعة © **مساهمو OpenStreetMap**، وفق ODbL 1.0. الربط بالولاية/البلدية يستخدم مجموعة بيانات geoalgeria الأساسية. شيفرة الحزمة تحت رخصة MIT (انظر [LICENSE](LICENSE)).

## أسئلة؟

افتح مسألة: https://github.com/yasserstudio/geoalgeria/issues
