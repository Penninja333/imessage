import DeviceToken from "../models/deviceToken.model.js";

export async function registerDevice(req, res) {
  try {
    const { token, platform, appVersion } = req.body;
    const userId = req.user._id;

    if (!token || !platform) {
      return res.status(400).json({ message: "token and platform are required" });
    }
    if (!["ios", "android"].includes(platform)) {
      return res.status(400).json({ message: "platform must be ios or android" });
    }

    await DeviceToken.findOneAndUpdate(
      { userId, token },
      { userId, token, platform, appVersion: appVersion || "", lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error in registerDevice:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
