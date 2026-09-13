# Website asset register

Every image shipped with the website is listed here with its source file and
its role. The originals stay outside this repository, in the project material
folder. The files committed here are optimised derivatives.

All artwork was created for the Anatomy of Mercy project by its author and is
not covered by an open source license. See [NOTICE.md](NOTICE.md).

## Brand

| Website asset | Source filename | Size | Purpose |
|---|---|---|---|
| `assets/images/brand/mark-176.png` | `AoM-web-znak.png` | 176 x 176 | Emblem in the header and the footer |
| `favicon.png` | `AoM-web-znak.png` | 180 x 180 | Browser icon |
| `assets/images/brand/doctor.webp` | `avatar-transparent.png` | 900 x 900 | Portrait in the contact section |

## Hero

| Website asset | Source filename | Size | Purpose |
|---|---|---|---|
| `assets/images/hero/vespera-doctor.webp` | `AoM-hero.png` | 1672 x 941 | Full width hero artwork |
| `assets/images/hero/vespera-doctor-1100.webp` | `AoM-hero.png` | 1100 x 619 | Narrow viewport variant |

## Story covers

| Website asset | Source filename | Size | Purpose |
|---|---|---|---|
| `assets/images/stories/light-beneath-the-ash.webp` | `AoM-opowiadanie-swiatlo-pod-popiplem-front-page.png` | 620 x 876 | Cover, part one |
| `assets/images/stories/the-volunteer.webp` | `AoM-opowiadanie-dobrowolny-front-page.png` | 620 x 876 | Cover, part two |
| `assets/images/stories/the-list-of-the-saved.webp` | `AoM-opowiadanie-lista-ocalonych-front-page.png` | 620 x 876 | Cover, part three |
| `assets/images/stories/i-will-fix-the-rest-later.webp` | `AoM-opowiadanie-reszte-naprawie-pozniej-front-page.png` | 620 x 868 | Cover, part four |

## Mood vignettes and world

Generated for the website from the world brief on 2026-09-11. They replaced
crops taken from an earlier mockup, which were reused elsewhere on the page
and too small for dense displays.

| Website asset | Source filename | Size | Purpose |
|---|---|---|---|
| `assets/images/mood/scene-1.webp` | `AoM-web-winieta-1.png` | 800 x 1000 | Vignette, difficult choices. Veyr, an inquisitor. |
| `assets/images/mood/scene-2.webp` | `AoM-web-winieta-2.png` | 800 x 1000 | Vignette, people not cases |
| `assets/images/mood/scene-3.webp` | `AoM-web-winieta-3.png` | 800 x 1000 | Vignette, faith and medicine |
| `assets/images/mood/scene-4.webp` | `AoM-web-winieta-4.png` | 800 x 1000 | Vignette, a city in quarantine |
| `assets/images/world/vespera.webp` | `AoM-web-vespera.png` | 1800 x 1013 | Background of the world section, and the masthead of the world page |

## World page illustrations

Generated from the world brief on 2026-09-13, one per section of the world
page. None of them has a figure in the foreground, so that they do not repeat
the hero, the panorama or any of the four vignettes. The first version of the
page borrowed the vignettes; the same artwork in two places on one site reads
as a shortage of material.

| Website asset | Source filename | Size | Purpose |
|---|---|---|---|
| `assets/images/world/city.webp` | `AoM-web-swiat-miasto.png` | 800 x 1000 | A sealed door in a lane at night. Section on Vespera. |
| `assets/images/world/plague.webp` | `AoM-web-swiat-pomor.png` | 800 x 1000 | A silver test plate, a sealed vial and dust. Section on the Crimson Plague. |
| `assets/images/world/church.webp` | `AoM-web-swiat-kosciol.png` | 800 x 1000 | The desk of a church investigator. Section on the Church of Light. |

The first prompt for the plague illustration described a cut section of human
bone and was refused by the generator under its rules on violence. The disease
is now shown through what it leaves behind rather than through remains, which
is also what the brief asks for in its section on the violence threshold.

## Social

| Website asset | Source filename | Size | Purpose |
|---|---|---|---|
| `assets/images/social/og-1200x630.jpg` | `AoM-web-og.png` + `AoM-title.png` | 1200 x 630 | Link preview. Artwork cropped to 1.9:1 with the wordmark composited onto it. |

The link preview is a composite, not a plain resize, so the recipe lives with
the source material in `Images\Narzędzia\zloz-og.py`. It crops the 16:9 artwork,
lifts the wordmark brightness and lays a soft halo under the letters. The
wordmark's own ink measures 123 of 255, which on this artwork gave a contrast of
4.13 to 1 and effectively disappeared; the composite measures 7.04 to 1.

## Missing assets

Nothing outstanding.

A separate 4:5 hero for narrow viewports was considered and dropped. The
landscape artwork was reviewed on a phone and the crop holds, so the extra
asset would add weight and a second thing to keep in sync for no visible gain.

## Rules

Do not copy artwork into this repository before it is listed in this table.
Every entry must name a real source file. Optimised derivatives belong here,
originals do not.
