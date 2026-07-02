/**
 * AttendX – App State & Session Store v3.0
 * Central in-memory store for current semester, faculty profile, etc.
 */
const Store = (function () {
  'use strict';

  let _semester  = null;  // current semester object
  let _profile   = null;  // faculty profile
  let _deptId    = null;
  let _semId     = null;
  let _classes   = [];    // classes in current semester
  let _subjects  = [];    // subjects in current semester
  let _mappings  = [];    // class-subject-faculty mappings

  const set = (key, val) => {
    if (key === 'semester')  { _semester = val; _semId = val?.id || null; }
    if (key === 'profile')   { _profile  = val; _deptId = val?.department_id || null; }
    if (key === 'classes')   _classes  = val || [];
    if (key === 'subjects')  _subjects = val || [];
    if (key === 'mappings')  _mappings = val || [];
  };

  const get = (key) => {
    if (key === 'semester')  return _semester;
    if (key === 'profile')   return _profile;
    if (key === 'semId')     return _semId;
    if (key === 'deptId')    return _deptId;
    if (key === 'classes')   return _classes;
    if (key === 'subjects')  return _subjects;
    if (key === 'mappings')  return _mappings;
    return null;
  };

  // Helpers
  const getClassLabel = (cls) => cls ? `${cls.year} – Sec ${cls.section}` : '—';
  const getMappingLabel = (m) => {
    const c = m?.classes;
    const s = m?.subjects;
    return `${c?.year || ''} ${c?.section || ''} – ${s?.name || ''}`;
  };

  return { set, get, getClassLabel, getMappingLabel };
})();
