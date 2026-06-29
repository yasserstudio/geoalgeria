# Heritage name translation — conventions (FR↔AR), GeoAlgeria patrimoine

Translate place/institution names for Algeria's cultural-heritage dataset. Output a
faithful, natural name in the target language — NOT a literal word-for-word gloss.

## Golden rules
1. **Use established French exonyms** for famous sites — do not transliterate them:
   تيبازة=Tipasa · جميلة=Djémila · تيمقاد=Timgad · تيديس=Tiddis · هيبون=Hippone ·
   الطاسيلي ناجر=Tassili n'Ajjer · القصبة=Casbah · قلعة بني حماد=Kalâa des Beni Hammad ·
   وادي ميزاب/غرداية=Vallée du M'Zab · شرشال=Cherchell · تلمسان=Tlemcen · قسنطينة=Constantine.
2. **Institutional templates (match the source's own FR style from the bilingual key):**
   - المكتبة الرئيسية للمطالعة العمومية … = "Bibliothèque principale de lecture publique …"
   - مكتبة المطالعة العمومية … = "Bibliothèque de lecture publique …"
   - المسرح الوطني … = "Théâtre national …" ; المسرح الجهوي … = "Théâtre régional …"
   - المتحف الوطني … = "Musée national …" ; المتحف العمومي الوطني … = "Musée public national …"
   - متحف المجاهد … = "Musée du Moudjahid …"
3. **Heritage common nouns:** قصر=Ksar · قصبة=Casbah · قلعة=Qalâa/Citadelle (use Qalâa for
   historic citadels) · برج=Bordj · زاوية=Zaouïa · ضريح=Mausolée · مقام=Mausolée · مسجد=Mosquée ·
   جامع=Grande Mosquée · كنيسة=Église · معبد=Temple · موقع أثري=Site archéologique ·
   مدينة أثرية=Cité antique · مقبرة=Nécropole · مقبرة ميغاليتية=Nécropole mégalithique ·
   حصن=Fort · سور=Remparts · حي=Quartier · دار=Dar · عين=Aïn.
4. **People's names** (institutions named after martyrs/scholars): transliterate with the
   common Algerian-French spelling; الشهيد=martyr ; العلامة/الشيخ=Cheikh. Keep the person's name.
5. Keep the wilaya/commune in the name if the source has it; use the standard French wilaya
   spelling (provided per record as wilaya_fr / wilaya_ar).
6. For FR→AR: mirror the same rules in reverse; use standard Arabic forms; transliterate
   French proper names into Arabic script naturally.
7. Preserve every record's `key` EXACTLY for round-trip merge. Do not drop, merge, reorder
   conceptually, or add records. One output per input.

## Output
Write ONLY a JSON array to the specified out file via the Write tool. Each element:
- AR→FR batches: `{ "key": "<unchanged>", "name_fr": "<French name>" }`
- FR→AR batch:   `{ "key": "<unchanged>", "name_ar": "<Arabic name>" }`
No prose, no markdown, no extra keys. Same length as the input array.
