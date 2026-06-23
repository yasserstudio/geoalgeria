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

- **"GeoAlgeria"** — set as one word, two colors: **Geo** = navy `#1A202C`,
  **Algeria** = green `#2D7A3A`. Equal weight; colour is the only differentiator.
  Font: **IBM Plex Sans SemiBold** (matches the geoalgeria.com app).
- **Arabic "جيو الجزائر"** — mirrors the Latin split: **جيو** (Geo) = navy,
  **الجزائر** (Algeria) = green. Font: IBM Plex Sans Arabic SemiBold.
- The horizontal lockup PNGs are **rendered from the vector mark + IBM Plex via
  rsvg-convert** (HarfBuzz shapes the Arabic) — no longer AI-generated raster.

## Sizing rule (important)

- **≥ 48px** → full icon *with* the Algeria map outline.
- **< 48px (favicon: 16/32px)** → **layers-only** variant, map dropped. The outline
  smudges below ~48px, so the small variant uses just the three green layers.

## Source of truth (vector mark)

The canonical vector mark now lives **as code** in the app repo:
`GeoAlgeria-app/apps/web/components/brand/` — `geoalgeria-mark.tsx` (full +
layers-only), `algeria-silhouette.ts` (national outline dissolved from the real
wilaya boundaries, not AI-traced), `mark.ts` (shared paths + `BRAND_GREEN`).
Reuse that geometry; don't regenerate the silhouette.

## Open items

- [x] **Accurate map geometry** — silhouette is now dissolved from real wilaya
      boundaries (app `algeria-silhouette.ts`); the README mark uses the same shape.
- [x] **Layers-only icon** — done; app ships `app/icon.svg` + favicon set.
- [x] **Arabic color/spacing** — fixed: جيو navy (right), الجزائر green (left).
- [x] **Navy locked** — lockup wordmark now uses navy `#1A202C` (not pure black).
- [x] **README headers (×3)** — wired in (light/dark via `<picture>`).
- [x] **App** — fully branded (headers, theme, favicon/manifest, OG). See app PR #22.
- [ ] **Optional: SVG lockup master** — the horizontal lockup is committed as
      retina PNG (rendered, not AI). A text-outlined SVG master is not produced.
- [ ] **Wire-in (remaining)** — npm/social avatars.
