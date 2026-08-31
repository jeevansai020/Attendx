# Design — AttendX "Sage Linen"

Recorded from the built implementation (ground truth), 2026-08-26.
Product truth: see `PRODUCT.md`. This document owns durable visual decisions only.

## The world

A quiet academic study in paper and ink. The app lives on **warm linen** (`#f3f1e9`),
works on **deep sage** (`#3d6353`), and is punctuated by **terracotta** (`#b3542e`)
as the single counter-accent. Hairline borders instead of glass, soft warm shadows
instead of glows, solid paper cards instead of translucency. Light is the default
theme; the dark theme ("Deep Moss") is the same world under lamplight, not a
separate design.

The old "Deep Indigo × Emerald × Glassmorphism" world is retired. It existed only
as anti-reference: heavy glass panels, emerald glow halos, gradient text, and a
broken theme switch (CSS keyed off an unused `body.light-mode` class while JS set
`html[data-theme]` — the app was permanently stuck dark).

## Theme mechanics

- **Single source of truth:** `styles/main.css` defines all tokens twice —
  `:root` (light, the document default) and `html[data-theme="dark"]` (Deep Moss).
  Nothing theme-specific lives in `dashboard.css` / `login.css`; they consume tokens only.
- **Switching:** JS (`js/db-supabase.js`, `js/utils.js`) sets `data-theme` on `<html>`
  and persists `light`|`dark` under `localStorage.ax_theme` (default `light`).
  A bootstrap `<script>` in each page's `<head>` applies the saved value before
  first paint (no theme flash).
- `color-scheme` is set per theme so native controls (date inputs, scrollbars) follow.
- `offline.html` is self-contained but carries a private copy of the same tokens.
- The PWA service worker cache was bumped to `v1.2` so installed clients fetch the new assets.

## Palette

### Light (default)

| Role | Token | Value |
|---|---|---|
| Canvas | `--bg` | `#f3f1e9` (linen) |
| Card paper | `--card-bg` | `#fdfcf9` |
| Fills | `--surface` / `-2` / `-3` | `#f0eee4` / `#e9e6da` / `#e0dccc` |
| Ink | `--text-primary` / `-secondary` / `-muted` | `#262b26` / `#565d55` / `#666d62` |
| Primary | `--primary` / `-dark` / `-soft` | `#3d6353` / `#315143` / `#33513f` |
| Accent | `--terracotta` | `#b3542e` |
| Success | `--success` | `#417049` |
| Warning | `--warning` | `#86590e` |
| Danger | `--danger` (surfaces) / `--danger-text` (text on tint) | `#b0452f` / `#b0452f` |
| Info | `--info` | `#46688c` |
| Violet / Cyan | `--violet` / `--cyan` | `#6d5a8f` / `#3d7a80` |
| Feature surfaces | `--feature-bg` | `linear-gradient(135deg,#31513f,#3d6353)` |

All text pairs meet WCAG AA (body ≥ 4.5:1, incl. on their tinted chips;
verified programmatically). Button label pairs (e.g. `--on-primary` on `--primary`)
≥ 4.8:1.

### Dark ("Deep Moss")

Same architecture, inverted values: moss-ink canvas `#141814`, card `#1c211c`,
warm off-white ink `#edf0e9`, brighter sage primary `#79a68c` (dark text on it via
`--text-inverse`), brightened semantic colors, and one split: `--danger`
(`#b95038`, solid surfaces with white text) vs `--danger-text` (`#e2836a`,
labels on tint) — the light theme aliases both to one value.

## Typography

- **Outfit** (Google Fonts) is the display voice: page titles, brand, stat
  numbers, greeting, ring percent, summary numbers.
- **Inter** (Google Fonts) is the workhorse body face for data-dense screens —
  it is the product's documented incumbent body face and stays.
- `font-variant-numeric: tabular-nums` on all numeric data (stats, roll numbers,
  times, percentages, calendar days).
- Scale is a dense utility scale (10 → 26 px+) — deliberate for an Operate-mode
  dashboard; hierarchy comes from weight (500→800), tracking, and ink color,
  not just size. (Detector note: flagged as flat hierarchy in one window;
  accepted — it is the incumbent, functional IA.)

## Surfaces & depth

- Cards: solid `--card-bg` + 1px `--card-border` + `--shadow-sm`; hover lifts the shadow to `--shadow`. No `backdrop-filter` on content (the old glass look is gone); blur is reserved for fixed scrims (modal, search) where it occludes.
- Chrome (sidebar, navbar, bottom nav): solid `--nav-bg` with a hairline separator.
- Elevation is declared once per surface — never a border *and* a wide halo.
- Radii: controls 12, cards 16–20, modals 20, login card 24.
- The RGUKT figure watermark (`assets/rgukt-logo.svg`) stays at 3% opacity on
  app + login canvases in both themes.

## Semantic color use

- **Present = success green, Absent = danger brick, Pending = warning amber** — everywhere, including the marking buttons, badges, rings, calendar dots, and toasts. Terracotta marks the *accent* moments (schedule dots, calendar data dots), not a data state.
- Stat chips use a 6-hue chip set (`--chip-blue/green/red/purple/orange/cyan`) with per-theme values.
- Toasts are solid tinted cards with a hairline of their semantic color.
- Deep-sage `--feature-bg` gradient is reserved for the greeting banner, summary
  header, chatbot header, avatars, and the brand mark — the only gradient in the system.

## Browser surfaces

Themed from the palette: `::selection`, `:focus-visible` ring (2px `--primary`),
scrollbars (thin, `--thumb`/`--thumb-hover`, `scrollbar-color` for Firefox),
`color-scheme` per theme, `code` chips for roll numbers.

## Motion

Kept deliberately small: 0.2s ease transitions on controls, hover lifts (1–2px),
the dashboard ring drawing its arc on load (1.2s), toast slide-in, the offline
icon float. The old infinite login gradient-shift and hue-rotate background
animation were removed as decorative noise.

## Detector findings & dispositions (impeccable `detect.mjs`, one run)

- **overused-font ×5 (Inter)** — accepted: Inter is the documented incumbent
  body face (README) and the brief forbade functional drift; Outfit carries
  the display voice.
- **layout-transition ×4** — accepted: thin progress-bar `width` transitions
  (functional fill feedback) and the incumbent `.sbtn-name` max-width reveal.
- **flat-type-hierarchy ×1** — accepted: dense intentional scale for a
  data-dense Operate surface (see Typography).

## Surface: /home.html (public home page)

A Persuade-mode landing surface in the same world, structured as a **Bento
Ledger** (user-locked via the impeccable surface roll, seed key `attendx-home`,
reroll 1): a hero with the RGUKT figure as a large soft-masked background
motif, then a bento grid of **live mini-UIs** built from the app's real tokens
(roster, coverage ring, calendar, timetable, report, offline strip), a
four-step keyboard workflow, a modules ledger (hairline rows, no cards), a
"75% line" deep-sage panel, and a CTA band. No fabricated claims; every module
and behavior shown is real.

- `assets/rgukt-figure.svg` — the institutional figure re-drawn with tapered
  bezier strokes (replaces the crude straight-line `rgukt-logo.svg`, which the
  app watermarks still use). Used on the home hero, the "75% line" panel, and
  the footer.
- `assets/og-image.png` — 1200×630 share image (generated, textless, on-palette).
- `assets/linen-texture.png` — subtle paper texture, low-opacity overlay on the hero.
- `styles/home.css` — home-only styles on top of the shared tokens; home-only
  tokens (`--home-fig-opacity`, `--home-texture-opacity`) flip per theme.
  Dark enhancements: hero radial sage/terracotta glow, brighter figure,
  elevated panel treatment.
- Theme toggle in the header uses the identical mechanism as the app
  (`data-theme` + `ax_theme`); icon convention matches the app (sun in dark).
- `index.html` links to the home page from inside the login card; `sw.js`
  precaches the home assets (cache `v1.3`).

## Files

- `home.html` — public home page (Bento Ledger), themed, pre-paint bootstrap.
- `styles/main.css` — tokens (both themes) + base system (buttons, forms, cards, badges, modals, toasts, tables, browser surfaces, print).
- `styles/dashboard.css` — shell + all module styles, tokens only.
- `styles/login.css` — login page, tokens only (light-first card on linen).
- `styles/home.css` — home page styles, tokens only.
- `offline.html` — self-contained tokens mirroring the world.
- `index.html` / `dashboard.html` / `home.html` — pre-paint theme bootstrap, `theme-color` `#3d6353`, tile colors `#f3f1e9`.
- `sw.js` — cache `v1.3`. `manifest.json` — `theme_color #3d6353`, `background_color #f3f1e9`.
