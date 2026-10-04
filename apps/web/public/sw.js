// Service worker for iMessage PWA (offline caching & push notifications)
const CACHE_NAME = "imessage-v4";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/fonts/SF-Pro-Text-Regular.woff2",
  "/fonts/SF-Pro-Display-Medium.woff2",
  "/fonts/SF-Pro-Text-Semibold.woff2",
  "/fonts/SF-Pro-Display-Bold.woff2",
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

// Message: Allow clients to command the waiting worker to activate or clear notifications
self.addEventListener("message", async (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_NOTIFICATIONS") {
    try {
      const senderId = event.data.senderId;
      const tag = senderId ? `chat-${senderId}` : null;
      const notifications = await self.registration.getNotifications(tag ? { tag } : undefined);
      notifications.forEach((n) => n.close());
    } catch (e) {
      console.warn("Could not clear notifications:", e);
    }
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

  const showNotificationAsync = async () => {
    // 1. Only suppress OS banner if user is currently active AND FOCUSED in the PWA.
    // If user is in YouTube, another app, home screen, or phone locked (client.focused === false),
    // we MUST show the high-priority heads-up banner notification!
    const windowClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    const isPwaFocused = windowClients.some((client) => client.focused);

    if (isPwaFocused) {
      // PWA is currently focused — user is actively chatting, suppress banner
      return;
    }

    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "iMessage", body: event.data.text() };
    }

    const senderName = payload.data?.senderName || payload.title || "iMessage";
    const senderId = payload.data?.senderId || "general";

    // 2. Group multiple notifications by sender in a single banner (tag: chat-<senderId>)
    const tag = `chat-${senderId}`;

    let existingNotifications = [];
    try {
      existingNotifications = await self.registration.getNotifications({ tag });
    } catch (e) {
      console.warn("Could not query existing notifications:", e);
    }

    const existing = existingNotifications.length > 0 ? existingNotifications[0] : null;
    let count = 1;

    if (existing && existing.data && typeof existing.data.count === "number") {
      count = existing.data.count + 1;
    } else if (existing) {
      count = 2;
    }

    // 3. CRITICAL FOR ANDROID HEADS-UP / PEEKING BANNER OVER APPS (e.g. YouTube):
    // When a notification with this tag already exists in the Android drawer,
    // Android NotificationManager suppresses heads-up popups for updates (even with renotify: true).
    // By explicitly closing the stale drawer notification right before showing the new one,
    // Android treats this as a brand-new high-priority alert and forces the heads-up banner
    // to pop down from the top of the screen!
    if (existingNotifications.length > 0) {
      for (const notif of existingNotifications) {
        notif.close();
      }
    }

    // Privacy rule: Only show sender name/ID and notification count — NEVER the message content
    const finalTitle = count > 1 ? `${senderName} (${count} notifications)` : senderName;
    const finalBody =
      count > 1
        ? `${count} new notifications • Open application to view`
        : "1 new notification • Open application to view";

    const options = {
      body: finalBody,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        ...(payload.data || {}),
        senderId,
        count,
        timestamp: Date.now(),
      },
      vibrate: [300, 150, 300, 150, 300],
      tag, // Groups into a single banner per sender
      renotify: true, // Re-triggers heads-up banner on each notification arrival
      silent: false,
      requireInteraction: false,
      timestamp: Date.now(),
      actions: [
        { action: "open", title: "Open" }
      ],
    };

    await self.registration.showNotification(finalTitle, options);
  };

  event.waitUntil(showNotificationAsync());
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
