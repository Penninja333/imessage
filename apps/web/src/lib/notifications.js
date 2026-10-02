// Web Push & Browser Notifications utility
import { axiosInstance } from "./axios";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (e) {
      console.warn("[notifications] Permission request error:", e.message);
    }
  }

  return false;
}

export async function subscribeToWebPush(forceRefresh = false) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  try {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    if (!registration) return false;

    const res = await axiosInstance.get("/devices/vapid-public-key");
    const publicKey = res.data?.publicKey;
    if (!publicKey) return false;

    let subscription = await registration.pushManager.getSubscription();

    // If forceRefresh is requested, remove stale/dead subscription
    if (subscription && forceRefresh) {
      try {
        await subscription.unsubscribe();
        subscription = null;
      } catch (unsubErr) {
        console.warn("[notifications] Unsubscribe error:", unsubErr);
      }
    }

    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      } catch (subErr) {
        console.warn("[notifications] Initial subscribe failed, retrying...", subErr.message);
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          try {
            await existing.unsubscribe();
          } catch {}
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
    }

    if (subscription) {
      await axiosInstance.post("/devices/register", {
        platform: "web",
        token: JSON.stringify(subscription),
        appVersion: "1.0.0",
      });
      console.log("[notifications] Web Push registered successfully ✓");
      return true;
    }
  } catch (error) {
    console.warn("[notifications] Failed to subscribe to Web Push:", error.message);
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
