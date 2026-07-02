/**
 * AttendX Service Worker — PWA Support
 * Strategy: Cache-First for static assets, Network-First for API/dynamic
 */

const CACHE_NAME = 'attendx-v1.0';
const STATIC_CACHE = 'attendx-static-v1.0';
const DYNAMIC_CACHE = 'attendx-dynamic-v1.0';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/styles/main.css',
  '/styles/login.css',
  '/styles/dashboard.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/db-supabase.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/api.js',
  '/js/store.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
];

// ── Install: Pre-cache static assets ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing AttendX Service Worker…');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      // Use individual adds so one failure doesn't break the whole cache
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn(`[SW] Failed to cache ${url}:`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: Clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating AttendX Service Worker…');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache strategies ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip browser-extension and chrome-extension requests
  if (!url.protocol.startsWith('http')) return;

  // Skip Supabase API calls — always network only (real-time data)
  if (url.hostname.includes('supabase') || url.hostname.includes('supabase.co')) {
    return event.respondWith(networkOnly(request));
  }

  // Skip Google Fonts — network first with fallback
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    return event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }

  // Skip CDN JS (supabase-js) — network first
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    return event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }

  // Static assets — cache first
  const isStaticAsset = PRECACHE_ASSETS.some((asset) => url.pathname === asset || url.pathname === asset.replace(/^\//, ''));
  if (isStaticAsset || url.pathname.match(/\.(css|js|png|svg|ico|woff|woff2|ttf)$/)) {
    return event.respondWith(cacheFirst(request, STATIC_CACHE));
  }

  // HTML pages — network first, fall back to cache, then offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    return event.respondWith(networkFirstWithOfflineFallback(request));
  }

  // Default: network first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ── Background Sync: Queue offline attendance saves ────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    console.log('[SW] Background sync: attendance');
    event.waitUntil(syncQueuedAttendance());
  }
});

// ── Push Notifications ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'AttendX';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.tag || 'attendx-notif',
    data: { url: data.url || '/' },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Cache Strategy Helpers ─────────────────────────────────────────────────────

/** Cache First → Network fallback → Cache stale */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Resource unavailable offline', { status: 503 });
  }
}

/** Network First → Cache fallback */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

/** Network First for HTML → Cache → Offline page */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/offline.html');
  }
}

/** Network Only (no caching) */
async function networkOnly(request) {
  return fetch(request).catch(() => new Response('Network unavailable', { status: 503 }));
}

/** Sync queued attendance records from IndexedDB */
async function syncQueuedAttendance() {
  // Placeholder — the app will implement the IndexedDB queue
  console.log('[SW] Background sync for attendance triggered');
}
