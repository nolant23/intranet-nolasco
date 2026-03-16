/* Service Worker per PWA - cache offline per area tecnici */
const CACHE_NAME = "nolasco-intranet-v1";

// Risorse statiche: cache-first (già in cache = veloce, aggiornamento in background)
function isStaticAsset(url) {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/_next/static/") || u.pathname.startsWith("/images/");
  } catch {
    return false;
  }
}

// Navigazione (pagine HTML / RSC): network-first, fallback cache (offline = ultima versione vista)
function isNavigation(url) {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/api")) return false;
    if (u.pathname.startsWith("/_next/static/")) return false;
    if (u.pathname.startsWith("/_next/data/")) return true;
    return true; // /, /tecnici, /manutenzioni, etc.
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = request.url;
  if (!url.startsWith(self.location.origin)) return;

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
          return cached ?? fetchPromise;
        })
      )
    );
    return;
  }

  // Navigation / document: network-first, fallback to cache (offline)
  if (isNavigation(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          if (res.ok && res.type === "basic") {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.open(CACHE_NAME).then((cache) => cache.match(request)).then((cached) => cached || new Response("Offline", { status: 503, statusText: "Offline" }))
        )
    );
    return;
  }

  // Rest: network only (API, etc.)
});

// ---------- Push notifications ----------
self.addEventListener("push", (event) => {
  let data = { title: "Intranet Nolasco", body: "", url: "/" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (_) {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      tag: "nolasco-push",
      data: { url: data.url || "/" },
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(self.location.origin + (url.startsWith("/") ? url : "/" + url));
    })
  );
});
