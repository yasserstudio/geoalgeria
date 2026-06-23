# GeoAlgeria — Brand Assets

Brand assets for GeoAlgeria. This folder is the single source of truth for the logo,
icon, colors, and usage rules.

> **Status: PNG drafts, wired into README headers.** The files here are AI-generated
> raster (PNG) drafts pending vector masters. The horizontal lockup is now used in the
> three README headers (light/dark via `<picture>`); the website + favicon are still
> pending. See [Open items](#open-items).

## Files

| File | What it is | Use |
| --- | --- | --- |
| `logo/geoalgeria-logo-horizontal.png` | Bilingual horizontal lockup, **black text** — for light backgrounds | README header (light), website header, social |
| `logo/geoalgeria-logo-horizontal-white.png` | Same lockup, **white text** (black→white recolor) — for dark backgrounds | README header (dark mode) |
| `icon/geoalgeria-icon-full.png` | Full icon — stacked map layers + Algeria outline | Avatars, large icon use (**≥ 48px**) |

Used in `README.md`, `README.fr.md`, `README.ar.md` as:

```html
<a href="https://geoalgeria.com"><picture><source media="(prefers-color-scheme: dark)" srcset="./assets/brand/logo/geoalgeria-logo-horizontal-white.png"><img src="./assets/brand/logo/geoalgeria-logo-horizontal.png" alt="GeoAlgeria" width="280"></picture></a>
```

## Concept

Three stacked map "layers" (GIS data layers) with the silhouette of Algeria on the top
layer. Communicates *layered open geographic data for Algeria*.

## Color palette

| Token | Hex | Use |
| --- | --- | --- |
| Brand green | `#2D7A3A` | Layer stack, "Algeria" wordmark, Arabic "الجزائر" |
| Dark navy | `#1A202C` | "Geo" wordmark, Arabic "جيو", tagline |
| White | `#FFFFFF` | Map outline, background |

No other colors. No gradients (flat only) — keeps single-color / monochrome
reproduction clean.

## Wordmark

- **"GeoAlgeria"** — set as one word, two colors: **Geo** = navy, **Algeria** = green.
  Equal font weight (color is the only differentiator). Modern geometric sans-serif.
- **Arabic "جيو الجزائر"** — mirrors the Latin split: **جيو** (Geo) = navy,
  **الجزائر** (Algeria) = green. Two words, with a space.
- **Tagline** — "OPEN DATA FOR ALGERIA", navy, small caps, tight letter-spacing.

## Sizing rule (important)

- **≥ 48px** → full icon *with* the Algeria map outline.
- **< 48px (favicon: 16/32px)** → **layers-only** variant, map dropped. The outline
  smudges below ~48px, so the small variant uses just the three green layers.
  *(This variant is not produced yet — see Open items.)*

## Open items

These are intentionally **not** implemented yet:

- [ ] **Vector masters** — current files are raster PNG from AI generation. Need clean
      SVG masters (real Algeria geometry, ideally traced from project boundary data
      rather than AI-approximated).
- [ ] **Layers-only icon** for the favicon (16 / 32 / 48px) — map dropped.
- [ ] **Arabic color/spacing check** — confirm جيو = navy, الجزائر = green, and the
      two words have a space (earlier drafts inverted/joined them).
- [ ] **Navy vs black** — current PNG wordmark is pure **black** `(0,0,0)`, not the spec
      navy `#1A202C`. Fix in the vector master (lock navy). The dark-mode variant recolors
      black→white, so dark mode is unaffected.
- [ ] **Icon polish** — optically center the map on the top layer; thicken the white
      outline ~15–20% to balance the chunky layers.
- [x] **README headers (×3)** — wired in (light/dark via `<picture>`), linked to
      geoalgeria.com. _Re-export when vectors are final._
- [ ] **Wire-in (remaining)** — website header, favicon, npm/social avatars.
