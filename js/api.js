/**
 * AttendX – Production API Layer v3.0
 * Single source of truth: Supabase
 * All methods return { data, error } or typed results.
 */
const API = (function () {
  'use strict';

  // ── Supabase client (initialized after DOM load) ──────────────
  let _sb = null;

  function init(client) {
    _sb = client;
  }

  // ── Helpers ───────────────────────────────────────────────────
  const today = () => new Date().toISOString().slice(0, 10);
  const DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DAY_NOW = () => DAYS[new Date().getDay()];

  // ─────────────────────────────────────────────────────────────
  //  AUTH
  // ─────────────────────────────────────────────────────────────
  const auth = {
    /** Login via Supabase Auth (email/password) */
    signIn: async (email, password) => {
      const { data, error } = await _sb.auth.signInWithPassword({ email, password });
      if (error) return { data: null, error };
      // Load faculty profile
      const { data: profile } = await _sb.from('faculty')
        .select('*, departments(name, code)')
        .eq('auth_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!profile) return { data: null, error: new Error('Faculty profile not found. Contact admin.') };
      // Update last_login
      _sb.from('faculty').update({ last_login: new Date().toISOString() }).eq('id', profile.id).then(() => {});
      return { data: { session: data.session, profile }, error: null };
    },

    signOut: async () => _sb.auth.signOut(),

    getUser: async () => {
      const { data } = await _sb.auth.getUser();
      return data?.user || null;
    },

    getSession: async () => {
      const { data } = await _sb.auth.getSession();
      return data?.session || null;
    },

    onAuthStateChange: (fn) => _sb.auth.onAuthStateChange(fn),
  };

  // ─────────────────────────────────────────────────────────────
  //  FACULTY
  // ─────────────────────────────────────────────────────────────
  const faculty = {
    getProfile: async (authId) => {
      const { data, error } = await _sb.from('faculty')
        .select('*, departments(id, name, code)')
        .eq('auth_id', authId)
        .eq('is_active', true)
        .maybeSingle();
      return { data, error };
    },

    getById: async (id) => {
      const { data, error } = await _sb.from('faculty')
        .select('*, departments(id, name, code)')
        .eq('id', id)
        .maybeSingle();
      return { data, error };
    },

    getAll: async (deptId = null) => {
      let q = _sb.from('faculty')
        .select('*, departments(id, name, code)')
        .eq('is_active', true)
        .order('name');
      if (deptId) q = q.eq('department_id', deptId);
      return await q;
    },

    getByDept: async (deptId) => {
      return await _sb.from('faculty')
        .select('id, name, employee_id, role, designation, email')
        .eq('department_id', deptId)
        .eq('is_active', true)
        .order('name');
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  DEPARTMENTS
  // ─────────────────────────────────────────────────────────────
  const departments = {
    getAll: async () => {
      return await _sb.from('departments')
        .select('*, faculty!departments_hod_id_fkey(id, name)')
        .eq('is_active', true)
        .order('name');
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  SEMESTERS & ACADEMIC YEARS
  // ─────────────────────────────────────────────────────────────
  const semesters = {
    getCurrent: async () => {
      const { data, error } = await _sb.from('semesters')
        .select('*, academic_years(id, label)')
        .eq('is_current', true)
        .maybeSingle();
      return { data, error };
    },

    getAll: async () => {
      return await _sb.from('semesters')
        .select('*, academic_years(id, label)')
        .order('created_at', { ascending: false });
    },

    create: async (semData) => {
      return await _sb.from('semesters').insert(semData).select().single();
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  CLASS–SUBJECT MAPPINGS (the core scheduling entity)
  // ─────────────────────────────────────────────────────────────
  const mappings = {
    /** Get all mappings for a faculty in current semester */
    getForFaculty: async (facultyId, semesterId) => {
      const { data, error } = await _sb.from('class_subject_mapping')
        .select(`
          id, is_active,
          classes(id, year, section, room, strength),
          subjects(id, name, code, type, credits),
          faculty(id, name)
        `)
        .eq('faculty_id', facultyId)
        .eq('semester_id', semesterId)
        .eq('is_active', true)
        .order('classes(year), classes(section)');
      return { data, error };
    },

    getForClass: async (classId, semesterId) => {
      const { data, error } = await _sb.from('class_subject_mapping')
        .select(`
          id, is_active,
          subjects(id, name, code, type, credits),
          faculty(id, name, employee_id)
        `)
        .eq('class_id', classId)
        .eq('semester_id', semesterId)
        .eq('is_active', true);
      return { data, error };
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  TIMETABLE
  // ─────────────────────────────────────────────────────────────
  const timetable = {
    /** Get today's schedule for a faculty */
    getToday: async (facultyId, semesterId) => {
      const dayName = DAY_NOW();
      const { data, error } = await _sb.from('timetable')
        .select(`
          id, day, start_time, end_time, room,
          class_subject_mapping!inner(
            id,
            classes(id, year, section, strength),
            subjects(id, name, code),
            faculty(id, name)
          )
        `)
        .eq('class_subject_mapping.faculty_id', facultyId)
        .eq('class_subject_mapping.semester_id', semesterId)
        .eq('class_subject_mapping.is_active', true)
        .eq('day', dayName)
        .eq('is_active', true)
        .order('start_time');
      return { data: data || [], error };
    },

    getWeekly: async (facultyId, semesterId) => {
      const { data, error } = await _sb.from('timetable')
        .select(`
          id, day, start_time, end_time, room,
          class_subject_mapping!inner(
            id,
            classes(id, year, section),
            subjects(id, name, code),
            faculty(id, name)
          )
        `)
        .eq('class_subject_mapping.faculty_id', facultyId)
        .eq('class_subject_mapping.semester_id', semesterId)
        .eq('class_subject_mapping.is_active', true)
        .eq('is_active', true)
        .order('day')
        .order('start_time');
      return { data: data || [], error };
    },

    save: async (entries) => {
      return await _sb.from('timetable').upsert(entries, { onConflict: 'id' });
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  STUDENTS
  // ─────────────────────────────────────────────────────────────
  const students = {
    getByClass: async (classId) => {
      const { data, error } = await _sb.from('students')
        .select('id, roll_no, name, gender, status')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('roll_no');
      return { data: data || [], error };
    },

    getByClassSemester: async (classId, semesterId) => {
      const { data, error } = await _sb.from('students')
        .select('id, roll_no, name, gender, status, batch')
        .eq('class_id', classId)
        .eq('semester_id', semesterId)
        .eq('is_active', true)
        .order('roll_no');
      return { data: data || [], error };
    },

    add: async (student) => {
      return await _sb.from('students').insert(student).select().single();
    },

    bulkInsert: async (rows) => {
      return await _sb.from('students').upsert(rows, { onConflict: 'semester_id,roll_no', ignoreDuplicates: false });
    },

    deactivate: async (id) => {
      return await _sb.from('students').update({ is_active: false, status: 'inactive' }).eq('id', id);
    },

    search: async (query, semesterId) => {
      let q = _sb.from('students')
        .select('id, roll_no, name, classes(year, section)')
        .eq('is_active', true)
        .order('roll_no')
        .limit(20);
      if (semesterId) q = q.eq('semester_id', semesterId);
      q = q.or(`name.ilike.%${query}%,roll_no.ilike.%${query}%`);
      return await q;
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  const attendance = {
    /** Check if a session already exists (dedup) */
    getSession: async (mappingId, date) => {
      const { data, error } = await _sb.from('attendance_sessions')
        .select('id, status, present_count, absent_count, total_students')
        .eq('class_subject_mapping_id', mappingId)
        .eq('date', date)
        .maybeSingle();
      return { data, error };
    },

    /** Get existing records for a session */
    getSessionRecords: async (sessionId) => {
      const { data, error } = await _sb.from('attendance_records')
        .select('id, student_id, roll_no, status, marked_at')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('roll_no');
      return { data: data || [], error };
    },

    /** Save or update a full attendance session */
    saveSession: async ({ mappingId, timetableId, date, startTime, endTime, facultyId, records, isExtra, notes }) => {
      const presentCount = records.filter(r => r.status === 'P').length;
      const absentCount  = records.filter(r => r.status === 'A').length;

      // Check existing
      const { data: existing } = await _sb.from('attendance_sessions')
        .select('id')
        .eq('class_subject_mapping_id', mappingId)
        .eq('date', date)
        .maybeSingle();

      let sessionId;
      if (existing) {
        sessionId = existing.id;
        await _sb.from('attendance_sessions').update({
          present_count: presentCount,
          absent_count: absentCount,
          total_students: records.length,
          status: 'completed',
          notes: notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', sessionId);
        await _sb.from('attendance_records').delete().eq('session_id', sessionId);
      } else {
        const { data: sess, error: sErr } = await _sb.from('attendance_sessions').insert({
          class_subject_mapping_id: mappingId,
          timetable_id: timetableId || null,
          date, start_time: startTime || null, end_time: endTime || null,
          faculty_id: facultyId,
          total_students: records.length,
          present_count: presentCount,
          absent_count: absentCount,
          is_extra: !!isExtra,
          status: 'completed',
          notes: notes || null,
        }).select('id').single();
        if (sErr) return { data: null, error: sErr };
        sessionId = sess.id;
      }

      // Insert records
      const recRows = records.map(r => ({
        session_id: sessionId,
        student_id: r.studentId,
        roll_no: r.rollNo,
        status: r.status,
        marked_by: facultyId,
        marked_at: new Date().toISOString(),
      }));
      const { error: rErr } = await _sb.from('attendance_records').insert(recRows);
      if (rErr) return { data: null, error: rErr };
      return { data: sessionId, error: null };
    },

    /** Get all sessions for a date */
    getByDate: async (date, facultyId = null) => {
      let q = _sb.from('attendance_sessions')
        .select(`
          id, date, present_count, absent_count, total_students, status, is_extra,
          class_subject_mapping(
            classes(year, section),
            subjects(name, code)
          )
        `)
        .eq('date', date)
        .eq('status', 'completed');
      if (facultyId) q = q.eq('faculty_id', facultyId);
      return await q;
    },

    /** Get all recorded dates */
    getDates: async (facultyId = null) => {
      let q = _sb.from('attendance_sessions')
        .select('date')
        .eq('status', 'completed')
        .order('date', { ascending: false });
      if (facultyId) q = q.eq('faculty_id', facultyId);
      const { data } = await q;
      return [...new Set((data || []).map(d => d.date))];
    },

    /** Attendance summary per student per subject */
    getStudentSummary: async (studentId) => {
      const { data, error } = await _sb.from('vw_student_attendance_summary')
        .select('*')
        .eq('student_id', studentId);
      return { data: data || [], error };
    },

    /** Class-wise report */
    getClassReport: async ({ classId, semesterId, startDate, endDate, subjectId } = {}) => {
      let q = _sb.from('attendance_sessions')
        .select(`
          id, date, present_count, absent_count, total_students, is_extra, status,
          class_subject_mapping!inner(
            class_id,
            semester_id,
            classes(id, year, section),
            subjects(id, name, code),
            faculty(id, name)
          )
        `)
        .eq('status', 'completed')
        .order('date', { ascending: false });
      if (classId)   q = q.eq('class_subject_mapping.class_id', classId);
      if (semesterId) q = q.eq('class_subject_mapping.semester_id', semesterId);
      if (subjectId)  q = q.eq('class_subject_mapping.subject_id', subjectId);
      if (startDate)  q = q.gte('date', startDate);
      if (endDate)    q = q.lte('date', endDate);
      return await q;
    },

    /** Low attendance list (< 75%) */
    getLowAttendance: async (threshold = 75) => {
      const { data, error } = await _sb.from('vw_low_attendance')
        .select('*')
        .order('attendance_pct');
      return { data: data || [], error };
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  ANALYTICS / WORKLOAD
  // ─────────────────────────────────────────────────────────────
  const analytics = {
    getFacultyWorkload: async (deptId = null) => {
      let q = _sb.from('vw_faculty_workload').select('*').order('faculty_name');
      return await q;
    },

    getDashboardStats: async (facultyId, semesterId) => {
      const todayStr = today();
      const [sessions, pending, lowAtt] = await Promise.all([
        _sb.from('attendance_sessions').select('id, status', { count: 'exact' })
           .eq('faculty_id', facultyId).eq('date', todayStr),
        _sb.from('attendance_sessions').select('id', { count: 'exact' })
           .eq('faculty_id', facultyId).eq('date', todayStr).eq('status', 'draft'),
        _sb.from('vw_low_attendance').select('student_id', { count: 'exact' }),
      ]);
      return {
        todaySessions:  sessions.count || 0,
        pendingToday:   pending.count || 0,
        lowAttStudents: lowAtt.count || 0,
      };
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  SUBJECT COVERAGE
  // ─────────────────────────────────────────────────────────────
  const coverage = {
    getByMapping: async (mappingId) => {
      const { data, error } = await _sb.from('subject_coverage')
        .select('*')
        .eq('class_subject_mapping_id', mappingId)
        .order('unit_number');
      return { data: data || [], error };
    },

    upsert: async (unit) => {
      return await _sb.from('subject_coverage')
        .upsert(unit, { onConflict: 'class_subject_mapping_id,unit_number' })
        .select()
        .single();
    },

    delete: async (id) => {
      return await _sb.from('subject_coverage').delete().eq('id', id);
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  HOLIDAYS & CALENDAR
  // ─────────────────────────────────────────────────────────────
  const holidays = {
    getAll: async (ayId = null) => {
      let q = _sb.from('holidays').select('*').order('date');
      if (ayId) q = q.eq('academic_year_id', ayId);
      const { data } = await q;
      return data || [];
    },

    isHoliday: async (dateStr) => {
      const { data } = await _sb.from('holidays').select('id').eq('date', dateStr).maybeSingle();
      return !!data;
    },

    add: async (holiday) => {
      return await _sb.from('holidays').insert(holiday).select().single();
    },

    delete: async (id) => {
      return await _sb.from('holidays').delete().eq('id', id);
    },

    getUpcoming: async (limit = 5) => {
      const { data } = await _sb.from('holidays')
        .select('date, name, type')
        .gte('date', today())
        .order('date')
        .limit(limit);
      return data || [];
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  const notifications = {
    getUnread: async (userId) => {
      const { data } = await _sb.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },

    getAll: async (userId) => {
      const { data } = await _sb.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },

    markRead: async (id) => {
      return await _sb.from('notifications').update({ is_read: true }).eq('id', id);
    },

    markAllRead: async (userId) => {
      return await _sb.from('notifications').update({ is_read: true }).eq('user_id', userId);
    },

    create: async (notif) => {
      return await _sb.from('notifications').insert(notif).select().single();
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  ATTENDANCE CORRECTIONS
  // ─────────────────────────────────────────────────────────────
  const corrections = {
    request: async ({ recordId, sessionId, studentId, oldStatus, newStatus, reason, requestedBy }) => {
      return await _sb.from('attendance_corrections').insert({
        record_id: recordId, session_id: sessionId, student_id: studentId,
        old_status: oldStatus, new_status: newStatus, reason,
        requested_by: requestedBy, status: 'pending',
      }).select().single();
    },

    getPending: async () => {
      const { data, error } = await _sb.from('attendance_corrections')
        .select(`
          *, students(name, roll_no),
          faculty!attendance_corrections_requested_by_fkey(name),
          attendance_sessions(date, class_subject_mapping(classes(year,section), subjects(name)))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return { data: data || [], error };
    },

    approve: async (id, approvedBy, newStatus) => {
      // Update correction record
      await _sb.from('attendance_corrections').update({
        status: 'approved', approved_by: approvedBy,
      }).eq('id', id);
      // Get record id and update
      const { data: corr } = await _sb.from('attendance_corrections').select('record_id').eq('id', id).single();
      if (corr?.record_id) {
        await _sb.from('attendance_records').update({ status: newStatus }).eq('id', corr.record_id);
      }
    },

    reject: async (id, approvedBy) => {
      return await _sb.from('attendance_corrections').update({
        status: 'rejected', approved_by: approvedBy,
      }).eq('id', id);
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  FACULTY SUBSTITUTIONS
  // ─────────────────────────────────────────────────────────────
  const substitutions = {
    create: async (sub) => {
      return await _sb.from('faculty_substitutions').insert(sub).select().single();
    },

    getActive: async (facultyId) => {
      const { data } = await _sb.from('faculty_substitutions')
        .select(`
          *,
          faculty!faculty_substitutions_substitute_faculty_id_fkey(name),
          class_subject_mapping(classes(year,section), subjects(name))
        `)
        .eq('original_faculty_id', facultyId)
        .eq('status', 'active')
        .gte('date', today());
      return data || [];
    },

    expire: async (id) => {
      return await _sb.from('faculty_substitutions').update({ status: 'expired' }).eq('id', id);
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  GLOBAL SEARCH
  // ─────────────────────────────────────────────────────────────
  const search = {
    global: async (query, semesterId) => {
      if (!query || query.length < 2) return { students: [], faculty: [] };
      const [studRes, facRes] = await Promise.all([
        _sb.from('students')
          .select('id, roll_no, name, classes(year, section)')
          .eq('is_active', true)
          .or(`name.ilike.%${query}%,roll_no.ilike.%${query}%`)
          .limit(10),
        _sb.from('faculty')
          .select('id, name, employee_id, role, departments(name)')
          .eq('is_active', true)
          .ilike('name', `%${query}%`)
          .limit(5),
      ]);
      return {
        students: studRes.data || [],
        faculty:  facRes.data  || [],
      };
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  APP SETTINGS
  // ─────────────────────────────────────────────────────────────
  const settings = {
    get: async (key) => {
      const { data } = await _sb.from('app_settings').select('value').eq('key', key).maybeSingle();
      return data?.value ?? null;
    },
    set: async (key, value, updatedBy) => {
      return await _sb.from('app_settings')
        .upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  REALTIME
  // ─────────────────────────────────────────────────────────────
  const realtime = {
    _channels: [],

    subscribe: (table, callback) => {
      const ch = _sb.channel(`ax-${table}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
      realtime._channels.push(ch);
      return ch;
    },

    unsubscribeAll: () => {
      realtime._channels.forEach(ch => _sb.removeChannel(ch));
      realtime._channels = [];
    },
  };

  // ─────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────
  return {
    init,
    auth,
    faculty,
    departments,
    semesters,
    mappings,
    timetable,
    students,
    attendance,
    analytics,
    coverage,
    holidays,
    notifications,
    corrections,
    substitutions,
    search,
    settings,
    realtime,
    today,
  };
})();
