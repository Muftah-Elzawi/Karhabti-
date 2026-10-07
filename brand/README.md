# Karhabti / كرهبتي — "Diagnose Drive" brand assets

Master brand files. The icon mark is a speedometer arc whose needle forms the
diagonal of the letter K — diagnosis + drive.

## Files

| File                      | Use                                                               |
| ------------------------- | ----------------------------------------------------------------- |
| `karhabti-horizontal.svg` | Master horizontal lockup (light backgrounds)                      |
| `karhabti-stacked.svg`    | Stacked lockup                                                    |
| `karhabti-icon.svg`       | Icon-only mark, transparent bg (white art — for DARK backgrounds) |
| `karhabti-app-icon.svg`   | App icon with aubergine rounded background                        |
| `karhabti-monochrome.svg` | Single-color utility lockup                                       |

Web-served copies live in `apps/web/public/brand/` and `apps/web/src/app/icon.svg`
(favicon); PWA PNGs are rasterized into `apps/web/public/icons/`.

## Palette (source of truth: `packages/config/tamagui/tokens.ts`)

| Token         | Hex       | Role                                      |
| ------------- | --------- | ----------------------------------------- |
| Aubergine     | `#3B1E4A` | Primary brand, dark surfaces, app icon bg |
| Copper Bronze | `#B86F3D` | Accents, needle, highlights               |
| Slate Gray    | `#485563` | Secondary text, structure                 |
| Warm Beige    | `#F2E8DB` | Backgrounds                               |
| Deep Charcoal | `#1E1E1E` | Text on light                             |
| White         | `#FFFFFF` | Text/art on dark                          |

## Typography

Arabic: **IBM Plex Sans Arabic** (fallbacks: Cairo, Tahoma, Arial).
Latin: **Inter** (fallbacks: IBM Plex Sans, Arial).

## Production notes

- The SVG wordmarks are live text for easy editing. Before shipping to
  App Store / Play Store / print vendors, convert text to outlines
  (Figma / Illustrator / Inkscape) using IBM Plex Sans Arabic + Inter.
- The original delivered SVGs had mojibake Arabic text (encoding corruption);
  the copies here are corrected UTF-8 (`كرهبتي`, `لخدمات السيارات وقطع الغيار`).
  Verify the tagline wording with the operations partner. // TODO: review Arabic copy
