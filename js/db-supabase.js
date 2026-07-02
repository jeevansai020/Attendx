/**
 * AttendX – Supabase Data Layer v1.1  (Production Hardened)
 * Replaces data.js. Exposes the same AttendX global.
 * All read/write methods are async (return Promises).
 *
 * New in v1.1:
 *  - Connection health check in init()
 *  - isConnected() public method
 *  - _connState tracks 'connecting' | 'connected' | 'error'
 *  - onConnStateChange(fn) callback hook for UI badges
 *  - Graceful error handling when Supabase is unreachable
 */
const AttendX = (function () {
  'use strict';

  // ── Local fallback data (used when Supabase is empty / unreachable) ──
  // Credentials must match supabase_seed.sql AND demo buttons in index.html
  const LOCAL_FACULTY = [
    { id: 'dr.kumar',    username: 'dr.kumar',    name: 'Dr. Ramesh Kumar',    password: 'Faculty@123', department: 'CSE', role: 'faculty' },
    { id: 'prof.meena',  username: 'prof.meena',  name: 'Prof. Meena Sharma',  password: 'Faculty@123', department: 'ECE', role: 'faculty' },
    { id: 'hod.cse',     username: 'hod.cse',     name: 'Dr. Anitha Rao',      password: 'Hod@12345',   department: 'CSE', role: 'hod'     },
    { id: 'admin',       username: 'admin',        name: 'Administrator',        password: 'Admin@123',   department: 'All', role: 'admin'   },
    { id: 'dean',        username: 'dean',         name: 'Dr. Suresh Nair',     password: 'Dean@12345',  department: 'All', role: 'dean'    },
  ];
  const LOCAL_SUBJECTS_BY_YEAR = {
    '1st Year': ['Engineering Mathematics-I','Engineering Physics','Engineering Chemistry','Programming in C','Engineering Drawing','English Communication'],
    '2nd Year': ['Mathematics-III','Data Structures','Digital Electronics','Object Oriented Programming','Computer Organization','Environment Science'],
    '3rd Year': ['Computer Networks','Operating Systems','Database Management Systems','Software Engineering','Theory of Computation','Web Technologies'],
    '4th Year': ['Machine Learning','Cloud Computing','Cyber Security','Big Data Analytics','Project Work','Professional Elective'],
  };
  let _useLocalFallback = false;

  const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Connection State ─────────────────────────────────────────
  let _connState = 'connecting';   // 'connecting' | 'connected' | 'error'
  const _connCbs = [];

  function _setConnState(state) {
    _connState = state;
    _connCbs.forEach(fn => { try { fn(state); } catch (_) {} });
  }

  // ── In-memory lookup maps (built during init()) ──────────────
  let _classMap     = {};   // `${year}__${section}` → class_id
  let _classById    = {};   // class_id → {id, year, section, strength}
  let _subjectMap   = {};   // subjectName → subject_id
  let _subjectById  = {};   // subject_id → subjectName
  let _subjectsByYear = {}; // year → [subjectName, ...]
  let _facultyMap   = {};   // username → facultyRow

  // ── Refresh callbacks (pages register here) ──────────────────
  const _cbs = {};
  function _notify(ev) {
    Object.values(_cbs).forEach(fn => { try { fn(ev); } catch (_) {} });
  }

  // ─────────────────────────────────────────────────────────────
  //  CONSTANTS
  // ─────────────────────────────────────────────────────────────
  const YEARS    = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const SECTIONS = ['A', 'B', 'C'];
  const HOURS    = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
  const DAYS     = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // ─────────────────────────────────────────────────────────────
  //  UTILS
  // ─────────────────────────────────────────────────────────────
  const utils = {
    today:      () => new Date().toISOString().slice(0, 10),
    formatDate: (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    pct:        (n, t) => t ? Math.round((n / t) * 100) : 0,
    YEARS, SECTIONS, HOURS, DAYS,
    get SUBJECTS_BY_YEAR() { return _subjectsByYear; },
  };

  // ─────────────────────────────────────────────────────────────
  //  THEME
  // ─────────────────────────────────────────────────────────────
  const theme = {
    get:    () => localStorage.getItem('ax_theme') || 'light',
    toggle: () => {
      const next = theme.get() === 'light' ? 'dark' : 'light';
      localStorage.setItem('ax_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    },
    apply: () => document.documentElement.setAttribute('data-theme', theme.get()),
  };

  // ─────────────────────────────────────────────────────────────
  //  TOAST
  // ─────────────────────────────────────────────────────────────
  const toast = {
    show: (msg, type = 'info', duration = 3500) => {
      let c = document.getElementById('toastContainer');
      if (!c) { c = document.createElement('div'); c.id = 'toastContainer'; document.body.appendChild(c); }
      const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span class="toast-msg">${msg}</span>`;
      c.appendChild(el);
      setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 350); }, duration);
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  AUTH  (session stored in localStorage)
  // ─────────────────────────────────────────────────────────────
  const auth = {
    login: async (username, password) => {
      // 1. Try local fallback first (supports multiple password entries per user)
      const localMatches = LOCAL_FACULTY.filter(f => f.username === username && f.password === password);
      const localF = localMatches.length ? localMatches[0] : null;

      // 2. Try Supabase faculty map (populated during init)
      let f = _facultyMap[username];

      // 3. If not in map, query Supabase directly
      if (!f && !_useLocalFallback) {
        try {
          const { data, error } = await _sb.from('faculty').select('*').eq('username', username).eq('is_active', true).maybeSingle();
          if (!error && data) { f = data; _facultyMap[f.username] = f; }
        } catch (_) {}
      }

      // 4. Fall back to local credentials when DB has no faculty
      if (!f) f = localF ? { ...localF, is_active: true } : null;

      if (!f || f.password !== password) {
        // Last chance: try local fallback match
        if (!localF) return null;
        f = { ...localF, is_active: true };
      }
      const initials = f.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const session  = { userId: f.id, name: f.name, dept: f.department, role: f.role, initials, loginAt: Date.now() };
      localStorage.setItem('ax_session', JSON.stringify(session));
      // Fire-and-forget last_login update (won't block login)
      if (!_useLocalFallback) {
        (async () => { try { await _sb.from('faculty').update({ last_login: new Date().toISOString() }).eq('id', f.id); } catch (_) {} })();
      }
      return f;
    },
    logout:     () => localStorage.removeItem('ax_session'),
    getSession: () => { try { return JSON.parse(localStorage.getItem('ax_session')); } catch { return null; } },
    isLoggedIn: () => !!localStorage.getItem('ax_session'),
  };

  // ─────────────────────────────────────────────────────────────
  //  STUDENTS
  // ─────────────────────────────────────────────────────────────
  const students = {
    getList: async (year, section) => {
      const classId = _classMap[`${year}__${section}`];
      if (!classId) return [];
      const { data, error } = await _sb.from('students')
        .select('id, roll_no, name').eq('class_id', classId).eq('is_active', true).order('roll_no');
      if (error) { console.error('[AttendX] students.getList:', error); return []; }
      return (data || []).map(s => ({ id: s.id, rollNo: s.roll_no, name: s.name }));
    },

    addStudent: async (year, section, student) => {
      const classId = _classMap[`${year}__${section}`];
      if (!classId) return null;
      const sid = `stu_cust_${Date.now()}`;
      const { data, error } = await _sb.from('students')
        .insert({ id: sid, roll_no: student.rollNo, name: student.name, class_id: classId, department: 'CSE', status: 'active', is_active: true }).select().single();
      if (error) { console.error('[AttendX] students.addStudent:', error); return null; }
      _notify({ type: 'students' });
      return data;
    },

    removeStudent: async (year, section, rollNo) => {
      const { error } = await _sb.from('students').update({ is_active: false, status: 'inactive' }).eq('roll_no', rollNo);
      if (error) { console.error('[AttendX] students.removeStudent:', error); return false; }
      _notify({ type: 'students' });
      return true;
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  TIMETABLE
  // ─────────────────────────────────────────────────────────────
  function _rowsToTT(rows) {
    const tt = {};
    DAYS.forEach(day => {
      tt[day] = {};
      HOURS.forEach(h => { tt[day][h] = (h === '12:00') ? { type: 'break', label: 'Lunch Break' } : null; });
    });
    rows.forEach(r => {
      const cls = _classById[r.class_id];
      const sub = _subjectById[r.subject_id];
      if (cls && sub && tt[r.day]) {
        tt[r.day][r.start_time] = { year: cls.year, section: cls.section, subject: sub, ttId: r.id };
      }
    });
    return tt;
  }

  const timetable = {
    get: async (facultyId) => {
      const { data, error } = await _sb.from('timetable').select('*').eq('faculty_id', facultyId).eq('is_active', true);
      if (error) { console.error('[AttendX] timetable.get:', error); return {}; }
      return _rowsToTT(data || []);
    },

    save: async (facultyId, ttData) => {
      // Soft-delete existing timetable rows for this faculty
      await _sb.from('timetable').update({ is_active: false }).eq('faculty_id', facultyId);
      const rows = [];
      const ts = Date.now();
      DAYS.forEach(day => {
        HOURS.forEach(h => {
          if (h === '12:00') return;
          const cell = (ttData[day] || {})[h];
          if (!cell || cell.type === 'break') return;
          const classId   = _classMap[`${cell.year}__${cell.section}`];
          const subjectId = _subjectMap[cell.subject];
          if (!classId || !subjectId) return;
          const [hNum] = h.split(':');
          const endH = String(parseInt(hNum) + 1).padStart(2, '0') + ':00';
          const rowId = `tt_${facultyId}_${day}_${h}_${ts}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
          rows.push({ id: rowId, faculty_id: facultyId, class_id: classId, subject_id: subjectId, day, start_time: h, end_time: endH, is_active: true });
        });
      });
      if (rows.length) {
        const { error } = await _sb.from('timetable').insert(rows);
        if (error) { console.error('[AttendX] timetable.save:', error); return false; }
      }
      _notify({ type: 'timetable' });
      return true;
    },

    getToday: async (facultyId) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      const tt = await timetable.get(facultyId);
      return { day: today, schedule: tt[today] || {} };
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  const attendance = {
    save: async (date, year, section, subject, records, extraClassId = null) => {
      const classId   = _classMap[`${year}__${section}`];
      const subjectId = _subjectMap[subject];
      const sess      = auth.getSession();
      if (!classId || !subjectId || !sess) return null;

      const presentCount = records.filter(r => r.status === 'P').length;
      const absentCount  = records.filter(r => r.status === 'A').length;

      // Resolve faculty_id — must be a real DB id, fall back to session.userId
      const facultyId = sess.userId;

      // Check existing session (unique constraint: date + class_id + subject_id)
      const { data: existing } = await _sb.from('attendance_sessions')
        .select('id').eq('date', date).eq('class_id', classId).eq('subject_id', subjectId).maybeSingle();

      let sessionId;
      if (existing) {
        sessionId = existing.id;
        await _sb.from('attendance_sessions').update({
          total_students: records.length,
          present_count: presentCount,
          absent_count: absentCount,
          status: 'completed',
        }).eq('id', sessionId);
        await _sb.from('attendance_records').delete().eq('session_id', sessionId);
      } else {
        // Build a deterministic, collision-safe session ID
        sessionId = `sess_${date}_${classId}_${subjectId}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const { error } = await _sb.from('attendance_sessions').insert({
          id: sessionId, date, class_id: classId, subject_id: subjectId,
          faculty_id: facultyId, extra_class_id: extraClassId || null,
          is_extra: !!extraClassId, total_students: records.length,
          present_count: presentCount, absent_count: absentCount, status: 'completed',
        });
        if (error) {
          console.error('[AttendX] attendance.save (session):', error);
          // If unique constraint violation, reload the existing session id
          if (error.code === '23505') {
            const { data: retry } = await _sb.from('attendance_sessions')
              .select('id').eq('date', date).eq('class_id', classId).eq('subject_id', subjectId).maybeSingle();
            if (!retry) return null;
            sessionId = retry.id;
            await _sb.from('attendance_sessions').update({ total_students: records.length, present_count: presentCount, absent_count: absentCount, status: 'completed' }).eq('id', sessionId);
            await _sb.from('attendance_records').delete().eq('session_id', sessionId);
          } else { return null; }
        }
      }

      // Fetch student IDs by roll_no
      const { data: stuData } = await _sb.from('students').select('id, roll_no').in('roll_no', records.map(r => r.rollNo));
      const stuByRoll = {};
      (stuData || []).forEach(s => { stuByRoll[s.roll_no] = s.id; });

      const recRows = records.map(r => ({
        id: `rec_${sessionId}_${r.rollNo}`.replace(/[^a-zA-Z0-9_\-]/g, '_'),
        session_id: sessionId,
        student_id: stuByRoll[r.rollNo] || null,
        roll_no: r.rollNo,
        student_name: r.name,
        status: r.status,
        is_active: true,
      }));
      const { error: rErr } = await _sb.from('attendance_records').insert(recRows);
      if (rErr) { console.error('[AttendX] attendance.save (records):', rErr); return null; }

      if (extraClassId) {
        await _sb.from('extra_classes').update({ status: 'completed' }).eq('id', extraClassId);
      }
      _notify({ type: 'attendance', date });
      return sessionId;
    },

    get: async (date, year, section, subject) => {
      const classId   = _classMap[`${year}__${section}`];
      const subjectId = _subjectMap[subject];
      if (!classId || !subjectId) return null;
      const { data: s } = await _sb.from('attendance_sessions')
        .select('id').eq('date', date).eq('class_id', classId).eq('subject_id', subjectId).maybeSingle();
      if (!s) return null;
      const { data: recs } = await _sb.from('attendance_records')
        .select('roll_no, student_name, status').eq('session_id', s.id);
      return { date, year, section, subject, records: (recs || []).map(r => ({ rollNo: r.roll_no, name: r.student_name, status: r.status })) };
    },

    getByDate: async (date) => {
      const { data: sessions } = await _sb.from('attendance_sessions')
        .select('*').eq('date', date).eq('status', 'completed');
      if (!sessions?.length) return [];
      const result = [];
      for (const s of sessions) {
        const cls = _classById[s.class_id];
        const { data: recs } = await _sb.from('attendance_records')
          .select('roll_no, student_name, status').eq('session_id', s.id);
        result.push({
          date,
          year:    cls?.year    || '',
          section: cls?.section || '',
          subject: _subjectById[s.subject_id] || '',
          is_extra: s.is_extra,
          records: (recs || []).map(r => ({ rollNo: r.roll_no, name: r.student_name, status: r.status })),
        });
      }
      return result;
    },

    getDates: async () => {
      const { data } = await _sb.from('attendance_sessions').select('date').eq('status', 'completed');
      return [...new Set((data || []).map(d => d.date))].sort();
    },

    getStudentSummary: async (rollNo, year, section) => {
      const classId = _classMap[`${year}__${section}`];
      if (!classId) return {};
      const { data: sessions } = await _sb.from('attendance_sessions')
        .select('id, subject_id').eq('class_id', classId).eq('status', 'completed');
      if (!sessions?.length) return {};
      const { data: recs } = await _sb.from('attendance_records')
        .select('session_id, status').in('session_id', sessions.map(s => s.id)).eq('roll_no', rollNo);
      const result = {};
      (recs || []).forEach(rec => {
        const sub = _subjectById[sessions.find(s => s.id === rec.session_id)?.subject_id];
        if (!sub) return;
        if (!result[sub]) result[sub] = { total: 0, present: 0 };
        result[sub].total++;
        if (rec.status === 'P') result[sub].present++;
      });
      return result;
    },

    getAll: async () => {
      const { data: sessions } = await _sb.from('attendance_sessions').select('*').eq('status', 'completed');
      if (!sessions?.length) return [];
      const result = [];
      for (const s of sessions) {
        const cls = _classById[s.class_id];
        const { data: recs } = await _sb.from('attendance_records')
          .select('roll_no, student_name, status').eq('session_id', s.id);
        result.push({
          date:    s.date,
          year:    cls?.year    || '',
          section: cls?.section || '',
          subject: _subjectById[s.subject_id] || '',
          is_extra: s.is_extra,
          records: (recs || []).map(r => ({ rollNo: r.roll_no, name: r.student_name, status: r.status })),
        });
      }
      return result;
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  EXTRA CLASSES
  // ─────────────────────────────────────────────────────────────
  const extraClasses = {
    _enrich: (rows) => rows.map(ec => ({
      ...ec,
      className:   _classById[ec.class_id]    ? `${_classById[ec.class_id].year} – Sec ${_classById[ec.class_id].section}` : ec.class_id,
      subjectName: _subjectById[ec.subject_id] || ec.subject_id,
      cls:         _classById[ec.class_id],
    })),

    getAll: async (facultyId) => {
      const { data, error } = await _sb.from('extra_classes')
        .select('*').eq('faculty_id', facultyId).eq('is_active', true).order('date', { ascending: false });
      if (error) { console.error('[AttendX] extraClasses.getAll:', error); return []; }
      return extraClasses._enrich(data || []);
    },

    getToday: async (facultyId) => {
      const { data } = await _sb.from('extra_classes')
        .select('*').eq('faculty_id', facultyId).eq('date', utils.today()).eq('is_active', true).neq('status', 'cancelled');
      return extraClasses._enrich(data || []);
    },

    getUpcoming: async (facultyId) => {
      const { data } = await _sb.from('extra_classes')
        .select('*').eq('faculty_id', facultyId).gte('date', utils.today()).eq('is_active', true).neq('status', 'cancelled').order('date');
      return extraClasses._enrich(data || []);
    },

    schedule: async (d) => {
      const classId   = _classMap[`${d.year}__${d.section}`];
      const subjectId = _subjectMap[d.subject];
      const sess      = auth.getSession();
      if (!classId || !subjectId) { toast.show('Invalid class or subject', 'error'); return null; }
      const { data, error } = await _sb.from('extra_classes').insert({
        faculty_id: sess.userId, class_id: classId, subject_id: subjectId,
        date: d.date, start_time: d.startTime, end_time: d.endTime, reason: d.reason || '',
      }).select().single();
      if (error) { console.error('[AttendX] extraClasses.schedule:', error); toast.show('Schedule failed', 'error'); return null; }
      _notify({ type: 'extra_classes' });
      return data;
    },

    updateStatus: async (id, status) => {
      const { error } = await _sb.from('extra_classes').update({ status }).eq('id', id);
      if (error) { console.error('[AttendX] extraClasses.updateStatus:', error); return false; }
      _notify({ type: 'extra_classes', status });
      return true;
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  REPORTS
  // ─────────────────────────────────────────────────────────────
  const reports = {
    getClassReport: async (year, section, startDate, endDate, subject) => {
      const classId = _classMap[`${year}__${section}`];
      if (!classId) return [];
      let q = _sb.from('attendance_sessions').select('*').eq('class_id', classId).eq('status', 'completed').order('date');
      if (startDate) q = q.gte('date', startDate);
      if (endDate)   q = q.lte('date', endDate);
      if (subject)   { const sid = _subjectMap[subject]; if (sid) q = q.eq('subject_id', sid); }
      const { data: sessions } = await q;
      if (!sessions?.length) return [];
      const result = [];
      for (const s of sessions) {
        const { data: recs } = await _sb.from('attendance_records').select('roll_no, student_name, status').eq('session_id', s.id);
        result.push({
          date: s.date, year, section,
          subject: _subjectById[s.subject_id] || '',
          is_extra: s.is_extra,
          records: (recs || []).map(r => ({ rollNo: r.roll_no, name: r.student_name, status: r.status })),
        });
      }
      return result;
    },

    getStudentReport: async (year, section, startDate, endDate) => {
      const data = await reports.getClassReport(year, section, startDate, endDate);
      const map = {};
      data.forEach(rec => {
        rec.records.forEach(s => {
          if (!map[s.rollNo]) map[s.rollNo] = { rollNo: s.rollNo, name: s.name, subjects: {} };
          if (!map[s.rollNo].subjects[rec.subject]) map[s.rollNo].subjects[rec.subject] = { total: 0, present: 0 };
          map[s.rollNo].subjects[rec.subject].total++;
          if (s.status === 'P') map[s.rollNo].subjects[rec.subject].present++;
        });
      });
      return Object.values(map);
    },

    exportCSV: (data, filename) => {
      if (!data?.length) return;
      const keys = Object.keys(data[0]);
      const csv  = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const a    = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
        download: filename + '.csv',
      });
      a.click();
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  REALTIME
  // ─────────────────────────────────────────────────────────────
  const realtime = {
    _ch: null,
    _rtConnected: false,

    start: () => {
      if (realtime._ch) return;
      realtime._ch = _sb.channel('attendx-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'timetable' },           p => _notify({ type: 'timetable',     payload: p }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'extra_classes' },       p => _notify({ type: 'extra_classes', payload: p }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, p => _notify({ type: 'attendance',    payload: p }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' },  p => _notify({ type: 'attendance',    payload: p }))
        .subscribe((status) => {
          console.log('[AttendX] Realtime status:', status);
          realtime._rtConnected = status === 'SUBSCRIBED';
          // Update realtime dot in navbar if present
          const dot = document.getElementById('realtimeDot') || document.getElementById('rtDot');
          if (dot) {
            dot.className = realtime._rtConnected ? 'rt-dot live' : 'rt-dot';
            dot.title     = realtime._rtConnected ? 'Realtime: Live' : 'Realtime: Disconnected';
          }
        });
    },
    isLive:     () => realtime._rtConnected,
    onRefresh:  (key, fn) => { _cbs[key] = fn; },
    offRefresh: (key)     => { delete _cbs[key]; },
  };

  // ─────────────────────────────────────────────────────────────
  //  CONNECTION HEALTH
  // ─────────────────────────────────────────────────────────────
  const connection = {
    /** Returns current state: 'connecting' | 'connected' | 'error' */
    state: () => _connState,
    isConnected: () => _connState === 'connected',
    /** Register a callback that fires whenever state changes */
    onChange: (fn) => { _connCbs.push(fn); },
  };

  // ─────────────────────────────────────────────────────────────
  //  INIT – load lookup maps once on startup
  // ─────────────────────────────────────────────────────────────
  async function init() {
    _setConnState('connecting');
    try {
      // Race Supabase against a 6-second timeout
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
      const queries = Promise.all([
        _sb.from('classes').select('*').eq('is_active', true),
        _sb.from('subjects').select('*').eq('is_active', true),
        _sb.from('faculty').select('*').eq('is_active', true),
      ]);
      const [cR, sR, fR] = await Promise.race([queries, timeout]);

      // Network-level errors on ALL three = truly unreachable
      const allFailed = cR.error && sR.error && fR.error;
      if (allFailed) throw new Error(cR.error.message || 'Supabase unreachable');

      (cR.data || []).forEach(c => {
        _classMap[`${c.year}__${c.section}`] = c.id;
        _classById[c.id] = c;
      });
      (sR.data || []).forEach(s => {
        _subjectMap[s.name]  = s.id;
        _subjectById[s.id]   = s.name;
        if (s.year_applicable) {
          if (!_subjectsByYear[s.year_applicable]) _subjectsByYear[s.year_applicable] = [];
          _subjectsByYear[s.year_applicable].push(s.name);
        }
      });
      (fR.data || []).forEach(f => { _facultyMap[f.username] = f; });

      // If DB is empty (no seed data), use local fallback subjects/faculty
      if (!(sR.data || []).length) {
        _useLocalFallback = true;
        Object.entries(LOCAL_SUBJECTS_BY_YEAR).forEach(([yr, subs]) => {
          _subjectsByYear[yr] = subs;
          subs.forEach((name, i) => {
            const id = `local_sub_${yr.replace(/\s/g,'_')}_${i}`;
            _subjectMap[name] = id;
            _subjectById[id]  = name;
          });
        });
        console.warn('[AttendX] ⚠ Supabase DB empty — using local subject fallback');
      }
      if (!(fR.data || []).length) {
        _useLocalFallback = true;
        LOCAL_FACULTY.forEach(f => { _facultyMap[f.username] = f; });
        console.warn('[AttendX] ⚠ Supabase DB empty — using local faculty fallback');
      }

      _setConnState('connected');
      realtime.start();
      theme.apply();
      console.log(
        `[AttendX] ✅ Init – ${(cR.data||[]).length} classes, ${(sR.data||[]).length} subjects, ${(fR.data||[]).length} faculty`
      );
    } catch (err) {
      _useLocalFallback = true;
      // Populate local fallbacks so the app still works offline
      Object.entries(LOCAL_SUBJECTS_BY_YEAR).forEach(([yr, subs]) => {
        _subjectsByYear[yr] = subs;
        subs.forEach((name, i) => {
          const id = `local_sub_${yr}_${i}`;
          _subjectMap[name] = id;
          _subjectById[id]  = name;
        });
      });
      LOCAL_FACULTY.forEach(f => { _facultyMap[f.username] = f; });
      _setConnState('error');
      console.error('[AttendX] ❌ Supabase unreachable – offline mode active:', err.message);
      // Do NOT re-throw — app continues with local fallback
    }
    theme.apply();
  }

  return {
    auth, students, timetable, attendance, extraClasses, reports,
    realtime, theme, toast, utils, connection, init,
  };
})();
