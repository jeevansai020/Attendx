/**
 * AttendX – App Core v2.0 (Supabase + Real-time + Extra Classes)
 *
 * @file app.js
 * Globals provided by previously loaded scripts:
 *   - AttendX  (js/db-supabase.js)
 *   - Utils    (js/utils.js)
 *   - Nav      (defined in this file)
 *
 * @typedef {import('./globals.d.ts')} Globals
 */
/* global AttendX, Utils */

// ==================== BOOT ====================
if (document.getElementById('dashboardApp')) {
  if (!AttendX.auth.isLoggedIn()) window.location.href = 'index.html';
}
if (document.querySelector('.login-body')) Utils.theme.apply();

// ==================== NAVIGATION ====================
const Nav = (function () {
  let current = 'dashboard';

  const pages = {
    dashboard:       { label: 'Dashboard',          show: showDashboard },
    attendance:      { label: 'Take Attendance',     show: showAttendance },
    'extra-classes': { label: 'Extra Classes',       show: showExtraClasses },
    students:        { label: 'Students',            show: showStudents },
    timetable:       { label: 'Timetable',           show: showTimetable },
    calendar:        { label: 'Calendar',            show: showCalendar },
    reports:         { label: 'Reports',             show: showReports },
    settings:        { label: 'Settings',            show: showSettings },
    coverage:        { label: 'Syllabus Coverage',   show: () => showCoverage() },
    notifications:   { label: 'Notifications',       show: () => showNotifications() },
    corrections:     { label: 'Corrections',         show: () => showCorrections() },
    analytics:       { label: 'Analytics',           show: () => showAnalytics() },
  };

  const go = async (page, params) => {
    // Unregister previous page's realtime callback
    AttendX.realtime.offRefresh('page');

    current = page;
    Nav._params = params || {};
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    const bc = document.getElementById('breadcrumb');
    if (bc) bc.textContent = pages[page]?.label || page;
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    const sec = document.getElementById(`page-${page}`);
    if (sec) sec.classList.remove('hidden');
    await pages[page]?.show(params);
    window.scrollTo(0, 0);
  };

  return { go, getCurrent: () => current, _params: {} };
})();

// ==================== SIDEBAR ====================
function initSidebar() {
  const toggle  = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
  document.querySelectorAll('.nav-item[data-page]').forEach(el => el.addEventListener('click', () => Nav.go(el.dataset.page)));
  document.getElementById('logoutBtn')?.addEventListener('click', () => { AttendX.auth.logout(); window.location.href = 'index.html'; });
}

// ==================== NAVBAR ====================
function initNavbar() {
  const session = AttendX.auth.getSession();
  if (!session) return;
  // Support both old and new HTML IDs
  ['navbarName','navName'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = session.name; });
  ['navbarRole','navRole'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = session.dept; });
  ['navbarAvatar','navAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = session.initials || session.name.slice(0,2).toUpperCase(); });
  const sn = document.getElementById('sidebarName'); if (sn) sn.textContent = session.name;
  ['sidebarDept','sidebarRole'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = session.dept; });
  ['sidebarAvatar'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = session.initials || session.name.slice(0,2).toUpperCase(); });
  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  // themeBtn has inline onclick="toggleTheme()" — no extra listener needed
  updateThemeIcon(AttendX.theme.get());
  // Greeting – supports both old <h2> and new Tiimo flat div
  const greet = document.getElementById('greetingText');
  const greetSub = document.getElementById('greetingSub');
  if (greet) {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
    greet.textContent = `${g}, ${session.name.split(' ')[0]} 👋`;
  }
  if (greetSub) {
    const d = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' });
    greetSub.textContent = `${d} – Here's your academic overview`;
  }
}


function updateThemeIcon(theme) {
  // Support both ID variants in different HTML templates
  const btn = document.getElementById('themeBtn') || document.getElementById('themeToggle');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

// ==================== DASHBOARD ====================
async function showDashboard() {
  const session = AttendX.auth.getSession();
  if (!session) return;
  const today = AttendX.utils.today();

  const [{ schedule }, todayAtt, allDates, todayExtra] = await Promise.all([
    AttendX.timetable.getToday(session.userId),
    AttendX.attendance.getByDate(today),
    AttendX.attendance.getDates(),
    AttendX.extraClasses.getToday(session.userId),
  ]);

  const regularSlots = Object.values(schedule).filter(s => s && !s.type).length;
  const totalToday   = regularSlots + todayExtra.length;
  const taken        = todayAtt.length;
  let absFCount      = 0;
  todayAtt.forEach(r => { absFCount += (r.records || []).filter(x => x.status === 'A').length; });

  // Support both old and new stat IDs
  const setEl = (ids, val) => ids.forEach(id => { const e = document.getElementById(id); if (e) e.textContent = val; });
  setEl(['statTodayClasses','statTotal'], totalToday);
  setEl(['statClassesTaken','statDone'], taken);
  setEl(['statAbsentsToday','statAbsent'], absFCount);
  setEl(['statTotalDays','statDays'], allDates.length);
  setEl(['statExtraClasses'], todayExtra.length);
  setEl(['statPending'], totalToday - taken);

  // Upcoming extra classes
  const upcoming = await AttendX.extraClasses.getUpcoming(session.userId);
  const upEl = document.getElementById('upcomingSection');
  if (upEl) {
    upEl.innerHTML = upcoming.length
      ? upcoming.slice(0,3).map(ec => `<div style="padding:6px 0;border-bottom:1px solid var(--border)"><strong>${ec.subjectName}</strong><br><small style="color:var(--text-muted)">${AttendX.utils.formatDate(ec.date)} · ${ec.className}</small></div>`).join('')
      : `<div style="color:var(--text-muted);font-size:13px">No upcoming extra classes</div>`;
  }

  renderTodaySchedule(schedule, todayExtra);

  // ── TIIMO: animate circular ring ──────────────────────────────────────
  initTiimoDayStrip();
  animateTiimoRing(taken, totalToday - taken);
  // ── end Tiimo ──────────────────────────────────────────────────────────

  AttendX.realtime.onRefresh('page', async (ev) => {
    if (['attendance', 'timetable', 'extra_classes'].includes(ev.type)) await showDashboard();
  });
}

/* ── Tiimo Day Strip – highlight today ───────────────────────────────── */
function initTiimoDayStrip() {
  const dayIds = ['dayMon','dayTue','dayWed','dayThu','dayFri','daySat','daySun'];
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
  dayIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', i === todayIdx);
  });
}

/* ── Tiimo Ring – animate SVG stroke-dashoffset ──────────────────────── */
function animateTiimoRing(done, pending) {
  const total = done + pending;
  const CIRC  = 502.65; // 2π×80
  const donePct    = total ? done    / total : 0;
  const pendingPct = total ? pending / total : 0;

  const pctEl = document.getElementById('ringPct');
  if (pctEl) pctEl.textContent = total ? Math.round(donePct * 100) + '%' : '–%';

  // green arc = done classes
  const doneArc = document.getElementById('ringDoneArc');
  if (doneArc) {
    doneArc.style.strokeDashoffset = CIRC * (1 - donePct);
  }

  // purple arc = pending (starts where green ends)
  const pendArc = document.getElementById('ringPendingArc');
  if (pendArc) {
    // We rotate the pending arc by the done angle so it begins after green
    const doneAngle = donePct * 360;
    pendArc.style.transform = `rotate(${doneAngle}deg)`;
    pendArc.style.transformOrigin = '100px 100px'; // SVG center
    pendArc.style.strokeDashoffset = CIRC * (1 - pendingPct);
  }
}


function renderTodaySchedule(schedule, extras = []) {
  const container = document.getElementById('todayScheduleList') || document.getElementById('todaySchedule');
  if (!container) return;
  const hours = AttendX.utils.HOURS;
  const items  = schedule ? hours.filter(h => schedule[h] && !schedule[h].type) : [];
  const allItems = [
    ...items.map(h => ({ type: 'regular', h, cls: schedule[h] })),
    ...extras.map(ec => ({ type: 'extra', ec })),
  ];
  if (!allItems.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px">No classes scheduled for today</div>`;
    return;
  }
  container.innerHTML = allItems.map(item => {
    if (item.type === 'regular') {
      const { h, cls } = item;
      const endH = String(parseInt(h) + 1).padStart(2, '0') + ':00';
      return `<div class="schedule-item">
        <div class="schedule-time"><span class="time-from">${h}</span><span class="time-to">${endH}</span></div>
        <div class="schedule-info"><div class="subject">${cls.subject}</div><div class="class-meta">${cls.year} – Section ${cls.section}</div></div>
        <div class="schedule-actions"><button class="btn-primary btn-sm" onclick="Nav.go('attendance',{year:'${cls.year}',section:'${cls.section}',subject:'${cls.subject}'})">Start</button></div>
      </div>`;
    } else {
      const { ec } = item;
      return `<div class="schedule-item extra-item">
        <div class="schedule-time"><span class="time-from">${ec.start_time}</span><span class="time-to">${ec.end_time}</span></div>
        <div class="schedule-info">
          <div class="subject">${ec.subjectName} <span class="badge-extra">⚡ Extra</span></div>
          <div class="class-meta">${ec.className}${ec.reason ? ' · ' + ec.reason : ''}</div>
        </div>
        <div class="schedule-actions">
          <button class="btn-warning btn-sm" onclick="Nav.go('attendance',{year:'${ec.cls?.year}',section:'${ec.cls?.section}',subject:'${ec.subjectName}',extraClassId:'${ec.id}'})">Start</button>
        </div>
      </div>`;
    }
  }).join('');
}

// ==================== ATTENDANCE ====================
let _classStudents = [], _currentIdx = 0, _records = {}, _attContext = {};

async function showAttendance(params) {
  // Support both old (attYear+attSection) and new (attClass) HTML structures
  const hasSplit = !!document.getElementById('attYear');
  const hasClass = !!document.getElementById('attClass');
  const subjSel  = document.getElementById('attSubject');

  if (hasSplit) {
    const yearSel = document.getElementById('attYear');
    const sectSel = document.getElementById('attSection');
    yearSel.innerHTML = `<option value="">Select Year</option>` + AttendX.utils.YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
    sectSel.innerHTML = `<option value="">Section</option>` + AttendX.utils.SECTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
    if (params?.year)    yearSel.value = params.year;
    if (params?.section) sectSel.value = params.section;
    updateSubjectDropdown();
    if (params?.subject && subjSel) subjSel.value = params.subject;
    yearSel.onchange = () => { updateSubjectDropdown(); resetAttendanceUI(); };
    sectSel.onchange = () => { updateSubjectDropdown(); resetAttendanceUI(); };
  } else if (hasClass) {
    const clsSel = document.getElementById('attClass');
    const opts = AttendX.utils.YEARS.flatMap(y => AttendX.utils.SECTIONS.map(s => `<option value="${y}__${s}">${y} – Section ${s}</option>`));
    clsSel.innerHTML = `<option value="">Select Class</option>` + opts.join('');
    if (params?.year && params?.section) clsSel.value = `${params.year}__${params.section}`;
    // Populate subjects when class changes
    const refreshSubs = () => {
      const val = clsSel.value;
      const yr  = val ? val.split('__')[0] : '';
      if (subjSel) {
        const subs = yr ? (AttendX.utils.SUBJECTS_BY_YEAR[yr] || []) : [];
        subjSel.innerHTML = `<option value="">Select Subject</option>` + subs.map(s => `<option value="${s}">${s}</option>`).join('');
        subjSel.disabled = !subs.length;
      }
      resetAttendanceUI();
    };
    clsSel.onchange = refreshSubs;
    if (params?.year && params?.section) refreshSubs();
    if (params?.subject && subjSel) subjSel.value = params.subject;
  }

  if (subjSel) subjSel.onchange = () => resetAttendanceUI();
  _attContext._extraClassId = params?.extraClassId || null;

  // Set date default
  const dateEl = document.getElementById('attDate');
  if (dateEl && !dateEl.value) dateEl.value = AttendX.utils.today();

  document.getElementById('loadStudentsBtn').onclick = loadStudents;
  if (params?.year && params?.section && params?.subject) await loadStudents();

  AttendX.realtime.onRefresh('page', async (ev) => {
    if (ev.type === 'timetable' || ev.type === 'extra_classes') {
      if (hasSplit) updateSubjectDropdown();
    }
  });
}

function updateSubjectDropdown() {
  const yr     = document.getElementById('attYear')?.value;
  const subjSel= document.getElementById('attSubject');
  if (!subjSel) return;
  const subs   = yr ? (AttendX.utils.SUBJECTS_BY_YEAR[yr] || []) : [];
  subjSel.innerHTML = `<option value="">Select Subject</option>` + subs.map(s => `<option value="${s}">${s}</option>`).join('');
  subjSel.disabled = !subs.length;
}

async function loadStudents() {
  let year    = document.getElementById('attYear')?.value;
  let section = document.getElementById('attSection')?.value;
  if (!year || !section) {
    const cls = document.getElementById('attClass')?.value || '';
    [year, section] = cls.split('__');
  }
  const subject = document.getElementById('attSubject')?.value;
  if (!year || !section || !subject) { AttendX.toast.show('Please select Class and Subject', 'warning'); return; }

  const btn = document.getElementById('loadStudentsBtn');
  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }

  const dateEl = document.getElementById('attDate');
  const useDate = dateEl?.value || AttendX.utils.today();
  _attContext = { year, section, subject, date: useDate, _extraClassId: _attContext._extraClassId || null };
  _classStudents = await AttendX.students.getList(year, section);
  _currentIdx = 0; _records = {};

  const existing = await AttendX.attendance.get(_attContext.date, year, section, subject);
  if (existing) { existing.records.forEach(r => { _records[r.rollNo] = r.status; }); AttendX.toast.show('Loaded existing attendance', 'info'); }

  if (btn) { btn.textContent = 'Load Student List'; btn.disabled = false; }

  renderAttendanceList();
  document.getElementById('attSelectorPanel')?.classList.add('hidden');
  document.getElementById('attMainPanel')?.classList.remove('hidden');
  // Bind save button (supports both saveAttBtn ID and onclick="saveAttendance()")
  const saveBtn = document.getElementById('saveAttBtn');
  if (saveBtn) saveBtn.onclick = saveAttendance;
  setupKeyboardAttendance();
  updateCountBar();
}

function renderAttendanceList() {
  const container = document.getElementById('studentListContainer');
  if (!container) return;
  const isExtra = !!_attContext._extraClassId;
  const ctxEl = document.getElementById('attContextLabel');
  if (ctxEl) ctxEl.textContent = `${_attContext.year} – Section ${_attContext.section} | ${_attContext.subject}${isExtra ? ' ⚡ Extra' : ''} | ${AttendX.utils.formatDate(_attContext.date)}`;
  const totEl = document.getElementById('attTotalCount');
  if (totEl) totEl.textContent = _classStudents.length;

  // ── Active (current) student card at top of list ──────────────────────
  const cur = _classStudents[_currentIdx];
  const curStatus = cur ? (_records[cur.rollNo] || '') : '';
  const progressPct = _classStudents.length ? Math.round((_currentIdx / _classStudents.length) * 100) : 0;
  const activeCard = cur ? `
    <div class="att-active-card" id="attActiveCard">
      <div class="att-active-meta">
        <span class="att-active-idx">${_currentIdx + 1} / ${_classStudents.length}</span>
        <div class="att-progress-bar"><div class="att-progress-fill" style="width:${progressPct}%"></div></div>
      </div>
      <div class="att-active-student">
        <div class="att-active-avatar">${cur.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="att-active-info">
          <div class="att-active-name">${cur.name}</div>
          <div class="att-active-roll">${cur.rollNo}</div>
        </div>
        ${curStatus ? `<span class="att-active-status ${curStatus === 'P' ? 'status-p' : 'status-a'}">${curStatus === 'P' ? '✓ Present' : '✗ Absent'}</span>` : ''}
      </div>
      <div class="att-active-btns">
        <button class="att-mark-btn att-mark-p ${curStatus === 'P' ? 'active' : ''}" onclick="markStudent(${_currentIdx},'P')">
          <span class="att-mark-label">P</span>
          <span class="att-mark-sub">Present</span>
        </button>
        <button class="att-mark-btn att-mark-a ${curStatus === 'A' ? 'active' : ''}" onclick="markStudent(${_currentIdx},'A')">
          <span class="att-mark-label">A</span>
          <span class="att-mark-sub">Absent</span>
        </button>
      </div>
      <div class="att-active-nav">
        <button class="btn btn-ghost btn-sm" onclick="setCurrentStudent(Math.max(${_currentIdx}-1,0))" ${_currentIdx === 0 ? 'disabled' : ''}>↑ Prev</button>
        <button class="btn btn-ghost btn-sm" onclick="setCurrentStudent(Math.min(${_currentIdx}+1,${_classStudents.length-1}))" ${_currentIdx === _classStudents.length-1 ? 'disabled' : ''}>Next ↓</button>
      </div>
    </div>` : '';

  // ── Full student list below ────────────────────────────────────────────
  const listRows = _classStudents.map((s, idx) => {
    const status = _records[s.rollNo] || '';
    let rowClass = 'student-row';
    if (idx === _currentIdx) rowClass += ' current-row';
    if (status === 'P') rowClass += ' status-present';
    if (status === 'A') rowClass += ' status-absent';
    return `<div class="${rowClass}" id="srow-${idx}" onclick="setCurrentStudent(${idx})">
      <span class="student-roll">${s.rollNo}</span>
      <span class="student-name">${s.name}</span>
      <div class="student-mark-wrap">
        ${status
          ? `<span class="badge ${status === 'P' ? 'badge-success' : 'badge-danger'}">${status === 'P' ? 'Present' : 'Absent'}</span>`
          : '<span class="badge" style="background:var(--bg-muted);color:var(--text-muted)">Pending</span>'}
        <button class="student-status-btn present-btn" onclick="event.stopPropagation();markStudent(${idx},'P')" title="Mark Present (P)">
          <span>P</span><span class="sbtn-name">${s.name}</span>
        </button>
        <button class="student-status-btn absent-btn" onclick="event.stopPropagation();markStudent(${idx},'A')" title="Mark Absent (A)">
          <span>A</span><span class="sbtn-name">${s.name}</span>
        </button>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = activeCard + `<div class="student-list-wrap">${listRows}</div>`;
  scrollToCurrentRow();
}

function setCurrentStudent(idx)      { _currentIdx = idx; renderAttendanceList(); }
function markStudent(idx, status)    { if (idx < 0 || idx >= _classStudents.length) return; _records[_classStudents[idx].rollNo] = status; _currentIdx = Math.min(idx + 1, _classStudents.length - 1); renderAttendanceList(); updateCountBar(); }
function setupKeyboardAttendance()   {
  document.onkeydown = (e) => {
    if (document.getElementById('page-attendance')?.classList.contains('hidden')) return;
    if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); markStudent(_currentIdx, 'P'); }
    if (e.key === 'a' || e.key === 'A') { e.preventDefault(); markStudent(_currentIdx, 'A'); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCurrentStudent(Math.min(_currentIdx + 1, _classStudents.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCurrentStudent(Math.max(_currentIdx - 1, 0)); }
  };
}
function scrollToCurrentRow()       { document.getElementById(`srow-${_currentIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function updateCountBar() {
  const p = Object.values(_records).filter(s => s === 'P').length;
  const a = Object.values(_records).filter(s => s === 'A').length;
  // Support both cntPresent and countPresent IDs
  ['countPresent','cntPresent'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=p; });
  ['countAbsent','cntAbsent'].forEach(id =>  { const e=document.getElementById(id); if(e) e.textContent=a; });
  ['countPending','cntPending'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=_classStudents.length-p-a; });
}
function resetAttendanceUI() {
  document.getElementById('attSelectorPanel')?.classList.remove('hidden');
  document.getElementById('attMainPanel')?.classList.add('hidden');
  document.getElementById('attSummaryPanel')?.classList.add('hidden');
  _classStudents = []; _records = {}; _currentIdx = 0;
  document.onkeydown = null;
}

async function saveAttendance() {
  const pending = _classStudents.filter(s => !_records[s.rollNo]);
  if (pending.length) {
    if (!confirm(`${pending.length} student(s) not marked. Mark all remaining as Present?`)) return;
    pending.forEach(s => { _records[s.rollNo] = 'P'; });
  }
  const records = _classStudents.map(s => ({ rollNo: s.rollNo, name: s.name, status: _records[s.rollNo] || 'P' }));
  // Fix: use ID-based selector instead of attribute selector (button is bound via .onclick)
  const btn = document.getElementById('saveAttBtn');
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
  const result = await AttendX.attendance.save(_attContext.date, _attContext.year, _attContext.section, _attContext.subject, records, _attContext._extraClassId || null);
  if (btn) { btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 💾 Save`; btn.disabled = false; }
  if (!result) { AttendX.toast.show('Save failed – check console', 'error'); return; }
  AttendX.toast.show('Attendance saved!', 'success');
  showSummary(records);
}

function showSummary(records) {
  const absent  = records.filter(r => r.status === 'A');
  const present = records.filter(r => r.status === 'P');
  document.getElementById('attMainPanel')?.classList.add('hidden');
  document.getElementById('attSummaryPanel')?.classList.remove('hidden');
  // Support both old and new summary IDs
  const setS = (ids, val) => ids.forEach(id => { const e=document.getElementById(id); if(e) e.textContent=val; });
  setS(['summarySubject','sumSubject'], _attContext.subject);
  setS(['summaryClass','sumClassLabel'], `${_attContext.year} – Section ${_attContext.section}`);
  setS(['summaryDate'], AttendX.utils.formatDate(_attContext.date));
  setS(['summaryTotal','sumTotal'], records.length);
  setS(['summaryPresent','sumPresent'], present.length);
  setS(['summaryAbsent','sumAbsent'], absent.length);
  setS(['summaryPct'], AttendX.utils.pct(present.length, records.length) + '%');
  const list = document.getElementById('absenteeList');
  if (list) list.innerHTML = absent.length
    ? absent.map(s => `<div class="student-row status-absent" style="margin-bottom:4px"><span class="student-roll">${s.rollNo}</span><span class="student-name">${s.name}</span><span class="badge badge-danger">Absent</span></div>`).join('')
    : `<div style="text-align:center;padding:20px;color:var(--success);font-size:14px;font-weight:600">🎉 No Absentees! Full Attendance Today</div>`;
  // Build WA message for later use
  window._lastAttSummary = { subject: _attContext.subject, classLabel: `${_attContext.year} Sec ${_attContext.section}`, dateStr: _attContext.date, absentees: absent };
}

function editAttendance() { document.getElementById('attSummaryPanel').classList.add('hidden'); document.getElementById('attMainPanel').classList.remove('hidden'); setupKeyboardAttendance(); }

// ==================== EXTRA CLASSES ====================
async function showExtraClasses() {
  const session = AttendX.auth.getSession();
  if (!session) return;
  await renderExtraClassesList(session.userId);

  document.getElementById('scheduleExtraBtn')?.addEventListener('click', () => openModal('extraClassModal'));

  // Init modal dropdowns
  initExtraClassModal();

  // Realtime refresh
  AttendX.realtime.onRefresh('page', async (ev) => {
    if (ev.type === 'extra_classes') await renderExtraClassesList(session.userId);
  });
}

async function renderExtraClassesList(facultyId) {
  const list = document.getElementById('extraClassList');
  if (!list) return;
  list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted)">Loading...</div>`;
  const items = await AttendX.extraClasses.getUpcoming(facultyId);
  if (!items.length) { list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:12px">📭</div><div>No extra classes scheduled. Click + Schedule Extra Class to add one.</div></div>`; return; }
  list.innerHTML = items.map(ec => {
    const statusColors = { scheduled: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };
    return `<div class="extra-class-card" id="ec-${ec.id}">
      <div class="ec-left">
        <div class="ec-date">${AttendX.utils.formatDate(ec.date)}</div>
        <div class="ec-time">${ec.start_time} – ${ec.end_time}</div>
      </div>
      <div class="ec-center">
        <div class="ec-subject">${ec.subjectName}</div>
        <div class="ec-class">${ec.className}</div>
        ${ec.reason ? `<div class="ec-reason">📝 ${ec.reason}</div>` : ''}
      </div>
      <div class="ec-right">
        <span class="badge ${statusColors[ec.status] || 'badge-info'}">${ec.status}</span>
        ${ec.status === 'scheduled' ? `
          <button class="btn-primary btn-sm" onclick="startExtraClassAttendance('${ec.id}','${ec.cls?.year}','${ec.cls?.section}','${ec.subjectName}')">Take Attendance</button>
          <button class="btn-danger btn-sm" onclick="cancelExtraClass('${ec.id}')">Cancel</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function startExtraClassAttendance(ecId, year, section, subject) {
  Nav.go('attendance', { year, section, subject, extraClassId: ecId });
}
async function cancelExtraClass(id) {
  if (!confirm('Cancel this extra class?')) return;
  await AttendX.extraClasses.updateStatus(id, 'cancelled');
  AttendX.toast.show('Extra class cancelled', 'info');
}

function initExtraClassModal() {
  const yrSel  = document.getElementById('ecYear');
  const secSel = document.getElementById('ecSection');
  const subSel = document.getElementById('ecSubject');
  if (!yrSel) return;
  yrSel.innerHTML  = `<option value="">Select Year</option>` + AttendX.utils.YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
  secSel.innerHTML = `<option value="">Section</option>`     + AttendX.utils.SECTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
  yrSel.onchange = () => {
    const subs = AttendX.utils.SUBJECTS_BY_YEAR[yrSel.value] || [];
    subSel.innerHTML = `<option value="">Select Subject</option>` + subs.map(s => `<option value="${s}">${s}</option>`).join('');
  };
  document.getElementById('ecDate').min   = AttendX.utils.today();
  document.getElementById('saveExtraBtn').onclick = saveExtraClass;
}

async function saveExtraClass() {
  const yr  = document.getElementById('ecYear').value;
  const sec = document.getElementById('ecSection').value;
  const sub = document.getElementById('ecSubject').value;
  const dt  = document.getElementById('ecDate').value;
  const st  = document.getElementById('ecStartTime').value;
  const et  = document.getElementById('ecEndTime').value;
  const rsn = document.getElementById('ecReason').value.trim();
  if (!yr || !sec || !sub || !dt || !st || !et) { AttendX.toast.show('Fill all required fields', 'warning'); return; }
  const result = await AttendX.extraClasses.schedule({ year: yr, section: sec, subject: sub, date: dt, startTime: st, endTime: et, reason: rsn });
  if (result) { closeModal('extraClassModal'); AttendX.toast.show('Extra class scheduled!', 'success'); }
}

// ==================== CALENDAR ====================
async function showCalendar() {
  const dates  = await AttendX.attendance.getDates();
  const dateSet = new Set(dates);
  const now    = new Date();
  let viewYear = now.getFullYear(), viewMonth = now.getMonth();
  renderCalendar(viewYear, viewMonth, dateSet, now);
  document.getElementById('calPrev').onclick = () => { if (--viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(viewYear, viewMonth, dateSet, now); };
  document.getElementById('calNext').onclick = () => { if (++viewMonth > 11) { viewMonth = 0; viewYear++; } renderCalendar(viewYear, viewMonth, dateSet, now); };
  AttendX.realtime.onRefresh('page', async (ev) => { if (ev.type === 'attendance') { const d = await AttendX.attendance.getDates(); renderCalendar(viewYear, viewMonth, new Set(d), now); } });
}

function renderCalendar(year, month, dateSet, now) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const titleEl = document.getElementById('calMonthTitle') || document.getElementById('calTitle');
  if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = now.toISOString().slice(0, 10);
  const grid = document.getElementById('calGrid');
  let html = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => html += `<div class="cal-day-name">${d}</div>`);
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === todayStr, hasData = dateSet.has(ds);
    html += `<div class="cal-day${isToday?' today':hasData?' has-data':''}" onclick="showDayDetail('${ds}')">${d}${hasData?'<span class="cal-dot"></span>':''}</div>`;
  }
  if (grid) grid.innerHTML = html;
}

async function showDayDetail(dateStr) {
  const det = document.getElementById('calDayDetail') || document.getElementById('calDetail');
  if (!det) return;
  const records = await AttendX.attendance.getByDate(dateStr);
  if (!records.length) { det.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;color:var(--text-muted);padding:30px">No attendance recorded for ${AttendX.utils.formatDate(dateStr)}</div></div>`; return; }
  det.innerHTML = `<div class="card"><div class="card-header"><h3>📅 ${AttendX.utils.formatDate(dateStr)}</h3><span class="badge badge-info">${records.length} session(s)</span></div><div class="card-body" style="padding:0"><table class="data-table"><thead><tr><th>Year</th><th>Section</th><th>Subject</th><th>Total</th><th>Present</th><th>Absent</th><th>%</th><th>Type</th></tr></thead><tbody>${
    records.map(r => {
      const present = (r.records||[]).filter(s => s.status==='P').length;
      const absent  = (r.records||[]).filter(s => s.status==='A').length;
      const pct     = AttendX.utils.pct(present, r.records?.length || 1);
      return `<tr><td>${r.year}</td><td>${r.section}</td><td>${r.subject}</td><td>${r.records?.length||0}</td><td><span class="badge badge-success">${present}</span></td><td><span class="badge badge-danger">${absent}</span></td><td><span class="badge ${pct>=75?'badge-success':pct>=50?'badge-warning':'badge-danger'}">${pct}%</span></td><td>${r.is_extra?'<span class="badge-extra">⚡ Extra</span>':'Regular'}</td></tr>`;
    }).join('')
  }</tbody></table></div></div>`;
}

// ==================== REPORTS ====================
async function showReports() {
  const hasSplit = !!document.getElementById('repYear');
  if (hasSplit) {
    const yearSel = document.getElementById('repYear'), sectSel = document.getElementById('repSection');
    yearSel.innerHTML = `<option value="">All Years</option>` + AttendX.utils.YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
    sectSel.innerHTML = `<option value="">All Sections</option>` + AttendX.utils.SECTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
    yearSel.onchange = updateRepSubjectFilter;
    updateRepSubjectFilter();
  } else {
    const clsSel = document.getElementById('repClass');
    if (clsSel) {
      const opts = AttendX.utils.YEARS.flatMap(y => AttendX.utils.SECTIONS.map(s => `<option value="${y}__${s}">${y} – Section ${s}</option>`));
      clsSel.innerHTML = `<option value="">All Classes</option>` + opts.join('');
    }
  }
  // Bind buttons (support multiple possible IDs)
  ['genReportBtn'].forEach(id => { document.getElementById(id)?.addEventListener('click', generateReport); });
  ['exportCSVBtn'].forEach(id => { document.getElementById(id)?.addEventListener('click', exportReportCSV); });
  ['exportPDFBtn'].forEach(id => { document.getElementById(id)?.addEventListener('click', exportReportPDF); });
}

function updateRepSubjectFilter() {
  const yr = document.getElementById('repYear')?.value, subjSel = document.getElementById('repSubject');
  if (!subjSel) return;
  const subs = yr ? (AttendX.utils.SUBJECTS_BY_YEAR[yr] || []) : [];
  subjSel.innerHTML = `<option value="">All Subjects</option>` + subs.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function generateReport() {
  let year = document.getElementById('repYear')?.value;
  let section = document.getElementById('repSection')?.value;
  if (!year || !section) {
    const cls = document.getElementById('repClass')?.value || '';
    [year, section] = cls.split('__');
  }
  const subject = document.getElementById('repSubject')?.value || '';
  const start = document.getElementById('repStart')?.value || document.getElementById('repFrom')?.value || '';
  const end   = document.getElementById('repEnd')?.value   || document.getElementById('repTo')?.value   || '';
  const type  = document.getElementById('repType')?.value || 'classwise';
  if (!year || !section) { AttendX.toast.show('Select a class', 'warning'); return; }
  const tbody = document.getElementById('reportTableBody') || document.getElementById('repBody');
  const thead = document.getElementById('reportTableHead') || document.getElementById('repHead');
  if (!tbody || !thead) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">Loading...</td></tr>`;
  if (type === 'classwise') {
    const data = await AttendX.reports.getClassReport(year, section, start || null, end || null, subject || null);
    thead.innerHTML = `<tr><th>#</th><th>Date</th><th>Subject</th><th>Total</th><th>Present</th><th>Absent</th><th>%</th><th>Type</th></tr>`;
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No data found</td></tr>`; return; }
    tbody.innerHTML = data.map((r, i) => {
      const p = (r.records||[]).filter(s => s.status==='P').length, a = (r.records||[]).filter(s => s.status==='A').length;
      const pct = AttendX.utils.pct(p, r.records?.length || 1);
      return `<tr><td>${i+1}</td><td>${AttendX.utils.formatDate(r.date)}</td><td>${r.subject}</td><td>${r.records?.length||0}</td><td><span class="badge badge-success">${p}</span></td><td><span class="badge badge-danger">${a}</span></td><td><span class="badge ${pct>=75?'badge-success':pct>=50?'badge-warning':'badge-danger'}">${pct}%</span></td><td>${r.is_extra?'<span class="badge-extra">⚡</span>':''}</td></tr>`;
    }).join('');
  } else {
    const data = await AttendX.reports.getStudentReport(year, section, start || null, end || null);
    thead.innerHTML = `<tr><th>Roll No</th><th>Name</th><th>Subject</th><th>Total</th><th>Present</th><th>Absent</th><th>%</th></tr>`;
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No data found</td></tr>`; return; }
    const rows = [];
    data.forEach(s => { Object.entries(s.subjects).forEach(([sub, d]) => { const pct = AttendX.utils.pct(d.present, d.total); rows.push(`<tr><td><code>${s.rollNo}</code></td><td>${s.name}</td><td>${sub}</td><td>${d.total}</td><td><span class="badge badge-success">${d.present}</span></td><td><span class="badge badge-danger">${d.total-d.present}</span></td><td><div class="pct-ring ${pct>=75?'pct-high':pct>=50?'pct-medium':'pct-low'}">${pct}%</div></td></tr>`); }); });
    tbody.innerHTML = rows.join('') || `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No data</td></tr>`;
  }
}

async function exportReportCSV() {
  let year = document.getElementById('repYear')?.value;
  let section = document.getElementById('repSection')?.value;
  if (!year || !section) {
    const cls = document.getElementById('repClass')?.value || '';
    [year, section] = cls.split('__');
  }
  const type = document.getElementById('repType')?.value || 'classwise';
  if (!year || !section) { AttendX.toast.show('Generate a report first', 'warning'); return; }
  if (type === 'classwise') {
    const data = await AttendX.reports.getClassReport(year, section);
    AttendX.reports.exportCSV(data.map(r => { const p=(r.records||[]).filter(s=>s.status==='P').length, a=(r.records||[]).filter(s=>s.status==='A').length; return {Date:r.date,Year:r.year,Section:r.section,Subject:r.subject,Total:r.records?.length||0,Present:p,Absent:a,Percentage:AttendX.utils.pct(p,r.records?.length||1)+'%',Type:r.is_extra?'Extra':'Regular'}; }), `att_${year}_${section}_classwise`);
  } else {
    const data = await AttendX.reports.getStudentReport(year, section);
    const flat = [];
    data.forEach(s => { Object.entries(s.subjects).forEach(([sub,d]) => { flat.push({RollNo:s.rollNo,Name:s.name,Subject:sub,Total:d.total,Present:d.present,Absent:d.total-d.present,Percentage:AttendX.utils.pct(d.present,d.total)+'%'}); }); });
    AttendX.reports.exportCSV(flat, `att_${year}_${section}_studentwise`);
  }
  AttendX.toast.show('CSV exported!', 'success');
}
function exportReportPDF() { window.print(); AttendX.toast.show('Use browser print dialog to save as PDF', 'info', 5000); }

// ==================== STUDENTS ====================
function showStudents() {
  const hasSplit = !!document.getElementById('stuYear');
  if (hasSplit) {
    const yrSel = document.getElementById('stuYear'), secSel = document.getElementById('stuSection');
    yrSel.innerHTML  = `<option value="">Select Year</option>`  + AttendX.utils.YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
    secSel.innerHTML = `<option value="">Section</option>` + AttendX.utils.SECTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
    yrSel.onchange = loadStudentTable; secSel.onchange = loadStudentTable;
  } else {
    const clsSel = document.getElementById('stuClass');
    if (clsSel) {
      const opts = AttendX.utils.YEARS.flatMap(y => AttendX.utils.SECTIONS.map(s => `<option value="${y}__${s}">${y} – Section ${s}</option>`));
      clsSel.innerHTML = `<option value="">Select Class</option>` + opts.join('');
      clsSel.onchange = loadStudentTable;
    }
  }
  const stuSearch = document.getElementById('stuSearch');
  if (stuSearch) { stuSearch.oninput = filterStudentTable; }
  const addBtn = document.getElementById('addStudentBtn');
  if (addBtn) { addBtn.onclick = showAddStudentModal; }
}

async function loadStudentTable() {
  let year = document.getElementById('stuYear')?.value;
  let section = document.getElementById('stuSection')?.value;
  if (!year || !section) {
    const cls = document.getElementById('stuClass')?.value || '';
    [year, section] = cls.split('__');
  }
  if (!year || !section) return;
  const tbody = document.getElementById('stuTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Loading...</td></tr>`;
  const list = await AttendX.students.getList(year, section);
  const rows = await Promise.all(list.map(async (s, i) => {
    const summary = await AttendX.attendance.getStudentSummary(s.rollNo, year, section);
    const totalClasses = Object.values(summary).reduce((a,v)=>a+v.total,0);
    const totalPresent = Object.values(summary).reduce((a,v)=>a+v.present,0);
    const pct = AttendX.utils.pct(totalPresent, totalClasses);
    return `<tr><td>${i+1}</td><td><code>${s.rollNo}</code></td><td>${s.name}</td><td>${totalClasses}</td><td>${totalPresent}</td><td>${totalClasses-totalPresent}</td><td><div class="pct-ring ${pct>=75?'pct-high':pct>=50?'pct-medium':'pct-low'}">${pct}%</div></td><td><button class="btn-danger btn-sm" onclick="removeStudentConfirm('${year}','${section}','${s.rollNo}','${s.name}')">Remove</button></td></tr>`;
  }));
  tbody.innerHTML = rows.join('') || `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">No students found</td></tr>`;
  const stuCountEl = document.getElementById('stuCountLabel');
  if (stuCountEl) stuCountEl.textContent = `${list.length} students`;
}

function filterStudentTable() {
  const q = document.getElementById('stuSearch').value.toLowerCase();
  document.querySelectorAll('#stuTableBody tr').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

async function showAddStudentModal() {
  let year = document.getElementById('stuYear')?.value;
  let section = document.getElementById('stuSection')?.value;
  if (!year || !section) {
    const cls = document.getElementById('stuClass')?.value || '';
    [year, section] = cls.split('__');
  }
  if (!year || !section) { AttendX.toast.show('Select a class first', 'warning'); return; }
  const list = await AttendX.students.getList(year, section);
  const yr   = AttendX.utils.YEARS.indexOf(year) + 1;
  const rollEl = document.getElementById('newRollNo');
  if (rollEl) rollEl.value = `${yr}${section}${String(list.length + 1).padStart(3,'0')}`;
  const nameEl = document.getElementById('newStudentName');
  if (nameEl) nameEl.value = '';
  Utils.modal.open('addStudentModal');
}

async function saveNewStudent() {
  let year = document.getElementById('stuYear')?.value;
  let section = document.getElementById('stuSection')?.value;
  if (!year || !section) {
    const cls = document.getElementById('stuClass')?.value || '';
    [year, section] = cls.split('__');
  }
  const rollNo = document.getElementById('newRollNo').value.trim();
  const name   = document.getElementById('newStudentName').value.trim();
  if (!rollNo || !name) { AttendX.toast.show('Fill in all fields', 'warning'); return; }
  await AttendX.students.addStudent(year, section, { rollNo, name });
  Utils.modal.close('addStudentModal');
  await loadStudentTable();
  AttendX.toast.show(`Student ${name} added!`, 'success');
}

async function removeStudentConfirm(year, section, rollNo, name) {
  if (!confirm(`Remove ${name} (${rollNo})?`)) return;
  await AttendX.students.removeStudent(year, section, rollNo);
  await loadStudentTable();
  AttendX.toast.show(`${name} removed`, 'info');
}

// ==================== ADD CLASS ROSTER ====================
let _acStep = 1;
let _acTemplateRows = [];   // generated template rows [{rollNo, name, studentId}]
let _acParsedStudents = []; // imported/parsed students ready to save

function openAddClassModal() {
  // Reset state
  _acStep = 1;
  _acTemplateRows = [];
  _acParsedStudents = [];

  // Populate selects
  const yrSel  = document.getElementById('acYear');
  const secSel = document.getElementById('acSection');
  yrSel.innerHTML  = '<option value="">Select Year</option>'  + AttendX.utils.YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
  secSel.innerHTML = '<option value="">Select Section</option>' + AttendX.utils.SECTIONS.map(s => `<option value="${s}">Section ${s}</option>`).join('');

  // Reset form inputs
  document.getElementById('acCount').value = '30';
  document.getElementById('acCrName').value = '';
  document.getElementById('acCrPhone').value = '';
  document.getElementById('acPasteArea').value = '';
  document.getElementById('acImportPreview').innerHTML = '';

  // Show step 1, hide others
  _acUpdateStepUI();

  Utils.modal.open('addClassModal');
}

function _acUpdateStepUI() {
  // Show/hide step panels
  [1, 2, 3].forEach(n => {
    const el = document.getElementById(`acStep${n}`);
    if (el) el.classList.toggle('hidden', n !== _acStep);
  });

  // Update step dots
  [1, 2, 3].forEach(n => {
    const dot = document.getElementById(`acStep${n}Dot`);
    if (!dot) return;
    dot.classList.remove('active', 'done');
    if (n < _acStep)       dot.classList.add('done');
    else if (n === _acStep) dot.classList.add('active');
  });

  // Update step-line colors
  document.querySelectorAll('.ac-step-line').forEach((line, i) => {
    line.classList.toggle('done', i + 1 < _acStep);
  });

  // Update footer buttons
  const backBtn = document.getElementById('acBackBtn');
  const nextBtn = document.getElementById('acNextBtn');
  if (backBtn) backBtn.style.display = _acStep > 1 ? '' : 'none';
  if (nextBtn) {
    if (_acStep === 1) { nextBtn.textContent = 'Generate Template →'; }
    else if (_acStep === 2) { nextBtn.textContent = 'Import Students →'; }
    else { nextBtn.textContent = '✓ Save All Students'; }
  }
}

async function acNextStep() {
  if (_acStep === 1) {
    // Validate
    const year    = document.getElementById('acYear').value;
    const section = document.getElementById('acSection').value;
    const count   = parseInt(document.getElementById('acCount').value) || 30;
    if (!year || !section) { AttendX.toast.show('Select year and section', 'warning'); return; }

    // Generate template rows
    const yearNum = AttendX.utils.YEARS.indexOf(year) + 1;
    _acTemplateRows = Array.from({ length: count }, (_, i) => ({
      rollNo:    `${yearNum}${section}${String(i + 1).padStart(3, '0')}`,
      name:      '',
      studentId: '',
    }));

    _acRenderTemplatePreview(year, section, count);
    _acStep = 2;
    _acUpdateStepUI();

  } else if (_acStep === 2) {
    _acStep = 3;
    _acInitImportZone();
    _acUpdateStepUI();

  } else if (_acStep === 3) {
    // Save all parsed students
    if (!_acParsedStudents.length) {
      AttendX.toast.show('No students to import. Upload or paste data first.', 'warning');
      return;
    }
    await _acSaveStudents();
  }
}

function acPrevStep() {
  if (_acStep > 1) { _acStep--; _acUpdateStepUI(); }
}

function _acRenderTemplatePreview(year, section, count) {
  const preview = document.getElementById('acTemplatePreview');
  const crName  = document.getElementById('acCrName').value.trim() || 'Class CR';
  const rows    = _acTemplateRows.slice(0, Math.min(5, count)); // show first 5 in preview

  const badge = `<span class="ac-preview-badge">fill in →</span>`;
  let html = `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
    <strong>${count} rows</strong> pre-filled for ${year} – Section ${section} &nbsp;·&nbsp; Showing first 5
  </div>
  <table>
    <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Student ID (optional)</th></tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${r.rollNo}</td>
        <td>${badge}</td>
        <td>${badge}</td>
      </tr>`).join('')}
      ${count > 5 ? `<tr><td colspan="4" style="text-align:center;padding:8px;color:var(--text-muted);font-style:italic">… ${count - 5} more rows in the downloaded file</td></tr>` : ''}
    </tbody>
  </table>`;

  preview.innerHTML = html;

  // Build instructions
  const instrEl = document.getElementById('acInstructions');
  if (instrEl) instrEl.innerHTML = `
    <li>Download the CSV template using the button below</li>
    <li>Open in <strong>Google Sheets</strong> (File → Import) or Excel</li>
    <li>Fill in <strong>Student Name</strong> and <strong>Student ID</strong> columns for each row</li>
    <li>Save the sheet and share back (WhatsApp / Email) to mam</li>
    <li>Mam will import the filled sheet in <strong>Step 3</strong> to bulk-add students</li>
  `;
}

function downloadClassTemplate() {
  const year    = document.getElementById('acYear').value;
  const section = document.getElementById('acSection').value;
  const session = AttendX.auth.getSession();
  const teacher = session?.name || 'Teacher';
  const now     = new Date().toLocaleDateString('en-IN');

  const header = `# AttendX Student Roster Template\n# Class: ${year} – Section ${section} | Teacher: ${teacher} | Date: ${now}\n# Instructions: Fill in "Student Name" and "Student ID" columns. Do not change Roll No column.\n`;
  const csvHeader = 'S.No,Roll No,Student Name,Student ID (optional)\n';
  const rows = _acTemplateRows.map((r, i) => `${i + 1},${r.rollNo},,`).join('\n');
  const csv  = header + csvHeader + rows;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `AttendX_${year.replace(/\s/g,'')}_Sec${section}_Roster.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
  AttendX.toast.show('Template downloaded! Share with your CR.', 'success');
}

function openGoogleSheetsTemplate() {
  const year    = document.getElementById('acYear').value;
  const section = document.getElementById('acSection').value;
  // Build CSV data for Google Sheets import
  const csvHeader = 'S.No,Roll No,Student Name,Student ID\n';
  const rows = _acTemplateRows.map((r, i) => `${i + 1},${r.rollNo},,`).join('\n');
  const csv  = csvHeader + rows;

  // Encode as data URI for Sheets (will open Sheets with the import prompt)
  const encodedCsv = encodeURIComponent(csv);
  const sheetsUrl  = `https://docs.google.com/spreadsheets/create?title=AttendX+${encodeURIComponent(year)}+Sec+${section}+Roster`;
  window.open(sheetsUrl, '_blank');

  // Also download the file so user can import into the new sheet
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `roster_${year}_${section}.csv` });
  a.click();
  URL.revokeObjectURL(url);
  AttendX.toast.show('Google Sheets opened + CSV downloaded. Import the CSV into the new sheet.', 'info', 6000);
}

function shareTemplateWA() {
  const year    = document.getElementById('acYear').value;
  const section = document.getElementById('acSection').value;
  const crName  = document.getElementById('acCrName').value.trim() || 'CR';
  const crPhone = document.getElementById('acCrPhone').value.trim().replace(/\D/g, '');
  const session = AttendX.auth.getSession();

  const msg = `📋 *AttendX – Class Roster Request*

Hello ${crName}! 👋

*Class:* ${year} – Section ${section}
*Sent by:* ${session?.name || 'Faculty'}

Please fill in the student details in the sheet below:

✅ *Steps:*
1. Open the CSV file I'll share
2. Fill in: *Name* and *Student ID* for each roll number
3. Send the filled sheet back to me
4. I'll import it into AttendX

_Thank you! 🙏_
_– Sent via AttendX_`;

  const url = crPhone
    ? `https://wa.me/91${crPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(url, '_blank');
  // Also download the template
  downloadClassTemplate();
}

function _acInitImportZone() {
  const zone      = document.getElementById('acDropZone');
  const fileInput = document.getElementById('acFileInput');
  if (!zone || !fileInput) return;

  zone.onclick = () => fileInput.click();
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag-over'); };
  zone.ondragleave = () => zone.classList.remove('drag-over');
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) _acProcessFile(file);
  };

  // Also watch paste area
  document.getElementById('acPasteArea').oninput = () => {
    const text = document.getElementById('acPasteArea').value.trim();
    if (text) _acParseAndPreview(text);
  };
}

function handleClassCSVUpload(event) {
  const file = event.target.files[0];
  if (file) _acProcessFile(file);
}

function _acProcessFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => _acParseAndPreview(e.target.result);
  reader.readAsText(file, 'UTF-8');
}

function _acParseAndPreview(text) {
  const year    = document.getElementById('acYear').value;
  const section = document.getElementById('acSection').value;

  // Strip comment lines (start with #)
  const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  if (!lines.length) { AttendX.toast.show('No data found in file', 'warning'); return; }

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('name') || firstLine.includes('roll') || firstLine.includes('s.no') || firstLine.includes('sno');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const parsed = [];
  const errors = [];

  dataLines.forEach((line, idx) => {
    if (!line.trim()) return;
    // Support comma and tab delimited
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    const cols   = parts.map(p => p.replace(/^"|"$/g, '').trim());

    // Try to figure out columns flexibly
    // Expected: S.No, Roll No, Name, Student ID  (or just: Roll No, Name, Student ID)
    let rollNo, name, studentId;
    if (cols.length >= 4) {
      // S.No, Roll No, Name, StudentID
      rollNo = cols[1]; name = cols[2]; studentId = cols[3];
    } else if (cols.length === 3) {
      rollNo = cols[0]; name = cols[1]; studentId = cols[2];
    } else if (cols.length === 2) {
      rollNo = cols[0]; name = cols[1]; studentId = '';
    } else {
      errors.push({ line: idx + 1, reason: 'Too few columns' }); return;
    }

    if (!rollNo.trim()) { errors.push({ line: idx + 1, reason: 'Missing roll number' }); return; }
    if (!name.trim())   { errors.push({ line: idx + 1, reason: 'Missing name' }); return; }

    parsed.push({ rollNo: rollNo.trim(), name: name.trim(), studentId: studentId.trim() });
  });

  _acParsedStudents = parsed;
  _acRenderImportPreview(parsed, errors, year, section);
}

function _acRenderImportPreview(parsed, errors, year, section) {
  const container = document.getElementById('acImportPreview');
  if (!container) return;

  if (!parsed.length && !errors.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-icon">📭</div><p>No valid data detected</p></div>`;
    return;
  }

  const validCount = parsed.length;
  const errCount   = errors.length;

  let html = `<div class="ac-import-count">
    <span style="color:var(--success)">✓ ${validCount} students ready to import</span>
    ${errCount ? `<span style="color:var(--danger)">✗ ${errCount} errors</span>` : ''}
    <span style="color:var(--text-muted);margin-left:auto">${year} – Section ${section}</span>
  </div>
  <div style="max-height:260px;overflow-y:auto;border-radius:10px;border:1px solid var(--border)">
  <table class="ac-import-table">
    <thead><tr><th>#</th><th>Roll No</th><th>Student Name</th><th>Student ID</th></tr></thead>
    <tbody>
    ${parsed.slice(0, 50).map((s, i) => `<tr class="valid-row">
      <td>${i + 1}</td>
      <td><code>${s.rollNo}</code></td>
      <td>${s.name}</td>
      <td style="color:var(--text-muted)">${s.studentId || '—'}</td>
    </tr>`).join('')}
    ${parsed.length > 50 ? `<tr><td colspan="4" style="text-align:center;padding:8px;color:var(--text-muted)">… ${parsed.length - 50} more</td></tr>` : ''}
    </tbody>
  </table>
  </div>`;

  if (errCount) {
    html += `<div style="margin-top:10px;padding:10px 14px;background:var(--danger-light);border:1px solid var(--danger-light);border-radius:8px;font-size:12px;color:var(--danger)">
      <strong>⚠ Skipped rows:</strong> ${errors.map(e => `Row ${e.line} (${e.reason})`).join(' · ')}
    </div>`;
  }

  container.innerHTML = html;
}

async function _acSaveStudents() {
  const year    = document.getElementById('acYear').value;
  const section = document.getElementById('acSection').value;
  if (!year || !section) { AttendX.toast.show('Class info missing', 'error'); return; }
  if (!_acParsedStudents.length) { AttendX.toast.show('No students to import', 'warning'); return; }

  const nextBtn = document.getElementById('acNextBtn');
  if (nextBtn) { nextBtn.textContent = 'Saving…'; nextBtn.disabled = true; }

  let saved = 0, failed = 0;
  for (const s of _acParsedStudents) {
    try {
      const result = await AttendX.students.addStudent(year, section, { rollNo: s.rollNo, name: s.name });
      if (result) saved++; else failed++;
    } catch (e) {
      console.error('[AddClass] Failed to add', s.rollNo, e);
      failed++;
    }
  }

  if (nextBtn) { nextBtn.textContent = '✓ Save All Students'; nextBtn.disabled = false; }

  if (saved > 0) {
    AttendX.toast.show(`✓ ${saved} students added to ${year} – Section ${section}!`, 'success', 5000);
    Utils.modal.close('addClassModal');
    // Update the class selector and reload table
    const clsSel = document.getElementById('stuClass');
    if (clsSel) {
      clsSel.value = `${year}__${section}`;
      await loadStudentTable();
    }
  }
  if (failed > 0) {
    AttendX.toast.show(`${failed} student(s) could not be saved. Check console.`, 'error', 5000);
  }
}


let _editableTT = {};

async function showTimetable() {
  const session = AttendX.auth.getSession();
  if (!session) return;
  const tt = await AttendX.timetable.get(session.userId);
  renderTimetableGrid(tt);
  const saveBtn = document.getElementById('saveTimetableBtn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;
      const ok = await AttendX.timetable.save(session.userId, _editableTT);
      saveBtn.textContent = '💾 Save Timetable';
      saveBtn.disabled = false;
      if (ok) AttendX.toast.show('Timetable saved!', 'success');
      else AttendX.toast.show('Save failed – check console', 'error');
    };
  }
}

function renderTimetableGrid(tt) {
  _editableTT = JSON.parse(JSON.stringify(tt));
  const container = document.getElementById('timetableGrid') || document.getElementById('ttGrid');
  if (!container) return;
  const days = AttendX.utils.DAYS, hours = AttendX.utils.HOURS;
  let html = `<div class="tt-header">Time</div>`;
  days.forEach(d => html += `<div class="tt-header">${d}</div>`);
  hours.forEach(h => {
    const endH = String(parseInt(h) + 1).padStart(2,'0') + ':00';
    html += `<div class="tt-time">${h}<br/><small style="opacity:0.6">${endH}</small></div>`;
    days.forEach(day => {
      const cell = (_editableTT[day] || {})[h];
      if (cell?.type === 'break') html += `<div class="tt-cell" style="background:var(--warning-light);border-color:var(--warning);text-align:center"><span style="font-size:11px;color:var(--warning-dark);font-weight:700">🍱 Lunch</span></div>`;
      else if (cell) html += `<div class="tt-cell filled" onclick="editTTCell('${day}','${h}')"><div class="tt-cell-subject">${cell.subject}</div><div class="tt-cell-class">${cell.year} – ${cell.section}</div></div>`;
      else html += `<div class="tt-cell empty-cell" onclick="editTTCell('${day}','${h}')"><div style="font-size:11px;color:var(--text-muted);text-align:center">+ Add</div></div>`;
    });
  });
  container.innerHTML = html;
}

function editTTCell(day, hour) {
  document.getElementById('ttDay').textContent = `${day}, ${hour}`;
  const cell = (_editableTT[day] || {})[hour];
  const yrSel = document.getElementById('ttYear'), secSel = document.getElementById('ttSection');
  yrSel.innerHTML  = `<option value="">Select Year</option>` + AttendX.utils.YEARS.map(y => `<option value="${y}">${y}</option>`).join('');
  secSel.innerHTML = `<option value="">Section</option>`     + AttendX.utils.SECTIONS.map(s => `<option value="${s}">${s}</option>`).join('');
  if (cell) { yrSel.value = cell.year; secSel.value = cell.section; }
  updateTTSubject();
  if (cell) document.getElementById('ttSubject').value = cell.subject;
  yrSel.onchange = updateTTSubject;
  document.getElementById('saveTTCellBtn').onclick = () => {
    const yr = yrSel.value, sec = secSel.value, sub = document.getElementById('ttSubject').value;
    if (!yr || !sec || !sub) { AttendX.toast.show('Fill all fields', 'warning'); return; }
    if (!_editableTT[day]) _editableTT[day] = {};
    _editableTT[day][hour] = { year: yr, section: sec, subject: sub };
    renderTimetableGrid(_editableTT); closeModal('ttCellModal');
  };
  document.getElementById('clearTTCellBtn').onclick = () => {
    if (!_editableTT[day]) _editableTT[day] = {};
    _editableTT[day][hour] = null;
    renderTimetableGrid(_editableTT); closeModal('ttCellModal');
  };
  openModal('ttCellModal');
}

function updateTTSubject() {
  const yr = document.getElementById('ttYear').value, subjSel = document.getElementById('ttSubject');
  const subs = yr ? (AttendX.utils.SUBJECTS_BY_YEAR[yr] || []) : [];
  subjSel.innerHTML = `<option value="">Select Subject</option>` + subs.map(s => `<option value="${s}">${s}</option>`).join('');
}

function showSettings() {
  const session = AttendX.auth.getSession();
  if (!session) return;
  ['settingsName'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=session.name; });
  ['settingsDept'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=session.dept; });
  ['settingsRole'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=`${(session.role||'faculty').toUpperCase()} – ${session.dept}`; });
  ['settingsId','settingsEmpId'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=`ID: ${session.userId || '—'}`; });
  ['settingsEmail'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=`${session.userId || 'faculty'}@college.edu`; });
  ['settingsAvatar'].forEach(id => { const e=document.getElementById(id); if(e) e.textContent=session.initials||session.name.slice(0,2).toUpperCase(); });
  // Populate semester info
  const semInfo = document.getElementById('semesterInfo');
  if (semInfo) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const sem = (month >= 6 && month <= 11) ? 'Odd Semester' : 'Even Semester';
    semInfo.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
      <div><span style="color:var(--text-muted)">Academic Year</span><br><strong>${now.getFullYear()}–${now.getFullYear()+1}</strong></div>
      <div><span style="color:var(--text-muted)">Semester</span><br><strong>${sem}</strong></div>
      <div><span style="color:var(--text-muted)">Department</span><br><strong>${session.dept}</strong></div>
      <div><span style="color:var(--text-muted)">Min. Attendance</span><br><strong>75%</strong></div>
    </div>`;
  }
}

// ==================== MODALS ====================
function openModal(id)  { if (Utils?.modal) Utils.modal.open(id);  else document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { if (Utils?.modal) Utils.modal.close(id); else document.getElementById(id)?.classList.remove('active'); }

// ==================== MISSING GLOBAL FUNCTIONS ====================
// Sidebar / mobile menu
function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  if (sb) sb.classList.toggle('collapsed');
}
function toggleMobileSidebar() {
  const sb = document.querySelector('.sidebar');
  if (sb) sb.classList.toggle('mobile-open');
  // Create overlay on demand if missing
  let overlay = document.getElementById('sidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick = toggleMobileSidebar;
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active');
}

// Search
function openSearch() {
  const ov = document.getElementById('searchOverlay');
  if (ov) { ov.classList.add('active'); document.getElementById('searchInput')?.focus(); }
}
function closeSearch() {
  const ov = document.getElementById('searchOverlay');
  if (ov) ov.classList.remove('active');
}
// Close search when clicking the backdrop (outside the search-box)
document.addEventListener('click', (e) => {
  const ov = document.getElementById('searchOverlay');
  if (ov && ov.classList.contains('active')) {
    // If click target is the overlay itself (not inside .search-box), close it
    if (!e.target.closest('.search-box')) closeSearch();
  }
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); openSearch(); }
  if (e.key==='Escape') closeSearch();
});

// Theme toggle
function toggleTheme() {
  const n = AttendX.theme.toggle();
  updateThemeIcon(n);
}

// Logout
function doLogout() { AttendX.auth.logout(); window.location.href = 'index.html'; }

// Attendance UI aliases
function resetAttUI() { resetAttendanceUI(); }

// WhatsApp
function toggleWABox() {
  const box = document.getElementById('waBox');
  if (!box) return;
  box.classList.toggle('hidden');
  if (!box.classList.contains('hidden') && window._lastAttSummary) {
    const msg = Utils.whatsapp.build(window._lastAttSummary);
    const prev = document.getElementById('waPreview');
    if (prev) prev.textContent = msg;
    window._waMsg = msg;
  }
}
function copyWA()  { if(window._waMsg) Utils.whatsapp.copy(window._waMsg); }
function shareWA() { if(window._waMsg) Utils.whatsapp.share(window._waMsg); }
function exportAttCSV() {
  if (!_classStudents.length) { AttendX.toast.show('No attendance data to export', 'warning'); return; }
  const rows = _classStudents.map(s => ({ RollNo: s.rollNo, Name: s.name, Status: _records[s.rollNo] || 'Pending' }));
  Utils.csv.download(rows, `att_${_attContext.year}_${_attContext.section}_${_attContext.subject}_${_attContext.date}`);
}

// Students CSV
function exportStudentsCSV() {
  const rows = [];
  document.querySelectorAll('#stuTableBody tr').forEach(tr => {
    const cells = tr.querySelectorAll('td');
    if (cells.length >= 3) rows.push({ Roll: cells[1]?.textContent, Name: cells[2]?.textContent, Percentage: cells[3]?.textContent });
  });
  Utils.csv.download(rows, 'students_export');
}

// Report CSV alias
function exportRepCSV() { exportReportCSV(); }

// Notifications
function markAllNotifRead() {
  AttendX.toast.show('All notifications marked as read', 'success');
  const badge = document.getElementById('notifBadge');
  if (badge) badge.classList.add('hidden');
  const sideBadge = document.getElementById('sidebarNotifBadge');
  if (sideBadge) sideBadge.style.display = 'none';
}

// Add Student alias
function saveStudent() { saveNewStudent(); }

// Chatbot
function toggleChatbot() {
  const win = document.getElementById('chatbotWindow');
  if (win) win.classList.toggle('hidden');
}
function sendChat() {
  const inp = document.getElementById('chatInput');
  const msgs = document.getElementById('chatMessages');
  if (!inp || !msgs || !inp.value.trim()) return;
  const q = inp.value.trim();
  inp.value = '';
  msgs.innerHTML += `<div class="chat-msg user">${q}</div>`;
  const answers = {
    'attendance': 'Go to Take Attendance from the sidebar, select your class and subject, load students, then mark P or A using keyboard shortcuts!',
    'report': 'Go to Reports in the sidebar, select a class and date range, then click Generate.',
    'timetable': 'Go to Timetable in the sidebar to view or edit your weekly schedule.',
    'student': 'Go to Students in the sidebar to view, search, add, or remove students.',
    'default': 'I can help you with attendance, reports, timetable, and student management. What do you need?',
  };
  const key = Object.keys(answers).find(k => q.toLowerCase().includes(k)) || 'default';
  setTimeout(() => { msgs.innerHTML += `<div class="chat-msg bot">${answers[key]}</div>`; msgs.scrollTop = msgs.scrollHeight; }, 400);
  msgs.scrollTop = msgs.scrollHeight;
}

// ==================== COVERAGE ====================
function showCoverage() {
  const sel = document.getElementById('coverageMapping');
  if (!sel) return;
  const subjects = Object.values(AttendX.utils.SUBJECTS_BY_YEAR).flat();
  sel.innerHTML = `<option value="">Select Subject</option>` + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  sel.onchange = renderCoverageList;
}
function renderCoverageList() {
  const subject = document.getElementById('coverageMapping')?.value;
  const list = document.getElementById('coverageList');
  if (!list) return;
  if (!subject) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">Select a Subject</div><p>Choose a subject above to view unit coverage.</p></div>`; return; }
  // Load from localStorage for now (DB table coming)
  const key = `coverage_${subject}`;
  const units = JSON.parse(localStorage.getItem(key) || '[]');
  if (!units.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No Units Added</div><p>Click + Add Unit to start tracking coverage for ${subject}.</p></div>`;
    return;
  }
  list.innerHTML = units.map((u, i) => {
    const pct = u.planned ? Math.round((u.completed / u.planned) * 100) : 0;
    const cls = pct >= 80 ? 'pct-high' : pct >= 50 ? 'pct-medium' : 'pct-low';
    return `<div class="coverage-card"><div class="coverage-header"><div><div class="coverage-title">Unit ${u.num}: ${u.title}</div>${u.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${u.notes}</div>` : ''}</div><div class="coverage-pct pct-ring ${cls}">${pct}%</div></div><div class="pct-bar"><div class="pct-bar-fill" style="width:${pct}%;background:${pct>=80?'var(--success)':pct>=50?'var(--warning)':'var(--danger)'}"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-top:6px"><span>✅ ${u.completed} topics done</span><span>📌 ${u.planned} planned</span></div></div>`;
  }).join('');
}
function saveCoverageUnit() {
  const subject = document.getElementById('coverageMapping')?.value;
  if (!subject) { AttendX.toast.show('Select a subject first', 'warning'); return; }
  const num       = parseInt(document.getElementById('unitNum')?.value) || 0;
  const title     = document.getElementById('unitTitle')?.value.trim();
  const planned   = parseInt(document.getElementById('unitPlanned')?.value) || 0;
  const completed = parseInt(document.getElementById('unitCompleted')?.value) || 0;
  const notes     = document.getElementById('unitNotes')?.value.trim();
  if (!num || !title) { AttendX.toast.show('Unit number and title are required', 'warning'); return; }
  const key = `coverage_${subject}`;
  const units = JSON.parse(localStorage.getItem(key) || '[]');
  const existing = units.findIndex(u => u.num === num);
  const entry = { num, title, planned, completed, notes };
  if (existing >= 0) units[existing] = entry; else units.push(entry);
  units.sort((a,b) => a.num - b.num);
  localStorage.setItem(key, JSON.stringify(units));
  Utils.modal.close('addUnitModal');
  renderCoverageList();
  AttendX.toast.show(`Unit ${num} saved!`, 'success');
}

// ==================== NOTIFICATIONS ====================
function showNotifications() {
  const list = document.getElementById('notifList');
  if (list) list.innerHTML = `<div class="card-body empty-state" style="padding:40px"><div class="empty-icon">📥</div><div class="empty-title">No notifications</div><p>You're all caught up!</p></div>`;
}

// ==================== CORRECTIONS ====================
function showCorrections() {
  const list = document.getElementById('correctionList');
  if (!list) return;
  const corrections = JSON.parse(localStorage.getItem('ax_corrections') || '[]');
  const session = AttendX.auth.getSession();
  // Populate correction modal class dropdown
  const corrClass = document.getElementById('corrClass');
  if (corrClass) {
    const opts = AttendX.utils.YEARS.flatMap(y => AttendX.utils.SECTIONS.map(s => `<option value="${y}__${s}">${y} – Section ${s}</option>`));
    corrClass.innerHTML = `<option value="">Select Class</option>` + opts.join('');
  }
  if (!corrections.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">No Corrections</div><p>No attendance correction requests yet.</p></div>`;
    return;
  }
  list.innerHTML = corrections.map((c, i) => `
    <div class="correction-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div><strong style="font-size:14px">${c.rollNo}</strong> <span style="color:var(--text-muted);font-size:13px">· ${c.date}</span></div>
        <span class="badge ${c.status==='approved'?'badge-success':c.status==='rejected'?'badge-danger':'badge-warning'}">${c.status||'pending'}</span>
      </div>
      <div style="font-size:13px;color:var(--text-secondary)">Class: ${c.classLabel} &nbsp;|&nbsp; New Status: <strong>${c.newStatus}</strong></div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:6px">Reason: ${c.reason}</div>
      ${(c.status||'pending')==='pending' ? `<div style="margin-top:10px;display:flex;gap:6px">
        <button class="btn btn-success btn-sm" onclick="approveCorrection(${i})">✓ Approve</button>
        <button class="btn btn-danger btn-sm" onclick="rejectCorrection(${i})">✗ Reject</button>
      </div>` : ''}
    </div>`).join('');
}
function submitCorrection() {
  const rollNo   = document.getElementById('corrRollNo')?.value.trim();
  const date     = document.getElementById('corrDate')?.value;
  const classVal = document.getElementById('corrClass')?.value;
  const status   = document.getElementById('corrStatus')?.value;
  const reason   = document.getElementById('corrReason')?.value.trim();
  if (!rollNo || !date || !classVal || !reason) { AttendX.toast.show('Fill all required fields', 'warning'); return; }
  const [year, section] = classVal.split('__');
  const corrections = JSON.parse(localStorage.getItem('ax_corrections') || '[]');
  corrections.unshift({ rollNo, date, classLabel: `${year} – Sec ${section}`, newStatus: status, reason, status: 'pending', submittedAt: new Date().toISOString() });
  localStorage.setItem('ax_corrections', JSON.stringify(corrections));
  Utils.modal.close('correctionModal');
  showCorrections();
  AttendX.toast.show('Correction request submitted!', 'success');
}
function approveCorrection(i) {
  const corrections = JSON.parse(localStorage.getItem('ax_corrections') || '[]');
  if (corrections[i]) { corrections[i].status = 'approved'; localStorage.setItem('ax_corrections', JSON.stringify(corrections)); showCorrections(); AttendX.toast.show('Correction approved', 'success'); }
}
function rejectCorrection(i) {
  const corrections = JSON.parse(localStorage.getItem('ax_corrections') || '[]');
  if (corrections[i]) { corrections[i].status = 'rejected'; localStorage.setItem('ax_corrections', JSON.stringify(corrections)); showCorrections(); AttendX.toast.show('Correction rejected', 'info'); }
}

// ==================== ANALYTICS ====================
async function showAnalytics() {
  const statsEl = document.getElementById('analyticsStats');
  const lowAttEl = document.getElementById('lowAttTable');
  const workloadEl = document.getElementById('workloadList');
  if (statsEl) statsEl.innerHTML = `<div class="loading-state"><div class="spinner spinner-dark"></div><span>Loading analytics…</span></div>`;

  try {
    const allData = await AttendX.attendance.getAll();
    const allDates = await AttendX.attendance.getDates();

    // Aggregate totals
    let totalPresent = 0, totalAbsent = 0, totalSessions = allData.length;
    const studentMap = {};
    allData.forEach(sess => {
      (sess.records || []).forEach(r => {
        if (r.status === 'P') totalPresent++; else totalAbsent++;
        if (!studentMap[r.rollNo]) studentMap[r.rollNo] = { name: r.name, total: 0, present: 0 };
        studentMap[r.rollNo].total++;
        if (r.status === 'P') studentMap[r.rollNo].present++;
      });
    });
    const totalStudents = Object.keys(studentMap).length;
    const overallPct = totalPresent + totalAbsent > 0 ? Math.round(totalPresent / (totalPresent + totalAbsent) * 100) : 0;

    if (statsEl) statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="stat-number">${allDates.length}</div><div class="stat-label">Days Recorded</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg></div><div><div class="stat-number">${totalSessions}</div><div class="stat-label">Total Sessions</div></div></div>
      <div class="stat-card"><div class="stat-icon purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div><div class="stat-number">${totalStudents}</div><div class="stat-label">Students Tracked</div></div></div>
      <div class="stat-card"><div class="stat-icon ${overallPct>=75?'green':overallPct>=65?'orange':'red'}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div><div class="stat-number">${overallPct}%</div><div class="stat-label">Overall Attendance</div></div></div>`;

    // Low attendance list
    const threshold = parseInt(document.getElementById('lowAttFilter')?.value || '75');
    const filterLow = () => {
      const thr = parseInt(document.getElementById('lowAttFilter')?.value || '75');
      const lowStudents = Object.entries(studentMap)
        .map(([roll, d]) => ({ roll, name: d.name, pct: Math.round(d.present / d.total * 100), total: d.total, present: d.present }))
        .filter(s => s.pct < thr)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 20);
      if (lowAttEl) {
        if (!lowStudents.length) {
          lowAttEl.innerHTML = `<div class="empty-state" style="padding:30px"><div class="empty-icon">🎉</div><p>No students below ${thr}% attendance</p></div>`;
        } else {
          lowAttEl.innerHTML = `<table class="data-table"><thead><tr><th>Roll No</th><th>Name</th><th>Present</th><th>Total</th><th>%</th></tr></thead><tbody>${
            lowStudents.map(s => `<tr><td><code>${s.roll}</code></td><td>${s.name}</td><td>${s.present}</td><td>${s.total}</td><td><span class="pct-ring ${s.pct>=65?'pct-medium':'pct-low'}">${s.pct}%</span></td></tr>`).join('')
          }</tbody></table>`;
        }
      }
    };
    filterLow();
    document.getElementById('lowAttFilter')?.addEventListener('change', filterLow);

    // Faculty workload
    const session = AttendX.auth.getSession();
    if (workloadEl && session) {
      workloadEl.innerHTML = `<div style="padding:16px 20px">
        <div class="progress-item"><div class="progress-info"><div class="progress-label">${session.name}</div><div class="progress-sub">${session.dept} · ${session.role || 'Faculty'}</div></div><div class="progress-pct">${totalSessions} sessions</div></div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-muted);text-align:center">Multi-faculty analytics available with HOD/Admin role</div>
      </div>`;
    }
  } catch (err) {
    console.error('[Analytics]', err);
    if (statsEl) statsEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠</div><div class="empty-title">Analytics Unavailable</div><p>Could not load data. Try again.</p></div>`;
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('dashboardApp')) return;
  const main = document.querySelector('.main-content');
  if (main) main.style.opacity = '0.5';

  const banner = document.getElementById('dbErrBanner');
  if (banner) {
    banner.style.display = 'none'; // Default to hidden, show only on connection error
  }

  // Hook connection change listener to dynamically show/hide the banner
  AttendX.connection.onChange((state) => {
    const bannerEl = document.getElementById('dbErrBanner');
    if (bannerEl) {
      bannerEl.style.display = (state === 'connected') ? 'none' : 'block';
    }
  });

  await AttendX.init();
  if (banner) {
    banner.style.display = AttendX.connection.isConnected() ? 'none' : 'block';
  }

  if (main) main.style.opacity = '1';
  initSidebar();
  initNavbar();
  await Nav.go('dashboard');
});
