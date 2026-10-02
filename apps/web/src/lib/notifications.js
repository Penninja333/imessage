// Web Push & Browser Notifications utility

export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }
  return null;
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function showWebNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  // Only show if document is hidden / tab is in background
  if (document.visibilityState === "visible") {
    return;
  }

  const defaultOptions = {
    icon: "/logo.png",
    badge: "/logo.png",
    ...options,
  };

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, defaultOptions);
    });
  } else {
    try {
      new Notification(title, defaultOptions);
    } catch (e) {
      console.warn("Direct Notification failed:", e);
    }
  }
}
