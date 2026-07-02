/**
 * AttendX – Auth Module v3.0 (Fixed)
 * Delegates to AttendX (db-supabase.js) — the active data layer.
 * NOTE: auth.js is currently NOT loaded by index.html or dashboard.html.
 *       The app uses AttendX.auth directly. This file is kept for future use.
 */
const Auth = (function () {
  'use strict';

  let _profile = null;

  const SESSION_KEY = 'ax_profile';

  const saveProfile = (profile) => {
    _profile = profile;
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(profile)); } catch (_) {}
  };

  const loadProfile = () => {
    if (_profile) return _profile;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) { _profile = JSON.parse(raw); return _profile; }
    } catch (_) {}
    return null;
  };

  const clearProfile = () => {
    _profile = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  };

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

  const login = async (email, password) => {
    // Delegate to AttendX data layer (db-supabase.js)
    const username = email.includes('@') ? email.split('@')[0] : email;
    if (typeof AttendX === 'undefined') throw new Error('AttendX data layer not loaded');
    const user = await AttendX.auth.login(username, password);
    if (!user) throw new Error('Invalid credentials');
    const profile = {
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
      username: user.username,
      initials: getInitials(user.name),
      deptName: user.department || '—',
    };
    saveProfile(profile);
    return profile;
  };

  const logout = () => {
    clearProfile();
    if (typeof AttendX !== 'undefined') AttendX.auth.logout();
  };

  const getProfile = () => loadProfile();

  const isLoggedIn = () => {
    if (loadProfile()) return true;
    if (typeof AttendX !== 'undefined') return AttendX.auth.isLoggedIn();
    return false;
  };

  const hasRole = (role) => {
    const p = loadProfile();
    if (!p) return false;
    const hierarchy = { super_admin: 5, dean: 4, hod: 3, admin: 2, faculty: 1 };
    return (hierarchy[p.role] || 0) >= (hierarchy[role] || 0);
  };

  const requireAuth = () => {
    if (!isLoggedIn()) { window.location.href = 'index.html'; return false; }
    return true;
  };
  // No-op: kept for forward-compatibility with Supabase Auth JWT flow
  const initAuthListener = () => {};

  return { login, logout, getProfile, isLoggedIn, hasRole, requireAuth, saveProfile, initAuthListener };
})();
