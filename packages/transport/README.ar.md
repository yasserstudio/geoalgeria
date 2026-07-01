[English](README.md) | [Français](README.fr.md) | **العربية**

<div dir="rtl">

# @geoalgeria/transport

**قطاع النقل في الجزائر — تثبيت واحد لكل الأنماط.**

حزمة جامعة تُعيد تصدير كل مجموعات بيانات النقل في GeoAlgeria.

</div>

```bash
npm install @geoalgeria/transport
```

```js
import transport from "@geoalgeria/transport";
transport.aviation.airports();        // المطارات (ANAC)
transport.ferroviaire.stations();     // السكك / الترامواي / المترو (SNTF / SETRAM / SEMA)
transport.garesRoutieres.stations();  // المحطات البرية (SOGRAL)
transport.buses.lines();              // شبكات الحافلات الحضرية (ETUSA)
```

<div dir="rtl">

## الأعضاء

| فضاء الأسماء | الحزمة | المحتوى |
| --- | --- | --- |
| `aviation` | `@geoalgeria/aviation` | المطارات المدنية (ANAC) |
| `ferroviaire` | `@geoalgeria/ferroviaire` | السكك والترامواي والمترو |
| `garesRoutieres` | `@geoalgeria/gares-routieres` | المحطات البرية (SOGRAL) |
| `buses` | `@geoalgeria/buses` | شبكات الحافلات الحضرية (ETUSA) |

## الرخصة

الشيفرة تحت [MIT](LICENSE). كل عضو يحمل رخصة بياناته الخاصة — راجع ملفات README المعنية.

</div>

---

<div dir="rtl">

من إنجاز [Yasser's Studio](https://yasser.studio)

</div>
