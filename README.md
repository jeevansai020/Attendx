# AttendX – Faculty Attendance Management System

> A modern, keyboard-first faculty attendance management web application built for colleges and universities.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Accounts](#demo-accounts)
- [Application Modules](#application-modules)
- [Data Architecture](#data-architecture)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Storage & Data Persistence](#storage--data-persistence)
- [Theming](#theming)
- [Exporting Data](#exporting-data)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

---

## Overview

**AttendX** is a fully client-side, offline-first faculty attendance management system. It is designed for speed and ease of use on laptops, featuring a keyboard-driven attendance workflow, real-time dashboard stats, a smart calendar view, comprehensive reporting, and timetable management — all without requiring any backend server or database.

All data is stored locally in the browser using `localStorage`, making it completely standalone and privacy-friendly.

---

## Features

- 🔐 **Faculty Authentication** — Secure login with session management via localStorage
- ⌨️ **Keyboard-First Attendance** — Mark students present/absent using `P`/`A` keys; navigate with `↑`/`↓` arrows
- 📊 **Live Dashboard** — Real-time stats: today's classes, attendance taken, absentee count, and total recorded days
- 📅 **Smart Calendar View** — Visual monthly calendar with dot indicators on days attendance was recorded; click any date to see session details
- 📝 **Attendance Module** — Filter by year, section, and subject; load students in one click; auto-save with summary panel
- 👥 **Student Management** — View student rosters, add new students, remove students with attendance summaries per student
- 🗓️ **Timetable Management** — Weekly timetable grid (Mon–Fri, 9 AM–5 PM) with editable cells; supports click-to-edit and save
- 📈 **Reports & Analytics** — Class-wise and student-wise report generation with date range and subject filters
- 📤 **CSV Export** — One-click export of attendance reports to downloadable `.csv` files
- 🖨️ **PDF Export** — Use browser print dialog to save any report as a PDF
- 🌗 **Dark/Light Theme** — Elegant "Sage Linen" light theme (default) and "Deep Moss" dark theme; toggle in the navbar and on the home page, preference persisted across sessions
- 🏛️ **Home Page** — `home.html`: a themed public overview page (live module vignettes, workflow, modules) with its own theme toggle; the login page links to it
- 🔔 **Toast Notifications** — Non-intrusive toast alerts for all user actions (success, error, warning, info)
- 📱 **Responsive Sidebar** — Collapsible navigation sidebar with department info and logout

---

## Tech Stack

| Layer        | Technology          |
|--------------|---------------------|
| Markup       | HTML5               |
| Styling      | Vanilla CSS (custom design system) |
| Logic        | Vanilla JavaScript (ES6+, IIFE module pattern) |
| Typography   | Outfit (display) + Inter (body), Google Fonts |
| Data Storage | Browser `localStorage` |
| Dev Server   | `serve` (Node.js package) |

> No frameworks. No databases. No backend. Fully self-contained.

---

## Project Structure

```
Attendancesystem/
├── home.html           # Public home page (marketing/overview, themed)
├── index.html          # Login page (app entry point)
├── dashboard.html      # Main application shell (all modules rendered here)
├── js/
│   ├── data.js         # Data layer: auth, students, attendance, timetable, reports, theme, toast
│   └── app.js          # App core: navigation router, UI logic for all modules
├── styles/
│   ├── main.css        # Global design system: variables, resets, base components
│   ├── login.css       # Login page specific styles
│   └── dashboard.css   # Dashboard layout and all module styles
├── assets/             # Static assets directory (images, icons)
├── package.json        # npm config; defines the `start` script
└── package-lock.json   # Lockfile for reproducible installs
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (bundled with Node.js)

### Installation

```bash
# 1. Navigate to the project directory
cd /path/to/Attendancesystem

# 2. Install dependencies
npm install

# 3. Start the local development server
npm start
```

The app will be served at **http://localhost:5500**.

Open `http://localhost:5500` in your browser and you'll land on the login page.

> The app can also be opened directly by double-clicking `index.html`, but a local server is recommended for correct routing between pages.

---

## Demo Accounts

Three pre-seeded accounts are available on the login page. Click any card to auto-fill credentials, or type them manually:

| Avatar | Username      | Password     | Department | Role    |
|--------|---------------|-------------|------------|---------|
| DK     | `dr.kumar`    | `faculty123` | CSE        | Faculty |
| PM     | `prof.meena`  | `faculty456` | ECE        | Faculty |
| AD     | `admin`       | `admin123`   | All        | Admin   |

---

## Application Modules

### 1. 🏠 Dashboard
The landing page after login. Displays:
- **4 stat cards**: Today's classes, attendance sessions taken, total absences today, total days recorded
- **Today's Schedule**: Auto-rendered from the faculty's timetable for the current weekday, with a "Start" button that navigates directly to the attendance module pre-filled with that class

### 2. ✅ Take Attendance
Step-by-step attendance workflow:
1. Select **Year** → **Section** → **Subject** and click **Load Students**
2. A student roster loads with status badges (Present / Absent / Pending)
3. Mark attendance via clicking buttons or keyboard shortcuts
4. A real-time **count bar** shows Present / Absent / Pending counts
5. Click **Save Attendance** to persist the session; a **Summary Panel** appears with an absentee list
6. Attendance for the same class/date is auto-loaded if it already exists

### 3. 📅 Calendar
Monthly calendar view:
- Blue dot on any date where attendance data exists
- "Today" highlighted distinctly
- Prev/Next buttons for month navigation
- Clicking on a date reveals a breakdown table of all sessions recorded that day

### 4. 📊 Reports
Filterable attendance reporting:
- Filter by **Year**, **Section**, **Subject**, **Date Range**, and **Report Type**
- **Class-wise**: Lists each session with total/present/absent counts and % rate
- **Student-wise**: Aggregates each student's attendance per subject
- Percentage is color-coded: ≥75% green, ≥50% yellow, <50% red

### 5. 👥 Students
Student roster management:
- Select year and section to view the student list
- Live **search** across roll number and name
- Add new students via modal (auto-suggests roll number)
- Remove students with a confirm-dialog guard
- Each row shows total classes, present count, absent count, and attendance % from historical data

### 6. 🗓️ Timetable
Weekly timetable management:
- Grid layout: rows = time slots (09:00–17:00), columns = weekdays (Mon–Fri)
- 12:00–13:00 is locked as **Lunch Break**
- Click any cell to open a modal and assign Year, Section, and Subject
- Click **Clear** to remove an entry from a cell
- Click **Save Timetable** to persist all changes

### 7. ⚙️ Settings
Displays the currently logged-in faculty member's profile:
- Name, Department, and Faculty ID
- Theme toggle available in the top navbar

---

## Data Architecture

All data is managed by the `AttendX` module defined in `js/data.js`. It uses the **IIFE (Immediately Invoked Function Expression)** pattern to encapsulate storage logic and expose a clean public API.

### localStorage Keys

| Key             | Description                                      |
|-----------------|--------------------------------------------------|
| `ax_faculty`    | Array of faculty accounts with credentials       |
| `ax_students`   | Object map of `year__section` → student arrays   |
| `ax_timetable`  | Object map of `facultyId` → weekly schedule      |
| `ax_attendance` | Object map of composite keys → attendance records|
| `ax_session`    | Currently logged-in user's session object        |
| `ax_theme`      | Current theme preference (`light` or `dark`)     |

### Attendance Record Key Format

```
YYYY-MM-DD__Year__Section__Subject
```

Example: `2026-04-04__3rd Year__A__Computer Networks`

### Auto-Generated Data on First Load

On first launch, `AttendX.init()` automatically:
- Seeds faculty accounts (if not already present)
- Generates **30–45 randomised students** for every year (1st–4th) × section (A, B, C) combination
- Generates a **random weekly timetable** for each faculty member

This gives the app a realistic dataset out of the box without any manual setup.

---

## Keyboard Shortcuts

These shortcuts work when the **Take Attendance** module is active and no input field is focused:

| Key         | Action                               |
|-------------|--------------------------------------|
| `P`         | Mark current student as **Present**  |
| `A`         | Mark current student as **Absent**   |
| `↓`         | Move focus to the **next** student   |
| `↑`         | Move focus to the **previous** student|

---

## Storage & Data Persistence

- **All data is stored in the browser's `localStorage`** — it persists across page refreshes and browser restarts on the same browser + device.
- Data is **not synced** across devices or browsers.
- Clearing browser data / localStorage will reset the application to its initial seeded state.

---

## Theming

AttendX is built on a **token-based design system** ("Sage Linen" — see `DESIGN.md`). All color, elevation, and surface values live as CSS custom properties defined twice in `main.css`: `:root` (the light theme, the default) and `html[data-theme="dark"]` ("Deep Moss").

- **Light is the default** theme; toggle to dark with the **moon/sun icon** in the top navbar (also in Settings)
- Preference is saved to `localStorage` (`ax_theme`) and applied before first paint on every page load — no flash of the wrong theme
- `color-scheme` follows the theme, so native inputs and scrollbars adapt automatically

---

## Exporting Data

### CSV Export
- Navigate to **Reports**, apply filters, and click **Export CSV**
- Downloads a `.csv` file named `attendance_<year>_<section>_<classwise|studentwise>.csv`
- Opens instantly in Excel, Google Sheets, or any spreadsheet tool

### PDF Export
- In **Reports**, click **Export PDF**
- Triggers the browser's native print dialog
- Choose **"Save as PDF"** as the printer destination

---

## Known Limitations

- 🔒 **No real authentication** — Passwords are stored in plain text in localStorage. This is intentional for a demo/local system. Not suitable for production use without a backend.
- 💾 **localStorage capacity** — Browsers typically limit localStorage to ~5 MB. Very large datasets (many sessions over many months) may approach this limit.
- 🌐 **No multi-device sync** — Data exists only in the browser it was entered in.
- 🖨️ **PDF layout** — PDF export uses the browser print stylesheet and may require minor margin adjustments depending on the browser.

---

## Future Improvements

- [ ] Backend integration (Node.js / Firebase / Supabase) for persistent multi-device storage
- [ ] Role-based access control (Admin vs Faculty views)
- [ ] Bulk student import via CSV upload
- [ ] Push notifications or email alerts for low-attendance students
- [ ] Chart visualisations for attendance trends (line/bar charts)
- [ ] PWA support for offline installation on any device
- [ ] Multi-language / locale support

---

## License

This project is for educational and personal use. No license is currently specified.

---

*Built with ❤️ using  HTML, CSS & JavaScript — no frameworks, no fuss.*
