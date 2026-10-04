// Service worker for iMessage PWA (offline caching & push notifications)
const CACHE_NAME = "imessage-v2";
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
    // 1. Don't send/show banner notification if the PWA is currently open and visible in the foreground
    const windowClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    const isPwaActive = windowClients.some(
      (client) => client.visibilityState === "visible"
    );

    if (isPwaActive) {
      // PWA is active in foreground — user sees messages in real time, suppress notification banner
      return;
    }

    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "iMessage", body: event.data.text() };
    }

    const senderName = payload.title || "iMessage";
    const senderId = payload.data?.senderId || "general";
    const newText = payload.body || "New message received";

    // 2. Group multiple messages by sender in a single banner (tag: chat-<senderId>)
    const tag = `chat-${senderId}`;

    let existingNotifications = [];
    try {
      existingNotifications = await self.registration.getNotifications({ tag });
    } catch (e) {
      console.warn("Could not query existing notifications:", e);
    }

    const existing = existingNotifications.length > 0 ? existingNotifications[0] : null;

    let finalTitle = senderName;
    let finalBody = newText;
    let accumulatedMessages = [newText];
    let count = 1;

    if (existing && existing.data && Array.isArray(existing.data.messages)) {
      accumulatedMessages = [...existing.data.messages, newText].slice(-4);
      count = (existing.data.count || existing.data.messages.length) + 1;
      finalTitle = `${senderName} (${count} messages)`;
      finalBody = accumulatedMessages.join("\n");
    } else if (existing) {
      const prevBody = existing.body || "";
      accumulatedMessages = [prevBody, newText];
      count = 2;
      finalTitle = `${senderName} (2 messages)`;
      finalBody = `${prevBody}\n${newText}`;
    }

    const options = {
      body: finalBody,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        ...(payload.data || {}),
        senderId,
        messages: accumulatedMessages,
        count,
        timestamp: Date.now(),
      },
      vibrate: [200, 100, 200, 100, 200],
      tag, // Groups into a single banner per sender
      renotify: true, // Re-triggers heads-up pop-down banner for each new message
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
