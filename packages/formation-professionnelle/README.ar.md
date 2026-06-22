[English](README.md) | [Français](README.fr.md) | **العربية**

<div align="center">

# @geoalgeria/formation-professionnelle

**كل مؤسسة تكوين مهني في الجزائر — كبيانات يمكنك تثبيتها.**

[![npm](https://img.shields.io/npm/v/@geoalgeria/formation-professionnelle)](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle)
[![npm downloads](https://img.shields.io/npm/dm/@geoalgeria/formation-professionnelle)](https://www.npmjs.com/package/@geoalgeria/formation-professionnelle)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

1,932 مؤسسة تكوين مهني عبر الجزائر — **مراكز التكوين المهني والتمهين (CFPA)**، **المعاهد
الوطنية المتخصصة في التكوين المهني (INSFP)**، **معاهد التكوين والتعليم المهنيين (IFEP)**،
**معاهد التعليم المهني (IEP)**، **مديريات التكوين والتعليم المهنيين (DFEP)** والمراكز الخاصة
المعتمدة — كل منها بالاسم الرسمي (بالعربية، مع الفرنسية عند توفرها)، **نوع** المؤسسة،
**الطاقة الاستيعابية**، معلومات **الإقامة الداخلية**، **بيانات الاتصال** المفصلة (هاتف، فاكس،
بريد إلكتروني، موقع إلكتروني، فيسبوك) والإحداثيات الجغرافية. المصدر: **وزارة التكوين
والتعليم المهنيين (MFEP)** عبر [takwin.dz](https://takwin.dz)، متوفر بصيغ JSON وCSV
وGeoJSON. جزء من [GeoAlgeria](https://github.com/yasserstudio/geoalgeria).

```bash
npm install @geoalgeria/formation-professionnelle
```

```js
import fp from "@geoalgeria/formation-professionnelle";

const all = fp.establishments();                    // 1,932
const byWilaya = fp.establishmentsByWilaya(16);     // مؤسسات الولاية 16
const cfpas = fp.establishmentsByType("cfpa");      // جميع مراكز CFPA
const one = fp.establishmentById(1);                // سجل واحد حسب المعرف

// 1,375 سجلا تحتوي على إحداثيات — الترتيب حسب المسافة، الخرائط، أو أقرب مركز في بضعة أسطر.
```

## ما يمكنك بناؤه

- **البحث عن أقرب مركز تكوين** — 1,375 سجلا محدد الإحداثيات، جاهزة للترتيب حسب المسافة.
- **أدلة التكوين المهني** — أسماء ثنائية اللغة، النوع، الطاقة الاستيعابية وبيانات الاتصال الكاملة.
- **الخرائط** — طبقة نقاط GeoJSON جاهزة للاستخدام لشبكة التكوين المهني (71% محدد الإحداثيات).
- **تخطيط الطاقة الاستيعابية** — الطاقة النظرية والفعلية، توفر الإقامة الداخلية والمساحة.
- **التحليل القطاعي** — 1,209 مؤسسة عمومية مقابل 723 خاصة عبر 58 ولاية.

## المحتوى

| النوع | الرمز | العدد |
| --- | --- | --- |
| مركز التكوين المهني والتمهين | `cfpa` | 856 |
| مركز خاص معتمد | `prive` | 723 |
| المعهد الوطني المتخصص في التكوين المهني | `insfp` | 182 |
| ملحقة CFPA | `annexe_cfpa` | 70 |
| مديرية التكوين والتعليم المهنيين | `dfep` | 58 |
| معهد التعليم المهني | `iep` | 18 |
| ملحقة CNFEPD | `annexe_cnfepd` | 9 |
| ملحقة INSFP | `annexe_insfp` | 9 |
| معهد التكوين والتعليم المهنيين | `ifep` | 6 |
| المعهد الوطني للتكوين والتعليم المهنيين | `infep` | 1 |
| **المجموع** | | **1,932** |

تغطي **58 ولاية** (المخطط قبل الإصلاح). 1,375 من أصل 1,932 مؤسسة محددة الإحداثيات
(71%) — `lat`/`lng` قيمتهما `null` للـ 557 المتبقية. `wilaya_code` يستخدم مخطط 58 ولاية
كما هو منشور من المصدر.

## الصيغ

حزمة npm توفر صيغة **JSON** (قابلة للاستيراد مباشرة):

```js
import establishments from "@geoalgeria/formation-professionnelle/data/establishments.json" with { type: "json" };
// أو عبر CDN، بدون تثبيت:
// https://cdn.jsdelivr.net/npm/@geoalgeria/formation-professionnelle/data/establishments.json
```

أدوات التحميل وأشكال السجلات **مصنفة بالكامل** — تعريفات TypeScript مضمنة في الحزمة:

```ts
import fp, { type Establishment } from "@geoalgeria/formation-professionnelle";
const all: Establishment[] = fp.establishments();
```

صيغتا **CSV وGeoJSON** موجودتان في المستودع ضمن [`data/`](data) ومضمنتان في كل
[إصدار على GitHub](https://github.com/yasserstudio/geoalgeria/releases):

```
data/
  establishments.json      # 1,932 مؤسسة (مصفوفة)
  metadata.json            # المصدر، الأعداد، by_type، by_secteur، geocoded، generated_at
  csv/                     # تصدير CSV (المستودع + حزمة الإصدار، غير مضمن في tarball npm)
  geojson/                 # معالم GeoJSON (1,375 نقطة محددة الإحداثيات)
```

## شكل السجل

```json
{
  "id": 1,
  "name": "مديرية التكوينو التعليم المهنيينأدرار",
  "name_fr": "DFEPADRAR",
  "type": "dfep",
  "type_label": "مديرية التكوين والتعليم المهنيين",
  "abreviation": "DFEP ADRAR",
  "code": "0100",
  "secteur": "public",
  "commune": "أدرار",
  "wilaya_code": "01",
  "lat": null,
  "lng": null,
  "adresse": "حي 103مسكن أدرار",
  "adresse_fr": "Cité 103 logtAdrar",
  "telephone": "049364333",
  "fax": "049364332",
  "email": "dfpadrar@gmail.com",
  "site_web": null,
  "facebook": "www.facebook.com/profile.php?id=100057469388259",
  "capacite": null,
  "capacite_reelle": null,
  "surface_m2": 2443.42,
  "internat": false,
  "capacite_internat": null,
  "vocations": null,
  "source": "takwin.dz (MFEP)"
}
```

`id` هو عدد صحيح ثابت يبدأ من 1. الأسماء ثنائية اللغة — `name` بالعربية (موجود دائما)،
`name_fr` بالفرنسية (قد يكون `null`). `type` هو رمز يطابق أحد أنواع المؤسسات العشرة
المذكورة أعلاه. `secteur` إما `"public"` أو `"prive"`. `wilaya_code` مكمل بصفر إلى رقمين
في مخطط 58 ولاية. `lat`/`lng` قيمتهما `null` للـ 29% من السجلات غير المحددة الإحداثيات
بعد. `capacite` (النظرية) و`capacite_reelle` (الفعلية) هما عدد المقاعد؛ `internat` يشير
إلى توفر الإقامة الداخلية مع `capacite_internat` اختياري. `vocations` مصفوفة تخصصات عند
توفرها.

## هل تحتاج التقسيمات الإدارية أيضا؟

إذا كنت تحتاج أيضا الولايات والدوائر والبلديات للربط، استخدم الحزمة الرئيسية
**[`geoalgeria`](https://www.npmjs.com/package/geoalgeria)** — توفر مجموعة بيانات التقسيم
الكاملة للـ 69 ولاية. استخدم `@geoalgeria/formation-professionnelle` عندما تحتاج *فقط*
بيانات التكوين المهني.

## المصدر

البيانات من **وزارة التكوين والتعليم المهنيين (MFEP)**، عبر [takwin.dz](https://takwin.dz).
المصدر يستخدم **مخطط 58 ولاية** (قبل الإصلاح). شغل `npm run fetch` لإعادة توليد جميع
المخرجات من الموقع الحي. الأسماء والأنواع وبيانات الاتصال والطاقات الاستيعابية والإحداثيات
كما نشرتها الوزارة.

## الترخيص والإسناد

الكود مرخص بموجب [MIT](LICENSE). البيانات الأساسية حقوق النشر محفوظة لـ **وزارة التكوين
والتعليم المهنيين**، معاد توزيعها كمرجع ولتشغيل [GeoAlgeria](https://geoalgeria.com).
تحقق من الوزارة للحصول على معلومات رسمية ومحدثة.

[توثيق API ومرجع الحقول →](https://geoalgeria.com/data/docs/formation-professionnelle) · [تصفح جميع الحزم →](https://geoalgeria.com/data)

---

صنع بواسطة [Yasser's Studio](https://yasser.studio) · [LinkedIn](https://www.linkedin.com/in/yasserberrehail/) · [X](https://x.com/yassersstudio) · [hello@yasser.studio](mailto:hello@yasser.studio)
