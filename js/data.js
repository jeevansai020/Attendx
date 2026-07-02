/**
 * AttendX - Data Layer (localStorage-based)
 * All data access goes through this module.
 */
const AttendX = (function() {
  'use strict';

  // ==================== DEFAULT DATA ====================
  const DEFAULT_FACULTY = [
    { id: 'dr.kumar',  name: 'Dr. Ramesh Kumar',   password: 'faculty123', dept: 'CSE', role: 'faculty', initials: 'DK' },
    { id: 'prof.meena',name: 'Prof. Meena Sharma', password: 'faculty456', dept: 'ECE', role: 'faculty', initials: 'PM' },
    { id: 'admin',     name: 'Administrator',       password: 'admin123',   dept: 'All', role: 'admin',   initials: 'AD' },
  ];

  const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const SECTIONS = ['A', 'B', 'C'];

  const SUBJECTS_BY_YEAR = {
    '1st Year': ['Engineering Mathematics-I', 'Engineering Physics', 'Engineering Chemistry', 'Programming in C', 'Engineering Drawing', 'English Communication'],
    '2nd Year': ['Mathematics-III', 'Data Structures', 'Digital Electronics', 'Object Oriented Programming', 'Computer Organization', 'Environment Science'],
    '3rd Year': ['Computer Networks', 'Operating Systems', 'Database Management Systems', 'Software Engineering', 'Theory of Computation', 'Web Technologies'],
    '4th Year': ['Machine Learning', 'Cloud Computing', 'Cyber Security', 'Big Data Analytics', 'Project Work', 'Professional Elective'],
  };

  const generateStudents = (year, section) => {
    const yearNum = YEARS.indexOf(year) + 1;
    const sectionCode = section.charCodeAt(0) - 64;
    const prefix = `${yearNum}${section}`;
    const count = 30 + Math.floor(Math.random() * 15); // 30-45 students
    const firstNames = ['Aarav','Vikram','Priya','Ananya','Rahul','Kavitha','Siddharth','Nithya','Arjun','Divya','Karthik','Sneha','Arun','Pooja','Suresh','Lakshmi','Varun','Meghna','Rajan','Swetha','Deepak','Aishwarya','Naveen','Keerthi','Prasad','Revathi','Vijay','Saranya','Harish','Lavanya','Mohan','Soundarya','Balaji','Tamilarasi','Senthil'];
    const lastNames = ['Kumar','Sharma','Patel','Singh','Reddy','Nair','Pillai','Krishnan','Murugan','Subramaniam','Venkatesh','Rajagopal','Balachandran','Anand','Jayaraman'];
    const students = [];
    for (let i = 1; i <= count; i++) {
      const rollNo = `${yearNum}${section}${String(i).padStart(3, '0')}`;
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      students.push({ rollNo, name: `${fn} ${ln}` });
    }
    return students;
  };

  const generateTimetable = (facultyId) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
    const timetable = {};
    days.forEach(day => {
      timetable[day] = {};
      hours.forEach((hour, idx) => {
        if (idx === 3) { timetable[day][hour] = { type: 'break', label: 'Lunch Break' }; return; }
        if (Math.random() > 0.3) {
          const yr = YEARS[Math.floor(Math.random() * YEARS.length)];
          const sec = ['A','B','C'][Math.floor(Math.random() * 3)];
          const subs = SUBJECTS_BY_YEAR[yr];
          const sub = subs[Math.floor(Math.random() * subs.length)];
          timetable[day][hour] = { year: yr, section: sec, subject: sub };
        } else {
          timetable[day][hour] = null;
        }
      });
    });
    return timetable;
  };

  // ==================== STORAGE HELPERS ====================
  const KEYS = {
    FACULTY: 'ax_faculty',
    STUDENTS: 'ax_students',
    TIMETABLE: 'ax_timetable',
    ATTENDANCE: 'ax_attendance',
    SESSION: 'ax_session',
    THEME: 'ax_theme',
  };

  const storage = {
    get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.error(e); } },
    remove: (key) => localStorage.removeItem(key),
  };

  // ==================== INITIALIZATION ====================
  const init = () => {
    if (!storage.get(KEYS.FACULTY)) storage.set(KEYS.FACULTY, DEFAULT_FACULTY);

    // Pre-generate students for all year+section combos
    let students = storage.get(KEYS.STUDENTS) || {};
    YEARS.forEach(yr => {
      SECTIONS.forEach(sec => {
        const key = `${yr}__${sec}`;
        if (!students[key]) students[key] = generateStudents(yr, sec);
      });
    });
    storage.set(KEYS.STUDENTS, students);

    // Pre-generate timetable if needed
    let timetables = storage.get(KEYS.TIMETABLE) || {};
    DEFAULT_FACULTY.forEach(f => {
      if (!timetables[f.id]) timetables[f.id] = generateTimetable(f.id);
    });
    storage.set(KEYS.TIMETABLE, timetables);
  };

  // ==================== AUTH ====================
  const auth = {
    login: (username, password) => {
      const faculty = storage.get(KEYS.FACULTY) || [];
      const user = faculty.find(f => f.id === username && f.password === password);
      if (user) {
        const session = { userId: user.id, name: user.name, dept: user.dept, role: user.role, initials: user.initials, loginAt: Date.now() };
        storage.set(KEYS.SESSION, session);
        return user;
      }
      return null;
    },
    logout: () => { storage.remove(KEYS.SESSION); },
    getSession: () => storage.get(KEYS.SESSION),
    isLoggedIn: () => !!storage.get(KEYS.SESSION),
  };

  // ==================== STUDENTS ====================
  const students = {
    getList: (year, section) => {
      const all = storage.get(KEYS.STUDENTS) || {};
      return all[`${year}__${section}`] || [];
    },
    addStudent: (year, section, student) => {
      const all = storage.get(KEYS.STUDENTS) || {};
      const key = `${year}__${section}`;
      if (!all[key]) all[key] = [];
      all[key].push(student);
      storage.set(KEYS.STUDENTS, all);
    },
    removeStudent: (year, section, rollNo) => {
      const all = storage.get(KEYS.STUDENTS) || {};
      const key = `${year}__${section}`;
      if (all[key]) all[key] = all[key].filter(s => s.rollNo !== rollNo);
      storage.set(KEYS.STUDENTS, all);
    },
  };

  // ==================== ATTENDANCE ====================
  const attendance = {
    // key = "YYYY-MM-DD__year__section__subject"
    _key: (date, year, section, subject) => `${date}__${year}__${section}__${subject}`,

    save: (date, year, section, subject, records) => {
      const all = storage.get(KEYS.ATTENDANCE) || {};
      const k = attendance._key(date, year, section, subject);
      all[k] = { date, year, section, subject, records, savedAt: Date.now() };
      storage.set(KEYS.ATTENDANCE, all);
    },

    get: (date, year, section, subject) => {
      const all = storage.get(KEYS.ATTENDANCE) || {};
      return all[attendance._key(date, year, section, subject)] || null;
    },

    getAll: () => storage.get(KEYS.ATTENDANCE) || {},

    getByDate: (date) => {
      const all = storage.get(KEYS.ATTENDANCE) || {};
      return Object.values(all).filter(r => r.date === date);
    },

    getByClass: (year, section) => {
      const all = storage.get(KEYS.ATTENDANCE) || {};
      return Object.values(all).filter(r => r.year === year && r.section === section);
    },

    getDates: () => {
      const all = storage.get(KEYS.ATTENDANCE) || {};
      const dates = new Set(Object.values(all).map(r => r.date));
      return [...dates].sort();
    },

    getStudentSummary: (rollNo, year, section) => {
      const all = Object.values(storage.get(KEYS.ATTENDANCE) || {});
      const relevant = all.filter(r => r.year === year && r.section === section);
      const result = {};
      relevant.forEach(rec => {
        if (!result[rec.subject]) result[rec.subject] = { total: 0, present: 0 };
        const entry = rec.records.find(s => s.rollNo === rollNo);
        if (entry) {
          result[rec.subject].total++;
          if (entry.status === 'P') result[rec.subject].present++;
        }
      });
      return result;
    },

    delete: (date, year, section, subject) => {
      const all = storage.get(KEYS.ATTENDANCE) || {};
      delete all[attendance._key(date, year, section, subject)];
      storage.set(KEYS.ATTENDANCE, all);
    },
  };

  // ==================== TIMETABLE ====================
  const timetable = {
    get: (facultyId) => {
      const all = storage.get(KEYS.TIMETABLE) || {};
      return all[facultyId] || {};
    },
    save: (facultyId, data) => {
      const all = storage.get(KEYS.TIMETABLE) || {};
      all[facultyId] = data;
      storage.set(KEYS.TIMETABLE, all);
    },
    getToday: (facultyId) => {
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const today = days[new Date().getDay()];
      const tt = timetable.get(facultyId);
      return { day: today, schedule: tt[today] || {} };
    },
  };

  // ==================== REPORTS ====================
  const reports = {
    getClassReport: (year, section, startDate, endDate, subject) => {
      const all = Object.values(storage.get(KEYS.ATTENDANCE) || {});
      return all.filter(r => {
        if (r.year !== year || r.section !== section) return false;
        if (startDate && r.date < startDate) return false;
        if (endDate && r.date > endDate) return false;
        if (subject && r.subject !== subject) return false;
        return true;
      }).sort((a, b) => a.date.localeCompare(b.date));
    },

    getStudentReport: (year, section, startDate, endDate) => {
      const data = reports.getClassReport(year, section, startDate, endDate);
      const studentMap = {};
      data.forEach(rec => {
        rec.records.forEach(s => {
          if (!studentMap[s.rollNo]) studentMap[s.rollNo] = { rollNo: s.rollNo, name: s.name, subjects: {} };
          if (!studentMap[s.rollNo].subjects[rec.subject]) studentMap[s.rollNo].subjects[rec.subject] = { total: 0, present: 0 };
          studentMap[s.rollNo].subjects[rec.subject].total++;
          if (s.status === 'P') studentMap[s.rollNo].subjects[rec.subject].present++;
        });
      });
      return Object.values(studentMap);
    },

    exportCSV: (data, filename) => {
      if (!data || !data.length) return;
      const keys = Object.keys(data[0]);
      const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
      URL.revokeObjectURL(url);
    },
  };

  // ==================== THEME ====================
  const theme = {
    get: () => storage.get(KEYS.THEME) || 'light',
    toggle: () => {
      const cur = theme.get();
      const next = cur === 'light' ? 'dark' : 'light';
      storage.set(KEYS.THEME, next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    },
    apply: () => {
      document.documentElement.setAttribute('data-theme', theme.get());
    },
  };

  // ==================== UTILITY ====================
  const utils = {
    today: () => new Date().toISOString().slice(0, 10),
    formatDate: (dateStr) => {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    pct: (n, total) => total ? Math.round((n / total) * 100) : 0,
    YEARS,
    SECTIONS,
    SUBJECTS_BY_YEAR,
    HOURS: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'],
    DAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  };

  // ==================== TOAST ====================
  const toast = {
    show: (msg, type = 'info', duration = 3500) => {
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
      }
      const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.innerHTML = `<span style="font-size:16px;font-weight:700">${icons[type]||''}</span><span>${msg}</span>`;
      container.appendChild(el);
      setTimeout(() => {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 300);
      }, duration);
    },
  };

  init();
  return { auth, students, attendance, timetable, reports, theme, utils, toast };
})();
