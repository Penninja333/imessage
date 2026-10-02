import DeviceToken from "../models/deviceToken.model.js";
import { getVapidPublicKey } from "../lib/push.js";

export async function getPublicKey(req, res) {
  try {
    const key = getVapidPublicKey();
    res.status(200).json({ publicKey: key });
  } catch (error) {
    console.error("Error in getPublicKey:", error.message);
    res.status(500).json({ message: "Failed to get public key" });
  }
}

export async function registerDevice(req, res) {
  try {
    const { token, platform, appVersion } = req.body;
    const userId = req.user._id;

    if (!token || !platform) {
      return res.status(400).json({ message: "token and platform are required" });
    }

    const cleanPlatform = String(platform).toLowerCase();
    if (!["ios", "android", "web"].includes(cleanPlatform)) {
      return res.status(400).json({ message: "platform must be ios, android, or web" });
    }

    const tokenStr = typeof token === "object" ? JSON.stringify(token) : String(token);

    // Remove any previous associations of this device token with other users
    await DeviceToken.deleteMany({ token: tokenStr, userId: { $ne: userId } });

    await DeviceToken.findOneAndUpdate(
      { userId, token: tokenStr },
      {
        userId,
        token: tokenStr,
        platform: cleanPlatform,
        appVersion: appVersion || "",
        lastSeen: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error in registerDevice:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
