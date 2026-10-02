import admin from "firebase-admin";
import webpush from "web-push";
import DeviceToken from "../models/deviceToken.model.js";

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BDq_PryHvnxNvRITzcbPIQx3S0KWOidrxcgwiX96Kh-qbqTZR3xSKRy_jys9WaL4zGn9ZzugurdFk4wY9FpfQXw";
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "3KxzrBXjdAscnTHIeXp2MsH4sSQxWtNrXqHDHjHPj9Q";
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:support@imessage-pwa.app";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("[push] Web Push (VAPID) initialized ✓");
} catch (e) {
  console.warn("[push] Failed to initialize Web Push VAPID:", e.message);
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

let initialized = false;

function initFirebase() {
  if (initialized) return;

  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountB64) {
    console.warn(
      "[push] FIREBASE_SERVICE_ACCOUNT not set — running in dry-run mode (pushes logged, not sent)",
    );
    return;
  }

  try {
    let serviceAccount;
    const trimmed = serviceAccountB64.trim();
    if (trimmed.startsWith("{")) {
      serviceAccount = JSON.parse(trimmed);
    } else {
      serviceAccount = JSON.parse(
        Buffer.from(trimmed, "base64").toString("utf8"),
      );
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    initialized = true;
    console.log("[push] Firebase Admin initialized ✓");
  } catch (err) {
    console.error("[push] Failed to initialise Firebase Admin:", err.message);
  }
}

/**
 * Send a push notification to device tokens (Web Push VAPID + FCM multicast)
 */
export async function sendPush({ tokens, title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return;

  const webPushTokens = [];
  const fcmTokens = [];

  for (const token of tokens) {
    try {
      if (typeof token === "string" && token.includes('"endpoint"')) {
        webPushTokens.push(JSON.parse(token));
      } else if (typeof token === "object" && token.endpoint) {
        webPushTokens.push(token);
      } else {
        fcmTokens.push(token);
      }
    } catch {
      fcmTokens.push(token);
    }
  }

  // 1. Deliver Web Push (PWA on Chrome, Android, iOS Safari 16.4+, Firefox)
  if (webPushTokens.length > 0) {
    const webPayload = JSON.stringify({
      title,
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: { ...data, timestamp: Date.now() },
    });

    await Promise.allSettled(
      webPushTokens.map((sub) =>
        webpush
          .sendNotification(sub, webPayload, {
            urgency: "high",
            TTL: 86400,
            headers: {
              Urgency: "high",
            },
          })
          .catch((err) => {
            console.warn(
              "[push] Web Push delivery failed for endpoint:",
              sub.endpoint,
              err.message,
            );
            if (err.statusCode === 410 || err.statusCode === 404) {
              const tokenStr = typeof sub === "string" ? sub : JSON.stringify(sub);
              DeviceToken.deleteOne({ token: tokenStr }).catch(() => {});
            }
          }),
      ),
    );
    console.log(`[push] Dispatched Web Push to ${webPushTokens.length} PWA client(s)`);
  }

  // 2. Deliver FCM Push
  if (fcmTokens.length > 0) {
    if (!initialized) {
      console.log(
        "[push][dry-run] Would send to",
        fcmTokens.length,
        "FCM device(s):",
        JSON.stringify({ title, body, data }),
      );
      return;
    }

    try {
      const payload = {
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          priority: "high",
          notification: {
            channelId: "messages",
            priority: "max",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        tokens: fcmTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(payload);
      console.log(
        `[push] FCM Sent: ${response.successCount} ok, ${response.failureCount} failed`,
      );
    } catch (err) {
      console.error("[push] sendEachForMulticast error:", err.message);
    }
  }
}

// Initialize on module load
initFirebase();
