/**
 * AttendX – Utils v3.0
 * Shared helpers: toast, modal, theme, date, export, WhatsApp
 */
const Utils = (function () {
  'use strict';

  // ── TOAST ─────────────────────────────────────────────────────
  const toast = {
    show: (msg, type = 'info', duration = 3500) => {
      let c = document.getElementById('toastContainer');
      if (!c) {
        c = document.createElement('div');
        c.id = 'toastContainer';
        document.body.appendChild(c);
      }
      const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span class="toast-msg">${msg}</span>`;
      c.appendChild(el);
      setTimeout(() => {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 350);
      }, duration);
    },
    success: (m, d) => toast.show(m, 'success', d),
    error:   (m, d) => toast.show(m, 'error',   d),
    warning: (m, d) => toast.show(m, 'warning',  d),
    info:    (m, d) => toast.show(m, 'info',     d),
  };

  // ── MODAL ─────────────────────────────────────────────────────
  const modal = {
    open:  (id) => { const m = document.getElementById(id); if (m) { m.classList.add('active'); m.setAttribute('aria-hidden','false'); } },
    close: (id) => { const m = document.getElementById(id); if (m) { m.classList.remove('active'); m.setAttribute('aria-hidden','true'); } },
    closeAll: () => document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')),
  };
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) modal.closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.closeAll();
  });

  // ── THEME ─────────────────────────────────────────────────────
  const theme = {
    get:    () => localStorage.getItem('ax_theme') || 'light',
    set:    (t) => { localStorage.setItem('ax_theme', t); document.documentElement.setAttribute('data-theme', t); },
    toggle: () => { const n = theme.get() === 'light' ? 'dark' : 'light'; theme.set(n); return n; },
    apply:  () => document.documentElement.setAttribute('data-theme', theme.get()),
  };

  // ── DATE & TIME ───────────────────────────────────────────────
  const date = {
    today: () => new Date().toISOString().slice(0, 10),
    now:   () => new Date().toISOString(),

    format: (d, opts = {}) => {
      if (!d) return '—';
      return new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', ...opts,
      });
    },

    formatTime: (t) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      const hr = parseInt(h);
      return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
    },

    greeting: () => {
      const h = new Date().getHours();
      if (h < 12) return 'Good Morning';
      if (h < 17) return 'Good Afternoon';
      return 'Good Evening';
    },

    dayName: () => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()],

    fullDate: () => new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    }),

    pct: (n, t) => t ? Math.round((n / t) * 100) : 0,
  };

  // ── LOADING STATE ─────────────────────────────────────────────
  const loading = {
    show: (el, text = 'Loading…') => {
      if (!el) return;
      el._origContent = el.innerHTML;
      el.disabled = true;
      el.innerHTML = `<span class="spinner"></span> ${text}`;
    },
    hide: (el) => {
      if (!el) return;
      el.disabled = false;
      el.innerHTML = el._origContent || el.innerHTML;
    },
    spinner: (text = 'Loading…') =>
      `<div class="loading-state"><div class="spinner spinner-dark"></div><span>${text}</span></div>`,
    empty: (icon, title, sub = '') =>
      `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div>${sub ? `<p>${sub}</p>` : ''}</div>`,
  };

  // ── EXPORT CSV ────────────────────────────────────────────────
  const csv = {
    download: (rows, filename = 'export') => {
      if (!rows?.length) { toast.warning('No data to export'); return; }
      const keys = Object.keys(rows[0]);
      const lines = [
        keys.join(','),
        ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${filename}_${date.today()}.csv`,
      });
      a.click();
      URL.revokeObjectURL(a.href);
    },
  };

  // ── WHATSAPP ──────────────────────────────────────────────────
  const whatsapp = {
    build: ({ subject, classLabel, dateStr, absentees }) => {
      const lines = [
        `📋 *Attendance Report*`,
        `📚 Subject: ${subject}`,
        `🏫 Class: ${classLabel}`,
        `📅 Date: ${date.format(dateStr)}`,
        ``,
        `❌ *Absent Students (${absentees.length}):*`,
        ...absentees.map((s, i) => `${i + 1}. ${s.rollNo} – ${s.name}`),
        ``,
        `_Sent via AttendX_`,
      ];
      return lines.join('\n');
    },
    share: (text) => {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    },
    copy: (text) => {
      navigator.clipboard?.writeText(text).then(() => toast.success('Copied to clipboard!'));
    },
  };

  // ── SEARCH HIGHLIGHT ──────────────────────────────────────────
  const hl = (text, q) => {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  };

  // ── DEBOUNCE ─────────────────────────────────────────────────
  const debounce = (fn, ms = 300) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  // ── DOM HELPERS ───────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const el = (tag, cls, html = '') => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };

  // ── AVATAR COLOR ──────────────────────────────────────────────
  const avatarColor = (name = '') => {
    const colors = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ── PCT BADGE ─────────────────────────────────────────────────
  const pctBadge = (pct) => {
    const cls = pct >= 75 ? 'badge-success' : pct >= 65 ? 'badge-warning' : 'badge-danger';
    return `<span class="badge ${cls}">${pct}%</span>`;
  };

  // ── PROGRESS BAR ─────────────────────────────────────────────
  const progressBar = (pct, color = null) => {
    const c = color || (pct >= 75 ? 'var(--success)' : pct >= 65 ? 'var(--warning)' : 'var(--danger)');
    return `<div class="pct-bar"><div class="pct-bar-fill" style="width:${pct}%;background:${c}"></div></div>`;
  };

  // ── ROLE BADGE ────────────────────────────────────────────────
  const roleBadge = (role) => {
    const map = {
      super_admin: ['badge-danger',  'Super Admin'],
      dean:        ['badge-primary', 'Dean'],
      hod:         ['badge-warning', 'HOD'],
      admin:       ['badge-info',    'Admin'],
      faculty:     ['badge-success', 'Faculty'],
    };
    const [cls, label] = map[role] || ['badge-muted', role];
    return `<span class="badge ${cls}">${label}</span>`;
  };

  return { toast, modal, theme, date, loading, csv, whatsapp, hl, debounce, $, $$, el, avatarColor, pctBadge, progressBar, roleBadge };
})();
