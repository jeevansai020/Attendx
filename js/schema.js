/**
 * AttendX - Production Schema v2.0
 * Relational JSON schema for localStorage.
 * Directly convertible to MongoDB collections or SQL tables.
 *
 * localStorage keys:
 *   ax_faculty | ax_students | ax_classes | ax_subjects
 *   ax_class_subject_map | ax_timetable | ax_attendance_sessions
 *   ax_attendance_records | ax_indexes | ax_settings | ax_audit_log
 */

'use strict';

// ─────────────────────────────────────────────
//  STORAGE KEYS
// ─────────────────────────────────────────────
const AX_KEYS = Object.freeze({
  FACULTY:            'ax_faculty',
  STUDENTS:           'ax_students',
  CLASSES:            'ax_classes',
  SUBJECTS:           'ax_subjects',
  CLASS_SUBJECT_MAP:  'ax_class_subject_map',
  TIMETABLE:          'ax_timetable',
  ATT_SESSIONS:       'ax_attendance_sessions',
  ATT_RECORDS:        'ax_attendance_records',
  INDEXES:            'ax_indexes',
  SETTINGS:           'ax_settings',
  AUDIT_LOG:          'ax_audit_log',
});

// ─────────────────────────────────────────────
//  SAMPLE DATA  (seed on first load)
// ─────────────────────────────────────────────
const AX_SEED = {

  /* ── FACULTY ───────────────────────────────
   * SQL equivalent  : faculty(id PK, ...)
   * MongoDB coll    : faculty
   */
  [AX_KEYS.FACULTY]: [
    {
      id: 'fac_001', name: 'Dr. Ramesh Kumar',   username: 'dr.kumar',
      password: 'faculty123', department: 'CSE', role: 'faculty',
      lastLogin: null, status: 'active',
      createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true,
    },
    {
      id: 'fac_002', name: 'Prof. Meena Sharma', username: 'prof.meena',
      password: 'faculty456', department: 'ECE', role: 'faculty',
      lastLogin: null, status: 'active',
      createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true,
    },
    {
      id: 'fac_admin', name: 'Administrator', username: 'admin',
      password: 'admin123', department: 'All', role: 'admin',
      lastLogin: null, status: 'active',
      createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true,
    },
  ],

  /* ── CLASSES ───────────────────────────────
   * SQL equivalent  : classes(id PK, ...)
   * MongoDB coll    : classes
   */
  [AX_KEYS.CLASSES]: [
    { id: 'class_1_A', year: '1st Year', section: 'A', department: 'CSE', strength: 60, createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'class_1_B', year: '1st Year', section: 'B', department: 'CSE', strength: 58, createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'class_2_A', year: '2nd Year', section: 'A', department: 'CSE', strength: 55, createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'class_3_A', year: '3rd Year', section: 'A', department: 'CSE', strength: 52, createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'class_3_B', year: '3rd Year', section: 'B', department: 'CSE', strength: 50, createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'class_4_A', year: '4th Year', section: 'A', department: 'CSE', strength: 48, createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
  ],

  /* ── SUBJECTS ──────────────────────────────
   * SQL equivalent  : subjects(id PK, ...)
   * MongoDB coll    : subjects
   */
  [AX_KEYS.SUBJECTS]: [
    { id: 'sub_EM1', name: 'Engineering Mathematics-I', code: 'EM101', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'sub_PC',  name: 'Programming in C',          code: 'CS101', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'sub_DS',  name: 'Data Structures',           code: 'CS201', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'sub_OOP', name: 'Object Oriented Programming',code: 'CS202', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'sub_CN',  name: 'Computer Networks',         code: 'CS301', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'sub_OS',  name: 'Operating Systems',         code: 'CS302', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'sub_DBMS',name: 'Database Management Systems',code: 'CS303', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'sub_ML',  name: 'Machine Learning',          code: 'CS401', department: 'CSE', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
  ],

  /* ── STUDENTS ──────────────────────────────
   * SQL equivalent  : students(id PK, classId FK→classes)
   * MongoDB coll    : students
   */
  [AX_KEYS.STUDENTS]: [
    { id: 'stu_001', rollNo: '3A001', name: 'Aarav Kumar',    classId: 'class_3_A', department: 'CSE', status: 'active', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'stu_002', rollNo: '3A002', name: 'Priya Sharma',   classId: 'class_3_A', department: 'CSE', status: 'active', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'stu_003', rollNo: '3A003', name: 'Rahul Reddy',    classId: 'class_3_A', department: 'CSE', status: 'active', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'stu_004', rollNo: '3A004', name: 'Ananya Nair',    classId: 'class_3_A', department: 'CSE', status: 'active', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'stu_005', rollNo: '3A005', name: 'Karthik Pillai', classId: 'class_3_A', department: 'CSE', status: 'active', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'stu_101', rollNo: '1A001', name: 'Divya Singh',    classId: 'class_1_A', department: 'CSE', status: 'active', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'stu_102', rollNo: '1A002', name: 'Arjun Patel',    classId: 'class_1_A', department: 'CSE', status: 'active', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
  ],

  /* ── CLASS–SUBJECT MAP ─────────────────────
   * Allows: many subjects per class, different faculty per subject
   * SQL equivalent  : class_subject_map(id PK, classId FK, subjectId FK, facultyId FK)
   * MongoDB coll    : class_subject_map
   */
  [AX_KEYS.CLASS_SUBJECT_MAP]: [
    { id: 'map_001', classId: 'class_3_A', subjectId: 'sub_CN',   facultyId: 'fac_001', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'map_002', classId: 'class_3_A', subjectId: 'sub_OS',   facultyId: 'fac_002', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'map_003', classId: 'class_3_A', subjectId: 'sub_DBMS', facultyId: 'fac_001', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'map_004', classId: 'class_3_B', subjectId: 'sub_CN',   facultyId: 'fac_001', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'map_005', classId: 'class_1_A', subjectId: 'sub_EM1',  facultyId: 'fac_002', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'map_006', classId: 'class_1_A', subjectId: 'sub_PC',   facultyId: 'fac_001', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
  ],

  /* ── TIMETABLE ─────────────────────────────
   * SQL equivalent  : timetable(id PK, facultyId FK, classId FK, subjectId FK, ...)
   * MongoDB coll    : timetable
   */
  [AX_KEYS.TIMETABLE]: [
    { id: 'tt_001', facultyId: 'fac_001', classId: 'class_3_A', subjectId: 'sub_CN',   day: 'Monday',    startTime: '09:00', endTime: '10:00', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'tt_002', facultyId: 'fac_001', classId: 'class_3_A', subjectId: 'sub_DBMS', day: 'Monday',    startTime: '10:00', endTime: '11:00', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'tt_003', facultyId: 'fac_001', classId: 'class_3_B', subjectId: 'sub_CN',   day: 'Tuesday',   startTime: '09:00', endTime: '10:00', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'tt_004', facultyId: 'fac_002', classId: 'class_3_A', subjectId: 'sub_OS',   day: 'Wednesday', startTime: '11:00', endTime: '12:00', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
    { id: 'tt_005', facultyId: 'fac_001', classId: 'class_1_A', subjectId: 'sub_PC',   day: 'Thursday',  startTime: '14:00', endTime: '15:00', createdAt: '2025-06-01T09:00:00Z', updatedAt: '2025-06-01T09:00:00Z', isActive: true },
  ],

  /* ── ATTENDANCE SESSIONS ───────────────────
   * One session = one class period on one date
   * SQL equivalent  : attendance_sessions(id PK, classId FK, subjectId FK, facultyId FK, timetableId FK)
   * Unique constraint: (date + classId + subjectId)
   */
  [AX_KEYS.ATT_SESSIONS]: [
    {
      id: 'att_001', date: '2026-04-04', classId: 'class_3_A',
      subjectId: 'sub_CN', facultyId: 'fac_001', timetableId: 'tt_001',
      totalStudents: 5, presentCount: 4, absentCount: 1,
      status: 'completed',
      createdAt: '2026-04-04T09:05:00Z', updatedAt: '2026-04-04T09:55:00Z', isActive: true,
    },
    {
      id: 'att_002', date: '2026-04-04', classId: 'class_3_A',
      subjectId: 'sub_DBMS', facultyId: 'fac_001', timetableId: 'tt_002',
      totalStudents: 5, presentCount: 5, absentCount: 0,
      status: 'completed',
      createdAt: '2026-04-04T10:05:00Z', updatedAt: '2026-04-04T10:55:00Z', isActive: true,
    },
    {
      id: 'att_003', date: '2026-04-05', classId: 'class_3_A',
      subjectId: 'sub_CN', facultyId: 'fac_001', timetableId: 'tt_001',
      totalStudents: 5, presentCount: 3, absentCount: 2,
      status: 'completed',
      createdAt: '2026-04-05T09:05:00Z', updatedAt: '2026-04-05T09:55:00Z', isActive: true,
    },
  ],

  /* ── ATTENDANCE RECORDS ────────────────────
   * One record = one student's status in one session
   * SQL equivalent  : attendance_records(id PK, sessionId FK, studentId FK)
   * MongoDB coll    : attendance_records
   */
  [AX_KEYS.ATT_RECORDS]: [
    // Session att_001
    { id: 'rec_001', sessionId: 'att_001', studentId: 'stu_001', status: 'present', timestamp: '2026-04-04T09:10:00Z', version: 1, isActive: true },
    { id: 'rec_002', sessionId: 'att_001', studentId: 'stu_002', status: 'present', timestamp: '2026-04-04T09:11:00Z', version: 1, isActive: true },
    { id: 'rec_003', sessionId: 'att_001', studentId: 'stu_003', status: 'absent',  timestamp: '2026-04-04T09:12:00Z', version: 1, isActive: true },
    { id: 'rec_004', sessionId: 'att_001', studentId: 'stu_004', status: 'present', timestamp: '2026-04-04T09:13:00Z', version: 1, isActive: true },
    { id: 'rec_005', sessionId: 'att_001', studentId: 'stu_005', status: 'present', timestamp: '2026-04-04T09:14:00Z', version: 1, isActive: true },
    // Session att_002
    { id: 'rec_006', sessionId: 'att_002', studentId: 'stu_001', status: 'present', timestamp: '2026-04-04T10:10:00Z', version: 1, isActive: true },
    { id: 'rec_007', sessionId: 'att_002', studentId: 'stu_002', status: 'present', timestamp: '2026-04-04T10:11:00Z', version: 1, isActive: true },
    { id: 'rec_008', sessionId: 'att_002', studentId: 'stu_003', status: 'present', timestamp: '2026-04-04T10:12:00Z', version: 1, isActive: true },
    { id: 'rec_009', sessionId: 'att_002', studentId: 'stu_004', status: 'present', timestamp: '2026-04-04T10:13:00Z', version: 1, isActive: true },
    { id: 'rec_010', sessionId: 'att_002', studentId: 'stu_005', status: 'present', timestamp: '2026-04-04T10:14:00Z', version: 1, isActive: true },
    // Session att_003
    { id: 'rec_011', sessionId: 'att_003', studentId: 'stu_001', status: 'present', timestamp: '2026-04-05T09:10:00Z', version: 1, isActive: true },
    { id: 'rec_012', sessionId: 'att_003', studentId: 'stu_002', status: 'absent',  timestamp: '2026-04-05T09:11:00Z', version: 1, isActive: true },
    { id: 'rec_013', sessionId: 'att_003', studentId: 'stu_003', status: 'absent',  timestamp: '2026-04-05T09:12:00Z', version: 1, isActive: true },
    { id: 'rec_014', sessionId: 'att_003', studentId: 'stu_004', status: 'present', timestamp: '2026-04-05T09:13:00Z', version: 1, isActive: true },
    { id: 'rec_015', sessionId: 'att_003', studentId: 'stu_005', status: 'present', timestamp: '2026-04-05T09:14:00Z', version: 1, isActive: true },
  ],

  /* ── INDEXES ───────────────────────────────
   * Fast lookups — rebuilt on every write
   */
  [AX_KEYS.INDEXES]: {
    // date → [sessionId, ...]
    attendance_sessions_index: {
      '2026-04-04': ['att_001', 'att_002'],
      '2026-04-05': ['att_003'],
    },
    // classId → [studentId, ...]
    class_student_index: {
      'class_3_A': ['stu_001', 'stu_002', 'stu_003', 'stu_004', 'stu_005'],
      'class_1_A': ['stu_101', 'stu_102'],
    },
    // studentId → [recordId, ...]
    student_attendance_index: {
      'stu_001': ['rec_001', 'rec_006', 'rec_011'],
      'stu_002': ['rec_002', 'rec_007', 'rec_012'],
      'stu_003': ['rec_003', 'rec_008', 'rec_013'],
      'stu_004': ['rec_004', 'rec_009', 'rec_014'],
      'stu_005': ['rec_005', 'rec_010', 'rec_015'],
    },
    // sessionId → [recordId, ...]
    session_records_index: {
      'att_001': ['rec_001','rec_002','rec_003','rec_004','rec_005'],
      'att_002': ['rec_006','rec_007','rec_008','rec_009','rec_010'],
      'att_003': ['rec_011','rec_012','rec_013','rec_014','rec_015'],
    },
    // facultyId → [sessionId, ...]
    faculty_sessions_index: {
      'fac_001': ['att_001', 'att_002', 'att_003'],
    },
    // "date|classId|subjectId" → sessionId  (duplicate-session guard)
    session_unique_index: {
      '2026-04-04|class_3_A|sub_CN':   'att_001',
      '2026-04-04|class_3_A|sub_DBMS': 'att_002',
      '2026-04-05|class_3_A|sub_CN':   'att_003',
    },
  },

  /* ── SETTINGS ──────────────────────────────*/
  [AX_KEYS.SETTINGS]: {
    theme: 'light',
    minAttendancePct: 75,
    instituteName: 'AttendX Institute of Technology',
    academicYear: '2025-2026',
    createdAt: '2025-06-01T09:00:00Z',
    updatedAt: '2025-06-01T09:00:00Z',
  },

  /* ── AUDIT LOG ─────────────────────────────
   * Tracks every edit with before/after values
   */
  [AX_KEYS.AUDIT_LOG]: [],
};
