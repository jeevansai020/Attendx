/**
 * AttendX - Database Utility Layer v2.0
 * All reads/writes go through this module.
 * Depends on: schema.js  (AX_KEYS, AX_SEED must be loaded first)
 */

'use strict';

const AttendXDB = (function () {

  // ─────────────────────────────────────────
  //  LOW-LEVEL STORAGE ADAPTER
  // ─────────────────────────────────────────
  const store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) { console.error('[AttendXDB] Storage write failed:', key, e); }
    },
    remove(key) { localStorage.removeItem(key); },
  };

  // ─────────────────────────────────────────
  //  ID GENERATORS
  // ─────────────────────────────────────────
  const _pad   = (n, l = 3) => String(n).padStart(l, '0');
  const _nextId = (prefix, collection) => {
    const items = store.get(collection, []);
    const nums  = items.map(i => parseInt((i.id || '').replace(/\D/g, '') || 0));
    return `${prefix}_${_pad(Math.max(0, ...nums) + 1)}`;
  };
  const _ts = () => new Date().toISOString();

  // ─────────────────────────────────────────
  //  INITIALISE (seed if first run)
  // ─────────────────────────────────────────
  function init() {
    Object.entries(AX_SEED).forEach(([key, value]) => {
      if (store.get(key) === null) store.set(key, value);
    });
  }

  // ─────────────────────────────────────────
  //  INDEX HELPERS
  // ─────────────────────────────────────────
  const idx = {
    get()            { return store.get(AX_KEYS.INDEXES, {}); },
    save(indexes)    { store.set(AX_KEYS.INDEXES, indexes); },

    addToList(section, key, value) {
      const all = idx.get();
      if (!all[section])      all[section] = {};
      if (!all[section][key]) all[section][key] = [];
      if (!all[section][key].includes(value)) all[section][key].push(value);
      idx.save(all);
    },

    removeFromList(section, key, value) {
      const all = idx.get();
      if (all[section]?.[key])
        all[section][key] = all[section][key].filter(v => v !== value);
      idx.save(all);
    },

    setUnique(section, key, value) {
      const all = idx.get();
      if (!all[section]) all[section] = {};
      all[section][key] = value;
      idx.save(all);
    },

    getUnique(section, key) {
      return idx.get()[section]?.[key] ?? null;
    },

    getList(section, key) {
      return idx.get()[section]?.[key] ?? [];
    },
  };

  // ─────────────────────────────────────────
  //  AUDIT LOG
  // ─────────────────────────────────────────
  function auditLog(entityType, entityId, action, before, after, actorId) {
    const logs = store.get(AX_KEYS.AUDIT_LOG, []);
    logs.push({
      id: `log_${Date.now()}`,
      entityType, entityId, action,
      before: before ?? null,
      after:  after  ?? null,
      actorId: actorId ?? 'system',
      timestamp: _ts(),
    });
    // Keep last 500 entries only
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    store.set(AX_KEYS.AUDIT_LOG, logs);
  }

  // ─────────────────────────────────────────
  //  GENERIC CRUD HELPERS
  // ─────────────────────────────────────────
  const crud = {
    all(key)        { return store.get(key, []); },
    byId(key, id)   { return crud.all(key).find(r => r.id === id) ?? null; },
    active(key)     { return crud.all(key).filter(r => r.isActive !== false); },

    insert(key, record, actorId) {
      const all = crud.all(key);
      const now = _ts();
      const newRecord = { ...record, createdAt: now, updatedAt: now, isActive: true };
      all.push(newRecord);
      store.set(key, all);
      auditLog(key, newRecord.id, 'INSERT', null, newRecord, actorId);
      return newRecord;
    },

    update(key, id, patch, actorId) {
      const all = crud.all(key);
      const i   = all.findIndex(r => r.id === id);
      if (i === -1) return null;
      const before = { ...all[i] };
      all[i] = { ...all[i], ...patch, updatedAt: _ts() };
      store.set(key, all);
      auditLog(key, id, 'UPDATE', before, all[i], actorId);
      return all[i];
    },

    softDelete(key, id, actorId) {
      return crud.update(key, id, { isActive: false, status: 'inactive' }, actorId);
    },
  };

  // ─────────────────────────────────────────
  //  FACULTY API
  // ─────────────────────────────────────────
  const faculty = {
    all:   ()  => crud.active(AX_KEYS.FACULTY),
    byId:  (id)=> crud.byId(AX_KEYS.FACULTY, id),
    byUsername: (username) => faculty.all().find(f => f.username === username) ?? null,

    login(username, password) {
      const f = faculty.byUsername(username);
      if (!f || f.password !== password) return null;
      crud.update(AX_KEYS.FACULTY, f.id, { lastLogin: _ts() });
      return f;
    },

    add(data, actorId) {
      const id = _nextId('fac', AX_KEYS.FACULTY);
      return crud.insert(AX_KEYS.FACULTY, { id, ...data }, actorId);
    },

    update: (id, patch, actorId) => crud.update(AX_KEYS.FACULTY, id, patch, actorId),
    remove: (id, actorId)        => crud.softDelete(AX_KEYS.FACULTY, id, actorId),
  };

  // ─────────────────────────────────────────
  //  CLASSES API
  // ─────────────────────────────────────────
  const classes = {
    all:   ()   => crud.active(AX_KEYS.CLASSES),
    byId:  (id) => crud.byId(AX_KEYS.CLASSES, id),
    byDept:(dept)=> classes.all().filter(c => c.department === dept || dept === 'All'),

    add(data, actorId) {
      const id = `class_${data.year.charAt(0)}_${data.section}`.replace(/\s/g, '');
      if (crud.byId(AX_KEYS.CLASSES, id)) return crud.byId(AX_KEYS.CLASSES, id);
      return crud.insert(AX_KEYS.CLASSES, { id, ...data }, actorId);
    },

    update: (id, patch, actorId) => crud.update(AX_KEYS.CLASSES, id, patch, actorId),
    remove: (id, actorId)        => crud.softDelete(AX_KEYS.CLASSES, id, actorId),
  };

  // ─────────────────────────────────────────
  //  SUBJECTS API
  // ─────────────────────────────────────────
  const subjects = {
    all:    ()    => crud.active(AX_KEYS.SUBJECTS),
    byId:   (id)  => crud.byId(AX_KEYS.SUBJECTS, id),
    byDept: (dept)=> subjects.all().filter(s => s.department === dept || dept === 'All'),

    add(data, actorId) {
      const id = _nextId('sub', AX_KEYS.SUBJECTS);
      return crud.insert(AX_KEYS.SUBJECTS, { id, ...data }, actorId);
    },

    update: (id, patch, actorId) => crud.update(AX_KEYS.SUBJECTS, id, patch, actorId),
    remove: (id, actorId)        => crud.softDelete(AX_KEYS.SUBJECTS, id, actorId),
  };

  // ─────────────────────────────────────────
  //  STUDENTS API
  // ─────────────────────────────────────────
  const students = {
    all:     ()       => crud.active(AX_KEYS.STUDENTS),
    byId:    (id)     => crud.byId(AX_KEYS.STUDENTS, id),
    byRoll:  (rollNo) => students.all().find(s => s.rollNo === rollNo) ?? null,

    /** Fast lookup via index */
    byClass(classId) {
      const ids = idx.getList('class_student_index', classId);
      if (ids.length) {
        const all = students.all();
        return ids.map(id => all.find(s => s.id === id)).filter(Boolean);
      }
      return students.all().filter(s => s.classId === classId);
    },

    add(data, actorId) {
      const id = _nextId('stu', AX_KEYS.STUDENTS);
      const record = crud.insert(AX_KEYS.STUDENTS, { id, ...data }, actorId);
      idx.addToList('class_student_index', record.classId, record.id);
      return record;
    },

    update(id, patch, actorId) {
      const before = students.byId(id);
      const updated = crud.update(AX_KEYS.STUDENTS, id, patch, actorId);
      // Re-index if classId changed
      if (patch.classId && before?.classId !== patch.classId) {
        idx.removeFromList('class_student_index', before.classId, id);
        idx.addToList('class_student_index', patch.classId, id);
      }
      return updated;
    },

    remove(id, actorId) {
      const s = students.byId(id);
      if (s) idx.removeFromList('class_student_index', s.classId, id);
      return crud.softDelete(AX_KEYS.STUDENTS, id, actorId);
    },
  };

  // ─────────────────────────────────────────
  //  CLASS–SUBJECT MAPPING API
  // ─────────────────────────────────────────
  const classSubjectMap = {
    all:    ()         => crud.active(AX_KEYS.CLASS_SUBJECT_MAP),
    byId:   (id)       => crud.byId(AX_KEYS.CLASS_SUBJECT_MAP, id),
    byClass:(classId)  => classSubjectMap.all().filter(m => m.classId === classId),

    /** Returns subjects (with faculty) for a class */
    getSubjectsByClass(classId) {
      const mappings = classSubjectMap.byClass(classId);
      return mappings.map(m => ({
        mapping:  m,
        subject:  subjects.byId(m.subjectId),
        faculty:  faculty.byId(m.facultyId),
      })).filter(r => r.subject);
    },

    add(data, actorId) {
      const id = _nextId('map', AX_KEYS.CLASS_SUBJECT_MAP);
      return crud.insert(AX_KEYS.CLASS_SUBJECT_MAP, { id, ...data }, actorId);
    },

    remove: (id, actorId) => crud.softDelete(AX_KEYS.CLASS_SUBJECT_MAP, id, actorId),
  };

  // ─────────────────────────────────────────
  //  TIMETABLE API
  // ─────────────────────────────────────────
  const timetable = {
    all:        ()          => crud.active(AX_KEYS.TIMETABLE),
    byId:       (id)        => crud.byId(AX_KEYS.TIMETABLE, id),
    byFaculty:  (facultyId) => timetable.all().filter(t => t.facultyId === facultyId),

    /** Get a faculty's schedule for a specific day */
    getFacultySchedule(facultyId, day) {
      return timetable.all()
        .filter(t => t.facultyId === facultyId && t.day === day)
        .map(t => ({
          ...t,
          class:   classes.byId(t.classId),
          subject: subjects.byId(t.subjectId),
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },

    getTodaySchedule(facultyId) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return timetable.getFacultySchedule(facultyId, days[new Date().getDay()]);
    },

    add(data, actorId) {
      const id = _nextId('tt', AX_KEYS.TIMETABLE);
      return crud.insert(AX_KEYS.TIMETABLE, { id, ...data }, actorId);
    },

    update: (id, patch, actorId) => crud.update(AX_KEYS.TIMETABLE, id, patch, actorId),
    remove: (id, actorId)        => crud.softDelete(AX_KEYS.TIMETABLE, id, actorId),
  };

  // ─────────────────────────────────────────
  //  ATTENDANCE SESSIONS API
  // ─────────────────────────────────────────
  const sessions = {
    all:   ()   => crud.active(AX_KEYS.ATT_SESSIONS),
    byId:  (id) => crud.byId(AX_KEYS.ATT_SESSIONS, id),

    /** Duplicate guard: (date + classId + subjectId) must be unique */
    findDuplicate(date, classId, subjectId) {
      const key = `${date}|${classId}|${subjectId}`;
      const existingId = idx.getUnique('session_unique_index', key);
      return existingId ? sessions.byId(existingId) : null;
    },

    byDate(date) {
      const ids = idx.getList('attendance_sessions_index', date);
      if (ids.length) {
        const all = sessions.all();
        return ids.map(id => all.find(s => s.id === id)).filter(Boolean);
      }
      return sessions.all().filter(s => s.date === date);
    },

    byClass: (classId) => sessions.all().filter(s => s.classId === classId),

    /**
     * Create a new attendance session.
     * @returns {object} { session, isExisting }
     */
    create({ date, classId, subjectId, facultyId, timetableId = null }, actorId) {
      // Constraint: prevent duplicate session
      const existing = sessions.findDuplicate(date, classId, subjectId);
      if (existing) return { session: existing, isExisting: true };

      // Validate classId references
      if (!classes.byId(classId))    throw new Error(`Class not found: ${classId}`);
      if (!subjects.byId(subjectId)) throw new Error(`Subject not found: ${subjectId}`);
      if (!faculty.byId(facultyId))  throw new Error(`Faculty not found: ${facultyId}`);

      const totalStudents = students.byClass(classId).length;
      const id = _nextId('att', AX_KEYS.ATT_SESSIONS);
      const session = crud.insert(AX_KEYS.ATT_SESSIONS, {
        id, date, classId, subjectId, facultyId,
        timetableId, totalStudents,
        presentCount: 0, absentCount: 0,
        status: 'pending',
      }, actorId);

      // Update indexes
      idx.addToList('attendance_sessions_index', date, id);
      idx.addToList('faculty_sessions_index', facultyId, id);
      idx.setUnique('session_unique_index', `${date}|${classId}|${subjectId}`, id);

      return { session, isExisting: false };
    },

    update: (id, patch, actorId) => crud.update(AX_KEYS.ATT_SESSIONS, id, patch, actorId),
  };

  // ─────────────────────────────────────────
  //  ATTENDANCE RECORDS API
  // ─────────────────────────────────────────
  const records = {
    all:        ()          => store.get(AX_KEYS.ATT_RECORDS, []),
    byId:       (id)        => records.all().find(r => r.id === id) ?? null,

    bySession(sessionId) {
      const ids = idx.getList('session_records_index', sessionId);
      if (ids.length) {
        const all = records.all();
        return ids.map(id => all.find(r => r.id === id)).filter(Boolean);
      }
      return records.all().filter(r => r.sessionId === sessionId);
    },

    byStudent(studentId) {
      const ids = idx.getList('student_attendance_index', studentId);
      if (ids.length) {
        const all = records.all();
        return ids.map(id => all.find(r => r.id === id)).filter(Boolean);
      }
      return records.all().filter(r => r.studentId === studentId);
    },

    /**
     * Mark a student's attendance for a session.
     * Handles versioning: if record exists, increments version.
     */
    mark(sessionId, studentId, status, actorId) {
      const validStatuses = ['present', 'absent'];
      if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

      const session = sessions.byId(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);

      // Constraint: student must belong to session's class
      const student = students.byId(studentId);
      if (!student) throw new Error(`Student not found: ${studentId}`);
      if (student.classId !== session.classId)
        throw new Error(`Student ${studentId} does not belong to class ${session.classId}`);

      const all = records.all();
      const existingIdx = all.findIndex(r => r.sessionId === sessionId && r.studentId === studentId);

      let record;
      if (existingIdx !== -1) {
        // Update with versioning
        const before = { ...all[existingIdx] };
        all[existingIdx] = {
          ...all[existingIdx],
          status,
          timestamp: _ts(),
          version: (all[existingIdx].version || 1) + 1,
        };
        store.set(AX_KEYS.ATT_RECORDS, all);
        auditLog(AX_KEYS.ATT_RECORDS, all[existingIdx].id, 'UPDATE', before, all[existingIdx], actorId);
        record = all[existingIdx];
      } else {
        // New record
        const id  = `rec_${Date.now()}`;
        record = {
          id, sessionId, studentId, status,
          timestamp: _ts(), version: 1, isActive: true,
        };
        all.push(record);
        store.set(AX_KEYS.ATT_RECORDS, all);
        auditLog(AX_KEYS.ATT_RECORDS, id, 'INSERT', null, record, actorId);
        idx.addToList('session_records_index', sessionId, id);
        idx.addToList('student_attendance_index', studentId, id);
      }

      return record;
    },
  };

  // ─────────────────────────────────────────
  //  FINALIZE SESSION
  // ─────────────────────────────────────────
  function finalizeAttendance(sessionId, actorId) {
    const session = sessions.byId(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (session.status === 'completed') return session;

    const sessionRecords = records.bySession(sessionId);
    const presentCount   = sessionRecords.filter(r => r.status === 'present').length;
    const absentCount    = sessionRecords.filter(r => r.status === 'absent').length;

    return sessions.update(sessionId, {
      presentCount, absentCount,
      totalStudents: sessionRecords.length,
      status: 'completed',
    }, actorId);
  }

  // ─────────────────────────────────────────
  //  QUERY / REPORT FUNCTIONS
  // ─────────────────────────────────────────
  const queries = {

    /** Get all absentees for a class on a given date */
    getAbsenteesByClassAndDate(classId, date) {
      const sessionsOnDate = sessions.byDate(date).filter(s => s.classId === classId);
      const result = [];
      sessionsOnDate.forEach(session => {
        const absent = records.bySession(session.id).filter(r => r.status === 'absent');
        absent.forEach(rec => {
          result.push({
            session,
            student: students.byId(rec.studentId),
            subject: subjects.byId(session.subjectId),
            record: rec,
          });
        });
      });
      return result;
    },

    /** Calculate attendance percentage for a student */
    getStudentReport(studentId) {
      const student = students.byId(studentId);
      if (!student) return null;

      const studentRecords = records.byStudent(studentId);
      const subjectMap = {};

      studentRecords.forEach(rec => {
        const session = sessions.byId(rec.sessionId);
        if (!session) return;
        const key = session.subjectId;
        if (!subjectMap[key]) {
          subjectMap[key] = {
            subject: subjects.byId(key),
            total: 0, present: 0, absent: 0,
          };
        }
        subjectMap[key].total++;
        if (rec.status === 'present') subjectMap[key].present++;
        else subjectMap[key].absent++;
      });

      const subjectStats = Object.values(subjectMap).map(s => ({
        ...s,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
      }));

      const overall = subjectStats.reduce(
        (acc, s) => { acc.total += s.total; acc.present += s.present; return acc; },
        { total: 0, present: 0 }
      );

      return {
        student,
        subjects: subjectStats,
        overall: {
          ...overall,
          percentage: overall.total > 0 ? Math.round((overall.present / overall.total) * 100) : 0,
        },
      };
    },

    /** Full report for a class across all sessions */
    getClassReport(classId, filters = {}) {
      let classSessions = sessions.byClass(classId);
      if (filters.subjectId)  classSessions = classSessions.filter(s => s.subjectId === filters.subjectId);
      if (filters.startDate)  classSessions = classSessions.filter(s => s.date >= filters.startDate);
      if (filters.endDate)    classSessions = classSessions.filter(s => s.date <= filters.endDate);
      if (filters.status)     classSessions = classSessions.filter(s => s.status === filters.status);

      return classSessions
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(session => ({
          session,
          subject:       subjects.byId(session.subjectId),
          facultyMember: faculty.byId(session.facultyId),
          records:       records.bySession(session.id),
        }));
    },

    /** Total classes conducted for a class (optionally per subject) */
    getTotalClassesConducted(classId, subjectId = null) {
      let classSessions = sessions.byClass(classId).filter(s => s.status === 'completed');
      if (subjectId) classSessions = classSessions.filter(s => s.subjectId === subjectId);
      return classSessions.length;
    },

    /** Get all sessions on a specific date */
    getAttendanceByDate: (date) => sessions.byDate(date),

    /** Get students below minimum attendance threshold */
    getLowAttendanceStudents(classId, threshold = null) {
      const settings = store.get(AX_KEYS.SETTINGS, {});
      const minPct = threshold ?? settings.minAttendancePct ?? 75;
      const classStudents = students.byClass(classId);
      return classStudents
        .map(s => queries.getStudentReport(s.id))
        .filter(r => r && r.overall.percentage < minPct)
        .sort((a, b) => a.overall.percentage - b.overall.percentage);
    },
  };

  // ─────────────────────────────────────────
  //  CSV EXPORT
  // ─────────────────────────────────────────
  function exportAttendanceCSV(classId, filters = {}) {
    const report = queries.getClassReport(classId, filters);
    if (!report.length) return null;

    const rows = [];
    report.forEach(({ session, subject }) => {
      const sessionRecords = records.bySession(session.id);
      sessionRecords.forEach(rec => {
        const student = students.byId(rec.studentId);
        rows.push({
          Date:       session.date,
          Class:      session.classId,
          Subject:    subject?.name  ?? session.subjectId,
          RollNo:     student?.rollNo ?? rec.studentId,
          StudentName:student?.name   ?? 'Unknown',
          Status:     rec.status,
          MarkedAt:   rec.timestamp,
          Version:    rec.version,
        });
      });
    });

    if (!rows.length) return null;

    const headers = Object.keys(rows[0]);
    const escape  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `AttendX_${classId}_${new Date().toISOString().slice(0,10)}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
    return rows.length;
  }

  // ─────────────────────────────────────────
  //  REBUILD INDEXES (utility / repair)
  // ─────────────────────────────────────────
  function rebuildIndexes() {
    const newIdx = {
      attendance_sessions_index: {},
      class_student_index: {},
      student_attendance_index: {},
      session_records_index: {},
      faculty_sessions_index: {},
      session_unique_index: {},
    };

    students.all().forEach(s => {
      if (!newIdx.class_student_index[s.classId]) newIdx.class_student_index[s.classId] = [];
      newIdx.class_student_index[s.classId].push(s.id);
    });

    sessions.all().forEach(s => {
      if (!newIdx.attendance_sessions_index[s.date]) newIdx.attendance_sessions_index[s.date] = [];
      newIdx.attendance_sessions_index[s.date].push(s.id);
      if (!newIdx.faculty_sessions_index[s.facultyId]) newIdx.faculty_sessions_index[s.facultyId] = [];
      newIdx.faculty_sessions_index[s.facultyId].push(s.id);
      newIdx.session_unique_index[`${s.date}|${s.classId}|${s.subjectId}`] = s.id;
    });

    records.all().forEach(r => {
      if (!newIdx.session_records_index[r.sessionId]) newIdx.session_records_index[r.sessionId] = [];
      newIdx.session_records_index[r.sessionId].push(r.id);
      if (!newIdx.student_attendance_index[r.studentId]) newIdx.student_attendance_index[r.studentId] = [];
      newIdx.student_attendance_index[r.studentId].push(r.id);
    });

    store.set(AX_KEYS.INDEXES, newIdx);
    return newIdx;
  }

  // ─────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────
  init();

  return {
    // Core CRUD
    faculty,
    classes,
    subjects,
    students,
    classSubjectMap,
    timetable,
    sessions,
    records,

    // High-level operations
    finalizeAttendance,

    // Queries
    queries,

    // Export
    exportAttendanceCSV,

    // Maintenance
    rebuildIndexes,

    // Direct store access (escape hatch)
    store,

    // Convenience
    settings: {
      get: ()     => store.get(AX_KEYS.SETTINGS, {}),
      set: (patch) => store.set(AX_KEYS.SETTINGS, { ...store.get(AX_KEYS.SETTINGS, {}), ...patch, updatedAt: _ts() }),
    },
    auditLog: {
      all: () => store.get(AX_KEYS.AUDIT_LOG, []),
    },
  };
})();
