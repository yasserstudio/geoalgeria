# Operator Facebook identity audit — 2026-09-04

## Scope and acceptance rule

This audit covers the seven records in `packages/buses/data/operators.json` whose
`facebook_url` was null at review time: `etus-bejaia`, `etus-msila`, `etus-oeb`,
`etus-sidi-bel-abbes`, `etus-tiaret`, `etusl-laghouat`, and `etusto` (seen;
[`operators.json`](../../packages/buses/data/operators.json)).

The supplied Facebook search-results screenshot was used only for candidate
discovery. A URL is accepted below only when an operator-owned website links to
it or Facebook's own public canonical metadata identifies the same operator and
location. No account was created, no form was submitted, and nobody was
contacted.

Screenshot receipt (seen):

- Local artifact: `/Users/yasser/Library/Containers/com.wiheads.paste/Data/tmp/images/cmux 2026-09-04 12.17.18.png`
- SHA-256: `dd71ac60535e47fd5a8eb367c0f6a26e8ff0ebd14d6797c40188413e7abf4ef1`
- The screenshot shows matching operator names/logos and approximate follower
  counts, but not link targets; those visual matches alone are not URL proof.

## Accepted canonical URLs

| Operator ID | Canonical Facebook URL | Evidence | Finding |
| --- | --- | --- | --- |
| `etus-bejaia` | <https://www.facebook.com/etusbejaia.bejaia.5> | The operator-owned website <https://etusbejaia.dz/> links directly to this URL. Facebook's public page title was `Etus Bejaia \| Facebook`, and the URL did not redirect elsewhere when checked on 2026-09-04. | **seen** |
| `etus-sidi-bel-abbes` | <https://www.facebook.com/etus22> | The operator-owned website <https://etus22.dz/> links directly to this URL in both its menu and footer. Facebook's public page title was `المؤسسة العمومية للنقل الحضري و شبه الحضري سيدي بلعباس \| Sidi Bel Abbès \| Facebook` when checked on 2026-09-04. | **seen** |
| `etusl-laghouat` | <https://www.facebook.com/ETUSL/> | Candidate discovery produced legacy Facebook page ID `1521771391459501`; opening <https://www.facebook.com/1521771391459501> redirected to `/ETUSL/`. Facebook's own public metadata supplied canonical `og:url` `/ETUSL/`, title `مؤسسة النقل الحضري و الشبه الحضري لولاية الأغواط \| Laghouat`, and description reporting 12,390 likes. The supplied screenshot independently shows the same Arabic operator identity, ETUL logo, Laghouat location, and approximately 12K followers. | **seen** |
| `etusto` | <https://www.facebook.com/etusto15> | The operator-owned website <http://etusto.dz/> links to the legacy URL <https://www.facebook.com/Etusto-104363575675214/>. Facebook redirects that URL to `/etusto15` and identifies the page as `Etusto \| Tizi Ouzou \| Facebook`. | **seen** |

## Unresolved or rejected candidates

| Operator ID | Result | Evidence and reason | Finding |
| --- | --- | --- | --- |
| `etus-msila` | Keep `facebook_url: null`. | The screenshot shows a plausible M'Sila operator page, but no target URL. The operator-owned site <https://etus-msila.dz/> renders its Facebook icons with `href=" # "`; it therefore does not establish an identity. One staff/card icon is also styled as Facebook while linking to the operator's Google Play application, so icon appearance is not reliable evidence. No candidate URL could be confirmed by Facebook's public metadata. | **seen** |
| `etus-oeb` | Keep `facebook_url: null`. | The screenshot shows an `ETU OEB`-branded page in Oum El Bouaghi with about 4.6K followers, but it does not reveal the link target. The supplied operator artwork and the audited WASLAYA APK establish the operator identity, not a Facebook URL; the APK audit contains no Facebook reference ([APK audit](agents/apk-audit/com.deeper.etus.oeb/AUDIT.md)). Common-looking handles were not accepted because Facebook returned no identifying public title or canonical metadata for them. | **seen** |
| `etus-tiaret` | Keep `facebook_url: null`. | The screenshot is not enough to recover a target URL. The operator-owned site <https://www.etus-tiaret.dz/> contains a Facebook footer icon whose published bundle uses `href="#"`, not a page URL. The audited Tiaret APK/review material contains no Facebook reference ([APK audit](agents/apk-audit/dz.etustiaret.reviews/AUDIT.md)). No candidate URL could be confirmed by Facebook's public metadata. | **seen** |
| `etusl-laghouat` rejected candidate | Do not use <https://www.facebook.com/etusl.laghouat>. | Facebook classifies it in public metadata as a personal-style profile (`Etusl Laghouat is on Facebook. Join Facebook to connect...`), not the 12K-follower operator Page shown in the screenshot. The verified operator Page is `/ETUSL/`. | **seen** |

## Promotion recommendation

Promote exactly the four accepted URLs above. Leave M'Sila, Oum El Bouaghi, and
Tiaret null until a first-party operator property or Facebook canonical metadata
exposes an unambiguous page URL. This recommendation is **inferred** from the
acceptance rule and the evidence recorded above.
