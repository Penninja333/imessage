import admin from "firebase-admin";

let initialized = false;

function initFirebase() {
  if (initialized) return;

  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountB64) {
    console.warn("[push] FIREBASE_SERVICE_ACCOUNT not set — running in dry-run mode (pushes logged, not sent)");
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
 * Send a push notification to a list of device tokens.
 *
 * @param {object} opts
 * @param {string[]} opts.tokens   — FCM/APNs device tokens
 * @param {string}   opts.title    — notification title (sender name)
 * @param {string}   opts.body     — notification body (message preview)
 * @param {object}   opts.data     — extra data payload (senderId, messageId)
 */
export async function sendPush({ tokens, title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return;

  const payload = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)]),
    ),
    tokens,
  };

  // Dry-run mode: Firebase not configured
  if (!initialized) {
    console.log("[push][dry-run] Would send to", tokens.length, "device(s):", JSON.stringify({ title, body, data }));
    return;
  }

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`[push] Sent: ${response.successCount} ok, ${response.failureCount} failed`);

    // Log individual failures for debugging
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.warn(`[push] Token ${i} failed:`, r.error?.message);
      }
    });
  } catch (err) {
    console.error("[push] sendEachForMulticast error:", err.message);
  }
}

// Initialize on module load
initFirebase();
