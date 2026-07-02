/**
 * AttendX PWA Registration & Install Prompt Manager
 * Handles: SW registration, install prompt, update notifications, online/offline UI
 */

(function () {
  'use strict';

  // ── Service Worker Registration ──────────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[PWA] Service Worker registered, scope:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });

        // Periodic update check (every 60 min)
        setInterval(() => registration.update(), 60 * 60 * 1000);

      } catch (err) {
        console.warn('[PWA] Service Worker registration failed:', err);
      }
    });

    // Handle SW messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'CACHE_UPDATED') {
        console.log('[PWA] Cache updated for:', event.data.url);
      }
    });
  }

  // ── Install Prompt Management ────────────────────────────────────────────────
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt captured');

    // Show install button in settings if on dashboard
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', triggerInstall);
    }

    // Show install toast on first visit (after 5s delay)
    const installDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (!installDismissed) {
      setTimeout(() => showInstallToast(), 5000);
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully!');
    deferredPrompt = null;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'none';
    showToast('✅ AttendX installed! Find it on your home screen.', 'success', 4000);
  });

  /** Trigger the native install prompt */
  window.triggerInstall = async function () {
    if (!deferredPrompt) {
      showToast('App is already installed or not installable on this device.', 'info', 3000);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    if (outcome === 'accepted') {
      showToast('🎉 Installing AttendX…', 'success', 3000);
    }
    deferredPrompt = null;
  };

  // ── Update Banner ────────────────────────────────────────────────────────────
  function showUpdateBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; padding: 14px 20px; border-radius: 14px;
      display: flex; align-items: center; gap: 14px; z-index: 99999;
      box-shadow: 0 8px 32px rgba(99,102,241,.45); font-family: inherit;
      font-size: 14px; font-weight: 500; white-space: nowrap;
      animation: slideUpBanner .4s cubic-bezier(.34,1.56,.64,1) both;
    `;

    banner.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      <span>New version available!</span>
      <button onclick="window.location.reload()" style="
        background: rgba(255,255,255,.25); border: 1px solid rgba(255,255,255,.35);
        color: white; padding: 6px 14px; border-radius: 8px; cursor: pointer;
        font-size: 13px; font-weight: 600; font-family: inherit;
      ">Update</button>
      <button onclick="this.closest('#pwa-update-banner').remove()" style="
        background: none; border: none; color: rgba(255,255,255,.7);
        cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px;
      ">✕</button>
    `;

    if (!document.getElementById('pwa-update-banner')) {
      document.body.appendChild(banner);
    }
  }

  // ── Install Toast ────────────────────────────────────────────────────────────
  function showInstallToast() {
    if (!deferredPrompt) return;

    const toast = document.createElement('div');
    toast.id = 'pwa-install-toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; max-width: 340px;
      background: var(--surface, #1e293b); border: 1px solid rgba(99,102,241,.4);
      border-radius: 16px; padding: 18px; z-index: 99998;
      box-shadow: 0 12px 40px rgba(0,0,0,.4); font-family: inherit;
      animation: slideInRight .4s cubic-bezier(.34,1.56,.64,1) both;
    `;

    toast.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:14px;">
        <div style="
          width:44px;height:44px;border-radius:12px;flex-shrink:0;overflow:hidden;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
            <path d="M8 28V16l12-8 12 8v12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="15" y="20" width="10" height="8" rx="2" stroke="white" stroke-width="2.5"/>
            <circle cx="20" cy="14" r="2" fill="white"/>
          </svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;color:var(--text-primary,#f1f5f9);margin-bottom:4px;">Install AttendX</div>
          <div style="font-size:12px;color:var(--text-muted,#94a3b8);line-height:1.5;">
            Add to your home screen for fast offline access — no app store needed!
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button onclick="window.triggerInstall();this.closest('#pwa-install-toast').remove()" style="
              background:linear-gradient(135deg,#6366f1,#8b5cf6);
              color:white;border:none;padding:7px 14px;border-radius:8px;
              font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
            ">Install</button>
            <button onclick="sessionStorage.setItem('pwa-install-dismissed','1');this.closest('#pwa-install-toast').remove()" style="
              background:rgba(148,163,184,.1);color:var(--text-muted,#94a3b8);
              border:1px solid rgba(148,163,184,.2);padding:7px 14px;border-radius:8px;
              font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
            ">Not Now</button>
          </div>
        </div>
        <button onclick="sessionStorage.setItem('pwa-install-dismissed','1');this.closest('#pwa-install-toast').remove()" style="
          background:none;border:none;color:var(--text-muted,#94a3b8);cursor:pointer;
          font-size:18px;line-height:1;flex-shrink:0;padding:2px;
        ">✕</button>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-dismiss after 12s
    setTimeout(() => {
      if (document.getElementById('pwa-install-toast')) {
        sessionStorage.setItem('pwa-install-dismissed', '1');
        toast.style.animation = 'slideOutRight .3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 12000);
  }

  // ── Online / Offline Status ──────────────────────────────────────────────────
  function updateOnlineStatus() {
    if (!navigator.onLine) {
      showToast('📶 You\'re offline. Working from cache…', 'warning', 0); // persistent
    } else {
      // Remove offline toast if any
      document.querySelectorAll('.toast-offline').forEach(t => t.remove());
      showToast('✅ Back online! Data will sync.', 'success', 3000);
    }
  }

  window.addEventListener('online',  () => updateOnlineStatus());
  window.addEventListener('offline', () => updateOnlineStatus());

  // ── Helper: show toast (delegates to app toast systems if available) ─────────
  function showToast(message, type = 'info', duration = 3000) {
    // Try AttendX.toast first, then Utils.toast.show, then minimal fallback
    if (window.AttendX?.toast?.show) {
      window.AttendX.toast.show(message, type, duration);
      return;
    }
    if (window.Utils?.toast?.show) {
      window.Utils.toast.show(message, type, duration);
      return;
    }
    // Fallback minimal toast
    const container = document.getElementById('toastContainer') || document.body;
    const t = document.createElement('div');
    t.className = `toast toast-pwa ${type === 'warning' ? 'toast-offline' : ''}`;
    t.textContent = message;
    t.style.cssText = `
      background: var(--surface, #1e293b);
      border: 1px solid ${type === 'success' ? 'rgba(16,185,129,.4)' : type === 'warning' ? 'rgba(245,158,11,.4)' : 'rgba(99,102,241,.4)'};
      color: var(--text-primary, #f1f5f9); padding: 12px 18px; border-radius: 12px;
      font-size: 13px; font-weight: 500; margin-bottom: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.3); animation: slideInRight .3s ease both;
    `;
    container.appendChild(t);
    if (duration > 0) {
      setTimeout(() => t.remove(), duration);
    }
  }

  // ── CSS Animations (injected once) ──────────────────────────────────────────
  if (!document.getElementById('pwa-styles')) {
    const style = document.createElement('style');
    style.id = 'pwa-styles';
    style.textContent = `
      @keyframes slideUpBanner {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to   { opacity: 1; transform: translate(-50%, 0);    }
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(20px); }
        to   { opacity: 1; transform: translateX(0);    }
      }
      @keyframes slideOutRight {
        from { opacity: 1; transform: translateX(0);    }
        to   { opacity: 0; transform: translateX(20px); }
      }
    `;
    document.head.appendChild(style);
  }

})();
