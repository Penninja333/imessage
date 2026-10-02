// Service worker for iMessage PWA (offline caching & push notifications)
const CACHE_NAME = "imessage-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/manifest.webmanifest",
];

// Install: Cache core static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.warn("PWA pre-cache warning:", err))
  );
});

// Message: Allow clients to command the waiting worker to activate immediately
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Activate: Clean up old caches & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first with cache fallback for navigation / stale-while-revalidate for assets
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore API requests, socket connections, and Clerk auth requests
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/socket.io") ||
    url.hostname.includes("clerk") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Handle SPA navigation: return cached index.html if offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html") || caches.match("/"))
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and update in background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// Web Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "iMessage";
    const body = data.body || "New message received";

    // Use unique tag per message so Android displays a fresh heads-up pop-down banner over other apps
    const tag = (data.data && data.data.messageId)
      ? `msg-${data.data.messageId}`
      : `imessage-${Date.now()}`;

    const options = {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data.data || {},
      vibrate: [200, 100, 200, 100, 200],
      tag,
      renotify: true,
      silent: false,
      requireInteraction: false,
      timestamp: Date.now(),
      actions: [
        { action: "open", title: "Open" }
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("iMessage", {
        body: text,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200],
        tag: `imessage-${Date.now()}`,
        renotify: true,
        silent: false,
      })
    );
  }
});

// Click notification: focus existing chat window or open new
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if (event.notification.data && event.notification.data.senderId) {
            client.postMessage({
              type: "SELECT_CONVERSATION",
              conversationId: event.notification.data.senderId,
            });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
