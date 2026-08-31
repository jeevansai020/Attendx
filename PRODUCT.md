# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Faculty** at colleges and universities (the RGUKT human-figure logo ships in `assets/`, indicating a real institutional deployment) who record daily class attendance.
- **Administrators** who view cross-department data (demo account `admin`).

## Product Purpose

Capture daily faculty attendance as fast as possible: load a class roster, mark students present/absent (keyboard-first), save the session, and produce class/student reports. Success is a class's attendance recorded in under a minute, without friction, even offline.

## Positioning

Keyboard-first, offline-first attendance: no backend required (browser `localStorage`), fully functional offline, installable as a PWA. An optional Supabase backend path also exists in code (`js/db-supabase.js`) with a real-time connection indicator.

## Operating Context

- Used daily, on campus, on a laptop in a classroom or office — for every class of the day, in variable ambient light (lecture halls, offices, corridors).
- Core workflow: login → dashboard (today's schedule, stats) → Take Attendance (Year/Section/Subject → Load Students → mark with `P`/`A` keys → Save → summary) → Reports / Calendar / Timetable / Students as needed.
- Reports are exported to CSV or saved as PDF via the browser print dialog; some flows share an absentee summary via WhatsApp (text preview).

## Capabilities and Constraints

- Modules: Dashboard, Take Attendance, Extra Classes, Students, Timetable, Calendar, Reports, Syllabus Coverage, Notifications, Corrections, Analytics, Settings.
- Vanilla HTML/CSS/JS (IIFE modules), no framework, no build step. PWA with service worker (`sw.js`) and an offline page (`offline.html`).
- Data in `localStorage` (keys `ax_*`); optional Supabase integration.
- Theme preference persisted under `ax_theme` (`light` | `dark`, default `light`); the JS sets `data-theme` on `<html>`. **Defect found and fixed in this redesign:** the CSS never read `data-theme` — it only styled an unused `body.light-mode` class — so the app was permanently stuck in the dark theme and the toggle was dead. The new design system keys both themes off `html[data-theme]`.
- **This redesign is visual-only.** All functionality, DOM structure, IDs, classes, keyboard behavior, data flow, and copy remain as before.

## Brand Commitments

- Name: **AttendX**. Mark: the house/attic glyph used in the sidebar and login brand.
- The RGUKT human-figure logo (`assets/rgukt-logo.svg`, dark red `#8b0000`) ships as a very-low-opacity background watermark on the app and login — kept in both themes.
- Green was the incumbent brand hue. The user commissioned a replacement visual world: an **elegant light theme in a sage-linen & terracotta palette** (light is the default; the dark theme is rebuilt to the same standard as a supported second theme), with no functional change.

## Evidence on Hand

- `README.md`: feature list, demo accounts, data keys, keyboard shortcuts, module descriptions.
- Demo accounts: `dr.kumar/faculty123` (CSE), `prof.meena/faculty456` (ECE), `admin/admin123` (Admin).
- Assets: `assets/icon-192.png`, `assets/icon-512.png` (app icons), `assets/rgukt-logo.svg`, `favicon.svg`.
- No photographic assets, testimonials, pricing, or external claims exist — future work must not invent them.

## Product Principles

1. **The marking workflow is the product.** Roster speed and scanability beat decoration; every pixel of the attendance screen serves the mark-and-save loop.
2. **Honest, glanceable states.** Present/absent/pending and data availability (offline, DB unreachable) must be legible at a glance from three metres away.
3. **Quiet, durable surfaces.** An all-day academic tool must stay legible and low-glare in any ambient light; color is semantic, not decorative.
4. **Zero-friction persistence.** Preferences and data survive sessions; the app works offline without apology.
